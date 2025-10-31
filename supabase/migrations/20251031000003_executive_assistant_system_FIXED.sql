-- Executive-Assistant System and Document Management (FIXED VERSION)
-- Adds role-based access control, delegated permissions, document management, and audit trails
-- This version safely handles existing types

-- ============================================================================
-- PART 1: ENUMS AND TYPES (WITH EXISTENCE CHECKS)
-- ============================================================================

-- Create types only if they don't exist
DO $$
BEGIN
    -- User role types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE user_role_type AS ENUM ('executive', 'assistant', 'standard');
    END IF;

    -- Subscription tiers
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'executive');
    END IF;

    -- Assistant relationship status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_status') THEN
        CREATE TYPE relationship_status AS ENUM ('active', 'pending', 'revoked');
    END IF;

    -- Document attachment types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment_type') THEN
        CREATE TYPE attachment_type AS ENUM ('briefing', 'reference', 'output', 'notes');
    END IF;

    -- Daily brief status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'brief_status') THEN
        CREATE TYPE brief_status AS ENUM ('draft', 'ready', 'viewed');
    END IF;

    -- Storage provider types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_provider') THEN
        CREATE TYPE storage_provider AS ENUM ('supabase', 's3');
    END IF;

    -- Audit action types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action_type') THEN
        CREATE TYPE audit_action_type AS ENUM (
          'create', 'update', 'delete', 'view',
          'upload', 'download', 'share',
          'grant_permission', 'revoke_permission',
          'approve_relationship', 'revoke_relationship'
        );
    END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE TABLES
-- ============================================================================

-- Table: user_roles
-- Defines user roles, subscription tiers, and feature access
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type user_role_type NOT NULL DEFAULT 'standard',
  subscription_tier subscription_tier NOT NULL DEFAULT 'starter',
  features_enabled JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT user_roles_user_id_unique UNIQUE (user_id)
);

COMMENT ON TABLE user_roles IS 'User roles, subscription tiers, and feature flags';
COMMENT ON COLUMN user_roles.features_enabled IS 'JSON object with feature flags: {ai_assistant: true, timeline_goals: true, max_assistants: 3, storage_gb: 10}';

-- Table: assistant_relationships
-- Manages executive-assistant relationships and permissions
CREATE TABLE IF NOT EXISTS assistant_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{
    "manage_timeline": true,
    "upload_documents": true,
    "create_items": true,
    "edit_items": true,
    "delete_items": false,
    "view_confidential": false,
    "manage_goals": true,
    "create_briefs": true,
    "view_only_layers": []
  }'::jsonb,
  status relationship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  notes TEXT,

  -- Constraints
  CONSTRAINT assistant_relationships_unique UNIQUE (executive_id, assistant_id),
  CONSTRAINT assistant_relationships_no_self CHECK (executive_id != assistant_id)
);

COMMENT ON TABLE assistant_relationships IS 'Executive-assistant relationships with granular permissions';
COMMENT ON COLUMN assistant_relationships.permissions IS 'Granular permissions: manage_timeline, upload_documents, create/edit/delete_items, view_confidential, view_only_layers (UUID[])';

-- Table: timeline_documents
-- Stores documents that can be attached to timeline items
CREATE TABLE IF NOT EXISTS timeline_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  for_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- bytes
  file_type TEXT NOT NULL, -- MIME type
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  document_date DATE, -- When the document is relevant (e.g., meeting date)
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  is_confidential BOOLEAN DEFAULT false,
  storage_provider storage_provider NOT NULL DEFAULT 'supabase',
  storage_bucket TEXT,
  storage_path TEXT,
  checksum TEXT, -- For file integrity verification
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE timeline_documents IS 'Documents uploaded for timeline items (briefings, references, outputs)';
COMMENT ON COLUMN timeline_documents.document_date IS 'When the document is relevant (meeting date, event date, etc.)';
COMMENT ON COLUMN timeline_documents.checksum IS 'SHA-256 checksum for file integrity verification';

-- Table: timeline_item_documents
-- Links documents to timeline items
CREATE TABLE IF NOT EXISTS timeline_item_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES timeline_documents(id) ON DELETE CASCADE,
  attachment_type attachment_type NOT NULL DEFAULT 'reference',
  sort_order INTEGER DEFAULT 0,
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT timeline_item_documents_unique UNIQUE (timeline_item_id, document_id)
);

COMMENT ON TABLE timeline_item_documents IS 'Links documents to timeline items with attachment type and notes';

-- Table: executive_daily_briefs
-- AI-generated daily briefings for executives
CREATE TABLE IF NOT EXISTS executive_daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prepared_by_assistant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brief_date DATE NOT NULL,
  status brief_status NOT NULL DEFAULT 'draft',
  summary TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  auto_generated_insights JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT executive_daily_briefs_unique UNIQUE (executive_id, brief_date)
);

COMMENT ON TABLE executive_daily_briefs IS 'Daily briefings for executives with AI-generated insights';
COMMENT ON COLUMN executive_daily_briefs.key_points IS 'Array of key points: [{title: "Meeting at 2pm", priority: "high", notes: "..."}]';
COMMENT ON COLUMN executive_daily_briefs.auto_generated_insights IS 'AI insights: {schedule_conflicts: [], suggested_priorities: [], energy_forecast: {}}';

-- Table: assistant_audit_log
-- Comprehensive audit trail for all assistant actions
CREATE TABLE IF NOT EXISTS assistant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action audit_action_type NOT NULL,
  resource_type TEXT NOT NULL, -- 'timeline_item', 'document', 'goal', etc.
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE assistant_audit_log IS 'Audit trail for all assistant actions on executive data';
COMMENT ON COLUMN assistant_audit_log.details IS 'Action details: {changes: {before: {}, after: {}}, reason: "...", metadata: {}}';

-- ============================================================================
-- PART 3: INDEXES FOR PERFORMANCE
-- ============================================================================

-- user_roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_type ON user_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_user_roles_subscription_tier ON user_roles(subscription_tier);

-- assistant_relationships indexes
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_executive_id ON assistant_relationships(executive_id);
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_assistant_id ON assistant_relationships(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_status ON assistant_relationships(status);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_assistant_relationships_active'
    ) THEN
        CREATE INDEX idx_assistant_relationships_active ON assistant_relationships(executive_id, assistant_id)
          WHERE status = 'active';
    END IF;
END $$;

-- timeline_documents indexes
CREATE INDEX IF NOT EXISTS idx_timeline_documents_uploaded_by ON timeline_documents(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_for_user ON timeline_documents(for_user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_upload_date ON timeline_documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_document_date ON timeline_documents(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_tags ON timeline_documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_category ON timeline_documents(category);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_confidential ON timeline_documents(for_user_id, is_confidential);

-- timeline_item_documents indexes
CREATE INDEX IF NOT EXISTS idx_timeline_item_documents_item_id ON timeline_item_documents(timeline_item_id);
CREATE INDEX IF NOT EXISTS idx_timeline_item_documents_document_id ON timeline_item_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_timeline_item_documents_added_by ON timeline_item_documents(added_by_user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_item_documents_type ON timeline_item_documents(attachment_type);

-- executive_daily_briefs indexes
CREATE INDEX IF NOT EXISTS idx_executive_daily_briefs_executive_id ON executive_daily_briefs(executive_id);
CREATE INDEX IF NOT EXISTS idx_executive_daily_briefs_brief_date ON executive_daily_briefs(brief_date DESC);
CREATE INDEX IF NOT EXISTS idx_executive_daily_briefs_status ON executive_daily_briefs(executive_id, status);
CREATE INDEX IF NOT EXISTS idx_executive_daily_briefs_prepared_by ON executive_daily_briefs(prepared_by_assistant_id);

-- assistant_audit_log indexes
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_actor ON assistant_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_target ON assistant_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_action ON assistant_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_resource ON assistant_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_created_at ON assistant_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_actor_target ON assistant_audit_log(actor_user_id, target_user_id, created_at DESC);

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Function: check_assistant_permission
-- Checks if an assistant has a specific permission for an executive
CREATE OR REPLACE FUNCTION check_assistant_permission(
  p_assistant_id UUID,
  p_executive_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_relationship RECORD;
BEGIN
  -- Get the active relationship
  SELECT * INTO v_relationship
  FROM assistant_relationships
  WHERE assistant_id = p_assistant_id
    AND executive_id = p_executive_id
    AND status = 'active';

  -- If no active relationship, return false
  IF v_relationship IS NULL THEN
    RETURN false;
  END IF;

  -- Check if permission exists and is true
  RETURN COALESCE((v_relationship.permissions->p_permission)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION check_assistant_permission IS 'Check if assistant has specific permission for executive';

-- Function: get_user_role
-- Get user's role type
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS user_role_type AS $$
DECLARE
  v_role user_role_type;
BEGIN
  SELECT role_type INTO v_role
  FROM user_roles
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_role, 'standard'::user_role_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_role IS 'Get user role type (executive, assistant, or standard)';

-- Function: can_user_access_timeline_item
-- Check if user can access a timeline item (owner or authorized assistant)
CREATE OR REPLACE FUNCTION can_user_access_timeline_item(
  p_user_id UUID,
  p_item_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item_owner UUID;
BEGIN
  -- Get item owner
  SELECT user_id INTO v_item_owner
  FROM timeline_items
  WHERE id = p_item_id;

  -- Check if user is owner
  IF v_item_owner = p_user_id THEN
    RETURN true;
  END IF;

  -- Check if user is an authorized assistant
  RETURN EXISTS (
    SELECT 1
    FROM assistant_relationships
    WHERE assistant_id = p_user_id
      AND executive_id = v_item_owner
      AND status = 'active'
      AND (permissions->>'manage_timeline')::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_user_access_timeline_item IS 'Check if user can access timeline item (owner or authorized assistant)';

-- Function: log_assistant_action
-- Log an assistant action for audit trail
CREATE OR REPLACE FUNCTION log_assistant_action(
  p_actor_user_id UUID,
  p_target_user_id UUID,
  p_action audit_action_type,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO assistant_audit_log (
    actor_user_id,
    target_user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_actor_user_id,
    p_target_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_assistant_action IS 'Log assistant action to audit trail';

-- ============================================================================
-- PART 5: TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger for user_roles
DROP TRIGGER IF EXISTS set_updated_at_user_roles ON user_roles;
CREATE TRIGGER set_updated_at_user_roles
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for timeline_documents
DROP TRIGGER IF EXISTS set_updated_at_timeline_documents ON timeline_documents;
CREATE TRIGGER set_updated_at_timeline_documents
  BEFORE UPDATE ON timeline_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for executive_daily_briefs
DROP TRIGGER IF EXISTS set_updated_at_executive_daily_briefs ON executive_daily_briefs;
CREATE TRIGGER set_updated_at_executive_daily_briefs
  BEFORE UPDATE ON executive_daily_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 6: AUTOMATIC AUDIT LOGGING TRIGGERS
-- ============================================================================

-- Function: auto_log_timeline_item_changes
-- Automatically log timeline item changes by assistants
CREATE OR REPLACE FUNCTION auto_log_timeline_item_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_owner_id UUID;
  v_action audit_action_type;
  v_details JSONB;
BEGIN
  v_actor_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_owner_id := NEW.user_id;
    v_action := 'create';
    v_details := jsonb_build_object(
      'item_title', NEW.title,
      'layer_id', NEW.layer_id,
      'start_time', NEW.start_time,
      'duration_minutes', NEW.duration_minutes
    );

    -- Only log if actor is different from owner (assistant creating item)
    IF v_actor_id != v_owner_id THEN
      PERFORM log_assistant_action(
        v_actor_id,
        v_owner_id,
        v_action,
        'timeline_item',
        NEW.id,
        v_details
      );
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_owner_id := NEW.user_id;
    v_action := 'update';

    -- Build details with changes
    v_details := jsonb_build_object(
      'changes', jsonb_build_object(
        'before', row_to_json(OLD),
        'after', row_to_json(NEW)
      )
    );

    -- Only log if actor is different from owner
    IF v_actor_id != v_owner_id THEN
      PERFORM log_assistant_action(
        v_actor_id,
        v_owner_id,
        v_action,
        'timeline_item',
        NEW.id,
        v_details
      );
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_owner_id := OLD.user_id;
    v_action := 'delete';
    v_details := jsonb_build_object(
      'item_title', OLD.title,
      'deleted_data', row_to_json(OLD)
    );

    -- Only log if actor is different from owner
    IF v_actor_id != v_owner_id THEN
      PERFORM log_assistant_action(
        v_actor_id,
        v_owner_id,
        v_action,
        'timeline_item',
        OLD.id,
        v_details
      );
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_log_timeline_item_changes IS 'Automatically log timeline item changes by assistants';

-- Apply trigger to timeline_items
DROP TRIGGER IF EXISTS log_timeline_item_changes ON timeline_items;
CREATE TRIGGER log_timeline_item_changes
  AFTER INSERT OR UPDATE OR DELETE ON timeline_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_timeline_item_changes();

-- Function: auto_log_document_actions
-- Automatically log document uploads and changes
CREATE OR REPLACE FUNCTION auto_log_document_actions()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_action audit_action_type;
  v_details JSONB;
BEGIN
  v_actor_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'upload';
    v_details := jsonb_build_object(
      'filename', NEW.filename,
      'file_size', NEW.file_size,
      'file_type', NEW.file_type,
      'is_confidential', NEW.is_confidential
    );

    PERFORM log_assistant_action(
      v_actor_id,
      NEW.for_user_id,
      v_action,
      'timeline_document',
      NEW.id,
      v_details
    );

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_details := jsonb_build_object(
      'filename', OLD.filename,
      'deleted_data', row_to_json(OLD)
    );

    PERFORM log_assistant_action(
      v_actor_id,
      OLD.for_user_id,
      v_action,
      'timeline_document',
      OLD.id,
      v_details
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_log_document_actions IS 'Automatically log document upload/delete actions';

-- Apply trigger to timeline_documents
DROP TRIGGER IF EXISTS log_document_actions ON timeline_documents;
CREATE TRIGGER log_document_actions
  AFTER INSERT OR DELETE ON timeline_documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_document_actions();

-- ============================================================================
-- PART 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_item_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_daily_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    -- user_roles policies
    DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
    DROP POLICY IF EXISTS "Users can update their own role (limited)" ON user_roles;

    -- assistant_relationships policies
    DROP POLICY IF EXISTS "Executives can view their assistant relationships" ON assistant_relationships;
    DROP POLICY IF EXISTS "Assistants can view their relationships" ON assistant_relationships;
    DROP POLICY IF EXISTS "Executives can create assistant relationships" ON assistant_relationships;
    DROP POLICY IF EXISTS "Executives can update their assistant relationships" ON assistant_relationships;
    DROP POLICY IF EXISTS "Executives can delete assistant relationships" ON assistant_relationships;

    -- timeline_documents policies
    DROP POLICY IF EXISTS "Users can view documents for themselves" ON timeline_documents;
    DROP POLICY IF EXISTS "Users can view documents they uploaded" ON timeline_documents;
    DROP POLICY IF EXISTS "Assistants can view executive documents (non-confidential)" ON timeline_documents;
    DROP POLICY IF EXISTS "Users can upload documents for themselves" ON timeline_documents;
    DROP POLICY IF EXISTS "Assistants can upload documents for executives" ON timeline_documents;
    DROP POLICY IF EXISTS "Users can update their own documents" ON timeline_documents;
    DROP POLICY IF EXISTS "Users can delete documents they uploaded" ON timeline_documents;

    -- timeline_item_documents policies
    DROP POLICY IF EXISTS "Users can view attachments for their items" ON timeline_item_documents;
    DROP POLICY IF EXISTS "Assistants can view attachments for executive items" ON timeline_item_documents;
    DROP POLICY IF EXISTS "Users can attach documents to their items" ON timeline_item_documents;
    DROP POLICY IF EXISTS "Assistants can attach documents to executive items" ON timeline_item_documents;
    DROP POLICY IF EXISTS "Users can delete attachments from their items" ON timeline_item_documents;

    -- executive_daily_briefs policies
    DROP POLICY IF EXISTS "Executives can view their briefs" ON executive_daily_briefs;
    DROP POLICY IF EXISTS "Assistants can view briefs they prepared" ON executive_daily_briefs;
    DROP POLICY IF EXISTS "Assistants can create briefs for executives" ON executive_daily_briefs;
    DROP POLICY IF EXISTS "Assistants can update briefs they prepared" ON executive_daily_briefs;
    DROP POLICY IF EXISTS "Executives can update their briefs (mark as viewed)" ON executive_daily_briefs;

    -- assistant_audit_log policies
    DROP POLICY IF EXISTS "Users can view audit logs where they are the target" ON assistant_audit_log;
    DROP POLICY IF EXISTS "Users can view audit logs where they are the actor" ON assistant_audit_log;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- user_roles policies
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own role (limited)"
  ON user_roles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- assistant_relationships policies
CREATE POLICY "Executives can view their assistant relationships"
  ON assistant_relationships FOR SELECT
  USING (auth.uid() = executive_id);

CREATE POLICY "Assistants can view their relationships"
  ON assistant_relationships FOR SELECT
  USING (auth.uid() = assistant_id);

CREATE POLICY "Executives can create assistant relationships"
  ON assistant_relationships FOR INSERT
  WITH CHECK (auth.uid() = executive_id);

CREATE POLICY "Executives can update their assistant relationships"
  ON assistant_relationships FOR UPDATE
  USING (auth.uid() = executive_id)
  WITH CHECK (auth.uid() = executive_id);

CREATE POLICY "Executives can delete assistant relationships"
  ON assistant_relationships FOR DELETE
  USING (auth.uid() = executive_id);

-- timeline_documents policies
CREATE POLICY "Users can view documents for themselves"
  ON timeline_documents FOR SELECT
  USING (auth.uid() = for_user_id);

CREATE POLICY "Users can view documents they uploaded"
  ON timeline_documents FOR SELECT
  USING (auth.uid() = uploaded_by_user_id);

CREATE POLICY "Assistants can view executive documents (non-confidential)"
  ON timeline_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = timeline_documents.for_user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'upload_documents')::boolean = true
        AND (
          timeline_documents.is_confidential = false
          OR (ar.permissions->>'view_confidential')::boolean = true
        )
    )
  );

CREATE POLICY "Users can upload documents for themselves"
  ON timeline_documents FOR INSERT
  WITH CHECK (auth.uid() = for_user_id);

CREATE POLICY "Assistants can upload documents for executives"
  ON timeline_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = timeline_documents.for_user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'upload_documents')::boolean = true
    )
  );

CREATE POLICY "Users can update their own documents"
  ON timeline_documents FOR UPDATE
  USING (auth.uid() = uploaded_by_user_id)
  WITH CHECK (auth.uid() = uploaded_by_user_id);

CREATE POLICY "Users can delete documents they uploaded"
  ON timeline_documents FOR DELETE
  USING (auth.uid() = uploaded_by_user_id);

-- timeline_item_documents policies
CREATE POLICY "Users can view attachments for their items"
  ON timeline_item_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timeline_items ti
      WHERE ti.id = timeline_item_documents.timeline_item_id
        AND ti.user_id = auth.uid()
    )
  );

CREATE POLICY "Assistants can view attachments for executive items"
  ON timeline_item_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timeline_items ti
      JOIN assistant_relationships ar ON ar.executive_id = ti.user_id
      WHERE ti.id = timeline_item_documents.timeline_item_id
        AND ar.assistant_id = auth.uid()
        AND ar.status = 'active'
        AND (ar.permissions->>'manage_timeline')::boolean = true
    )
  );

CREATE POLICY "Users can attach documents to their items"
  ON timeline_item_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timeline_items ti
      WHERE ti.id = timeline_item_documents.timeline_item_id
        AND ti.user_id = auth.uid()
    )
  );

CREATE POLICY "Assistants can attach documents to executive items"
  ON timeline_item_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timeline_items ti
      JOIN assistant_relationships ar ON ar.executive_id = ti.user_id
      WHERE ti.id = timeline_item_documents.timeline_item_id
        AND ar.assistant_id = auth.uid()
        AND ar.status = 'active'
        AND (ar.permissions->>'manage_timeline')::boolean = true
    )
  );

CREATE POLICY "Users can delete attachments from their items"
  ON timeline_item_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM timeline_items ti
      WHERE ti.id = timeline_item_documents.timeline_item_id
        AND ti.user_id = auth.uid()
    )
  );

-- executive_daily_briefs policies
CREATE POLICY "Executives can view their briefs"
  ON executive_daily_briefs FOR SELECT
  USING (auth.uid() = executive_id);

CREATE POLICY "Assistants can view briefs they prepared"
  ON executive_daily_briefs FOR SELECT
  USING (auth.uid() = prepared_by_assistant_id);

CREATE POLICY "Assistants can create briefs for executives"
  ON executive_daily_briefs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = executive_daily_briefs.executive_id
        AND ar.status = 'active'
        AND (ar.permissions->>'create_briefs')::boolean = true
    )
  );

CREATE POLICY "Assistants can update briefs they prepared"
  ON executive_daily_briefs FOR UPDATE
  USING (auth.uid() = prepared_by_assistant_id)
  WITH CHECK (auth.uid() = prepared_by_assistant_id);

CREATE POLICY "Executives can update their briefs (mark as viewed)"
  ON executive_daily_briefs FOR UPDATE
  USING (auth.uid() = executive_id)
  WITH CHECK (auth.uid() = executive_id);

-- assistant_audit_log policies
CREATE POLICY "Users can view audit logs where they are the target"
  ON assistant_audit_log FOR SELECT
  USING (auth.uid() = target_user_id);

CREATE POLICY "Users can view audit logs where they are the actor"
  ON assistant_audit_log FOR SELECT
  USING (auth.uid() = actor_user_id);

-- Note: INSERT on audit_log is handled by triggers and functions with SECURITY DEFINER

-- ============================================================================
-- PART 8: UPDATE EXISTING TIMELINE ITEMS RLS POLICIES
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can insert their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can update their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can delete their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can view their timeline items or items they assist with" ON timeline_items;
DROP POLICY IF EXISTS "Users can insert timeline items for themselves" ON timeline_items;
DROP POLICY IF EXISTS "Assistants can insert timeline items for executives" ON timeline_items;
DROP POLICY IF EXISTS "Assistants can update executive timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Assistants can delete executive timeline items (if permitted)" ON timeline_items;

-- Recreate policies with assistant support
CREATE POLICY "Users can view their timeline items or items they assist with"
  ON timeline_items FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'manage_timeline')::boolean = true
    )
  );

CREATE POLICY "Users can insert timeline items for themselves"
  ON timeline_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Assistants can insert timeline items for executives"
  ON timeline_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'create_items')::boolean = true
    )
  );

CREATE POLICY "Users can update their own timeline items"
  ON timeline_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Assistants can update executive timeline items"
  ON timeline_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'edit_items')::boolean = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'edit_items')::boolean = true
    )
  );

CREATE POLICY "Users can delete their own timeline items"
  ON timeline_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Assistants can delete executive timeline items (if permitted)"
  ON timeline_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'delete_items')::boolean = true
    )
  );

-- ============================================================================
-- PART 9: VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: active_assistant_relationships
-- Shows all active assistant relationships with role info
CREATE OR REPLACE VIEW active_assistant_relationships AS
SELECT
  ar.id,
  ar.executive_id,
  ar.assistant_id,
  ur_exec.role_type as executive_role,
  ur_asst.role_type as assistant_role,
  ar.permissions,
  ar.created_at,
  ar.approved_at,
  au_exec.email as executive_email,
  au_asst.email as assistant_email,
  au_exec.raw_user_meta_data->>'full_name' as executive_name,
  au_asst.raw_user_meta_data->>'full_name' as assistant_name
FROM assistant_relationships ar
JOIN user_roles ur_exec ON ur_exec.user_id = ar.executive_id
JOIN user_roles ur_asst ON ur_asst.user_id = ar.assistant_id
JOIN auth.users au_exec ON au_exec.id = ar.executive_id
JOIN auth.users au_asst ON au_asst.id = ar.assistant_id
WHERE ar.status = 'active';

COMMENT ON VIEW active_assistant_relationships IS 'Active assistant relationships with user details';

-- View: document_attachments
-- Shows documents with their timeline item attachments
CREATE OR REPLACE VIEW document_attachments AS
SELECT
  td.id as document_id,
  td.filename,
  td.file_type,
  td.file_size,
  td.upload_date,
  td.document_date,
  td.tags,
  td.category,
  td.is_confidential,
  td.uploaded_by_user_id,
  td.for_user_id,
  tid.timeline_item_id,
  tid.attachment_type,
  tid.notes as attachment_notes,
  tid.added_by_user_id,
  ti.title as item_title,
  ti.start_time as item_start_time
FROM timeline_documents td
LEFT JOIN timeline_item_documents tid ON tid.document_id = td.id
LEFT JOIN timeline_items ti ON ti.id = tid.timeline_item_id
ORDER BY td.upload_date DESC;

COMMENT ON VIEW document_attachments IS 'Documents with their timeline item attachments';

-- View: assistant_activity_summary
-- Summary of assistant activity per executive
CREATE OR REPLACE VIEW assistant_activity_summary AS
SELECT
  aal.actor_user_id as assistant_id,
  aal.target_user_id as executive_id,
  aal.action,
  aal.resource_type,
  COUNT(*) as action_count,
  MAX(aal.created_at) as last_action_at,
  MIN(aal.created_at) as first_action_at
FROM assistant_audit_log aal
WHERE aal.created_at > NOW() - INTERVAL '30 days'
GROUP BY aal.actor_user_id, aal.target_user_id, aal.action, aal.resource_type
ORDER BY last_action_at DESC;

COMMENT ON VIEW assistant_activity_summary IS '30-day assistant activity summary by action type';

-- ============================================================================
-- PART 10: DEFAULT DATA FOR NEW USERS
-- ============================================================================

-- Function: setup_default_user_role
-- Automatically create user_role record when user signs up
CREATE OR REPLACE FUNCTION setup_default_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role_type, subscription_tier, features_enabled)
  VALUES (
    NEW.id,
    'standard',
    'starter',
    jsonb_build_object(
      'ai_assistant', true,
      'timeline_goals', true,
      'max_assistants', 0,
      'storage_gb', 1,
      'max_documents', 50,
      'daily_briefs', false
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION setup_default_user_role IS 'Create default user role on signup';

-- Apply trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_setup_role ON auth.users;
CREATE TRIGGER on_auth_user_created_setup_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION setup_default_user_role();

-- ============================================================================
-- PART 11: VERIFICATION AND CLEANUP
-- ============================================================================

-- Verify table creation
DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'user_roles',
      'assistant_relationships',
      'timeline_documents',
      'timeline_item_documents',
      'executive_daily_briefs',
      'assistant_audit_log'
    );

  RAISE NOTICE '================================================';
  RAISE NOTICE 'Executive-Assistant System Migration (FIXED)';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Tables created: %/6', v_table_count;

  IF v_table_count = 6 THEN
    RAISE NOTICE 'SUCCESS: All tables created successfully!';
  ELSE
    RAISE WARNING 'Expected 6 tables, but only found %!', v_table_count;
  END IF;

  RAISE NOTICE '================================================';
END $$;
