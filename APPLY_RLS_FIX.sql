-- ============================================================================
-- APPLY THIS MANUALLY IN SUPABASE SQL EDITOR
-- ============================================================================
-- Instructions:
-- 1. Go to https://supabase.com/dashboard/project/your-project-id/sql
-- 2. Copy this entire file
-- 3. Paste into the SQL Editor
-- 4. Click "Run" button
-- 5. Verify you see success message
-- 6. Test deleting timeline items in your app
-- ============================================================================

-- Drop ALL existing RLS policies on timeline_items
DROP POLICY IF EXISTS "Users can view their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can insert their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can update their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can delete their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can manage their own timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can view accessible timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can insert timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can update accessible timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Users can delete accessible timeline items" ON timeline_items;

-- Create clean, comprehensive RLS policies
CREATE POLICY "timeline_items_select_policy"
  ON timeline_items FOR SELECT
  USING (
    user_id = auth.uid() OR
    assigned_to = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ) AND visibility IN ('team', 'assigned'))
  );

CREATE POLICY "timeline_items_insert_policy"
  ON timeline_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (team_id IS NULL OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  );

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

CREATE POLICY "timeline_items_delete_policy"
  ON timeline_items FOR DELETE
  USING (
    user_id = auth.uid() OR
    (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND visibility IN ('team', 'assigned'))
  );

-- Success!
SELECT 'RLS policies fixed! Timeline items can now be deleted properly.' AS status;
