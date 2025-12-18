-- Fix RLS policies for user_google_tokens to allow INSERT/UPDATE
-- Users need to be able to store their own tokens after OAuth

-- Drop existing policies
DROP POLICY IF EXISTS "Service role full access" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can view own tokens" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_google_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON public.user_google_tokens;

-- Enable RLS
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access" ON public.user_google_tokens
FOR ALL USING (auth.role() = 'service_role');

-- Users can SELECT their own tokens
CREATE POLICY "Users can view own tokens" ON public.user_google_tokens
FOR SELECT USING (auth.uid() = user_id);

-- Users can INSERT their own tokens (required for upsert)
CREATE POLICY "Users can insert own tokens" ON public.user_google_tokens
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own tokens (required for upsert on conflict)
CREATE POLICY "Users can update own tokens" ON public.user_google_tokens
FOR UPDATE USING (auth.uid() = user_id);

-- Users can DELETE their own tokens (for disconnecting)
CREATE POLICY "Users can delete own tokens" ON public.user_google_tokens
FOR DELETE USING (auth.uid() = user_id);
