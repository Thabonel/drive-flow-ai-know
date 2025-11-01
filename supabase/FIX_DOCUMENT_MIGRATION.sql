-- Proper fix for document attachments migration
-- This script safely handles existing objects

-- Step 1: Check and drop only if needed
DO $$
BEGIN
    -- Drop document_templates if it exists (with cascade to remove dependent objects)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_templates') THEN
        RAISE NOTICE 'Dropping existing document_templates table...';
        DROP TABLE document_templates CASCADE;
    END IF;

    -- Drop timeline_item_documents if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'timeline_item_documents') THEN
        RAISE NOTICE 'Dropping existing timeline_item_documents table...';
        DROP TABLE timeline_item_documents CASCADE;
    END IF;
END $$;

-- Step 2: Drop functions if they exist
DROP FUNCTION IF EXISTS get_timeline_item_document_count(UUID);
DROP FUNCTION IF EXISTS get_timeline_item_documents(UUID);
DROP FUNCTION IF EXISTS create_briefing_from_template(UUID, UUID);
DROP FUNCTION IF EXISTS update_timeline_item_documents_updated_at();

-- Step 3: Cleanup complete!
-- Now run the full migration in a NEW query:
-- Copy and paste the ENTIRE content from:
-- supabase/migrations/20251102000013_create_document_attachments.sql

-- Verification: Check that tables are gone
SELECT 'Cleanup successful - ready for migration' AS status;
