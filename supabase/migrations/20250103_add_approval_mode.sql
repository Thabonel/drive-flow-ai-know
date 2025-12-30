-- ============================================================================
-- Mini-Me Agent Mode: Approval Gates (Slice 2.5)
-- ============================================================================
-- Adds approval mode and auto-approved actions tracking
-- ============================================================================

-- Add approval mode column to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS agent_approval_mode TEXT DEFAULT 'suggest' NOT NULL
CHECK (agent_approval_mode IN ('suggest', 'auto'));

COMMENT ON COLUMN user_settings.agent_approval_mode IS 'suggest: ask before high-risk actions, auto: execute without approval';

-- Add auto-approved actions tracking
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS agent_auto_approved_actions JSONB DEFAULT '[]'::jsonb NOT NULL;

COMMENT ON COLUMN user_settings.agent_auto_approved_actions IS 'Array of action types user has auto-approved: ["create_calendar_event", "send_email", etc.]';
