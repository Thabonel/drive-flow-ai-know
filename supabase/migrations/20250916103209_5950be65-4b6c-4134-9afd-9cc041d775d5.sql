-- Enhanced security measures for Google authentication tokens (Fixed)
-- Addresses: Google Authentication Tokens Could Be Compromised

-- Create audit log table for token access attempts
CREATE TABLE IF NOT EXISTS public.google_token_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    action text NOT NULL,
    success boolean NOT NULL,
    details jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.google_token_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.google_token_audit_log;
DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.google_token_audit_log;

CREATE POLICY "Users can view their own audit logs" ON public.google_token_audit_log
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage audit logs" ON public.google_token_audit_log
    FOR ALL USING (auth.role() = 'service_role');

-- Create token access rate limiting table
CREATE TABLE IF NOT EXISTS public.google_token_rate_limit (
    user_id uuid PRIMARY KEY,
    access_count integer DEFAULT 0,
    window_start timestamp with time zone DEFAULT now(),
    blocked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limiting table
ALTER TABLE public.google_token_rate_limit ENABLE ROW LEVEL SECURITY;

-- Drop and recreate rate limit policies
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.google_token_rate_limit;
CREATE POLICY "Service role can manage rate limits" ON public.google_token_rate_limit
    FOR ALL USING (auth.role() = 'service_role');

-- Enhanced token access validation with rate limiting and audit logging
CREATE OR REPLACE FUNCTION public.validate_google_token_access_enhanced(p_user_id uuid, p_action text DEFAULT 'access', p_ip_address inet DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user uuid;
  rate_limit_record record;
  max_attempts_per_hour integer := 100; -- Max 100 token accesses per hour
  current_time timestamp with time zone := now();
BEGIN
  requesting_user := auth.uid();
  
  -- Log the access attempt (only if audit table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_audit_log') THEN
    INSERT INTO public.google_token_audit_log (user_id, action, success, details, ip_address, user_agent)
    VALUES (p_user_id, p_action, false, 
            jsonb_build_object('requesting_user', requesting_user, 'ip', p_ip_address, 'user_agent', p_user_agent),
            p_ip_address, p_user_agent);
  END IF;
  
  -- Basic validation
  IF requesting_user IS NULL THEN
    RETURN false;
  END IF;
  
  -- Service role bypass
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  
  -- User can only access their own tokens
  IF requesting_user != p_user_id THEN
    RETURN false;
  END IF;
  
  -- Check rate limiting (only if rate limit table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_rate_limit') THEN
    SELECT * INTO rate_limit_record 
    FROM public.google_token_rate_limit 
    WHERE user_id = p_user_id;
    
    -- If blocked, check if block period has expired
    IF rate_limit_record.blocked_until IS NOT NULL AND rate_limit_record.blocked_until > current_time THEN
      RETURN false;
    END IF;
    
    -- Reset window if needed (hourly windows)
    IF rate_limit_record.window_start IS NULL OR rate_limit_record.window_start < current_time - interval '1 hour' THEN
      INSERT INTO public.google_token_rate_limit (user_id, access_count, window_start, blocked_until)
      VALUES (p_user_id, 1, current_time, NULL)
      ON CONFLICT (user_id) DO UPDATE SET
        access_count = 1,
        window_start = current_time,
        blocked_until = NULL;
    ELSE
      -- Increment access count
      UPDATE public.google_token_rate_limit 
      SET access_count = access_count + 1,
          blocked_until = CASE 
                           WHEN access_count + 1 > max_attempts_per_hour 
                           THEN current_time + interval '1 hour'
                           ELSE NULL 
                         END
      WHERE user_id = p_user_id;
      
      -- Check if now blocked
      IF (SELECT blocked_until FROM public.google_token_rate_limit WHERE user_id = p_user_id) IS NOT NULL THEN
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  -- Log successful validation (only if audit table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_audit_log') THEN
    UPDATE public.google_token_audit_log 
    SET success = true, details = details || jsonb_build_object('validation_passed', true)
    WHERE user_id = p_user_id AND created_at = (
      SELECT MAX(created_at) FROM public.google_token_audit_log WHERE user_id = p_user_id
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Enhanced token storage function with additional security checks
CREATE OR REPLACE FUNCTION public.store_encrypted_google_tokens_enhanced(
  p_access_token text, 
  p_refresh_token text DEFAULT NULL, 
  p_token_type text DEFAULT 'Bearer', 
  p_expires_in integer DEFAULT 3600, 
  p_scope text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to store tokens';
  END IF;

  -- Validate access using enhanced function
  IF NOT public.validate_google_token_access_enhanced(current_user_id, 'store', p_ip_address, p_user_agent) THEN
    RAISE EXCEPTION 'Token storage access denied due to rate limiting or security policy';
  END IF;

  encryption_key := current_setting('app.google_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Google token encryption key not configured';
  END IF;

  -- Enhanced key validation - check key strength
  IF length(encryption_key) < 32 THEN
    RAISE EXCEPTION 'Encryption key must be at least 32 characters long';
  END IF;
  
  -- Validate key contains mixed case, numbers, and special characters
  IF NOT (encryption_key ~ '[a-z]' AND encryption_key ~ '[A-Z]' AND encryption_key ~ '[0-9]' AND encryption_key ~ '[^a-zA-Z0-9]') THEN
    RAISE EXCEPTION 'Encryption key must contain uppercase, lowercase, numbers, and special characters';
  END IF;

  -- Enhanced token validation
  IF p_access_token IS NULL OR length(p_access_token) < 10 THEN
    RAISE EXCEPTION 'Invalid access token provided';
  END IF;
  
  -- Check for suspicious token patterns
  IF p_access_token ~ '^[a-zA-Z0-9]*$' AND length(p_access_token) < 50 THEN
    RAISE EXCEPTION 'Suspicious token format detected';
  END IF;

  -- Store with enhanced expiration handling
  INSERT INTO public.user_google_tokens (
    user_id,
    encrypted_access_token,
    encrypted_refresh_token,
    token_type,
    expires_at,
    scope,
    created_at,
    updated_at
  ) VALUES (
    current_user_id,
    pgp_sym_encrypt(p_access_token, encryption_key),
    CASE WHEN p_refresh_token IS NOT NULL 
         THEN pgp_sym_encrypt(p_refresh_token, encryption_key)
         ELSE NULL END,
    p_token_type,
    -- Add buffer time and ensure reasonable expiration
    CASE 
      WHEN p_expires_in > 86400 THEN NOW() + interval '24 hours'  -- Max 24 hours
      WHEN p_expires_in < 300 THEN NOW() + interval '5 minutes'   -- Min 5 minutes
      ELSE NOW() + (p_expires_in || ' seconds')::interval
    END,
    p_scope,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    encrypted_access_token = pgp_sym_encrypt(p_access_token, encryption_key),
    encrypted_refresh_token = CASE WHEN p_refresh_token IS NOT NULL 
                                   THEN pgp_sym_encrypt(p_refresh_token, encryption_key)
                                   ELSE EXCLUDED.encrypted_refresh_token END,
    token_type = p_token_type,
    expires_at = CASE 
                   WHEN p_expires_in > 86400 THEN NOW() + interval '24 hours'
                   WHEN p_expires_in < 300 THEN NOW() + interval '5 minutes'
                   ELSE NOW() + (p_expires_in || ' seconds')::interval
                 END,
    scope = p_scope,
    updated_at = NOW();

  -- Audit log the successful storage (only if audit table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_audit_log') THEN
    INSERT INTO public.google_token_audit_log (user_id, action, success, details, ip_address, user_agent)
    VALUES (current_user_id, 'store', true, 
            jsonb_build_object('expires_in', p_expires_in, 'token_type', p_token_type, 'scope', p_scope),
            p_ip_address, p_user_agent);
  END IF;

  RAISE LOG 'Google tokens stored securely for user % at % with enhanced validation', current_user_id, NOW();
END;
$$;

-- Enhanced token retrieval function with additional security
CREATE OR REPLACE FUNCTION public.get_decrypted_google_token_enhanced(p_user_id uuid, p_ip_address inet DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone, token_type text, scope text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
  token_record record;
BEGIN
  -- Enhanced access validation
  IF NOT public.validate_google_token_access_enhanced(p_user_id, 'retrieve', p_ip_address, p_user_agent) THEN
    RAISE EXCEPTION 'Token retrieval access denied due to rate limiting or security policy';
  END IF;
  
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  encryption_key := current_setting('app.google_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Google token encryption key not configured';
  END IF;

  -- Select token with additional validation
  SELECT 
    encrypted_access_token,
    encrypted_refresh_token,
    t.expires_at,
    t.token_type,
    t.scope
  INTO token_record
  FROM public.user_google_tokens t
  WHERE t.user_id = p_user_id
    AND (t.expires_at IS NULL OR t.expires_at > NOW())
    AND created_at > NOW() - interval '30 days'; -- Additional security: tokens older than 30 days are not returned

  IF token_record IS NULL THEN
    -- Audit failed attempt (only if audit table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_audit_log') THEN
      INSERT INTO public.google_token_audit_log (user_id, action, success, details, ip_address, user_agent)
      VALUES (p_user_id, 'retrieve', false, 
              jsonb_build_object('reason', 'no_valid_tokens'),
              p_ip_address, p_user_agent);
    END IF;
    
    RAISE LOG 'No valid tokens found for user %', p_user_id;
    RETURN;
  END IF;

  -- Audit successful retrieval (only if audit table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_audit_log') THEN
    INSERT INTO public.google_token_audit_log (user_id, action, success, details, ip_address, user_agent)
    VALUES (p_user_id, 'retrieve', true, 
            jsonb_build_object('token_type', token_record.token_type, 'scope', token_record.scope),
            p_ip_address, p_user_agent);
  END IF;

  RAISE LOG 'Google tokens decrypted for user % at % with enhanced security', p_user_id, NOW();

  RETURN QUERY SELECT
    pgp_sym_decrypt(token_record.encrypted_access_token, encryption_key),
    CASE WHEN token_record.encrypted_refresh_token IS NOT NULL
         THEN pgp_sym_decrypt(token_record.encrypted_refresh_token, encryption_key)
         ELSE NULL END,
    token_record.expires_at,
    token_record.token_type,
    token_record.scope;
END;
$$;

-- Enhanced RLS policies for additional security
DROP POLICY IF EXISTS "Enhanced secure tokens view access" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Enhanced secure tokens insert access" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Enhanced secure tokens update access" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Enhanced secure tokens delete access" ON public.user_google_tokens;

-- More restrictive RLS policies
CREATE POLICY "Enhanced secure tokens view access" ON public.user_google_tokens
    FOR SELECT USING (
        (auth.uid() = user_id AND validate_google_token_access_enhanced(user_id, 'view')) 
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Enhanced secure tokens insert access" ON public.user_google_tokens
    FOR INSERT WITH CHECK (
        (auth.uid() = user_id AND validate_google_token_access_enhanced(user_id, 'insert')) 
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Enhanced secure tokens update access" ON public.user_google_tokens
    FOR UPDATE USING (
        (auth.uid() = user_id AND validate_google_token_access_enhanced(user_id, 'update')) 
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Enhanced secure tokens delete access" ON public.user_google_tokens
    FOR DELETE USING (
        (auth.uid() = user_id AND validate_google_token_access_enhanced(user_id, 'delete')) 
        OR auth.role() = 'service_role'
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_token_audit_log_user_id_created_at 
ON public.google_token_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_google_token_rate_limit_window_start 
ON public.google_token_rate_limit(window_start);

CREATE INDEX IF NOT EXISTS idx_user_google_tokens_expires_at 
ON public.user_google_tokens(expires_at);