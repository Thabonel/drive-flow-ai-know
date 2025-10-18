-- Add personal_prompt column to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS personal_prompt TEXT;

-- Add comment
COMMENT ON COLUMN user_settings.personal_prompt IS 'User custom system prompt for AI interactions (max 2000 characters)';
