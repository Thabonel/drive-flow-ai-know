-- Multi-Team Support Migration
-- Enables Business tier users to have unlimited teams with additional team purchases

-- ============================================================================
-- 1. Add privacy mode to teams table
-- ============================================================================
ALTER TABLE teams
ADD COLUMN privacy_mode TEXT DEFAULT 'private'
CHECK (privacy_mode IN ('private', 'open'));

COMMENT ON COLUMN teams.privacy_mode IS 'Controls team visibility: private (invite-only) or open (discoverable)';

-- ============================================================================
-- 2. Create team_subscriptions table (decouples team billing from user_subscriptions)
-- ============================================================================
CREATE TABLE team_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  is_primary_team BOOLEAN DEFAULT FALSE,  -- First team included with Business subscription
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_subscriptions_user ON team_subscriptions(user_id);
CREATE INDEX idx_team_subscriptions_team ON team_subscriptions(team_id);
CREATE INDEX idx_team_subscriptions_stripe ON team_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON TABLE team_subscriptions IS 'Tracks team billing separately from user subscriptions to support multiple teams per user';
COMMENT ON COLUMN team_subscriptions.is_primary_team IS 'TRUE for first team (included with Business sub), FALSE for additional purchased teams';
COMMENT ON COLUMN team_subscriptions.stripe_subscription_id IS 'NULL for primary team (uses main subscription), set for additional teams';

-- Enable RLS
ALTER TABLE team_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own team subscriptions
CREATE POLICY "Users can view their own team subscriptions"
  ON team_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Team owners can view team subscription details
CREATE POLICY "Team owners can view team subscriptions"
  ON team_subscriptions FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. Add active team tracking to user_settings
-- ============================================================================
ALTER TABLE user_settings
ADD COLUMN active_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN user_settings.active_team_id IS 'Currently active team for multi-team users (persists across devices)';

-- ============================================================================
-- 4. Migrate existing teams to team_subscriptions
-- ============================================================================
-- All existing teams are considered "primary teams" (included with Business subscription)
INSERT INTO team_subscriptions (team_id, user_id, is_primary_team, status)
SELECT
  id,
  owner_user_id,
  TRUE,  -- All existing teams are primary teams
  'active'
FROM teams
ON CONFLICT DO NOTHING;

-- Set active_team_id for users who have exactly one team (auto-select it)
UPDATE user_settings us
SET active_team_id = (
  SELECT team_id
  FROM team_subscriptions ts
  WHERE ts.user_id = us.user_id
  LIMIT 1
)
WHERE us.user_id IN (
  SELECT user_id
  FROM team_subscriptions
  GROUP BY user_id
  HAVING COUNT(*) = 1
)
AND us.active_team_id IS NULL;

-- ============================================================================
-- 5. Update RLS policies for open teams
-- ============================================================================
-- Drop existing "Users can view their teams" policy if it exists
DROP POLICY IF EXISTS "Users can view their teams" ON teams;

-- Create new policy that allows viewing open teams
CREATE POLICY "Users can view teams they belong to or open teams"
  ON teams FOR SELECT
  USING (
    -- User owns the team
    owner_user_id = auth.uid()
    -- OR user is a member of the team
    OR id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    -- OR team is open (discoverable)
    OR privacy_mode = 'open'
  );

-- ============================================================================
-- 6. Add trigger to auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_team_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_subscription_timestamp
  BEFORE UPDATE ON team_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_team_subscription_timestamp();

-- ============================================================================
-- 7. Add helpful views for team management
-- ============================================================================
-- View: Active teams per user
CREATE OR REPLACE VIEW user_active_teams AS
SELECT
  ts.user_id,
  ts.team_id,
  t.name AS team_name,
  t.slug AS team_slug,
  ts.is_primary_team,
  ts.status,
  ts.stripe_subscription_id,
  t.privacy_mode,
  COUNT(*) OVER (PARTITION BY ts.user_id) AS total_teams
FROM team_subscriptions ts
JOIN teams t ON ts.team_id = t.id
WHERE ts.status = 'active';

COMMENT ON VIEW user_active_teams IS 'Shows all active teams per user with subscription details';
