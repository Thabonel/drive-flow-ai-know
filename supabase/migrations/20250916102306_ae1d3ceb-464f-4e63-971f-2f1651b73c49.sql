-- Strengthen Google tokens security by adding additional safeguards

-- First, let's add a function to validate token access with additional security checks
CREATE OR REPLACE FUNCTION public.validate_google_token_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user uuid;
BEGIN
  -- Get the current user from auth context
  requesting_user := auth.uid();
  
  -- Only allow access if the requesting user matches the token owner
  -- or if it's the service role
  IF requesting_user IS NULL THEN
    RETURN false;
  END IF;
  
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  
  RETURN requesting_user = p_user_id;
END;
$$;

-- Update the store_encrypted_google_tokens function to add additional validation
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
  -- Validate the user is authenticated
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to store tokens';
  END IF;

  -- Get encryption key from environment (will be added as Supabase secret)
  encryption_key := current_setting('app.google_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Google token encryption key not configured';
  END IF;

  -- Validate encryption key strength (minimum 32 characters)
  IF length(encryption_key) < 32 THEN
    RAISE EXCEPTION 'Encryption key must be at least 32 characters long';
  END IF;

  -- Validate token parameters
  IF p_access_token IS NULL OR length(p_access_token) < 10 THEN
    RAISE EXCEPTION 'Invalid access token provided';
  END IF;

  -- Additional security: limit token storage to prevent abuse
  -- Check if user already has tokens and update existing record
  IF EXISTS (SELECT 1 FROM public.user_google_tokens WHERE user_id = current_user_id) THEN
    -- Update existing tokens
    UPDATE public.user_google_tokens SET
      encrypted_access_token = pgp_sym_encrypt(p_access_token, encryption_key),
      encrypted_refresh_token = CASE WHEN p_refresh_token IS NOT NULL 
                                     THEN pgp_sym_encrypt(p_refresh_token, encryption_key)
                                     ELSE encrypted_refresh_token END,
      token_type = p_token_type,
      expires_at = NOW() + (p_expires_in || ' seconds')::interval,
      scope = p_scope,
      updated_at = NOW()
    WHERE user_id = current_user_id;
  ELSE
    -- Insert new tokens
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
    );
  END IF;

  -- Log the token storage for audit purposes (without sensitive data)
  RAISE LOG 'Google tokens stored for user % at %', current_user_id, NOW();
END;
$$;

-- Update the get_decrypted_google_token function with additional security
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
  -- Only service role should call this function
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service role can decrypt tokens';
  END IF;
  
  -- Additional validation for the requesting user ID
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  encryption_key := current_setting('app.google_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Google token encryption key not configured';
  END IF;

  -- Check if tokens exist and are not expired
  SELECT 
    encrypted_access_token,
    encrypted_refresh_token,
    t.expires_at,
    t.token_type,
    t.scope
  INTO token_record
  FROM public.user_google_tokens t
  WHERE t.user_id = p_user_id
    AND (t.expires_at IS NULL OR t.expires_at > NOW()); -- Only return non-expired tokens

  IF token_record IS NULL THEN
    RAISE LOG 'No valid tokens found for user %', p_user_id;
    RETURN;
  END IF;

  -- Log token access for audit purposes
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

-- Drop and recreate RLS policies with stronger security
DROP POLICY IF EXISTS "Users can view own tokens metadata" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON public.user_google_tokens;

-- Create enhanced RLS policies
CREATE POLICY "Users can view own tokens metadata only" 
ON public.user_google_tokens 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND validate_google_token_access(user_id)
);

CREATE POLICY "Users can insert own tokens only" 
ON public.user_google_tokens 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND validate_google_token_access(user_id)
);

CREATE POLICY "Users can update own tokens only" 
ON public.user_google_tokens 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND validate_google_token_access(user_id)
);

CREATE POLICY "Users can delete own tokens only" 
ON public.user_google_tokens 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND validate_google_token_access(user_id)
);

-- Service role access policy (for decryption function)
CREATE POLICY "Service role full access" 
ON public.user_google_tokens 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create an audit function to log suspicious token access attempts
CREATE OR REPLACE FUNCTION public.log_token_access_attempt(
  p_user_id uuid,
  p_action text,
  p_success boolean,
  p_details text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access attempts for monitoring
  RAISE LOG 'Token access attempt - User: %, Action: %, Success: %, Details: %, Timestamp: %', 
    p_user_id, p_action, p_success, p_details, NOW();
END;
$$;