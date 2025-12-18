-- Create user_dropbox_tokens table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS public.user_dropbox_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_dropbox_tokens_user_id_key UNIQUE (user_id)
);

-- Create dropbox_folders table for storing connected folders
CREATE TABLE IF NOT EXISTS public.dropbox_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  folder_path TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  files_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT dropbox_folders_user_folder_key UNIQUE (user_id, folder_id)
);

-- Enable RLS on both tables
ALTER TABLE public.user_dropbox_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropbox_folders ENABLE ROW LEVEL SECURITY;

-- Policies for user_dropbox_tokens
DROP POLICY IF EXISTS "Users can view own dropbox tokens" ON public.user_dropbox_tokens;
CREATE POLICY "Users can view own dropbox tokens" ON public.user_dropbox_tokens
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access dropbox tokens" ON public.user_dropbox_tokens;
CREATE POLICY "Service role full access dropbox tokens" ON public.user_dropbox_tokens
FOR ALL USING (auth.role() = 'service_role');

-- Policies for dropbox_folders
DROP POLICY IF EXISTS "Users can view own dropbox folders" ON public.dropbox_folders;
CREATE POLICY "Users can view own dropbox folders" ON public.dropbox_folders
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dropbox folders" ON public.dropbox_folders;
CREATE POLICY "Users can insert own dropbox folders" ON public.dropbox_folders
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dropbox folders" ON public.dropbox_folders;
CREATE POLICY "Users can update own dropbox folders" ON public.dropbox_folders
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dropbox folders" ON public.dropbox_folders;
CREATE POLICY "Users can delete own dropbox folders" ON public.dropbox_folders
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access dropbox folders" ON public.dropbox_folders;
CREATE POLICY "Service role full access dropbox folders" ON public.dropbox_folders
FOR ALL USING (auth.role() = 'service_role');

-- Grant access to authenticated users
GRANT SELECT ON public.user_dropbox_tokens TO authenticated;
GRANT ALL ON public.dropbox_folders TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dropbox_folders_user_id ON public.dropbox_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dropbox_tokens_user_id ON public.user_dropbox_tokens(user_id);
