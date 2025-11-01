# Assistant Migration Error Fix

## Error You Encountered

```
ERROR: 42703: column "invitation_token" does not exist
LINE 137: CREATE INDEX IF NOT EXISTS idx_assistant_relationships_token ON assistant_relationships(invitation_token)...
```

## What Happened

The migration ran partially and created the `assistant_relationships` table, but something went wrong during table creation. The table exists in an incomplete state without all the required columns.

## How to Fix

### Step 1: Clean Up Partial Migration

Run this in Supabase SQL Editor:

```sql
-- File: supabase/CLEAN_AND_REAPPLY_ASSISTANT.sql

DROP TABLE IF EXISTS assistant_suggestions CASCADE;
DROP TABLE IF EXISTS assistant_activity_log CASCADE;
DROP TABLE IF EXISTS assistant_relationships CASCADE;

DROP FUNCTION IF EXISTS generate_invitation_token() CASCADE;
DROP FUNCTION IF EXISTS has_assistant_permission(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_assistant_activity(UUID, TEXT, TEXT, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS accept_assistant_invitation(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_executive_assistants(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_assistant_relationships_updated_at() CASCADE;
```

**Click "Run"** - This will clean up all partially created objects.

### Step 2: Reapply the Migration

Now run the complete migration again:

1. Open: `supabase/migrations/20251102000012_create_assistant_system.sql`
2. Copy the **ENTIRE** file content
3. Paste into Supabase SQL Editor
4. Click **"Run"**

This time it should complete successfully because we've cleaned up the partial state.

## Verification

After running, verify everything was created:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('assistant_relationships', 'assistant_activity_log', 'assistant_suggestions');

-- Check columns in assistant_relationships
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'assistant_relationships'
ORDER BY ordinal_position;

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'generate_invitation_token',
  'has_assistant_permission',
  'log_assistant_activity',
  'accept_assistant_invitation',
  'get_executive_assistants'
);
```

Expected results:
- 3 tables found
- 12+ columns in assistant_relationships (including `invitation_token`)
- 5 functions found

## Why This Happened

Common causes:
1. Transaction timeout during migration
2. Syntax error in earlier part of migration that was ignored
3. Connection interrupted mid-migration
4. Manually edited the table after partial creation

## Prevention

Always:
1. Run migrations in a single transaction when possible
2. Check for errors after each migration
3. Don't manually edit database objects while migrations are running
4. Use the verification queries above to confirm success

## Still Having Issues?

If you still get errors after cleanup:

1. **Check for dependent objects:**
   ```sql
   -- Find all objects referencing assistant_relationships
   SELECT DISTINCT
       dependent_ns.nspname AS dependent_schema,
       dependent_view.relname AS dependent_view
   FROM pg_depend
   JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
   JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
   JOIN pg_namespace AS dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
   WHERE pg_depend.refobjid = 'assistant_relationships'::regclass;
   ```

2. **Manually drop those objects first**, then re-run the cleanup script

3. **Contact support** if the issue persists - provide the exact error message

## After Successful Migration

Don't forget to also apply the document attachments migration if needed:
- `supabase/migrations/20251102000013_create_document_attachments.sql`
- And create the storage bucket (see `DOCUMENT_ATTACHMENTS_SETUP.md`)
