-- ============================================================================
-- FIX TIMELINE ITEMS RLS POLICIES
-- ============================================================================
-- This migration fixes duplicate/conflicting RLS policies on timeline_items
-- that were preventing users from deleting their own timeline items.
--
-- Problem: Multiple DELETE policies with slightly different names caused
-- confusion and potential conflicts. The old policy names didn't match
-- what was being dropped in later migrations.
-- ============================================================================

-- Drop ALL existing policies on timeline_items to start fresh
DROP POLICY IF EXISTS "Users can view their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can insert their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can update their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can delete their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can manage their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can view accessible timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can insert timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can update accessible timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can delete accessible timeline items" ON timeline_items;

-- ============================================================================
-- CREATE CLEAN, COMPREHENSIVE RLS POLICIES
-- ============================================================================

-- SELECT: Users can view their own items, assigned items, and team items
CREATE POLICY "timeline_items_select_policy"
  ON timeline_items FOR SELECT
  USING (
    user_id = auth.uid() OR  -- Own items
    assigned_to = auth.uid() OR  -- Assigned to me
    (team_id IN (  -- Team items
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ) AND visibility IN ('team', 'assigned'))
  );

-- INSERT: Users can insert their own items (with optional team)
CREATE POLICY "timeline_items_insert_policy"
  ON timeline_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (team_id IS NULL OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  );

-- UPDATE: Users can update their own items, assigned items, and team items (if admin)
CREATE POLICY "timeline_items_update_policy"
  ON timeline_items FOR UPDATE
  USING (
    user_id = auth.uid() OR
    assigned_to = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND visibility IN ('team', 'assigned'))
  );

-- DELETE: Users can delete their own items, and team admins can delete team items
CREATE POLICY "timeline_items_delete_policy"
  ON timeline_items FOR DELETE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND visibility IN ('team', 'assigned'))
  );

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================

-- Show all policies on timeline_items (for debugging)
DO $$
BEGIN
  RAISE NOTICE 'Timeline items RLS policies have been reset';
  RAISE NOTICE 'New policies: timeline_items_select_policy, timeline_items_insert_policy, timeline_items_update_policy, timeline_items_delete_policy';
END $$;
