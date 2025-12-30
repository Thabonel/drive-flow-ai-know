-- ============================================================================
-- FIX: Infinite recursion in teams/team_members RLS policies
-- ============================================================================
-- Problem: teams policy queries team_members, which joins back to teams
-- Solution: Use SECURITY DEFINER function to break recursion cycle
-- ============================================================================

-- Drop the problematic policy on teams
DROP POLICY IF EXISTS "Users can view teams they belong to or open teams" ON teams;

-- Create security definer function to check team membership (breaks recursion)
CREATE OR REPLACE FUNCTION is_team_member(team_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.team_id = team_id_param
      AND tm.user_id = user_id_param
  );
END;
$$;

-- Create new non-recursive policy on teams
CREATE POLICY "Users can view teams they belong to or open teams"
  ON teams FOR SELECT
  USING (
    -- User owns the team
    owner_user_id = auth.uid()
    -- OR user is a member (using security definer function - no recursion)
    OR is_team_member(id, auth.uid())
    -- OR team is open (discoverable)
    OR privacy_mode = 'open'
  );

-- Ensure team_members policies are optimal (from previous fix)
DROP POLICY IF EXISTS "Users can view their own team memberships" ON team_members;
DROP POLICY IF EXISTS "Users can view members in their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON team_members;
DROP POLICY IF EXISTS "Team admins can insert members" ON team_members;
DROP POLICY IF EXISTS "Team admins can update members" ON team_members;
DROP POLICY IF EXISTS "Team admins can delete members" ON team_members;

-- Recreate team_members policies (these are fine, just ensuring they exist)
CREATE POLICY "Users can view their own team memberships"
  ON team_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view members in their teams via ownership"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM teams t WHERE t.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can manage all members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t WHERE t.owner_user_id = auth.uid()
    )
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_team_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_member(UUID, UUID) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION is_team_member IS 'Security definer function to check team membership without triggering RLS recursion';
