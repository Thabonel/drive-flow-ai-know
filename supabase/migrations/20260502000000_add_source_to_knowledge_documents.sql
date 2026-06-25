ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN knowledge_documents.source IS 'Origin of the document: ai_chat, google_drive, upload, microsoft, etc.';
