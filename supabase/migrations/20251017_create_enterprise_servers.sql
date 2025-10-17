-- Enterprise Servers Table for S3, Azure, and other cloud storage
CREATE TABLE IF NOT EXISTS public.enterprise_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('s3', 'azure_blob', 'azure_files', 'sftp', 'ftp', 'smb_cifs', 'webdav', 'nfs')),

  -- S3 Configuration
  bucket_name TEXT,
  region TEXT,
  endpoint TEXT, -- For custom S3 endpoints (MinIO, DigitalOcean Spaces, etc.)

  -- Azure Configuration
  storage_account_name TEXT,
  container_name TEXT,

  -- General Configuration
  host TEXT,
  port INTEGER,
  base_path TEXT,

  -- Authentication (stored as JSON)
  authentication JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.enterprise_servers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own enterprise servers"
  ON public.enterprise_servers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enterprise servers"
  ON public.enterprise_servers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enterprise servers"
  ON public.enterprise_servers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own enterprise servers"
  ON public.enterprise_servers FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enterprise_servers_user_id
  ON public.enterprise_servers(user_id);

CREATE INDEX IF NOT EXISTS idx_enterprise_servers_protocol
  ON public.enterprise_servers(protocol);

CREATE INDEX IF NOT EXISTS idx_enterprise_servers_active
  ON public.enterprise_servers(user_id, is_active);

-- Trigger for updated_at
CREATE TRIGGER update_enterprise_servers_updated_at
  BEFORE UPDATE ON public.enterprise_servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
