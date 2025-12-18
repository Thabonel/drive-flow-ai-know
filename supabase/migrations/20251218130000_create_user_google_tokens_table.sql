-- Create user_google_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_google_tokens_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tokens
DROP POLICY IF EXISTS "Users can view own tokens" ON public.user_google_tokens;
CREATE POLICY "Users can view own tokens" ON public.user_google_tokens
FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role has full access (for edge functions)
DROP POLICY IF EXISTS "Service role full access" ON public.user_google_tokens;
CREATE POLICY "Service role full access" ON public.user_google_tokens
FOR ALL USING (auth.role() = 'service_role');

-- Grant access to authenticated users for reading
GRANT SELECT ON public.user_google_tokens TO authenticated;
