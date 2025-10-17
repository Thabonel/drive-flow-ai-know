-- Add microsoft_file_id column to knowledge_documents table
ALTER TABLE public.knowledge_documents
ADD COLUMN IF NOT EXISTS microsoft_file_id TEXT;

-- Create unique constraint for user_id + microsoft_file_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_user_microsoft_file
  ON public.knowledge_documents(user_id, microsoft_file_id)
  WHERE microsoft_file_id IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_microsoft_file_id
  ON public.knowledge_documents(microsoft_file_id)
  WHERE microsoft_file_id IS NOT NULL;
