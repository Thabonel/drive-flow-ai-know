-- Living Assistant: Autonomy Safeguard System
-- Created: 2026-02-05
-- Purpose: 2-hour autonomy sessions with user confirmation

-- =============================================================================
-- PART 1: Enhance autonomy_sessions table (already created in Phase 2)
-- =============================================================================

-- Add confirmation tracking columns if not exists
DO $$
BEGIN
  -- Add confirmation_requested_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'autonomy_sessions' AND column_name = 'confirmation_requested_at'
  ) THEN
    ALTER TABLE autonomy_sessions ADD COLUMN confirmation_requested_at TIMESTAMPTZ;
  END IF;

  -- Add confirmation_message_id for tracking Telegram message
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'autonomy_sessions' AND column_name = 'confirmation_message_id'
  ) THEN
    ALTER TABLE autonomy_sessions ADD COLUMN confirmation_message_id TEXT;
  END IF;

  -- Add channel type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'autonomy_sessions' AND column_name = 'channel'
  ) THEN
    ALTER TABLE autonomy_sessions ADD COLUMN channel TEXT DEFAULT 'telegram';
  END IF;
END $$;

-- =============================================================================
-- PART 2: Pending confirmations table
-- =============================================================================
CREATE TABLE IF NOT EXISTS pending_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Confirmation type
  confirmation_type TEXT NOT NULL CHECK (confirmation_type IN (
    'autonomy_start',      -- Start new autonomy session
    'autonomy_extend',     -- Extend existing session
    'action_approval',     -- Approve specific action
    'bulk_action'          -- Approve bulk operation
  )),

  -- What needs confirmation
  action_description TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',

  -- Where to send confirmation
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'slack')),
  channel_id TEXT NOT NULL,
  message_id TEXT, -- Platform-specific message ID for updating

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Waiting for user response
    'approved',   -- User approved
    'denied',     -- User denied
    'expired',    -- Timed out
    'cancelled'   -- System cancelled
  )),

  -- Response tracking
  responded_at TIMESTAMPTZ,
  response_data JSONB,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 3: Action rate limiting
-- =============================================================================
CREATE TABLE IF NOT EXISTS action_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rate limit window
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),

  -- Counters
  messages_sent INTEGER NOT NULL DEFAULT 0,
  actions_taken INTEGER NOT NULL DEFAULT 0,
  api_calls_made INTEGER NOT NULL DEFAULT 0,

  -- Limits (configurable per user)
  max_messages_per_hour INTEGER NOT NULL DEFAULT 20,
  max_actions_per_hour INTEGER NOT NULL DEFAULT 50,
  max_api_calls_per_hour INTEGER NOT NULL DEFAULT 100,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 4: Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_user ON pending_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_status ON pending_confirmations(user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_expires ON pending_confirmations(expires_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_action_rate_limits_user ON action_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_action_rate_limits_window ON action_rate_limits(user_id, window_start, window_end);

-- =============================================================================
-- PART 5: RLS Policies
-- =============================================================================
ALTER TABLE pending_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending_confirmations"
  ON pending_confirmations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all pending_confirmations"
  ON pending_confirmations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own action_rate_limits"
  ON action_rate_limits FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all action_rate_limits"
  ON action_rate_limits FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- PART 6: Autonomy session management functions
-- =============================================================================

-- Check if user has active autonomy session
CREATE OR REPLACE FUNCTION has_active_autonomy_session(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM autonomy_sessions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active autonomy session
CREATE OR REPLACE FUNCTION get_active_autonomy_session(p_user_id UUID)
RETURNS TABLE (
  session_id UUID,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  actions_count INTEGER,
  time_remaining_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as session_id,
    s.started_at,
    s.expires_at,
    s.actions_count,
    EXTRACT(EPOCH FROM (s.expires_at - NOW()))::INTEGER / 60 as time_remaining_minutes
  FROM autonomy_sessions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.expires_at > NOW()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Start new autonomy session
CREATE OR REPLACE FUNCTION start_autonomy_session(
  p_user_id UUID,
  p_channel TEXT DEFAULT 'telegram',
  p_duration_hours INTEGER DEFAULT 2
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Expire any existing active sessions
  UPDATE autonomy_sessions
  SET status = 'expired', ended_at = NOW()
  WHERE user_id = p_user_id AND status = 'active';

  -- Create new session
  INSERT INTO autonomy_sessions (
    user_id,
    started_at,
    expires_at,
    status,
    channel
  ) VALUES (
    p_user_id,
    NOW(),
    NOW() + (p_duration_hours || ' hours')::INTERVAL,
    'active',
    p_channel
  )
  RETURNING id INTO v_session_id;

  -- Log audit event
  PERFORM log_audit_event(
    p_user_id,
    'autonomy_action',
    'Started new autonomy session for ' || p_duration_hours || ' hours',
    p_channel,
    'autonomy_session',
    v_session_id,
    jsonb_build_object('duration_hours', p_duration_hours)
  );

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extend autonomy session
CREATE OR REPLACE FUNCTION extend_autonomy_session(
  p_user_id UUID,
  p_additional_hours INTEGER DEFAULT 2
)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_id UUID;
  v_current_extension_count INTEGER;
BEGIN
  -- Get active session
  SELECT id, extension_count INTO v_session_id, v_current_extension_count
  FROM autonomy_sessions
  WHERE user_id = p_user_id AND status = 'active' AND expires_at > NOW()
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update session
  UPDATE autonomy_sessions
  SET
    expires_at = expires_at + (p_additional_hours || ' hours')::INTERVAL,
    extension_count = COALESCE(extension_count, 0) + 1,
    last_extended_at = NOW()
  WHERE id = v_session_id;

  -- Log audit event
  PERFORM log_audit_event(
    p_user_id,
    'autonomy_action',
    'Extended autonomy session by ' || p_additional_hours || ' hours',
    'api',
    'autonomy_session',
    v_session_id,
    jsonb_build_object('additional_hours', p_additional_hours, 'total_extensions', v_current_extension_count + 1)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End autonomy session
CREATE OR REPLACE FUNCTION end_autonomy_session(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Get active session
  SELECT id INTO v_session_id
  FROM autonomy_sessions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- End session
  UPDATE autonomy_sessions
  SET status = 'ended', ended_at = NOW()
  WHERE id = v_session_id;

  -- Log audit event
  PERFORM log_audit_event(
    p_user_id,
    'autonomy_action',
    'Ended autonomy session',
    'api',
    'autonomy_session',
    v_session_id,
    '{}'::jsonb
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment action count in session
CREATE OR REPLACE FUNCTION increment_session_action(
  p_user_id UUID,
  p_action_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Get active session
  SELECT id INTO v_session_id
  FROM autonomy_sessions
  WHERE user_id = p_user_id AND status = 'active' AND expires_at > NOW()
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN FALSE; -- No active session
  END IF;

  -- Increment action count
  UPDATE autonomy_sessions
  SET
    actions_count = actions_count + 1,
    actions_log = COALESCE(actions_log, '[]'::jsonb) || jsonb_build_object(
      'action', p_action_description,
      'timestamp', NOW()
    )
  WHERE id = v_session_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 7: Confirmation management functions
-- =============================================================================

-- Create pending confirmation
CREATE OR REPLACE FUNCTION create_pending_confirmation(
  p_user_id UUID,
  p_confirmation_type TEXT,
  p_action_description TEXT,
  p_channel TEXT,
  p_channel_id TEXT,
  p_action_data JSONB DEFAULT '{}',
  p_expires_minutes INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  v_confirmation_id UUID;
BEGIN
  INSERT INTO pending_confirmations (
    user_id,
    confirmation_type,
    action_description,
    action_data,
    channel,
    channel_id,
    expires_at
  ) VALUES (
    p_user_id,
    p_confirmation_type,
    p_action_description,
    p_action_data,
    p_channel,
    p_channel_id,
    NOW() + (p_expires_minutes || ' minutes')::INTERVAL
  )
  RETURNING id INTO v_confirmation_id;

  RETURN v_confirmation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process confirmation response
CREATE OR REPLACE FUNCTION process_confirmation_response(
  p_confirmation_id UUID,
  p_approved BOOLEAN,
  p_response_data JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_confirmation RECORD;
  v_result JSONB;
BEGIN
  -- Get confirmation
  SELECT * INTO v_confirmation
  FROM pending_confirmations
  WHERE id = p_confirmation_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confirmation not found or already processed');
  END IF;

  -- Check expiration
  IF v_confirmation.expires_at < NOW() THEN
    UPDATE pending_confirmations SET status = 'expired' WHERE id = p_confirmation_id;
    RETURN jsonb_build_object('success', false, 'error', 'Confirmation expired');
  END IF;

  -- Update confirmation
  UPDATE pending_confirmations
  SET
    status = CASE WHEN p_approved THEN 'approved' ELSE 'denied' END,
    responded_at = NOW(),
    response_data = p_response_data
  WHERE id = p_confirmation_id;

  -- If approved and it's an autonomy start, create session
  IF p_approved AND v_confirmation.confirmation_type = 'autonomy_start' THEN
    PERFORM start_autonomy_session(v_confirmation.user_id, v_confirmation.channel);
  END IF;

  -- If approved and it's an autonomy extend
  IF p_approved AND v_confirmation.confirmation_type = 'autonomy_extend' THEN
    PERFORM extend_autonomy_session(v_confirmation.user_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'approved', p_approved,
    'confirmation_type', v_confirmation.confirmation_type,
    'user_id', v_confirmation.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 8: Rate limiting functions
-- =============================================================================

-- Check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT -- 'message', 'action', or 'api_call'
)
RETURNS JSONB AS $$
DECLARE
  v_limit RECORD;
  v_allowed BOOLEAN := TRUE;
  v_current_count INTEGER;
  v_max_count INTEGER;
BEGIN
  -- Get or create current window
  SELECT * INTO v_limit
  FROM action_rate_limits
  WHERE user_id = p_user_id
    AND window_start <= NOW()
    AND window_end > NOW()
  FOR UPDATE;

  -- Create new window if needed
  IF NOT FOUND THEN
    INSERT INTO action_rate_limits (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_limit;
  END IF;

  -- Check limit based on action type
  CASE p_action_type
    WHEN 'message' THEN
      v_current_count := v_limit.messages_sent;
      v_max_count := v_limit.max_messages_per_hour;
      IF v_current_count >= v_max_count THEN
        v_allowed := FALSE;
      ELSE
        UPDATE action_rate_limits SET messages_sent = messages_sent + 1 WHERE id = v_limit.id;
      END IF;
    WHEN 'action' THEN
      v_current_count := v_limit.actions_taken;
      v_max_count := v_limit.max_actions_per_hour;
      IF v_current_count >= v_max_count THEN
        v_allowed := FALSE;
      ELSE
        UPDATE action_rate_limits SET actions_taken = actions_taken + 1 WHERE id = v_limit.id;
      END IF;
    WHEN 'api_call' THEN
      v_current_count := v_limit.api_calls_made;
      v_max_count := v_limit.max_api_calls_per_hour;
      IF v_current_count >= v_max_count THEN
        v_allowed := FALSE;
      ELSE
        UPDATE action_rate_limits SET api_calls_made = api_calls_made + 1 WHERE id = v_limit.id;
      END IF;
  END CASE;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', v_current_count,
    'max_count', v_max_count,
    'resets_at', v_limit.window_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 9: Cleanup job for expired confirmations
-- =============================================================================

-- Function to cleanup expired items
CREATE OR REPLACE FUNCTION cleanup_expired_confirmations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE pending_confirmations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Schedule cleanup via pg_cron:
-- SELECT cron.schedule('cleanup-expired-confirmations', '*/5 * * * *', 'SELECT cleanup_expired_confirmations()');
