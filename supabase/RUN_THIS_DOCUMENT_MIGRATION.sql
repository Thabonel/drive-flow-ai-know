-- COMBINED: Cleanup + Document Attachments Migration
-- Run this ONE file to fix and apply the migration

-- ============================================
-- STEP 1: CLEANUP (Drop existing objects)
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Starting cleanup...';

    -- Drop document_templates if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_templates') THEN
        RAISE NOTICE 'Dropping existing document_templates table...';
        DROP TABLE document_templates CASCADE;
    END IF;

    -- Drop timeline_item_documents if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'timeline_item_documents') THEN
        RAISE NOTICE 'Dropping existing timeline_item_documents table...';
        DROP TABLE timeline_item_documents CASCADE;
    END IF;

    RAISE NOTICE 'Cleanup complete!';
END $$;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS get_timeline_item_document_count(UUID);
DROP FUNCTION IF EXISTS get_timeline_item_documents(UUID);
DROP FUNCTION IF EXISTS create_briefing_from_template(UUID, UUID);
DROP FUNCTION IF EXISTS update_timeline_item_documents_updated_at();

-- ============================================
-- STEP 2: CREATE TABLES
-- ============================================

-- Timeline item documents table
CREATE TABLE timeline_item_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File details
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- Max 10MB
  mime_type TEXT NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- DOCX
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- XLSX
    'application/vnd.openxmlformats-officedocument.presentationml.presentation' -- PPTX
  )),

  -- Storage details
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'timeline-documents',

  -- Metadata
  description TEXT,
  is_briefing_package BOOLEAN DEFAULT FALSE,
  uploaded_via_assistant BOOLEAN DEFAULT FALSE,
  assistant_relationship_id UUID REFERENCES assistant_relationships(id) ON DELETE SET NULL,

  -- Timestamps
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_file_name CHECK (LENGTH(file_name) > 0 AND LENGTH(file_name) <= 255),
  CONSTRAINT valid_storage_path CHECK (LENGTH(storage_path) > 0)
);

-- Document templates library
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template details
  template_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,

  -- Template metadata
  description TEXT,
  category TEXT CHECK (category IN ('meeting', 'agenda', 'briefing', 'report', 'other')),
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_template_name UNIQUE (user_id, template_name)
);

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================

CREATE INDEX idx_timeline_item_documents_timeline_item ON timeline_item_documents(timeline_item_id);
CREATE INDEX idx_timeline_item_documents_uploaded_by ON timeline_item_documents(uploaded_by_user_id);
CREATE INDEX idx_timeline_item_documents_assistant ON timeline_item_documents(assistant_relationship_id) WHERE assistant_relationship_id IS NOT NULL;
CREATE INDEX idx_timeline_item_documents_briefing ON timeline_item_documents(is_briefing_package) WHERE is_briefing_package = TRUE;
CREATE INDEX idx_timeline_item_documents_created ON timeline_item_documents(created_at DESC);

CREATE INDEX idx_document_templates_user ON document_templates(user_id);
CREATE INDEX idx_document_templates_category ON document_templates(category);
CREATE INDEX idx_document_templates_public ON document_templates(is_public) WHERE is_public = TRUE;

-- ============================================
-- STEP 4: ENABLE RLS
-- ============================================

ALTER TABLE timeline_item_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================

-- Users can view documents for their own timeline items
CREATE POLICY "Users can view their timeline item documents"
  ON timeline_item_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timeline_items
      WHERE timeline_items.id = timeline_item_documents.timeline_item_id
        AND timeline_items.user_id = auth.uid()
    )
  );

-- Assistants can view documents for executives they assist
CREATE POLICY "Assistants can view executive timeline item documents"
  ON timeline_item_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timeline_items ti
      JOIN assistant_relationships ar ON ar.executive_id = ti.user_id
      WHERE ti.id = timeline_item_documents.timeline_item_id
        AND ar.assistant_id = auth.uid()
        AND ar.status = 'active'
        AND (ar.permissions->>'view_documents')::BOOLEAN = TRUE
    )
  );

-- Users can upload documents to their own timeline items
CREATE POLICY "Users can upload documents to their timeline items"
  ON timeline_item_documents FOR INSERT
  WITH CHECK (
    uploaded_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM timeline_items
      WHERE timeline_items.id = timeline_item_documents.timeline_item_id
        AND timeline_items.user_id = auth.uid()
    )
  );

-- Assistants can upload documents for executives
CREATE POLICY "Assistants can upload documents for executives"
  ON timeline_item_documents FOR INSERT
  WITH CHECK (
    uploaded_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM timeline_items ti
      JOIN assistant_relationships ar ON ar.executive_id = ti.user_id
      WHERE ti.id = timeline_item_documents.timeline_item_id
        AND ar.assistant_id = auth.uid()
        AND ar.status = 'active'
        AND (ar.permissions->>'attach_documents')::BOOLEAN = TRUE
    )
  );

-- Users can delete their own uploaded documents
CREATE POLICY "Users can delete their own documents"
  ON timeline_item_documents FOR DELETE
  USING (uploaded_by_user_id = auth.uid());

-- Users can delete documents from their timeline items
CREATE POLICY "Users can delete documents from their timeline items"
  ON timeline_item_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM timeline_items
      WHERE timeline_items.id = timeline_item_documents.timeline_item_id
        AND timeline_items.user_id = auth.uid()
    )
  );

-- Users can view their own templates
CREATE POLICY "Users can view their own templates"
  ON document_templates FOR SELECT
  USING (user_id = auth.uid());

-- Users can view public templates
CREATE POLICY "Users can view public templates"
  ON document_templates FOR SELECT
  USING (is_public = TRUE);

-- Users can create templates
CREATE POLICY "Users can create templates"
  ON document_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
  ON document_templates FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
  ON document_templates FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- STEP 6: CREATE FUNCTIONS
-- ============================================

-- Get document count for timeline item
CREATE FUNCTION get_timeline_item_document_count(p_timeline_item_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM timeline_item_documents
    WHERE timeline_item_id = p_timeline_item_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get documents for timeline item
CREATE FUNCTION get_timeline_item_documents(p_timeline_item_id UUID)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  is_briefing_package BOOLEAN,
  uploaded_by_user_id UUID,
  uploaded_via_assistant BOOLEAN,
  uploaded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tid.id,
    tid.file_name,
    tid.file_url,
    tid.file_size,
    tid.mime_type,
    tid.description,
    tid.is_briefing_package,
    tid.uploaded_by_user_id,
    tid.uploaded_via_assistant,
    tid.uploaded_at
  FROM timeline_item_documents tid
  WHERE tid.timeline_item_id = p_timeline_item_id
  ORDER BY tid.is_briefing_package DESC, tid.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create briefing package from template
CREATE FUNCTION create_briefing_from_template(
  p_timeline_item_id UUID,
  p_template_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_timeline_item RECORD;
  v_document_id UUID;
  v_new_storage_path TEXT;
BEGIN
  -- Get template details
  SELECT * INTO v_template
  FROM document_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Get timeline item details
  SELECT * INTO v_timeline_item
  FROM timeline_items
  WHERE id = p_timeline_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timeline item not found';
  END IF;

  -- Generate new storage path
  v_new_storage_path := 'briefings/' || p_timeline_item_id || '/' || v_template.file_name;

  -- Create document record
  INSERT INTO timeline_item_documents (
    timeline_item_id,
    uploaded_by_user_id,
    file_name,
    file_url,
    file_size,
    mime_type,
    storage_path,
    description,
    is_briefing_package
  ) VALUES (
    p_timeline_item_id,
    auth.uid(),
    v_template.file_name,
    v_template.file_url,
    0,
    v_template.mime_type,
    v_new_storage_path,
    'Created from template: ' || v_template.template_name,
    TRUE
  )
  RETURNING id INTO v_document_id;

  -- Update template usage count
  UPDATE document_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;

  RETURN v_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at timestamp
CREATE FUNCTION update_timeline_item_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 7: CREATE TRIGGERS
-- ============================================

CREATE TRIGGER timeline_item_documents_updated_at
  BEFORE UPDATE ON timeline_item_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_item_documents_updated_at();

CREATE TRIGGER document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_item_documents_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Migration completed successfully!' AS status;

SELECT 'Created ' || COUNT(*) || ' tables' AS tables_created
FROM information_schema.tables
WHERE table_name IN ('timeline_item_documents', 'document_templates');

SELECT 'Created ' || COUNT(*) || ' functions' AS functions_created
FROM information_schema.routines
WHERE routine_name IN (
  'get_timeline_item_document_count',
  'get_timeline_item_documents',
  'create_briefing_from_template',
  'update_timeline_item_documents_updated_at'
);
