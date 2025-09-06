-- Remove plaintext Google token columns from user_google_tokens table
-- First, check if columns exist and drop them
ALTER TABLE public.user_google_tokens DROP COLUMN IF EXISTS access_token;
ALTER TABLE public.user_google_tokens DROP COLUMN IF EXISTS refresh_token;

-- Update RLS policies to be more restrictive
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.user_google_tokens;

-- Create explicit policies for each operation
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