-- Fix remaining functions with mutable search_path
CREATE OR REPLACE FUNCTION public.get_decrypted_google_token(p_user_id uuid)
 RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone, token_type text, scope text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  encryption_key text;
  token_record record;
BEGIN
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service role can decrypt tokens';
  END IF;
  
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  encryption_key := current_setting('app.google_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Google token encryption key not configured';
  END IF;

  SELECT 
    encrypted_access_token,
    encrypted_refresh_token,
    t.expires_at,
    t.token_type,
    t.scope
  INTO token_record
  FROM public.user_google_tokens t
  WHERE t.user_id = p_user_id
    AND (t.expires_at IS NULL OR t.expires_at > NOW());

  IF token_record IS NULL THEN
    RAISE LOG 'No valid tokens found for user %', p_user_id;
    RETURN;
  END IF;

  RAISE LOG 'Google tokens decrypted for user % at %', p_user_id, NOW();

  RETURN QUERY SELECT
    pgp_sym_decrypt(token_record.encrypted_access_token, encryption_key),
    CASE WHEN token_record.encrypted_refresh_token IS NOT NULL
         THEN pgp_sym_decrypt(token_record.encrypted_refresh_token, encryption_key)
         ELSE NULL END,
    token_record.expires_at,
    token_record.token_type,
    token_record.scope;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_decrypted_google_token_enhanced(p_user_id uuid, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone, token_type text, scope text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
    AND created_at > NOW() - interval '30 days';

  IF token_record IS NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_token_audit_log') THEN
      INSERT INTO public.google_token_audit_log (user_id, action, success, details, ip_address, user_agent)
      VALUES (p_user_id, 'retrieve', false, 
              jsonb_build_object('reason', 'no_valid_tokens'),
              p_ip_address, p_user_agent);
    END IF;
    
    RAISE LOG 'No valid tokens found for user %', p_user_id;
    RETURN;
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.validate_google_token_access_enhanced(p_user_id uuid, p_action text DEFAULT 'access'::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  requesting_user uuid;
  rate_limit_record record;
  max_attempts_per_hour integer := 50;
  current_time timestamp with time zone := now();
  encryption_key text;
BEGIN
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_encryption_key_configured()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;