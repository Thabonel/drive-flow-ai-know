-- Fix auth.users access for assistant relationships
-- The previous security fix broke queries that need to join with auth.users
-- This creates a safe view that exposes only necessary user data

-- ============================================================================
-- Create a secure view for user profiles accessible via assistant relationships
-- ============================================================================

CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data
FROM auth.users u
WHERE
  -- Users can see their own profile
  u.id = auth.uid()
  OR
  -- Users can see profiles of their assistants
  u.id IN (
    SELECT assistant_id
    FROM assistant_relationships
    WHERE executive_id = auth.uid()
  )
  OR
  -- Users can see profiles of their executives
  u.id IN (
    SELECT executive_id
    FROM assistant_relationships
    WHERE assistant_id = auth.uid()
  );

-- Enable RLS on the view
ALTER VIEW user_profiles SET (security_barrier = true);

-- Grant access to authenticated users only
GRANT SELECT ON user_profiles TO authenticated;

-- ============================================================================
-- Update assistant_relationships RLS policies to allow joining with user_profiles
-- ============================================================================

-- The existing RLS policies are fine, but we need to ensure the view can be used
-- No changes needed to assistant_relationships policies

-- ============================================================================
-- Add helpful comment
-- ============================================================================

COMMENT ON VIEW public.user_profiles IS
'Secure view that exposes user profile data only for users connected via assistant relationships.
Uses RLS-like filtering in the WHERE clause to ensure users can only see:
1. Their own profile
2. Profiles of their assistants
3. Profiles of their executives';
