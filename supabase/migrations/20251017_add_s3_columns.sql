-- Add S3-specific columns to knowledge_documents table
ALTER TABLE public.knowledge_documents
ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES public.enterprise_servers(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS s3_key TEXT,
ADD COLUMN IF NOT EXISTS s3_etag TEXT,
ADD COLUMN IF NOT EXISTS s3_last_modified TIMESTAMP WITH TIME ZONE;

-- Create unique constraint for user_id + s3_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_user_s3_key
  ON public.knowledge_documents(user_id, s3_key)
  WHERE s3_key IS NOT NULL;

-- Add index for faster S3 key lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_s3_key
  ON public.knowledge_documents(s3_key)
  WHERE s3_key IS NOT NULL;

-- Add index for server_id
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_server_id
  ON public.knowledge_documents(server_id)
  WHERE server_id IS NOT NULL;

-- Update sync_jobs table to support server_id
ALTER TABLE public.sync_jobs
ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES public.enterprise_servers(id) ON DELETE CASCADE;

-- Add index for server sync jobs
CREATE INDEX IF NOT EXISTS idx_sync_jobs_server_id
  ON public.sync_jobs(server_id, created_at DESC)
  WHERE server_id IS NOT NULL;
