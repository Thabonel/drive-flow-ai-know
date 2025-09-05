-- Phase 1: Add token encryption schema for Google OAuth tokens
-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns to user_google_tokens
ALTER TABLE public.user_google_tokens 
ADD COLUMN IF NOT EXISTS encrypted_access_token bytea,
ADD COLUMN IF NOT EXISTS encrypted_refresh_token bytea;

-- Create a secure function to store encrypted Google tokens
CREATE OR REPLACE FUNCTION public.store_encrypted_google_tokens(
  p_access_token text,
  p_refresh_token text DEFAULT NULL,
  p_token_type text DEFAULT 'Bearer',
  p_expires_in integer DEFAULT 3600,
  p_scope text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from environment (will be added as Supabase secret)
  encryption_key := current_setting('app.google_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Google token encryption key not configured';
  END IF;

  -- Upsert with encrypted tokens
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
    auth.uid(),
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
END;
$$;

-- Create function to decrypt tokens (server-side only)
CREATE OR REPLACE FUNCTION public.get_decrypted_google_token(p_user_id uuid)
RETURNS TABLE(
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  token_type text,
  scope text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key text;
  token_record record;
BEGIN
  -- Only service role should call this function
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service role can decrypt tokens';
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
  WHERE t.user_id = p_user_id;

  IF token_record IS NULL THEN
    RETURN;
  END IF;

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