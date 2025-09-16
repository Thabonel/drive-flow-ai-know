-- Fix critical Google token security issues
-- Simplified version without IF NOT EXISTS

-- 1. Create token cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_google_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM user_google_tokens 
  WHERE expires_at < NOW() - interval '7 days';
END;
$$;

-- 2. Create encryption key validation function
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

-- 3. Enhanced token access validation with stricter security
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
  max_attempts_per_hour integer := 50;
  current_time timestamp with time zone := now();
  encryption_key text;
BEGIN
  -- Verify encryption key is configured
  encryption_key := current_setting('app.google_token_encryption_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN false;
  END IF;

  requesting_user := auth.uid();
  
  IF requesting_user IS NULL THEN
    RETURN false;
  END IF;
  
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  
  IF requesting_user != p_user_id THEN
    RETURN false;
  END IF;
  
  -- Rate limiting if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_rate_limit') THEN
    SELECT * INTO rate_limit_record 
    FROM google_token_rate_limit 
    WHERE user_id = p_user_id;
    
    IF rate_limit_record.blocked_until IS NOT NULL AND rate_limit_record.blocked_until > current_time THEN
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
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- 4. Add policy to block access when encryption is not configured
DROP POLICY IF EXISTS "Block access when encryption not configured" ON user_google_tokens;
CREATE POLICY "Block access when encryption not configured"
ON user_google_tokens
FOR ALL
USING (validate_encryption_key_configured() = true)
WITH CHECK (validate_encryption_key_configured() = true);

-- 5. Create automatic cleanup trigger
CREATE OR REPLACE FUNCTION trigger_token_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF random() < 0.05 THEN
    PERFORM cleanup_expired_google_tokens();
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS auto_cleanup_tokens ON user_google_tokens;
CREATE TRIGGER auto_cleanup_tokens
  AFTER INSERT OR UPDATE OR DELETE ON user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_token_cleanup();