-- Update Microsoft token functions to use a workaround for encryption key
-- Since we can't set app.* parameters, we'll create a simple table to store the key

-- Create a simple settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the encryption key
INSERT INTO public.app_config (key, value)
VALUES ('microsoft_encryption_setting', '3rIqniUYJtU2zqs4h8f9G8WBRbpQuT/T12uMxtvnbeM=')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Update the store function to read from app_config table
CREATE OR REPLACE FUNCTION public.store_encrypted_microsoft_token(
  p_user_id UUID,
  p_accessToken TEXT,
  p_refreshToken TEXT DEFAULT NULL,
  p_token_type TEXT DEFAULT 'Bearer',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_scope TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  encryption_key TEXT;
  v_result JSONB;
BEGIN
  -- Get encryption key from app_config table
  SELECT value INTO encryption_key FROM public.app_config WHERE key = 'microsoft_encryption_setting';

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Microsoft token encryption key not configured';
  END IF;

  -- Upsert encrypted tokens
  INSERT INTO public.user_microsoft_tokens (
    user_id,
    encrypted_accessToken,
    encrypted_refreshToken,
    token_type,
    expires_at,
    scope,
    updated_at
  ) VALUES (
    p_user_id,
    pgp_sym_encrypt(p_accessToken, encryption_key),
    CASE WHEN p_refreshToken IS NOT NULL
      THEN pgp_sym_encrypt(p_refreshToken, encryption_key)
      ELSE NULL
    END,
    p_token_type,
    p_expires_at,
    p_scope,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    encrypted_accessToken = pgp_sym_encrypt(p_accessToken, encryption_key),
    encrypted_refreshToken = CASE WHEN p_refreshToken IS NOT NULL
      THEN pgp_sym_encrypt(p_refreshToken, encryption_key)
      ELSE user_microsoft_tokens.encrypted_refreshToken
    END,
    token_type = p_token_type,
    expires_at = p_expires_at,
    scope = p_scope,
    updated_at = NOW();

  -- Log the action
  INSERT INTO public.microsoft_token_audit_log (
    user_id,
    action,
    success,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    'store_token',
    true,
    jsonb_build_object(
      'token_type', p_token_type,
      'expires_at', p_expires_at,
      'scope', p_scope
    ),
    p_ip_address,
    p_user_agent
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Microsoft tokens stored successfully'
  );

  RETURN v_result;
END;
$$;

-- Update the get function to read from app_config table
CREATE OR REPLACE FUNCTION public.get_decrypted_microsoft_token(p_user_id UUID)
RETURNS TABLE (
  accessToken TEXT,
  refreshToken TEXT,
  token_type TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from app_config table
  SELECT value INTO encryption_key FROM public.app_config WHERE key = 'microsoft_encryption_setting';

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Microsoft token encryption key not configured';
  END IF;

  RETURN QUERY
  SELECT
    pgp_sym_decrypt(encrypted_accessToken, encryption_key)::TEXT,
    CASE
      WHEN encrypted_refreshToken IS NOT NULL THEN pgp_sym_decrypt(encrypted_refreshToken, encryption_key)::TEXT
      ELSE NULL
    END,
    umt.token_type,
    umt.expires_at,
    umt.scope
  FROM public.user_microsoft_tokens umt
  WHERE umt.user_id = p_user_id;
END;
$$;
