# Document Attachments Migration Error Fix

## Error You Encountered

```
ERROR: 42P07: relation "unique_user_template_name" already exists
```

## What Happened

The migration ran partially and created some database objects, but failed when trying to create a constraint that already exists. This happens when:
1. The migration was run multiple times
2. The migration was interrupted mid-execution
3. Some objects were created manually

## How to Fix

### Option 1: Quick Fix (Recommended)

Run this in Supabase SQL Editor:

```sql
-- File: supabase/CLEAN_AND_REAPPLY_DOCUMENTS.sql

DROP TABLE IF EXISTS document_templates CASCADE;
DROP TABLE IF EXISTS timeline_item_documents CASCADE;

DROP FUNCTION IF EXISTS get_timeline_item_document_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_timeline_item_documents(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_briefing_from_template(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_timeline_item_documents_updated_at() CASCADE;
```

**Click "Run"** - This will clean up all document-related objects.

Then:
1. Open: `supabase/migrations/20251102000013_create_document_attachments.sql`
2. Copy the **ENTIRE** file content
3. Paste into Supabase SQL Editor
4. Click **"Run"**

### Option 2: Manual Fix (If Quick Fix Doesn't Work)

If you want to keep existing data, try adding `IF NOT EXISTS` checks:

```sql
-- Check if constraint exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_user_template_name'
    ) THEN
        ALTER TABLE document_templates
        ADD CONSTRAINT unique_user_template_name UNIQUE (user_id, template_name);
    END IF;
END $$;
```

But this is more complex. **Option 1 is recommended** for a fresh start.

## Verification

After running the migration, verify everything:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('timeline_item_documents', 'document_templates');

-- Check columns in timeline_item_documents
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'timeline_item_documents'
ORDER BY ordinal_position;

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'document_templates';

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'get_timeline_item_document_count',
  'get_timeline_item_documents',
  'create_briefing_from_template',
  'update_timeline_item_documents_updated_at'
);
```

Expected results:
- 2 tables found
- timeline_item_documents has 13+ columns
- document_templates has constraint: unique_user_template_name
- 4 functions found

## After Successful Migration

Don't forget to:

1. **Create the Storage Bucket**
   - Go to Supabase Dashboard → Storage
   - Click "New bucket"
   - Name: `timeline-documents`
   - Public: OFF
   - Max size: 10485760 (10MB)
   - Allowed MIME types: PDF, DOCX, XLSX, PPTX

2. **Apply Storage Policies**
   - Run `supabase/storage_setup.sql` in SQL Editor
   - This creates RLS policies for secure file access

3. **Verify Setup**
   ```sql
   -- Check storage bucket exists
   SELECT name, public, file_size_limit
   FROM storage.buckets
   WHERE name = 'timeline-documents';
   ```

See `DOCUMENT_ATTACHMENTS_SETUP.md` for complete setup instructions.

## Common Issues

### "Cannot drop table because other objects depend on it"

If you see this error during cleanup:

```sql
-- Find dependent objects
SELECT
    dependent_ns.nspname as dependent_schema,
    dependent_view.relname as dependent_view,
    source_ns.nspname as source_schema,
    source_table.relname as source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
WHERE source_table.relname IN ('timeline_item_documents', 'document_templates');
```

Then drop those dependent objects first with `CASCADE`.

### "Storage bucket already exists"

That's fine! Skip creating the bucket and just apply the storage policies.

### "Permission denied for storage bucket"

Make sure you're logged in as a Supabase admin/owner. Storage operations require elevated permissions.

## Still Having Issues?

1. Check Supabase logs for detailed error messages
2. Make sure you have the latest migration file
3. Try running migrations one section at a time:
   - First: CREATE TABLE statements
   - Then: CREATE INDEX statements
   - Then: CREATE FUNCTION statements
   - Finally: ALTER TABLE and policies

## Running Multiple Migrations

If you're applying both assistant AND document migrations:

1. **First**: Fix and apply assistant migration
   - Use `CLEAN_AND_REAPPLY_ASSISTANT.sql`
   - Then run `20251102000012_create_assistant_system.sql`

2. **Second**: Fix and apply document migration
   - Use `CLEAN_AND_REAPPLY_DOCUMENTS.sql`
   - Then run `20251102000013_create_document_attachments.sql`

3. **Third**: Set up storage
   - Create `timeline-documents` bucket
   - Run `storage_setup.sql`

4. **Verify**: Run all verification queries above
