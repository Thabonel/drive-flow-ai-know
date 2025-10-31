-- Fix user_roles table - add missing features_enabled column if needed
-- This handles the case where the table exists but is missing the column

-- First, check if we need to create the enum types (they might already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    CREATE TYPE user_role_type AS ENUM ('executive', 'assistant', 'standard');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'executive');
  END IF;
END $$;

-- Check if user_roles table exists
DO $$
BEGIN
  -- If table doesn't exist, create it with all columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    CREATE TABLE user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role_type user_role_type NOT NULL DEFAULT 'standard',
      subscription_tier subscription_tier NOT NULL DEFAULT 'starter',
      features_enabled JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT user_roles_user_id_unique UNIQUE (user_id)
    );

    RAISE NOTICE 'Created user_roles table with all columns';
  ELSE
    RAISE NOTICE 'user_roles table already exists, checking for missing columns...';
  END IF;
END $$;

-- Add features_enabled column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'features_enabled'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN features_enabled JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added features_enabled column to user_roles';
  ELSE
    RAISE NOTICE 'features_enabled column already exists';
  END IF;
END $$;

-- Add role_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'role_type'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN role_type user_role_type NOT NULL DEFAULT 'standard';
    RAISE NOTICE 'Added role_type column to user_roles';
  END IF;
END $$;

-- Add subscription_tier column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN subscription_tier subscription_tier NOT NULL DEFAULT 'starter';
    RAISE NOTICE 'Added subscription_tier column to user_roles';
  END IF;
END $$;

-- Now safely add comments
COMMENT ON TABLE user_roles IS 'User roles, subscription tiers, and feature flags';
COMMENT ON COLUMN user_roles.features_enabled IS 'JSON object with feature flags: {ai_assistant: true, timeline_goals: true, max_assistants: 3, storage_gb: 10}';

-- Create index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_user_id'
  ) THEN
    CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
    RAISE NOTICE 'Created idx_user_roles_user_id index';
  END IF;
END $$;

-- Verify the fix
DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'features_enabled'
  ) INTO v_column_exists;

  IF v_column_exists THEN
    RAISE NOTICE '✓ SUCCESS: user_roles table now has features_enabled column';
  ELSE
    RAISE WARNING '✗ FAILED: features_enabled column still missing!';
  END IF;
END $$;
