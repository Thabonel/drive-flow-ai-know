-- ============================================================================
-- FIX: Infinite recursion in team_members RLS policies
-- ============================================================================
-- Problem: Policies queried team_members table within team_members policies
-- Solution: Use direct checks instead of subqueries on same table
-- ============================================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON team_members;

-- Create fixed policies with direct checks (no self-referencing subqueries)
CREATE POLICY "Users can view their own team memberships"
  ON team_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view members in their teams"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM teams t WHERE t.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can manage members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t WHERE t.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can insert members"
  ON team_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND role = 'admin'
  );

CREATE POLICY "Team admins can update members"
  ON team_members FOR UPDATE
  USING (
    user_id = auth.uid() AND role = 'admin'
  );

CREATE POLICY "Team admins can delete members"
  ON team_members FOR DELETE
  USING (
    user_id = auth.uid() AND role = 'admin'
  );
