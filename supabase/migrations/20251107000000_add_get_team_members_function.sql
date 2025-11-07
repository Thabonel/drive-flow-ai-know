-- Add function to get team members with user information
-- This bypasses RLS to safely expose user email/metadata to team members

CREATE OR REPLACE FUNCTION get_team_members_with_users(p_team_id UUID)
RETURNS TABLE (
  id UUID,
  team_id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  invited_by UUID,
  created_at TIMESTAMPTZ,
  user_email TEXT,
  user_full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.id,
    tm.team_id,
    tm.user_id,
    tm.role,
    tm.joined_at,
    tm.invited_by,
    tm.created_at,
    u.email AS user_email,
    u.raw_user_meta_data->>'full_name' AS user_full_name
  FROM team_members tm
  LEFT JOIN auth.users u ON u.id = tm.user_id
  WHERE tm.team_id = p_team_id
  ORDER BY tm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_team_members_with_users(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_team_members_with_users IS 'Returns team members with basic user information (email, full name). Uses SECURITY DEFINER to safely access auth.users.';
