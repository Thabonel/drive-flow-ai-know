-- ============================================================================
-- FIX: Circular RLS policy dependency using SECURITY DEFINER function
-- ============================================================================
-- Problem: timeline_items → team_members → teams → team_members (circular!)
-- Solution: Use SECURITY DEFINER function to bypass RLS when checking team membership
-- ============================================================================

-- Drop the problematic teams policy that creates circular reference
DROP POLICY IF EXISTS "Users can view their teams" ON teams;

-- Create a SECURITY DEFINER function that bypasses RLS when querying team_members
-- This breaks the circular reference because it doesn't trigger RLS policies
CREATE OR REPLACE FUNCTION get_user_team_ids(input_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id
  FROM team_members
  WHERE user_id = input_user_id
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_team_ids(UUID) TO authenticated;

-- Recreate teams policies using the SECURITY DEFINER function
-- This prevents the circular reference while maintaining full team functionality
CREATE POLICY "Users can view teams they own"
  ON teams FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can view teams they belong to"
  ON teams FOR SELECT
  USING (id IN (SELECT get_user_team_ids(auth.uid())));

-- Comment explaining the solution for future reference
COMMENT ON FUNCTION get_user_team_ids IS
  'Returns team IDs for a user. Uses SECURITY DEFINER to bypass RLS and prevent circular policy references.';
