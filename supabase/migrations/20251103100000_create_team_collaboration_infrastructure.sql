-- ============================================================================
-- TEAM COLLABORATION INFRASTRUCTURE
-- ============================================================================
-- Implements team collaboration features for Business tier:
-- - Shared team documents with unified AI context
-- - Team timeline with task assignment
-- - Team member management with role-based access
--
-- Key Concepts:
-- - "Context is local" - Team knowledge stays within organization
-- - "Context operates at the team level" - All team members share same AI context
-- - "Context fluency" - Entire team speaks same language
-- ============================================================================

-- ============================================================================
-- 1. CORE TEAM TABLES
-- ============================================================================

-- Teams table: One team per Business subscription
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  max_members INTEGER DEFAULT 5,
  slug TEXT UNIQUE, -- For URLs: /team/acme-corp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table: Team membership with roles
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invitations table: Email-based invitation flow
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Team settings table: Team-level preferences
CREATE TABLE IF NOT EXISTS team_settings (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  enable_assistant_features BOOLEAN DEFAULT FALSE,
  allow_member_document_upload BOOLEAN DEFAULT TRUE,
  require_document_approval BOOLEAN DEFAULT FALSE,
  default_document_visibility TEXT DEFAULT 'team' CHECK (default_document_visibility IN ('team', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. MODIFY EXISTING TABLES FOR TEAM SUPPORT
-- ============================================================================

-- Add team ownership to documents
ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'personal'
    CHECK (visibility IN ('personal', 'team')),
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- Add team ownership to knowledge bases
ALTER TABLE knowledge_bases
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'personal'
    CHECK (visibility IN ('personal', 'team')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add team fields to timeline items
ALTER TABLE timeline_items
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'personal'
    CHECK (visibility IN ('personal', 'team', 'assigned')),
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Link subscriptions to teams
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_teams_subscription ON teams(subscription_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(invitation_token);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_team ON knowledge_documents(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_team ON knowledge_bases(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_items_team ON timeline_items(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_items_assigned ON timeline_items(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;

-- Teams: Users can view teams they're members of
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    owner_user_id = auth.uid() OR
    id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Teams: Only owners can update their teams
CREATE POLICY "Team owners can update teams"
  ON teams FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Teams: Only owners can delete their teams
CREATE POLICY "Team owners can delete teams"
  ON teams FOR DELETE
  USING (owner_user_id = auth.uid());

-- Teams: Users can create teams (service role will validate subscription)
CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Team Members: Users can view members of their teams
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Team Members: Owners and admins can manage team members
CREATE POLICY "Owners and admins can manage members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Team Invitations: Team members can view pending invitations
CREATE POLICY "Team members can view invitations"
  ON team_invitations FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Team Invitations: Owners and admins can create invitations
CREATE POLICY "Owners and admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Team Invitations: Anyone can accept via token (handled by function)
CREATE POLICY "Service role can manage invitations"
  ON team_invitations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Team Settings: Team members can view settings
CREATE POLICY "Team members can view settings"
  ON team_settings FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Team Settings: Owners and admins can update settings
CREATE POLICY "Owners and admins can update settings"
  ON team_settings FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 5. UPDATE RLS POLICIES FOR EXISTING TABLES
-- ============================================================================

-- Documents: Update RLS to allow team access
DROP POLICY IF EXISTS "Users can manage their own documents" ON knowledge_documents;

CREATE POLICY "Users can view accessible documents"
  ON knowledge_documents FOR SELECT
  USING (
    user_id = auth.uid() OR  -- Own documents
    (team_id IN (  -- Team documents
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ) AND visibility = 'team')
  );

CREATE POLICY "Users can insert their own documents"
  ON knowledge_documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (team_id IS NULL OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update accessible documents"
  ON knowledge_documents FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND visibility = 'team')
  );

CREATE POLICY "Users can delete their own documents"
  ON knowledge_documents FOR DELETE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND visibility = 'team')
  );

-- Knowledge Bases: Update RLS to allow team access
DROP POLICY IF EXISTS "Users can manage their own knowledge bases" ON knowledge_bases;

CREATE POLICY "Users can view accessible knowledge bases"
  ON knowledge_bases FOR SELECT
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ) AND visibility = 'team')
  );

CREATE POLICY "Users can insert knowledge bases"
  ON knowledge_bases FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (team_id IS NULL OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update accessible knowledge bases"
  ON knowledge_bases FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND visibility = 'team')
  );

CREATE POLICY "Users can delete accessible knowledge bases"
  ON knowledge_bases FOR DELETE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND visibility = 'team')
  );

-- Timeline Items: Update RLS to allow team access
DROP POLICY IF EXISTS "Users can manage their own timeline items" ON timeline_items;

CREATE POLICY "Users can view accessible timeline items"
  ON timeline_items FOR SELECT
  USING (
    user_id = auth.uid() OR  -- Own items
    assigned_to = auth.uid() OR  -- Assigned to me
    (team_id IN (  -- Team items
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ) AND visibility IN ('team', 'assigned'))
  );

CREATE POLICY "Users can insert timeline items"
  ON timeline_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (team_id IS NULL OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update accessible timeline items"
  ON timeline_items FOR UPDATE
  USING (
    user_id = auth.uid() OR
    assigned_to = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND visibility IN ('team', 'assigned'))
  );

CREATE POLICY "Users can delete accessible timeline items"
  ON timeline_items FOR DELETE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND visibility IN ('team', 'assigned'))
  );

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get user's teams
CREATE OR REPLACE FUNCTION get_user_teams(p_user_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  user_role TEXT,
  member_count BIGINT,
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    tm.role AS user_role,
    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count,
    (t.owner_user_id = p_user_id) AS is_owner
  FROM teams t
  INNER JOIN team_members tm ON tm.team_id = t.id
  WHERE tm.user_id = p_user_id
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is team member
CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has role
CREATE OR REPLACE FUNCTION has_team_role(p_team_id UUID, p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is owner or admin
CREATE OR REPLACE FUNCTION is_team_admin(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

CREATE TRIGGER set_team_settings_updated_at
  BEFORE UPDATE ON team_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- Auto-create team_settings when team is created
CREATE OR REPLACE FUNCTION create_team_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_settings (team_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_team_settings
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_team_settings();

-- Auto-add team owner as member
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.owner_user_id, 'owner', NEW.owner_user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_add_owner_as_member
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE teams IS 'Teams/organizations for Business tier. One team per subscription.';
COMMENT ON TABLE team_members IS 'Team membership with roles (owner, admin, member, viewer).';
COMMENT ON TABLE team_invitations IS 'Email-based team invitations with token validation.';
COMMENT ON TABLE team_settings IS 'Team-level preferences and feature flags.';

COMMENT ON COLUMN knowledge_documents.team_id IS 'Team ownership for shared documents. NULL = personal document.';
COMMENT ON COLUMN knowledge_documents.visibility IS 'Document visibility: personal (only owner) or team (all team members).';
COMMENT ON COLUMN knowledge_bases.team_id IS 'Team ownership for shared knowledge bases. NULL = personal KB.';
COMMENT ON COLUMN timeline_items.team_id IS 'Team ownership for shared timeline items.';
COMMENT ON COLUMN timeline_items.visibility IS 'Item visibility: personal, team (all members see), or assigned (assignee + admin see).';
COMMENT ON COLUMN timeline_items.assigned_to IS 'User assigned to this timeline item/task.';
