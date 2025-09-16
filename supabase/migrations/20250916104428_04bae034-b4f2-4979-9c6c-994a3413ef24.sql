-- Fix Google token security issues - handle existing data

-- 1. First, clean up any existing rows with NULL encrypted tokens (security risk)
DELETE FROM user_google_tokens 
WHERE encrypted_access_token IS NULL;

-- 2. Add security constraint to prevent future NULL encrypted tokens
ALTER TABLE user_google_tokens 
ADD CONSTRAINT check_encrypted_tokens_not_null 
CHECK (encrypted_access_token IS NOT NULL);

-- 3. Create enhanced validation function with stricter security
CREATE OR REPLACE FUNCTION validate_google_token_access_enhanced(
  p_user_id uuid, 
  p_action text DEFAULT 'access'::text, 
  p_ip_address inet DEFAULT NULL::inet, 
  p_user_agent text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requesting_user uuid;
  rate_limit_record record;
  max_attempts_per_hour integer := 50; -- Reduced for better security
  current_time timestamp with time zone := now();
  encryption_key text;
BEGIN
  -- Check if encryption key is properly configured
  encryption_key := current_setting('app.google_token_encryption_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE LOG 'SECURITY ALERT: Google token encryption key not configured for user %', p_user_id;
    RETURN false;
  END IF;

  requesting_user := auth.uid();
  
  -- Enhanced audit logging
  RAISE LOG 'Token access: User=%, Action=%, IP=%, Time=%', 
    p_user_id, p_action, p_ip_address, current_time;
  
  -- Basic validation
  IF requesting_user IS NULL THEN
    RAISE LOG 'SECURITY ALERT: Unauthenticated token access for user %', p_user_id;
    RETURN false;
  END IF;
  
  -- Service role bypass
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  
  -- Users can only access their own tokens
  IF requesting_user != p_user_id THEN
    RAISE LOG 'SECURITY ALERT: Cross-user token access: % -> %', requesting_user, p_user_id;
    RETURN false;
  END IF;
  
  -- Enhanced rate limiting
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_rate_limit') THEN
    SELECT * INTO rate_limit_record 
    FROM google_token_rate_limit 
    WHERE user_id = p_user_id;
    
    IF rate_limit_record.blocked_until IS NOT NULL AND rate_limit_record.blocked_until > current_time THEN
      RAISE LOG 'SECURITY ALERT: Rate limited user %', p_user_id;
      RETURN false;
    END IF;
    
    IF rate_limit_record.window_start IS NULL OR rate_limit_record.window_start < current_time - interval '1 hour' THEN
      INSERT INTO google_token_rate_limit (user_id, access_count, window_start, blocked_until)
      VALUES (p_user_id, 1, current_time, NULL)
      ON CONFLICT (user_id) DO UPDATE SET
        access_count = 1,
        window_start = current_time,
        blocked_until = NULL;
    ELSE
      UPDATE google_token_rate_limit 
      SET access_count = access_count + 1,
          blocked_until = CASE 
                           WHEN access_count + 1 > max_attempts_per_hour 
                           THEN current_time + interval '2 hours'
                           ELSE NULL 
                         END
      WHERE user_id = p_user_id;
      
      IF (SELECT blocked_until FROM google_token_rate_limit WHERE user_id = p_user_id) IS NOT NULL THEN
        RAISE LOG 'SECURITY ALERT: User % hit rate limit', p_user_id;
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- 4. Create encryption key validation function
CREATE OR REPLACE FUNCTION validate_encryption_key_configured()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key text;
BEGIN
  encryption_key := current_setting('app.google_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN false;
  END IF;
  
  IF length(encryption_key) < 32 THEN
    RETURN false;
  END IF;
  
  IF NOT (encryption_key ~ '[a-z]' AND encryption_key ~ '[A-Z]' AND encryption_key ~ '[0-9]' AND encryption_key ~ '[^a-zA-Z0-9]') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 5. Add policy to block access when encryption not configured
DROP POLICY IF EXISTS "Block access when encryption not configured" ON user_google_tokens;
CREATE POLICY "Block access when encryption not configured"
ON user_google_tokens
FOR ALL
USING (validate_encryption_key_configured() = true)
WITH CHECK (validate_encryption_key_configured() = true);

-- 6. Create cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_google_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM user_google_tokens 
  WHERE expires_at < NOW() - interval '7 days';
  
  RAISE LOG 'Cleaned up expired Google tokens at %', NOW();
END;
$$;