-- Clean up and reapply document attachments migration
-- Use this if you got the "unique_user_template_name already exists" error

-- Step 1: Drop all document-related tables (if they exist)
DROP TABLE IF EXISTS document_templates CASCADE;
DROP TABLE IF EXISTS timeline_item_documents CASCADE;

-- Step 2: Drop all document-related functions (if they exist)
DROP FUNCTION IF EXISTS get_timeline_item_document_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_timeline_item_documents(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_briefing_from_template(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_timeline_item_documents_updated_at() CASCADE;

-- Step 3: Now you can run the full migration again
-- Go to: supabase/migrations/20251102000013_create_document_attachments.sql
-- Copy the ENTIRE content and run it in a NEW query
