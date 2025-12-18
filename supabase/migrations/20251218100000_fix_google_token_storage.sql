-- Fix Google token storage to work without encryption key requirement
-- This allows Google Drive integration to work immediately

-- Add plaintext columns back if they don't exist (for simpler storage)
ALTER TABLE public.user_google_tokens
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Create a unique constraint on user_id if it doesn't exist
ALTER TABLE public.user_google_tokens
DROP CONSTRAINT IF EXISTS user_google_tokens_user_id_key;

ALTER TABLE public.user_google_tokens
ADD CONSTRAINT user_google_tokens_user_id_key UNIQUE (user_id);

-- Create a simple token storage function that doesn't require encryption
CREATE OR REPLACE FUNCTION public.store_google_tokens_simple(
  p_access_token text,
  p_refresh_token text DEFAULT NULL,
  p_token_type text DEFAULT 'Bearer',
  p_expires_in integer DEFAULT 3600,
  p_scope text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to store tokens';
  END IF;

  -- Insert or update tokens
  INSERT INTO public.user_google_tokens (
    user_id,
    access_token,
    refresh_token,
    token_type,
    expires_at,
    scope,
    created_at,
    updated_at
  ) VALUES (
    current_user_id,
    p_access_token,
    p_refresh_token,
    p_token_type,
    NOW() + (p_expires_in || ' seconds')::interval,
    p_scope,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token = p_access_token,
    refresh_token = COALESCE(p_refresh_token, user_google_tokens.refresh_token),
    token_type = p_token_type,
    expires_at = NOW() + (p_expires_in || ' seconds')::interval,
    scope = p_scope,
    updated_at = NOW();

  RAISE LOG 'Google tokens stored for user %', current_user_id;
END;
$$;

-- Update RLS policies to allow service role full access
DROP POLICY IF EXISTS "Service role full access" ON public.user_google_tokens;
CREATE POLICY "Service role full access" ON public.user_google_tokens
FOR ALL USING (auth.role() = 'service_role');

-- Ensure users can still read their own tokens
DROP POLICY IF EXISTS "Users can view own tokens" ON public.user_google_tokens;
CREATE POLICY "Users can view own tokens" ON public.user_google_tokens
FOR SELECT USING (auth.uid() = user_id);

-- Grant execute on the simple function
GRANT EXECUTE ON FUNCTION public.store_google_tokens_simple TO authenticated;
