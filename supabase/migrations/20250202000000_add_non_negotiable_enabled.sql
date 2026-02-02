-- Add non_negotiable_enabled field to user_attention_preferences
-- This makes the non-negotiable priority tracker an opt-in feature

ALTER TABLE user_attention_preferences
ADD COLUMN IF NOT EXISTS non_negotiable_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_attention_preferences.non_negotiable_enabled
IS 'Tracks whether user has enabled the non-negotiable priority tracking feature';