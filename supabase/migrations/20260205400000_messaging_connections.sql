-- Messaging Connections: Telegram and Slack user connections
-- Created: 2026-02-05
-- Purpose: Store user connections to messaging platforms for the Living AI Assistant

-- =============================================================================
-- PART 1: User messaging connections table
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_messaging_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'slack')),

  -- Telegram-specific fields
  telegram_chat_id TEXT,
  telegram_username TEXT,

  -- Slack-specific fields
  slack_team_id TEXT,
  slack_team_name TEXT,
  slack_channel_id TEXT,
  slack_channel_name TEXT,
  slack_bot_token TEXT, -- Encrypted in production
  slack_user_id TEXT,

  -- Connection metadata
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Settings per connection
  settings JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one connection per platform per user
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- =============================================================================
-- PART 2: Messaging link tokens (for connecting accounts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS messaging_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'slack')),
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one active token per platform per user
  CONSTRAINT unique_user_platform_token UNIQUE (user_id, platform)
);

-- =============================================================================
-- PART 3: Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_messaging_connections_user ON user_messaging_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_messaging_connections_platform ON user_messaging_connections(platform);
CREATE INDEX IF NOT EXISTS idx_messaging_connections_telegram_chat ON user_messaging_connections(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messaging_connections_slack_team ON user_messaging_connections(slack_team_id) WHERE slack_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_link_tokens_token ON messaging_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_link_tokens_expires ON messaging_link_tokens(expires_at);

-- =============================================================================
-- PART 4: RLS Policies
-- =============================================================================
ALTER TABLE user_messaging_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_link_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own connections
CREATE POLICY "Users can view own messaging connections"
  ON user_messaging_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own messaging connections"
  ON user_messaging_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all connections
CREATE POLICY "Service role can manage all messaging connections"
  ON user_messaging_connections FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can view their own link tokens
CREATE POLICY "Users can view own link tokens"
  ON messaging_link_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create/update their own link tokens
CREATE POLICY "Users can manage own link tokens"
  ON messaging_link_tokens FOR ALL
  USING (auth.uid() = user_id);

-- Service role can manage all link tokens
CREATE POLICY "Service role can manage all link tokens"
  ON messaging_link_tokens FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- PART 5: Helper functions
-- =============================================================================

-- Verify and consume a link token
CREATE OR REPLACE FUNCTION verify_messaging_link_token(
  p_platform TEXT,
  p_token TEXT
)
RETURNS TABLE (
  user_id UUID,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Find the token
  SELECT lt.user_id, lt.expires_at, lt.used_at
  INTO v_token_record
  FROM messaging_link_tokens lt
  WHERE lt.platform = p_platform
    AND lt.token = p_token;

  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Invalid token'::TEXT;
    RETURN;
  END IF;

  -- Token already used
  IF v_token_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Token already used'::TEXT;
    RETURN;
  END IF;

  -- Token expired
  IF v_token_record.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Token expired'::TEXT;
    RETURN;
  END IF;

  -- Mark token as used
  UPDATE messaging_link_tokens
  SET used_at = NOW()
  WHERE platform = p_platform AND token = p_token;

  -- Return success
  RETURN QUERY SELECT v_token_record.user_id, TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connect a messaging platform to a user
CREATE OR REPLACE FUNCTION connect_messaging_platform(
  p_user_id UUID,
  p_platform TEXT,
  p_telegram_chat_id TEXT DEFAULT NULL,
  p_telegram_username TEXT DEFAULT NULL,
  p_slack_team_id TEXT DEFAULT NULL,
  p_slack_team_name TEXT DEFAULT NULL,
  p_slack_channel_id TEXT DEFAULT NULL,
  p_slack_channel_name TEXT DEFAULT NULL,
  p_slack_bot_token TEXT DEFAULT NULL,
  p_slack_user_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_connection_id UUID;
BEGIN
  INSERT INTO user_messaging_connections (
    user_id,
    platform,
    telegram_chat_id,
    telegram_username,
    slack_team_id,
    slack_team_name,
    slack_channel_id,
    slack_channel_name,
    slack_bot_token,
    slack_user_id,
    connected_at
  ) VALUES (
    p_user_id,
    p_platform,
    p_telegram_chat_id,
    p_telegram_username,
    p_slack_team_id,
    p_slack_team_name,
    p_slack_channel_id,
    p_slack_channel_name,
    p_slack_bot_token,
    p_slack_user_id,
    NOW()
  )
  ON CONFLICT (user_id, platform) DO UPDATE SET
    telegram_chat_id = COALESCE(EXCLUDED.telegram_chat_id, user_messaging_connections.telegram_chat_id),
    telegram_username = COALESCE(EXCLUDED.telegram_username, user_messaging_connections.telegram_username),
    slack_team_id = COALESCE(EXCLUDED.slack_team_id, user_messaging_connections.slack_team_id),
    slack_team_name = COALESCE(EXCLUDED.slack_team_name, user_messaging_connections.slack_team_name),
    slack_channel_id = COALESCE(EXCLUDED.slack_channel_id, user_messaging_connections.slack_channel_id),
    slack_channel_name = COALESCE(EXCLUDED.slack_channel_name, user_messaging_connections.slack_channel_name),
    slack_bot_token = COALESCE(EXCLUDED.slack_bot_token, user_messaging_connections.slack_bot_token),
    slack_user_id = COALESCE(EXCLUDED.slack_user_id, user_messaging_connections.slack_user_id),
    connected_at = NOW(),
    is_active = TRUE,
    updated_at = NOW()
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user by Telegram chat ID
CREATE OR REPLACE FUNCTION get_user_by_telegram_chat_id(p_chat_id TEXT)
RETURNS UUID AS $$
  SELECT user_id FROM user_messaging_connections
  WHERE platform = 'telegram' AND telegram_chat_id = p_chat_id AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get user by Slack team and channel
CREATE OR REPLACE FUNCTION get_user_by_slack_channel(p_team_id TEXT, p_channel_id TEXT)
RETURNS UUID AS $$
  SELECT user_id FROM user_messaging_connections
  WHERE platform = 'slack'
    AND slack_team_id = p_team_id
    AND (slack_channel_id = p_channel_id OR slack_channel_id IS NULL)
    AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Update last message timestamp
CREATE OR REPLACE FUNCTION update_messaging_last_message(
  p_user_id UUID,
  p_platform TEXT
)
RETURNS VOID AS $$
  UPDATE user_messaging_connections
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE user_id = p_user_id AND platform = p_platform;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- PART 6: Pending Slack connections (for OAuth flow)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pending_slack_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  team_id TEXT,
  team_name TEXT,
  bot_token TEXT,
  bot_user_id TEXT,
  authed_user_id TEXT,
  channel_id TEXT,
  channel_name TEXT,
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_slack_state ON pending_slack_connections(state);
CREATE INDEX IF NOT EXISTS idx_pending_slack_expires ON pending_slack_connections(expires_at);

-- Service role only for pending connections
ALTER TABLE pending_slack_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage pending slack connections"
  ON pending_slack_connections FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Cleanup expired pending connections (can be run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_connections()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pending_slack_connections
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM messaging_link_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
