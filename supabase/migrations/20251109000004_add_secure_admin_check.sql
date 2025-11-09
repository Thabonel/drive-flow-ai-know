-- Secure Admin Authorization
-- This migration adds a SECURITY DEFINER function for admin checks

-- Create or replace the admin check function
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user exists in user_roles table with admin role
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = 'admin'
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.is_user_admin IS 'Securely checks if a user has admin role. Uses SECURITY DEFINER to bypass RLS.';

-- Create a helper function to require admin access (throws error if not admin)
CREATE OR REPLACE FUNCTION public.require_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin(p_user_id) THEN
    RAISE EXCEPTION 'Admin access required'
      USING HINT = 'User must have admin role to perform this action',
            ERRCODE = '42501'; -- insufficient_privilege
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.require_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_admin(UUID) TO service_role;

COMMENT ON FUNCTION public.require_admin IS 'Throws an error if the user is not an admin. Use this to guard admin-only operations.';
