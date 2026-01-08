-- Migration: Add Memory Indexes and Document Versions
-- Purpose: Enable cross-session AI memory and document update versioning
-- Date: 2026-01-08

-- ============================================
-- PART 1: Memory System Indexes
-- ============================================

-- Add text search index for keyword-based memory retrieval
-- This enables efficient full-text search on memory content
CREATE INDEX IF NOT EXISTS idx_agentic_memories_content_tsvector
ON public.agentic_memories USING gin(to_tsvector('english', content));

-- Add composite index for user + recency queries
-- This optimizes the common pattern: get recent memories for a user
CREATE INDEX IF NOT EXISTS idx_agentic_memories_user_created
ON public.agentic_memories (user_id, created_at DESC);

-- Add index for memory_type filtering
CREATE INDEX IF NOT EXISTS idx_agentic_memories_user_type
ON public.agentic_memories (user_id, memory_type);

-- ============================================
-- PART 2: Document Version History
-- ============================================

-- Create document_versions table for tracking all changes
CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content text NOT NULL,
  title text,
  changed_by_type text NOT NULL CHECK (changed_by_type IN ('user', 'ai', 'system')),
  changed_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_summary text,
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure unique version numbers per document
  UNIQUE(document_id, version_number)
);

-- Add current_version tracking to knowledge_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'knowledge_documents'
    AND column_name = 'current_version'
  ) THEN
    ALTER TABLE public.knowledge_documents
    ADD COLUMN current_version integer DEFAULT 1;
  END IF;
END $$;

-- Create index for fast version lookups
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_id
ON public.document_versions(document_id, version_number DESC);

-- ============================================
-- PART 3: Row Level Security for document_versions
-- ============================================

-- Enable RLS on document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view versions of their own documents
CREATE POLICY "Users can view versions of their documents"
ON public.document_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.knowledge_documents kd
    WHERE kd.id = document_versions.document_id
    AND kd.user_id = auth.uid()
  )
);

-- Policy: Users can insert versions for their own documents
CREATE POLICY "Users can insert versions for their documents"
ON public.document_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.knowledge_documents kd
    WHERE kd.id = document_versions.document_id
    AND kd.user_id = auth.uid()
  )
);

-- ============================================
-- PART 4: Comments for documentation
-- ============================================

COMMENT ON TABLE public.document_versions IS
  'Stores version history for document edits. Each change (user or AI) creates a new version.';

COMMENT ON COLUMN public.document_versions.changed_by_type IS
  'Type of change: user (manual edit), ai (AI-suggested update), system (automatic)';

COMMENT ON COLUMN public.document_versions.change_summary IS
  'Human-readable description of what changed in this version';

COMMENT ON INDEX idx_agentic_memories_content_tsvector IS
  'Full-text search index for semantic memory retrieval fallback';

-- ============================================
-- Migration complete
-- ============================================
