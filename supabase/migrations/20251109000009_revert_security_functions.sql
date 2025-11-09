-- Revert security functions added in migrations 004 and 005
-- This removes the admin authorization and token hashing features

-- Drop admin authorization functions
DROP FUNCTION IF EXISTS public.require_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_user_admin(UUID) CASCADE;

-- Drop invitation token hashing functions
DROP FUNCTION IF EXISTS public.generate_invitation_token() CASCADE;
DROP FUNCTION IF EXISTS public.hash_invitation_token(TEXT) CASCADE;

-- Drop hashed_token column from team_invitations if it exists
-- (Safe to run even if column doesn't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_invitations'
      AND column_name = 'hashed_token'
  ) THEN
    ALTER TABLE public.team_invitations DROP COLUMN hashed_token;
  END IF;
END $$;

-- Verify cleanup
SELECT
  'Security functions removed successfully' as status,
  NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_user_admin'
  ) as is_user_admin_removed,
  NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'require_admin'
  ) as require_admin_removed,
  NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'hash_invitation_token'
  ) as hash_invitation_token_removed,
  NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'generate_invitation_token'
  ) as generate_invitation_token_removed,
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_invitations'
      AND column_name = 'hashed_token'
  ) as hashed_token_column_removed;
