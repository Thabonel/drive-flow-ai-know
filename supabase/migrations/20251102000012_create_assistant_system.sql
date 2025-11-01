-- Create Assistant Access System
-- Created: 2025-11-02
-- Purpose: Executive-assistant collaboration with granular permissions

-- Assistant relationships (executive invites assistant)
CREATE TABLE IF NOT EXISTS assistant_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship parties
  executive_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_email TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),

  -- Permissions (JSONB for flexibility)
  permissions JSONB NOT NULL DEFAULT '{
    "view_calendar": true,
    "edit_calendar": false,
    "suggest_changes": true,
    "attach_documents": true,
    "apply_templates": false,
    "bulk_schedule": false,
    "view_documents": true
  }'::JSONB,

  -- Invitation details
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Acceptance tracking
  accepted_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_executive_assistant UNIQUE (executive_id, assistant_email),
  CONSTRAINT valid_invitation_token CHECK (invitation_token IS NULL OR LENGTH(invitation_token) >= 32),
  CONSTRAINT accepted_requires_assistant CHECK (
    (status = 'pending' AND assistant_id IS NULL) OR
    (status != 'pending' AND assistant_id IS NOT NULL)
  )
);

-- Assistant activity log (track all actions)
CREATE TABLE IF NOT EXISTS assistant_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES assistant_relationships(id) ON DELETE CASCADE,

  -- Who and what
  assistant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'viewed_timeline',
    'created_item',
    'updated_item',
    'deleted_item',
    'applied_template',
    'bulk_scheduled',
    'attached_document',
    'added_note',
    'suggested_change',
    'generated_brief'
  )),

  -- Target details
  target_type TEXT CHECK (target_type IN ('timeline_item', 'document', 'template', 'note', 'bulk_action')),
  target_id UUID,

  -- Change details
  changes JSONB,
  old_values JSONB,
  new_values JSONB,

  -- Description for notifications
  description TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Suggested changes (require executive approval)
CREATE TABLE IF NOT EXISTS assistant_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES assistant_relationships(id) ON DELETE CASCADE,

  -- Who and what
  assistant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Suggestion details
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'create_item',
    'update_item',
    'delete_item',
    'reschedule_item',
    'apply_template',
    'bulk_schedule'
  )),

  -- Proposed changes
  proposed_data JSONB NOT NULL,
  target_id UUID,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Assistant's reasoning
  reason TEXT,
  notes TEXT,

  -- Executive response
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_executive ON assistant_relationships(executive_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_assistant ON assistant_relationships(assistant_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_status ON assistant_relationships(status);
CREATE INDEX IF NOT EXISTS idx_assistant_relationships_token ON assistant_relationships(invitation_token) WHERE invitation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assistant_activity_relationship ON assistant_activity_log(relationship_id);
CREATE INDEX IF NOT EXISTS idx_assistant_activity_assistant ON assistant_activity_log(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_activity_executive ON assistant_activity_log(executive_id);
CREATE INDEX IF NOT EXISTS idx_assistant_activity_created ON assistant_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assistant_suggestions_relationship ON assistant_suggestions(relationship_id);
CREATE INDEX IF NOT EXISTS idx_assistant_suggestions_executive ON assistant_suggestions(executive_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_assistant_suggestions_status ON assistant_suggestions(status);

-- Enable RLS
ALTER TABLE assistant_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assistant_relationships

-- Executives can view their own relationships
CREATE POLICY "Executives can view their relationships"
  ON assistant_relationships FOR SELECT
  USING (auth.uid() = executive_id);

-- Assistants can view relationships where they are the assistant
CREATE POLICY "Assistants can view their relationships"
  ON assistant_relationships FOR SELECT
  USING (auth.uid() = assistant_id);

-- Executives can create relationships
CREATE POLICY "Executives can invite assistants"
  ON assistant_relationships FOR INSERT
  WITH CHECK (auth.uid() = executive_id);

-- Executives can update their relationships
CREATE POLICY "Executives can update their relationships"
  ON assistant_relationships FOR UPDATE
  USING (auth.uid() = executive_id);

-- Assistants can accept invitations
CREATE POLICY "Assistants can accept invitations"
  ON assistant_relationships FOR UPDATE
  USING (auth.uid() = assistant_id OR (status = 'pending' AND assistant_id IS NULL));

-- RLS Policies for assistant_activity_log

-- Executives can view activity for their assistants
CREATE POLICY "Executives can view assistant activity"
  ON assistant_activity_log FOR SELECT
  USING (auth.uid() = executive_id);

-- Assistants can view their own activity
CREATE POLICY "Assistants can view their own activity"
  ON assistant_activity_log FOR SELECT
  USING (auth.uid() = assistant_id);

-- Assistants can log their actions
CREATE POLICY "Assistants can log actions"
  ON assistant_activity_log FOR INSERT
  WITH CHECK (auth.uid() = assistant_id);

-- RLS Policies for assistant_suggestions

-- Executives can view suggestions for them
CREATE POLICY "Executives can view suggestions"
  ON assistant_suggestions FOR SELECT
  USING (auth.uid() = executive_id);

-- Assistants can view their own suggestions
CREATE POLICY "Assistants can view their suggestions"
  ON assistant_suggestions FOR SELECT
  USING (auth.uid() = assistant_id);

-- Assistants can create suggestions
CREATE POLICY "Assistants can create suggestions"
  ON assistant_suggestions FOR INSERT
  WITH CHECK (auth.uid() = assistant_id);

-- Executives can approve/reject suggestions
CREATE POLICY "Executives can review suggestions"
  ON assistant_suggestions FOR UPDATE
  USING (auth.uid() = executive_id);

-- Functions

-- Generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has permission
CREATE OR REPLACE FUNCTION has_assistant_permission(
  p_assistant_id UUID,
  p_executive_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_permissions JSONB;
  v_status TEXT;
BEGIN
  SELECT permissions, status INTO v_permissions, v_status
  FROM assistant_relationships
  WHERE executive_id = p_executive_id
    AND assistant_id = p_assistant_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN COALESCE((v_permissions->>p_permission)::BOOLEAN, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log assistant activity
CREATE OR REPLACE FUNCTION log_assistant_activity(
  p_relationship_id UUID,
  p_action_type TEXT,
  p_description TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_assistant_id UUID;
  v_executive_id UUID;
BEGIN
  -- Get assistant and executive IDs from relationship
  SELECT assistant_id, executive_id INTO v_assistant_id, v_executive_id
  FROM assistant_relationships
  WHERE id = p_relationship_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid relationship ID';
  END IF;

  INSERT INTO assistant_activity_log (
    relationship_id,
    assistant_id,
    executive_id,
    action_type,
    target_type,
    target_id,
    changes,
    description
  ) VALUES (
    p_relationship_id,
    v_assistant_id,
    v_executive_id,
    p_action_type,
    p_target_type,
    p_target_id,
    p_changes,
    p_description
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept assistant invitation
CREATE OR REPLACE FUNCTION accept_assistant_invitation(
  p_invitation_token TEXT
)
RETURNS UUID AS $$
DECLARE
  v_relationship_id UUID;
  v_assistant_email TEXT;
  v_user_email TEXT;
BEGIN
  -- Get user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Find and validate invitation
  SELECT id, assistant_email INTO v_relationship_id, v_assistant_email
  FROM assistant_relationships
  WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND invitation_expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Verify email matches
  IF LOWER(v_assistant_email) != LOWER(v_user_email) THEN
    RAISE EXCEPTION 'This invitation is for a different email address';
  END IF;

  -- Accept invitation
  UPDATE assistant_relationships
  SET
    assistant_id = auth.uid(),
    status = 'active',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_relationship_id;

  RETURN v_relationship_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active assistants for executive
CREATE OR REPLACE FUNCTION get_executive_assistants(p_executive_id UUID)
RETURNS TABLE (
  relationship_id UUID,
  assistant_id UUID,
  assistant_email TEXT,
  permissions JSONB,
  accepted_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id as relationship_id,
    ar.assistant_id,
    ar.assistant_email,
    ar.permissions,
    ar.accepted_at,
    MAX(aal.created_at) as last_activity
  FROM assistant_relationships ar
  LEFT JOIN assistant_activity_log aal ON aal.relationship_id = ar.id
  WHERE ar.executive_id = p_executive_id
    AND ar.status = 'active'
  GROUP BY ar.id, ar.assistant_id, ar.assistant_email, ar.permissions, ar.accepted_at
  ORDER BY ar.accepted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assistant_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assistant_relationships_updated_at
  BEFORE UPDATE ON assistant_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_relationships_updated_at();

CREATE TRIGGER assistant_suggestions_updated_at
  BEFORE UPDATE ON assistant_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_relationships_updated_at();
