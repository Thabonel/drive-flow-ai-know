-- ========================================================================
-- COMPLETE PREMIUM FEATURES MIGRATION
-- Run this ONE file to install both Assistant Access and Document Attachments
-- ========================================================================

-- This script:
-- 1. Cleans up any partial migrations
-- 2. Creates assistant system (FIRST - required dependency)
-- 3. Creates document attachments (SECOND - depends on assistant system)
-- 4. Verifies everything was created successfully

-- ========================================================================
-- PHASE 1: CLEANUP
-- ========================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Starting cleanup ===';

    -- Drop document tables first (they depend on assistant tables)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_templates') THEN
        RAISE NOTICE 'Dropping document_templates...';
        DROP TABLE document_templates CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'timeline_item_documents') THEN
        RAISE NOTICE 'Dropping timeline_item_documents...';
        DROP TABLE timeline_item_documents CASCADE;
    END IF;

    -- Drop assistant tables
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assistant_suggestions') THEN
        RAISE NOTICE 'Dropping assistant_suggestions...';
        DROP TABLE assistant_suggestions CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assistant_activity_log') THEN
        RAISE NOTICE 'Dropping assistant_activity_log...';
        DROP TABLE assistant_activity_log CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assistant_relationships') THEN
        RAISE NOTICE 'Dropping assistant_relationships...';
        DROP TABLE assistant_relationships CASCADE;
    END IF;

    RAISE NOTICE '=== Cleanup complete ===';
END $$;

-- Drop all related functions
DROP FUNCTION IF EXISTS generate_invitation_token() CASCADE;
DROP FUNCTION IF EXISTS has_assistant_permission(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_assistant_activity(UUID, TEXT, TEXT, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS accept_assistant_invitation(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_executive_assistants(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_assistant_relationships_updated_at() CASCADE;
DROP FUNCTION IF EXISTS get_timeline_item_document_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_timeline_item_documents(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_briefing_from_template(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_timeline_item_documents_updated_at() CASCADE;

-- ========================================================================
-- PHASE 2: ASSISTANT ACCESS SYSTEM
-- ========================================================================

-- Create assistant_relationships table
CREATE TABLE assistant_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
  permissions JSONB NOT NULL DEFAULT '{
    "view_calendar": true,
    "edit_calendar": false,
    "suggest_changes": true,
    "attach_documents": true,
    "apply_templates": false,
    "bulk_schedule": false,
    "view_documents": true
  }'::JSONB,
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_executive_assistant UNIQUE (executive_id, assistant_email),
  CONSTRAINT valid_invitation_token CHECK (invitation_token IS NULL OR LENGTH(invitation_token) >= 32),
  CONSTRAINT accepted_requires_assistant CHECK (
    (status = 'pending' AND assistant_id IS NULL) OR
    (status != 'pending' AND assistant_id IS NOT NULL)
  )
);

-- Create assistant_activity_log table
CREATE TABLE assistant_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES assistant_relationships(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'viewed_timeline', 'created_item', 'updated_item', 'deleted_item',
    'applied_template', 'bulk_scheduled', 'attached_document', 'added_note',
    'suggested_change', 'generated_brief'
  )),
  target_type TEXT CHECK (target_type IN ('timeline_item', 'document', 'template', 'note', 'bulk_action')),
  target_id UUID,
  changes JSONB,
  old_values JSONB,
  new_values JSONB,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create assistant_suggestions table
CREATE TABLE assistant_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES assistant_relationships(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'create_item', 'update_item', 'delete_item', 'reschedule_item',
    'apply_template', 'bulk_schedule'
  )),
  proposed_data JSONB NOT NULL,
  target_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assistant indexes
CREATE INDEX idx_assistant_relationships_executive ON assistant_relationships(executive_id) WHERE status = 'active';
CREATE INDEX idx_assistant_relationships_assistant ON assistant_relationships(assistant_id) WHERE status = 'active';
CREATE INDEX idx_assistant_relationships_status ON assistant_relationships(status);
CREATE INDEX idx_assistant_relationships_token ON assistant_relationships(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX idx_assistant_activity_relationship ON assistant_activity_log(relationship_id);
CREATE INDEX idx_assistant_activity_assistant ON assistant_activity_log(assistant_id);
CREATE INDEX idx_assistant_activity_executive ON assistant_activity_log(executive_id);
CREATE INDEX idx_assistant_activity_created ON assistant_activity_log(created_at DESC);
CREATE INDEX idx_assistant_suggestions_relationship ON assistant_suggestions(relationship_id);
CREATE INDEX idx_assistant_suggestions_executive ON assistant_suggestions(executive_id) WHERE status = 'pending';
CREATE INDEX idx_assistant_suggestions_status ON assistant_suggestions(status);

-- Enable RLS on assistant tables
ALTER TABLE assistant_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assistant_relationships
CREATE POLICY "Executives can view their relationships" ON assistant_relationships FOR SELECT USING (auth.uid() = executive_id);
CREATE POLICY "Assistants can view their relationships" ON assistant_relationships FOR SELECT USING (auth.uid() = assistant_id);
CREATE POLICY "Executives can invite assistants" ON assistant_relationships FOR INSERT WITH CHECK (auth.uid() = executive_id);
CREATE POLICY "Executives can update their relationships" ON assistant_relationships FOR UPDATE USING (auth.uid() = executive_id);
CREATE POLICY "Assistants can accept invitations" ON assistant_relationships FOR UPDATE USING (auth.uid() = assistant_id OR (status = 'pending' AND assistant_id IS NULL));

-- RLS Policies for assistant_activity_log
CREATE POLICY "Executives can view assistant activity" ON assistant_activity_log FOR SELECT USING (auth.uid() = executive_id);
CREATE POLICY "Assistants can view their own activity" ON assistant_activity_log FOR SELECT USING (auth.uid() = assistant_id);
CREATE POLICY "Assistants can log actions" ON assistant_activity_log FOR INSERT WITH CHECK (auth.uid() = assistant_id);

-- RLS Policies for assistant_suggestions
CREATE POLICY "Executives can view suggestions" ON assistant_suggestions FOR SELECT USING (auth.uid() = executive_id);
CREATE POLICY "Assistants can view their suggestions" ON assistant_suggestions FOR SELECT USING (auth.uid() = assistant_id);
CREATE POLICY "Assistants can create suggestions" ON assistant_suggestions FOR INSERT WITH CHECK (auth.uid() = assistant_id);
CREATE POLICY "Executives can review suggestions" ON assistant_suggestions FOR UPDATE USING (auth.uid() = executive_id);

-- Assistant functions
CREATE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION has_assistant_permission(p_assistant_id UUID, p_executive_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_permissions JSONB;
BEGIN
  SELECT permissions INTO v_permissions
  FROM assistant_relationships
  WHERE executive_id = p_executive_id AND assistant_id = p_assistant_id AND status = 'active';

  IF NOT FOUND THEN RETURN FALSE; END IF;
  RETURN COALESCE((v_permissions->>p_permission)::BOOLEAN, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION log_assistant_activity(
  p_relationship_id UUID, p_action_type TEXT, p_description TEXT,
  p_target_type TEXT DEFAULT NULL, p_target_id UUID DEFAULT NULL, p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_assistant_id UUID;
  v_executive_id UUID;
BEGIN
  SELECT assistant_id, executive_id INTO v_assistant_id, v_executive_id
  FROM assistant_relationships WHERE id = p_relationship_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid relationship ID'; END IF;

  INSERT INTO assistant_activity_log (
    relationship_id, assistant_id, executive_id, action_type,
    target_type, target_id, changes, description
  ) VALUES (
    p_relationship_id, v_assistant_id, v_executive_id, p_action_type,
    p_target_type, p_target_id, p_changes, p_description
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION accept_assistant_invitation(p_invitation_token TEXT)
RETURNS UUID AS $$
DECLARE
  v_relationship_id UUID;
  v_assistant_email TEXT;
  v_user_email TEXT;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  SELECT id, assistant_email INTO v_relationship_id, v_assistant_email
  FROM assistant_relationships
  WHERE invitation_token = p_invitation_token
    AND status = 'pending' AND invitation_expires_at > NOW();

  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
  IF LOWER(v_assistant_email) != LOWER(v_user_email) THEN
    RAISE EXCEPTION 'This invitation is for a different email address';
  END IF;

  UPDATE assistant_relationships
  SET assistant_id = auth.uid(), status = 'active', accepted_at = NOW(), updated_at = NOW()
  WHERE id = v_relationship_id;

  RETURN v_relationship_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION get_executive_assistants(p_executive_id UUID)
RETURNS TABLE (
  relationship_id UUID, assistant_id UUID, assistant_email TEXT,
  permissions JSONB, accepted_at TIMESTAMPTZ, last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT ar.id, ar.assistant_id, ar.assistant_email, ar.permissions,
         ar.accepted_at, MAX(aal.created_at) as last_activity
  FROM assistant_relationships ar
  LEFT JOIN assistant_activity_log aal ON aal.relationship_id = ar.id
  WHERE ar.executive_id = p_executive_id AND ar.status = 'active'
  GROUP BY ar.id, ar.assistant_id, ar.assistant_email, ar.permissions, ar.accepted_at
  ORDER BY ar.accepted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION update_assistant_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assistant_relationships_updated_at BEFORE UPDATE ON assistant_relationships
  FOR EACH ROW EXECUTE FUNCTION update_assistant_relationships_updated_at();

CREATE TRIGGER assistant_suggestions_updated_at BEFORE UPDATE ON assistant_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_assistant_relationships_updated_at();

-- ========================================================================
-- PHASE 3: DOCUMENT ATTACHMENTS SYSTEM
-- ========================================================================

-- Create timeline_item_documents table
CREATE TABLE timeline_item_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  mime_type TEXT NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )),
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'timeline-documents',
  description TEXT,
  is_briefing_package BOOLEAN DEFAULT FALSE,
  uploaded_via_assistant BOOLEAN DEFAULT FALSE,
  assistant_relationship_id UUID REFERENCES assistant_relationships(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_file_name CHECK (LENGTH(file_name) > 0 AND LENGTH(file_name) <= 255),
  CONSTRAINT valid_storage_path CHECK (LENGTH(storage_path) > 0)
);

-- Create document_templates table
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('meeting', 'agenda', 'briefing', 'report', 'other')),
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_template_name UNIQUE (user_id, template_name)
);

-- Document indexes
CREATE INDEX idx_timeline_item_documents_timeline_item ON timeline_item_documents(timeline_item_id);
CREATE INDEX idx_timeline_item_documents_uploaded_by ON timeline_item_documents(uploaded_by_user_id);
CREATE INDEX idx_timeline_item_documents_assistant ON timeline_item_documents(assistant_relationship_id) WHERE assistant_relationship_id IS NOT NULL;
CREATE INDEX idx_timeline_item_documents_briefing ON timeline_item_documents(is_briefing_package) WHERE is_briefing_package = TRUE;
CREATE INDEX idx_timeline_item_documents_created ON timeline_item_documents(created_at DESC);
CREATE INDEX idx_document_templates_user ON document_templates(user_id);
CREATE INDEX idx_document_templates_category ON document_templates(category);
CREATE INDEX idx_document_templates_public ON document_templates(is_public) WHERE is_public = TRUE;

-- Enable RLS on document tables
ALTER TABLE timeline_item_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timeline_item_documents
CREATE POLICY "Users can view their timeline item documents" ON timeline_item_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM timeline_items WHERE timeline_items.id = timeline_item_documents.timeline_item_id AND timeline_items.user_id = auth.uid()));

CREATE POLICY "Assistants can view executive timeline item documents" ON timeline_item_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM timeline_items ti
    JOIN assistant_relationships ar ON ar.executive_id = ti.user_id
    WHERE ti.id = timeline_item_documents.timeline_item_id
      AND ar.assistant_id = auth.uid() AND ar.status = 'active'
      AND (ar.permissions->>'view_documents')::BOOLEAN = TRUE
  ));

CREATE POLICY "Users can upload documents to their timeline items" ON timeline_item_documents FOR INSERT
  WITH CHECK (uploaded_by_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM timeline_items WHERE timeline_items.id = timeline_item_documents.timeline_item_id AND timeline_items.user_id = auth.uid()
  ));

CREATE POLICY "Assistants can upload documents for executives" ON timeline_item_documents FOR INSERT
  WITH CHECK (uploaded_by_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM timeline_items ti
    JOIN assistant_relationships ar ON ar.executive_id = ti.user_id
    WHERE ti.id = timeline_item_documents.timeline_item_id
      AND ar.assistant_id = auth.uid() AND ar.status = 'active'
      AND (ar.permissions->>'attach_documents')::BOOLEAN = TRUE
  ));

CREATE POLICY "Users can delete their own documents" ON timeline_item_documents FOR DELETE USING (uploaded_by_user_id = auth.uid());
CREATE POLICY "Users can delete documents from their timeline items" ON timeline_item_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM timeline_items WHERE timeline_items.id = timeline_item_documents.timeline_item_id AND timeline_items.user_id = auth.uid()));

-- RLS Policies for document_templates
CREATE POLICY "Users can view their own templates" ON document_templates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view public templates" ON document_templates FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can create templates" ON document_templates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own templates" ON document_templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own templates" ON document_templates FOR DELETE USING (user_id = auth.uid());

-- Document functions
CREATE FUNCTION get_timeline_item_document_count(p_timeline_item_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM timeline_item_documents WHERE timeline_item_id = p_timeline_item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION get_timeline_item_documents(p_timeline_item_id UUID)
RETURNS TABLE (
  id UUID, file_name TEXT, file_url TEXT, file_size BIGINT, mime_type TEXT,
  description TEXT, is_briefing_package BOOLEAN, uploaded_by_user_id UUID,
  uploaded_via_assistant BOOLEAN, uploaded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT tid.id, tid.file_name, tid.file_url, tid.file_size, tid.mime_type,
         tid.description, tid.is_briefing_package, tid.uploaded_by_user_id,
         tid.uploaded_via_assistant, tid.uploaded_at
  FROM timeline_item_documents tid
  WHERE tid.timeline_item_id = p_timeline_item_id
  ORDER BY tid.is_briefing_package DESC, tid.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION create_briefing_from_template(p_timeline_item_id UUID, p_template_id UUID)
RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_document_id UUID;
BEGIN
  SELECT * INTO v_template FROM document_templates WHERE id = p_template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template not found'; END IF;

  INSERT INTO timeline_item_documents (
    timeline_item_id, uploaded_by_user_id, file_name, file_url, file_size,
    mime_type, storage_path, description, is_briefing_package
  ) VALUES (
    p_timeline_item_id, auth.uid(), v_template.file_name, v_template.file_url, 0,
    v_template.mime_type, 'briefings/' || p_timeline_item_id || '/' || v_template.file_name,
    'Created from template: ' || v_template.template_name, TRUE
  ) RETURNING id INTO v_document_id;

  UPDATE document_templates SET usage_count = usage_count + 1 WHERE id = p_template_id;
  RETURN v_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION update_timeline_item_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timeline_item_documents_updated_at BEFORE UPDATE ON timeline_item_documents
  FOR EACH ROW EXECUTE FUNCTION update_timeline_item_documents_updated_at();

CREATE TRIGGER document_templates_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_timeline_item_documents_updated_at();

-- ========================================================================
-- VERIFICATION
-- ========================================================================

SELECT '✅ Migration completed successfully!' AS status;

SELECT 'Created ' || COUNT(*) || ' tables (expected: 5)' AS result
FROM information_schema.tables
WHERE table_name IN (
  'assistant_relationships', 'assistant_activity_log', 'assistant_suggestions',
  'timeline_item_documents', 'document_templates'
);

SELECT 'Created ' || COUNT(*) || ' functions (expected: 9)' AS result
FROM information_schema.routines
WHERE routine_name IN (
  'generate_invitation_token', 'has_assistant_permission', 'log_assistant_activity',
  'accept_assistant_invitation', 'get_executive_assistants',
  'update_assistant_relationships_updated_at', 'get_timeline_item_document_count',
  'get_timeline_item_documents', 'create_briefing_from_template',
  'update_timeline_item_documents_updated_at'
);
