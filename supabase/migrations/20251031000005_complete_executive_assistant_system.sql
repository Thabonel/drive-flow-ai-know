-- Complete Executive-Assistant System Migration
-- This applies the remaining parts of 20251031000003 that may not have been applied
-- Safe to run multiple times (idempotent)

-- ============================================================================
-- PART 1: ENSURE ALL ENUMS EXIST
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    CREATE TYPE user_role_type AS ENUM ('executive', 'assistant', 'standard');
    RAISE NOTICE 'Created user_role_type enum';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'executive');
    RAISE NOTICE 'Created subscription_tier enum';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_status') THEN
    CREATE TYPE relationship_status AS ENUM ('active', 'pending', 'revoked');
    RAISE NOTICE 'Created relationship_status enum';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment_type') THEN
    CREATE TYPE attachment_type AS ENUM ('briefing', 'reference', 'output', 'notes');
    RAISE NOTICE 'Created attachment_type enum';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'brief_status') THEN
    CREATE TYPE brief_status AS ENUM ('draft', 'ready', 'viewed');
    RAISE NOTICE 'Created brief_status enum';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_provider') THEN
    CREATE TYPE storage_provider AS ENUM ('supabase', 's3');
    RAISE NOTICE 'Created storage_provider enum';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action_type') THEN
    CREATE TYPE audit_action_type AS ENUM (
      'create', 'update', 'delete', 'view',
      'upload', 'download', 'share',
      'grant_permission', 'revoke_permission',
      'approve_relationship', 'revoke_relationship'
    );
    RAISE NOTICE 'Created audit_action_type enum';
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE TABLES (IF NOT EXISTS)
-- ============================================================================

-- Table: assistant_relationships
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
  CONSTRAINT assistant_relationships_unique UNIQUE (executive_id, assistant_id),
  CONSTRAINT assistant_relationships_no_self CHECK (executive_id != assistant_id)
);

-- Table: timeline_documents
CREATE TABLE IF NOT EXISTS timeline_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  for_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  document_date DATE,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  is_confidential BOOLEAN DEFAULT false,
  storage_provider storage_provider NOT NULL DEFAULT 'supabase',
  storage_bucket TEXT,
  storage_path TEXT,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: timeline_item_documents
CREATE TABLE IF NOT EXISTS timeline_item_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES timeline_documents(id) ON DELETE CASCADE,
  attachment_type attachment_type NOT NULL DEFAULT 'reference',
  sort_order INTEGER DEFAULT 0,
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT timeline_item_documents_unique UNIQUE (timeline_item_id, document_id)
);

-- Table: executive_daily_briefs
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
  CONSTRAINT executive_daily_briefs_unique UNIQUE (executive_id, brief_date)
);

-- Table: assistant_audit_log
CREATE TABLE IF NOT EXISTS assistant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action audit_action_type NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE assistant_relationships IS 'Executive-assistant relationships with granular permissions';
COMMENT ON TABLE timeline_documents IS 'Documents uploaded for timeline items (briefings, references, outputs)';
COMMENT ON TABLE timeline_item_documents IS 'Links documents to timeline items with attachment type and notes';
COMMENT ON TABLE executive_daily_briefs IS 'Daily briefings for executives with AI-generated insights';
COMMENT ON TABLE assistant_audit_log IS 'Audit trail for all assistant actions on executive data';

-- ============================================================================
-- PART 3: CREATE INDEXES
-- ============================================================================

-- assistant_relationships indexes
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_executive_id ON assistant_relationships(executive_id);
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_assistant_id ON assistant_relationships(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_status ON assistant_relationships(status);

-- timeline_documents indexes
CREATE INDEX IF NOT EXISTS idx_timeline_documents_uploaded_by ON timeline_documents(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_for_user ON timeline_documents(for_user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_upload_date ON timeline_documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_document_date ON timeline_documents(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_tags ON timeline_documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_timeline_documents_category ON timeline_documents(category);

-- timeline_item_documents indexes
CREATE INDEX IF NOT EXISTS idx_timeline_item_documents_item_id ON timeline_item_documents(timeline_item_id);
CREATE INDEX IF NOT EXISTS idx_timeline_item_documents_document_id ON timeline_item_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_timeline_item_documents_added_by ON timeline_item_documents(added_by_user_id);

-- executive_daily_briefs indexes
CREATE INDEX IF NOT EXISTS idx_executive_daily_briefs_executive_id ON executive_daily_briefs(executive_id);
CREATE INDEX IF NOT EXISTS idx_executive_daily_briefs_brief_date ON executive_daily_briefs(brief_date DESC);
CREATE INDEX IF NOT EXISTS idx_executive_daily_briefs_prepared_by ON executive_daily_briefs(prepared_by_assistant_id);

-- assistant_audit_log indexes
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_actor ON assistant_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_target ON assistant_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_action ON assistant_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_created_at ON assistant_audit_log(created_at DESC);

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Function: check_assistant_permission
CREATE OR REPLACE FUNCTION check_assistant_permission(
  p_assistant_id UUID,
  p_executive_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_relationship RECORD;
BEGIN
  SELECT * INTO v_relationship
  FROM assistant_relationships
  WHERE assistant_id = p_assistant_id
    AND executive_id = p_executive_id
    AND status = 'active';

  IF v_relationship IS NULL THEN
    RETURN false;
  END IF;

  RETURN COALESCE((v_relationship.permissions->p_permission)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function: get_user_role
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

-- Function: can_user_access_timeline_item
CREATE OR REPLACE FUNCTION can_user_access_timeline_item(
  p_user_id UUID,
  p_item_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item_owner UUID;
BEGIN
  SELECT user_id INTO v_item_owner
  FROM timeline_items
  WHERE id = p_item_id;

  IF v_item_owner = p_user_id THEN
    RETURN true;
  END IF;

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

-- Function: log_assistant_action
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

-- ============================================================================
-- PART 5: TRIGGERS
-- ============================================================================

-- Trigger for timeline_documents updated_at
DROP TRIGGER IF EXISTS set_updated_at_timeline_documents ON timeline_documents;
CREATE TRIGGER set_updated_at_timeline_documents
  BEFORE UPDATE ON timeline_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for executive_daily_briefs updated_at
DROP TRIGGER IF EXISTS set_updated_at_executive_daily_briefs ON executive_daily_briefs;
CREATE TRIGGER set_updated_at_executive_daily_briefs
  BEFORE UPDATE ON executive_daily_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: auto_log_timeline_item_changes
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

    v_details := jsonb_build_object(
      'changes', jsonb_build_object(
        'before', row_to_json(OLD),
        'after', row_to_json(NEW)
      )
    );

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

-- Apply trigger to timeline_items
DROP TRIGGER IF EXISTS log_timeline_item_changes ON timeline_items;
CREATE TRIGGER log_timeline_item_changes
  AFTER INSERT OR UPDATE OR DELETE ON timeline_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_timeline_item_changes();

-- Function: auto_log_document_actions
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

-- Apply trigger to timeline_documents
DROP TRIGGER IF EXISTS log_document_actions ON timeline_documents;
CREATE TRIGGER log_document_actions
  AFTER INSERT OR DELETE ON timeline_documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_document_actions();

-- ============================================================================
-- PART 6: ENABLE RLS
-- ============================================================================

ALTER TABLE assistant_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_item_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_daily_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 7: RLS POLICIES
-- ============================================================================

-- assistant_relationships policies
DROP POLICY IF EXISTS "Executives can view their assistant relationships" ON assistant_relationships;
CREATE POLICY "Executives can view their assistant relationships"
  ON assistant_relationships FOR SELECT
  USING (auth.uid() = executive_id);

DROP POLICY IF EXISTS "Assistants can view their relationships" ON assistant_relationships;
CREATE POLICY "Assistants can view their relationships"
  ON assistant_relationships FOR SELECT
  USING (auth.uid() = assistant_id);

DROP POLICY IF EXISTS "Executives can create assistant relationships" ON assistant_relationships;
CREATE POLICY "Executives can create assistant relationships"
  ON assistant_relationships FOR INSERT
  WITH CHECK (auth.uid() = executive_id);

DROP POLICY IF EXISTS "Executives can update their assistant relationships" ON assistant_relationships;
CREATE POLICY "Executives can update their assistant relationships"
  ON assistant_relationships FOR UPDATE
  USING (auth.uid() = executive_id)
  WITH CHECK (auth.uid() = executive_id);

DROP POLICY IF EXISTS "Executives can delete assistant relationships" ON assistant_relationships;
CREATE POLICY "Executives can delete assistant relationships"
  ON assistant_relationships FOR DELETE
  USING (auth.uid() = executive_id);

-- timeline_documents policies
DROP POLICY IF EXISTS "Users can view documents for themselves" ON timeline_documents;
CREATE POLICY "Users can view documents for themselves"
  ON timeline_documents FOR SELECT
  USING (auth.uid() = for_user_id);

DROP POLICY IF EXISTS "Users can view documents they uploaded" ON timeline_documents;
CREATE POLICY "Users can view documents they uploaded"
  ON timeline_documents FOR SELECT
  USING (auth.uid() = uploaded_by_user_id);

DROP POLICY IF EXISTS "Assistants can view executive documents (non-confidential)" ON timeline_documents;
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

DROP POLICY IF EXISTS "Users can upload documents for themselves" ON timeline_documents;
CREATE POLICY "Users can upload documents for themselves"
  ON timeline_documents FOR INSERT
  WITH CHECK (auth.uid() = for_user_id);

DROP POLICY IF EXISTS "Assistants can upload documents for executives" ON timeline_documents;
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

DROP POLICY IF EXISTS "Users can update their own documents" ON timeline_documents;
CREATE POLICY "Users can update their own documents"
  ON timeline_documents FOR UPDATE
  USING (auth.uid() = uploaded_by_user_id)
  WITH CHECK (auth.uid() = uploaded_by_user_id);

DROP POLICY IF EXISTS "Users can delete documents they uploaded" ON timeline_documents;
CREATE POLICY "Users can delete documents they uploaded"
  ON timeline_documents FOR DELETE
  USING (auth.uid() = uploaded_by_user_id);

-- timeline_item_documents policies
DROP POLICY IF EXISTS "Users can view attachments for their items" ON timeline_item_documents;
CREATE POLICY "Users can view attachments for their items"
  ON timeline_item_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timeline_items ti
      WHERE ti.id = timeline_item_documents.timeline_item_id
        AND ti.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Assistants can view attachments for executive items" ON timeline_item_documents;
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

DROP POLICY IF EXISTS "Users can attach documents to their items" ON timeline_item_documents;
CREATE POLICY "Users can attach documents to their items"
  ON timeline_item_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timeline_items ti
      WHERE ti.id = timeline_item_documents.timeline_item_id
        AND ti.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Assistants can attach documents to executive items" ON timeline_item_documents;
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

DROP POLICY IF EXISTS "Users can delete attachments from their items" ON timeline_item_documents;
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
DROP POLICY IF EXISTS "Executives can view their briefs" ON executive_daily_briefs;
CREATE POLICY "Executives can view their briefs"
  ON executive_daily_briefs FOR SELECT
  USING (auth.uid() = executive_id);

DROP POLICY IF EXISTS "Assistants can view briefs they prepared" ON executive_daily_briefs;
CREATE POLICY "Assistants can view briefs they prepared"
  ON executive_daily_briefs FOR SELECT
  USING (auth.uid() = prepared_by_assistant_id);

DROP POLICY IF EXISTS "Assistants can create briefs for executives" ON executive_daily_briefs;
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

DROP POLICY IF EXISTS "Assistants can update briefs they prepared" ON executive_daily_briefs;
CREATE POLICY "Assistants can update briefs they prepared"
  ON executive_daily_briefs FOR UPDATE
  USING (auth.uid() = prepared_by_assistant_id)
  WITH CHECK (auth.uid() = prepared_by_assistant_id);

DROP POLICY IF EXISTS "Executives can update their briefs (mark as viewed)" ON executive_daily_briefs;
CREATE POLICY "Executives can update their briefs (mark as viewed)"
  ON executive_daily_briefs FOR UPDATE
  USING (auth.uid() = executive_id)
  WITH CHECK (auth.uid() = executive_id);

-- assistant_audit_log policies
DROP POLICY IF EXISTS "Users can view audit logs where they are the target" ON assistant_audit_log;
CREATE POLICY "Users can view audit logs where they are the target"
  ON assistant_audit_log FOR SELECT
  USING (auth.uid() = target_user_id);

DROP POLICY IF EXISTS "Users can view audit logs where they are the actor" ON assistant_audit_log;
CREATE POLICY "Users can view audit logs where they are the actor"
  ON assistant_audit_log FOR SELECT
  USING (auth.uid() = actor_user_id);

-- ============================================================================
-- PART 8: UPDATE TIMELINE_ITEMS POLICIES FOR ASSISTANT ACCESS
-- ============================================================================

-- Drop and recreate timeline_items policies with assistant support
DROP POLICY IF EXISTS "Users can view their timeline items or items they assist with" ON timeline_items;
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

DROP POLICY IF EXISTS "Assistants can insert timeline items for executives" ON timeline_items;
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

DROP POLICY IF EXISTS "Assistants can update executive timeline items" ON timeline_items;
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

DROP POLICY IF EXISTS "Assistants can delete executive timeline items (if permitted)" ON timeline_items;
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
-- PART 9: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_table_count INTEGER;
  v_enum_count INTEGER;
  v_function_count INTEGER;
BEGIN
  -- Count tables
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

  -- Count enums
  SELECT COUNT(DISTINCT typname) INTO v_enum_count
  FROM pg_type
  WHERE typname IN (
    'user_role_type',
    'subscription_tier',
    'relationship_status',
    'attachment_type',
    'brief_status',
    'storage_provider',
    'audit_action_type'
  );

  -- Count functions
  SELECT COUNT(*) INTO v_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'check_assistant_permission',
      'get_user_role',
      'can_user_access_timeline_item',
      'log_assistant_action'
    );

  RAISE NOTICE '================================================';
  RAISE NOTICE 'Executive-Assistant System - Installation Complete';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Tables created: %/6', v_table_count;
  RAISE NOTICE 'Enum types created: %/7', v_enum_count;
  RAISE NOTICE 'Helper functions created: %/4', v_function_count;
  RAISE NOTICE '================================================';

  IF v_table_count = 6 AND v_enum_count = 7 AND v_function_count = 4 THEN
    RAISE NOTICE '✓ SUCCESS: All components installed!';
  ELSE
    RAISE WARNING '⚠ INCOMPLETE: Some components may be missing';
  END IF;

  RAISE NOTICE '================================================';
END $$;
