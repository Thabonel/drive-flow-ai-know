-- Migration: Add original file storage to knowledge_documents
-- Allows storing original PDFs while keeping extracted text for AI

-- Add storage fields for original files
ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS original_file_size BIGINT;

-- Add index for storage_path lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_storage_path
  ON knowledge_documents(storage_path);

-- Add comment explaining the dual storage approach
COMMENT ON COLUMN knowledge_documents.content IS 'Extracted text content with [IMAGE: ...] descriptions for AI understanding';
COMMENT ON COLUMN knowledge_documents.file_url IS 'Public URL to original file (e.g., PDF with actual images) for user viewing';
COMMENT ON COLUMN knowledge_documents.storage_path IS 'Internal Supabase Storage path for file management and deletion';
COMMENT ON COLUMN knowledge_documents.original_file_size IS 'Size of original uploaded file in bytes (may differ from extracted content length)';
