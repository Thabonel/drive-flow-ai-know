-- Phase 1: Backfill encryption and remove plaintext token exposure; tighten RLS policies
-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Backfill encrypted columns from plaintext if needed
DO $$
DECLARE
  encryption_key text := current_setting('app.google_token_encryption_key', true);
BEGIN
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Google token encryption key not configured';
  END IF;

  UPDATE public.user_google_tokens
  SET 
    encrypted_access_token = CASE 
      WHEN access_token IS NOT NULL THEN pgp_sym_encrypt(access_token, encryption_key)
      ELSE encrypted_access_token 
    END,
    encrypted_refresh_token = CASE 
      WHEN refresh_token IS NOT NULL THEN pgp_sym_encrypt(refresh_token, encryption_key)
      ELSE encrypted_refresh_token 
    END
  WHERE (encrypted_access_token IS NULL AND access_token IS NOT NULL)
     OR (encrypted_refresh_token IS NULL AND refresh_token IS NOT NULL);
END
$$;

-- Drop plaintext columns if they still exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_google_tokens' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE public.user_google_tokens DROP COLUMN access_token;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_google_tokens' AND column_name = 'refresh_token'
  ) THEN
    ALTER TABLE public.user_google_tokens DROP COLUMN refresh_token;
  END IF;
END
$$;

-- Replace broad ALL policy with explicit, least-privilege policies
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.user_google_tokens;

CREATE POLICY "Users can view own tokens metadata"
ON public.user_google_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
ON public.user_google_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
ON public.user_google_tokens
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
ON public.user_google_tokens
FOR DELETE
USING (auth.uid() = user_id);
