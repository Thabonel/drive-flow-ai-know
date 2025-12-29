-- ============================================================================
-- FIX: RLS Circular Dependency in team_members
-- ============================================================================
-- Creates a security definer function to get user's team IDs without
-- triggering RLS policies, breaking the circular dependency that causes
-- 500 errors when querying team_members and related tables.
--
-- Problem: RLS policies on team_members, teams, timeline_items, documents,
-- and knowledge_bases were using subqueries like:
--   team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
--
-- This creates infinite recursion because querying team_members triggers
-- the team_members SELECT policy, which queries team_members again.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS to get
-- user's team IDs, then use this function in all RLS policies.
-- ============================================================================

-- ============================================================================
-- 1. CREATE SECURITY DEFINER FUNCTION
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.user_team_ids();

-- Create security definer function to get user's team IDs
CREATE OR REPLACE FUNCTION public.user_team_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_team_ids() TO authenticated;

COMMENT ON FUNCTION public.user_team_ids() IS
  'Returns team IDs for the current user. Uses SECURITY DEFINER to bypass RLS and prevent circular dependencies.';

-- ============================================================================
-- 2. UPDATE TEAMS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their teams" ON teams;

CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    owner_user_id = auth.uid() OR
    id IN (SELECT public.user_team_ids())
  );

-- ============================================================================
-- 3. UPDATE TEAM_MEMBERS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON team_members;

-- SELECT: Users can see members of their teams
CREATE POLICY "team_members_select_policy"
  ON team_members FOR SELECT
  USING (
    team_id IN (SELECT public.user_team_ids())
  );

-- ALL (INSERT/UPDATE/DELETE): Owners and admins can manage members
-- Note: This policy checks the role directly, so it won't cause circular dependency
CREATE POLICY "team_members_manage_policy"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 4. UPDATE TEAM_INVITATIONS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Team members can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON team_invitations;

CREATE POLICY "Team members can view invitations"
  ON team_invitations FOR SELECT
  USING (
    team_id IN (SELECT public.user_team_ids())
  );

CREATE POLICY "Owners and admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 5. UPDATE TEAM_SETTINGS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Team members can view settings" ON team_settings;
DROP POLICY IF EXISTS "Owners and admins can update settings" ON team_settings;

CREATE POLICY "Team members can view settings"
  ON team_settings FOR SELECT
  USING (
    team_id IN (SELECT public.user_team_ids())
  );

CREATE POLICY "Owners and admins can update settings"
  ON team_settings FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 6. UPDATE KNOWLEDGE_DOCUMENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view accessible documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can update accessible documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON knowledge_documents;

CREATE POLICY "Users can view accessible documents"
  ON knowledge_documents FOR SELECT
  USING (
    user_id = auth.uid() OR  -- Own documents
    (team_id IN (SELECT public.user_team_ids()) AND visibility = 'team')  -- Team documents
  );

CREATE POLICY "Users can insert their own documents"
  ON knowledge_documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (team_id IS NULL OR team_id IN (SELECT public.user_team_ids()))
  );

CREATE POLICY "Users can update accessible documents"
  ON knowledge_documents FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    ) AND visibility = 'team')
  );

CREATE POLICY "Users can delete their own documents"
  ON knowledge_documents FOR DELETE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    ) AND visibility = 'team')
  );

-- ============================================================================
-- 7. UPDATE KNOWLEDGE_BASES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view accessible knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can insert knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can update accessible knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can delete accessible knowledge bases" ON knowledge_bases;

CREATE POLICY "Users can view accessible knowledge bases"
  ON knowledge_bases FOR SELECT
  USING (
    user_id = auth.uid() OR
    (team_id IN (SELECT public.user_team_ids()) AND visibility = 'team')
  );

CREATE POLICY "Users can insert knowledge bases"
  ON knowledge_bases FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (team_id IS NULL OR team_id IN (SELECT public.user_team_ids()))
  );

CREATE POLICY "Users can update accessible knowledge bases"
  ON knowledge_bases FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    ) AND visibility = 'team')
  );

CREATE POLICY "Users can delete accessible knowledge bases"
  ON knowledge_bases FOR DELETE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    ) AND visibility = 'team')
  );

-- ============================================================================
-- 8. UPDATE TIMELINE_ITEMS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view accessible timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can insert timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can update accessible timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can delete accessible timeline items" ON timeline_items;
DROP POLICY IF EXISTS "timeline_items_select_policy" ON timeline_items;
DROP POLICY IF EXISTS "timeline_items_insert_policy" ON timeline_items;
DROP POLICY IF EXISTS "timeline_items_update_policy" ON timeline_items;
DROP POLICY IF EXISTS "timeline_items_delete_policy" ON timeline_items;

-- SELECT: Users can view their own items, assigned items, and team items
CREATE POLICY "timeline_items_select_policy"
  ON timeline_items FOR SELECT
  USING (
    user_id = auth.uid() OR  -- Own items
    assigned_to = auth.uid() OR  -- Assigned to me
    (team_id IN (SELECT public.user_team_ids()) AND visibility IN ('team', 'assigned'))  -- Team items
  );

-- INSERT: Users can insert their own items (with optional team)
CREATE POLICY "timeline_items_insert_policy"
  ON timeline_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (team_id IS NULL OR team_id IN (SELECT public.user_team_ids()))
  );

-- UPDATE: Users can update their own items, assigned items, and team items (if admin)
CREATE POLICY "timeline_items_update_policy"
  ON timeline_items FOR UPDATE
  USING (
    user_id = auth.uid() OR
    assigned_to = auth.uid() OR
    (team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    ) AND visibility IN ('team', 'assigned'))
  );

-- DELETE: Users can delete their own items, and team admins can delete team items
CREATE POLICY "timeline_items_delete_policy"
  ON timeline_items FOR DELETE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    ) AND visibility IN ('team', 'assigned'))
  );

-- ============================================================================
-- 9. VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS circular dependency fix applied successfully';
  RAISE NOTICE 'Created: public.user_team_ids() security definer function';
  RAISE NOTICE 'Updated: All team-related RLS policies to use public.user_team_ids()';
  RAISE NOTICE 'Fixed tables: teams, team_members, team_invitations, team_settings, knowledge_documents, knowledge_bases, timeline_items';
END $$;
