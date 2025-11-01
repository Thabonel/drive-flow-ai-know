-- Clean up and reapply assistant system migration
-- Use this if you got the "invitation_token does not exist" error

-- Step 1: Drop all assistant-related tables (if they exist)
DROP TABLE IF EXISTS assistant_suggestions CASCADE;
DROP TABLE IF EXISTS assistant_activity_log CASCADE;
DROP TABLE IF EXISTS assistant_relationships CASCADE;

-- Step 2: Drop all assistant-related functions (if they exist)
DROP FUNCTION IF EXISTS generate_invitation_token() CASCADE;
DROP FUNCTION IF EXISTS has_assistant_permission(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_assistant_activity(UUID, TEXT, TEXT, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS accept_assistant_invitation(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_executive_assistants(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_assistant_relationships_updated_at() CASCADE;

-- Step 3: Now you can run the full migration again
-- Go to: supabase/migrations/20251102000012_create_assistant_system.sql
-- Copy the ENTIRE content and run it in a NEW query

-- Alternatively, paste the migration content below:
-- (See next SQL file for the complete migration)
