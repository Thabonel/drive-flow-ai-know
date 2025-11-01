-- Fix for assistant_relationships migration error
-- This script handles the case where the table was partially created

-- First, let's check if the table exists
DO $$
BEGIN
  -- If table exists but is incomplete, drop it and recreate
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assistant_relationships') THEN
    -- Check if invitation_token column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'assistant_relationships'
      AND column_name = 'invitation_token'
    ) THEN
      -- Table exists but is incomplete, drop it
      RAISE NOTICE 'Dropping incomplete assistant_relationships table...';
      DROP TABLE IF EXISTS assistant_relationships CASCADE;
      DROP TABLE IF EXISTS assistant_activity_log CASCADE;
      DROP TABLE IF EXISTS assistant_suggestions CASCADE;
    ELSE
      RAISE NOTICE 'assistant_relationships table appears complete, skipping recreation';
    END IF;
  END IF;
END $$;

-- Now run the complete migration (only if tables were dropped above)
-- Copy the entire content from: supabase/migrations/20251102000012_create_assistant_system.sql
-- and paste it below this comment

-- Or, if you prefer, you can just run the original migration file again
-- after this fix script completes.
