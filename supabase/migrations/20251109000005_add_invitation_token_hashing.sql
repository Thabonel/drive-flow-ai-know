-- Secure Team Invitation Tokens with Hashing
-- This migration adds hashed token storage for team invitations

-- Enable pgcrypto extension for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add hashed_token column (we'll phase out plain token storage)
ALTER TABLE team_invitations
  ADD COLUMN IF NOT EXISTS hashed_token TEXT UNIQUE;

-- Create a function to hash invitation tokens
CREATE OR REPLACE FUNCTION public.hash_invitation_token(token TEXT)
RETURNS TEXT
AS $$
BEGIN
  -- Use SHA-256 for hashing
  RETURN encode(digest(token, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to generate and hash a new invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TABLE(plain_token TEXT, hashed_token TEXT)
AS $$
DECLARE
  v_plain_token TEXT;
  v_hashed_token TEXT;
BEGIN
  -- Generate a random 32-byte token
  v_plain_token := encode(gen_random_bytes(32), 'hex');

  -- Hash the token
  v_hashed_token := public.hash_invitation_token(v_plain_token);

  RETURN QUERY SELECT v_plain_token, v_hashed_token;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.hash_invitation_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_invitation_token() TO service_role;

-- Add index on hashed_token for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_hashed_token
  ON team_invitations(hashed_token);

-- Add comments
COMMENT ON COLUMN team_invitations.hashed_token IS 'SHA-256 hash of invitation token. Only the hash is stored for security.';
COMMENT ON FUNCTION public.hash_invitation_token IS 'Hashes an invitation token using SHA-256';
COMMENT ON FUNCTION public.generate_invitation_token IS 'Generates a random token and returns both plain and hashed versions';
