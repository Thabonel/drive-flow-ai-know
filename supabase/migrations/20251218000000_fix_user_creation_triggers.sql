-- Fix user creation triggers to be robust and not fail
-- This migration ensures all triggers on auth.users handle errors gracefully

-- 1. Drop and recreate handle_new_user to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Safely insert into profiles table
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Drop and recreate create_default_planning_settings to be safe  
DROP TRIGGER IF EXISTS create_planning_settings_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_default_planning_settings() CASCADE;

CREATE OR REPLACE FUNCTION create_default_planning_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Safely insert planning settings
  INSERT INTO daily_planning_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'create_default_planning_settings failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_planning_settings_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_planning_settings();

-- 3. Fix user_roles to have a default and create trigger for auto-assignment
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'user';

-- Drop old role creation trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_setup_role ON auth.users;
DROP FUNCTION IF EXISTS setup_user_role() CASCADE;

-- Create safe function to setup default user role
CREATE OR REPLACE FUNCTION setup_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Safely insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'setup_user_role failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_setup_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION setup_user_role();

-- 4. Create user_subscriptions record for new users (free tier by default)
DROP TRIGGER IF EXISTS create_user_subscription_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_default_subscription() CASCADE;

CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Safely insert default free subscription
  INSERT INTO user_subscriptions (user_id, plan_tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'create_default_subscription failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_subscription_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- 5. Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Ensure daily_planning_settings exists
CREATE TABLE IF NOT EXISTS daily_planning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  planning_time TIME DEFAULT '09:00:00' NOT NULL,
  duration_minutes INTEGER DEFAULT 15 NOT NULL CHECK (duration_minutes > 0),
  skip_weekends BOOLEAN DEFAULT false NOT NULL,
  review_yesterday BOOLEAN DEFAULT true NOT NULL,
  import_calendar BOOLEAN DEFAULT true NOT NULL,
  set_priorities BOOLEAN DEFAULT true NOT NULL,
  check_workload BOOLEAN DEFAULT true NOT NULL,
  enable_notifications BOOLEAN DEFAULT true NOT NULL,
  snooze_duration_minutes INTEGER DEFAULT 15 NOT NULL,
  quick_planning_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on these tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_planning_settings ENABLE ROW LEVEL SECURITY;

-- Create/update RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own planning settings" ON daily_planning_settings;
CREATE POLICY "Users can view their own planning settings"
  ON daily_planning_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own planning settings" ON daily_planning_settings;
CREATE POLICY "Users can update their own planning settings"
  ON daily_planning_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Ensure security_audit_log table exists (was showing 404)
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
  ON security_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
