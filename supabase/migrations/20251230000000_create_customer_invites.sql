-- Customer Invites System
-- Allows admins to generate magic link invites for free Executive accounts

-- Customer invites table
CREATE TABLE IF NOT EXISTS customer_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Who created this invite
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Optional: pre-assign to specific email
  assigned_email TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'used', 'expired', 'cancelled', 'archived')
  ),

  -- Usage tracking
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,

  -- Plan to grant (always executive for customer invites)
  plan_tier TEXT NOT NULL DEFAULT 'executive' CHECK (
    plan_tier IN ('free', 'ai_starter', 'professional', 'executive')
  ),

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Metadata for tracking source, campaign, etc.
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_invites_token ON customer_invites(invite_token);
CREATE INDEX idx_customer_invites_status ON customer_invites(status);
CREATE INDEX idx_customer_invites_created_by ON customer_invites(created_by);
CREATE INDEX idx_customer_invites_expires_at ON customer_invites(expires_at);

-- RLS Policies
ALTER TABLE customer_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view all invites
CREATE POLICY "Admins can view all customer invites"
  ON customer_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can create invites
CREATE POLICY "Admins can create customer invites"
  ON customer_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can update invites (cancel, etc.)
CREATE POLICY "Admins can update customer invites"
  ON customer_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_customer_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_invites_updated_at
  BEFORE UPDATE ON customer_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_invites_updated_at();

-- Function to check if invite is valid
CREATE OR REPLACE FUNCTION is_invite_valid(invite_token_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record RECORD;
BEGIN
  SELECT * INTO invite_record
  FROM customer_invites
  WHERE invite_token = invite_token_param;

  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check status
  IF invite_record.status != 'pending' THEN
    RETURN FALSE;
  END IF;

  -- Check expiration
  IF invite_record.expires_at < NOW() THEN
    -- Auto-expire
    UPDATE customer_invites
    SET status = 'expired'
    WHERE invite_token = invite_token_param;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE customer_invites IS 'Magic link invites for free Executive accounts';
COMMENT ON FUNCTION is_invite_valid IS 'Validates invite token and checks expiration';
