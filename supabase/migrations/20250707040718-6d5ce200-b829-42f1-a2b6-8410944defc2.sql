-- Add is_pinned column to knowledge_documents table
ALTER TABLE knowledge_documents 
ADD COLUMN is_pinned BOOLEAN DEFAULT false;