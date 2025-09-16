-- Fix critical Google token security issues (corrected version)

-- 1. Add additional security constraints to the user_google_tokens table
ALTER TABLE user_google_tokens 
ADD CONSTRAINT check_encrypted_tokens_not_null 
CHECK (encrypted_access_token IS NOT NULL);

-- 2. Add token expiration cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_google_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete tokens that have been expired for more than 7 days
  DELETE FROM user_google_tokens 
  WHERE expires_at < NOW() - interval '7 days';
  
  RAISE LOG 'Cleaned up expired Google tokens at %', NOW();
END;
$$;

-- 3. Enhance the validation function with stricter security checks
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
  max_attempts_per_hour integer := 50; -- Reduced from 100 for better security
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
  
  -- Enhanced logging for audit trail
  RAISE LOG 'Token access attempt: User %, Action %, IP %, UA %, Time %', 
    p_user_id, p_action, p_ip_address, p_user_agent, current_time;
  
  -- Basic validation
  IF requesting_user IS NULL THEN
    RAISE LOG 'SECURITY ALERT: Unauthenticated token access attempt for user %', p_user_id;
    RETURN false;
  END IF;
  
  -- Service role bypass (for legitimate system operations)
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  
  -- Users can only access their own tokens
  IF requesting_user != p_user_id THEN
    RAISE LOG 'SECURITY ALERT: Cross-user token access attempt by % for user %', requesting_user, p_user_id;
    RETURN false;
  END IF;
  
  -- Enhanced rate limiting (only if rate limit table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_rate_limit') THEN
    SELECT * INTO rate_limit_record 
    FROM google_token_rate_limit 
    WHERE user_id = p_user_id;
    
    -- Check if currently blocked
    IF rate_limit_record.blocked_until IS NOT NULL AND rate_limit_record.blocked_until > current_time THEN
      RAISE LOG 'SECURITY ALERT: Rate limited token access for user %', p_user_id;
      RETURN false;
    END IF;
    
    -- Reset or update rate limit window
    IF rate_limit_record.window_start IS NULL OR rate_limit_record.window_start < current_time - interval '1 hour' THEN
      INSERT INTO google_token_rate_limit (user_id, access_count, window_start, blocked_until)
      VALUES (p_user_id, 1, current_time, NULL)
      ON CONFLICT (user_id) DO UPDATE SET
        access_count = 1,
        window_start = current_time,
        blocked_until = NULL;
    ELSE
      -- Increment and check limits
      UPDATE google_token_rate_limit 
      SET access_count = access_count + 1,
          blocked_until = CASE 
                           WHEN access_count + 1 > max_attempts_per_hour 
                           THEN current_time + interval '2 hours' -- Longer block time
                           ELSE NULL 
                         END
      WHERE user_id = p_user_id;
      
      -- Check if now blocked
      IF (SELECT blocked_until FROM google_token_rate_limit WHERE user_id = p_user_id) IS NOT NULL THEN
        RAISE LOG 'SECURITY ALERT: User % hit rate limit for token access', p_user_id;
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- 4. Create a secure function to validate encryption key strength
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
  
  -- Check if key exists and meets minimum requirements
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN false;
  END IF;
  
  -- Check key length
  IF length(encryption_key) < 32 THEN
    RETURN false;
  END IF;
  
  -- Check key complexity (has mixed case, numbers, and symbols)
  IF NOT (encryption_key ~ '[a-z]' AND encryption_key ~ '[A-Z]' AND encryption_key ~ '[0-9]' AND encryption_key ~ '[^a-zA-Z0-9]') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 5. Add a policy to prevent token access when encryption is not properly configured
DROP POLICY IF EXISTS "Block access when encryption not configured" ON user_google_tokens;
CREATE POLICY "Block access when encryption not configured"
ON user_google_tokens
FOR ALL
USING (validate_encryption_key_configured() = true)
WITH CHECK (validate_encryption_key_configured() = true);

-- 6. Create automatic cleanup job trigger
CREATE OR REPLACE FUNCTION trigger_token_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Periodically clean up (5% chance on each operation)
  IF random() < 0.05 THEN
    PERFORM cleanup_expired_google_tokens();
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add cleanup trigger
DROP TRIGGER IF EXISTS auto_cleanup_tokens ON user_google_tokens;
CREATE TRIGGER auto_cleanup_tokens
  AFTER INSERT OR UPDATE OR DELETE ON user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_token_cleanup();