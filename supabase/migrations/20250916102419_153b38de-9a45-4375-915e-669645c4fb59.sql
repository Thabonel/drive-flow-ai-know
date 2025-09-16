-- Fix Google tokens security by dropping existing policies first

-- Drop all existing policies on user_google_tokens
DROP POLICY IF EXISTS "Users can view own tokens metadata only" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens only" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can update own tokens only" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens only" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Service role full access" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can view own tokens metadata" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON public.user_google_tokens;

-- Create validation function for token access
CREATE OR REPLACE FUNCTION public.validate_google_token_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user uuid;
BEGIN
  requesting_user := auth.uid();
  
  IF requesting_user IS NULL THEN
    RETURN false;
  END IF;
  
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  
  RETURN requesting_user = p_user_id;
END;
$$;

-- Enhanced RLS policies with additional validation
CREATE POLICY "Secure tokens view access" 
ON public.user_google_tokens 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND validate_google_token_access(user_id)
);

CREATE POLICY "Secure tokens insert access" 
ON public.user_google_tokens 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND validate_google_token_access(user_id)
);

CREATE POLICY "Secure tokens update access" 
ON public.user_google_tokens 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND validate_google_token_access(user_id)
);

CREATE POLICY "Secure tokens delete access" 
ON public.user_google_tokens 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND validate_google_token_access(user_id)
);

CREATE POLICY "Service role tokens access" 
ON public.user_google_tokens 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enhanced store function with validation
CREATE OR REPLACE FUNCTION public.store_encrypted_google_tokens(
  p_access_token text, 
  p_refresh_token text DEFAULT NULL::text, 
  p_token_type text DEFAULT 'Bearer'::text, 
  p_expires_in integer DEFAULT 3600, 
  p_scope text DEFAULT NULL::text
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

  encryption_key := current_setting('app.google_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Google token encryption key not configured';
  END IF;

  IF length(encryption_key) < 32 THEN
    RAISE EXCEPTION 'Encryption key must be at least 32 characters long';
  END IF;

  IF p_access_token IS NULL OR length(p_access_token) < 10 THEN
    RAISE EXCEPTION 'Invalid access token provided';
  END IF;

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
    NOW() + (p_expires_in || ' seconds')::interval,
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
    expires_at = NOW() + (p_expires_in || ' seconds')::interval,
    scope = p_scope,
    updated_at = NOW();

  RAISE LOG 'Google tokens stored for user % at %', current_user_id, NOW();
END;
$$;

-- Enhanced decryption function with additional security
CREATE OR REPLACE FUNCTION public.get_decrypted_google_token(p_user_id uuid)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone, token_type text, scope text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;