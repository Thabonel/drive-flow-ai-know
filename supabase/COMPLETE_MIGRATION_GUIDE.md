# Complete Migration Guide - Assistant Access & Document Attachments

This guide will walk you through applying both premium features: Assistant Access System and Document Attachments.

## Prerequisites

- Supabase project set up
- Admin access to Supabase Dashboard
- SQL Editor access

## Migration Order (IMPORTANT)

Apply migrations in this exact order:

1. ✅ Assistant Access System
2. ✅ Document Attachments
3. ✅ Storage Setup

## Step-by-Step Instructions

### Phase 1: Clean Up (If you had errors)

If you encountered any errors during previous migration attempts, clean up first:

**1A. Clean Assistant Tables (if needed)**
```sql
-- Run: supabase/CLEAN_AND_REAPPLY_ASSISTANT.sql

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

**1B. Clean Document Tables (if needed)**
```sql
-- Run: supabase/CLEAN_AND_REAPPLY_DOCUMENTS.sql

DROP TABLE IF EXISTS document_templates CASCADE;
DROP TABLE IF EXISTS timeline_item_documents CASCADE;

DROP FUNCTION IF EXISTS get_timeline_item_document_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_timeline_item_documents(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_briefing_from_template(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_timeline_item_documents_updated_at() CASCADE;
```

### Phase 2: Apply Assistant Migration

**File**: `supabase/migrations/20251102000012_create_assistant_system.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy the ENTIRE content of the migration file
3. Paste into SQL Editor
4. Click **"Run"**
5. Wait for "Success" message

**Verify:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('assistant_relationships', 'assistant_activity_log', 'assistant_suggestions');
-- Should return 3 rows

SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%assistant%' OR routine_name = 'generate_invitation_token';
-- Should return 5+ functions
```

### Phase 3: Apply Document Migration

**File**: `supabase/migrations/20251102000013_create_document_attachments.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy the ENTIRE content of the migration file
3. Paste into SQL Editor
4. Click **"Run"**
5. Wait for "Success" message

**Verify:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('timeline_item_documents', 'document_templates');
-- Should return 2 rows

SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%document%' OR routine_name LIKE '%briefing%';
-- Should return 4 functions
```

### Phase 4: Create Storage Bucket

1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Configure:
   - **Name**: `timeline-documents`
   - **Public**: **OFF** (unchecked)
   - **File size limit**: `10485760` (10MB)
   - **Allowed MIME types**:
     ```
     application/pdf
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     application/vnd.openxmlformats-officedocument.presentationml.presentation
     ```
4. Click **"Create bucket"**

**Verify:**
```sql
SELECT name, public, file_size_limit
FROM storage.buckets
WHERE name = 'timeline-documents';
-- Should return 1 row with public=false, file_size_limit=10485760
```

### Phase 5: Apply Storage Policies

**File**: `supabase/storage_setup.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy the ENTIRE content of the file
3. Paste into SQL Editor
4. Click **"Run"**
5. Wait for "Success" message

**Verify:**
```sql
SELECT policyname FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
-- Should return 6+ policies
```

## Complete Verification

Run this comprehensive check:

```sql
-- Check all tables
SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
  'assistant_relationships',
  'assistant_activity_log',
  'assistant_suggestions',
  'timeline_item_documents',
  'document_templates'
)
ORDER BY table_name;
-- Should return 5 rows

-- Check all functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'generate_invitation_token',
  'has_assistant_permission',
  'log_assistant_activity',
  'accept_assistant_invitation',
  'get_executive_assistants',
  'get_timeline_item_document_count',
  'get_timeline_item_documents',
  'create_briefing_from_template',
  'update_timeline_item_documents_updated_at'
)
ORDER BY routine_name;
-- Should return 9 rows

-- Check storage bucket
SELECT name, public, file_size_limit
FROM storage.buckets
WHERE name = 'timeline-documents';
-- Should return 1 row

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN (
  'assistant_relationships',
  'assistant_activity_log',
  'assistant_suggestions',
  'timeline_item_documents',
  'document_templates'
);
-- All should have rowsecurity = true
```

Expected results: ✅ All checks pass

## Troubleshooting

### Error: "invitation_token does not exist"
→ See `ASSISTANT_MIGRATION_FIX_README.md`

### Error: "unique_user_template_name already exists"
→ See `DOCUMENT_MIGRATION_FIX_README.md`

### Error: "Cannot drop table - dependent objects"
→ Add `CASCADE` to all DROP statements

### Error: "Permission denied"
→ Make sure you're logged in as project owner/admin

### Error: "Bucket already exists"
→ Skip bucket creation, just apply storage policies

## What Gets Created

### Assistant Access System
- **Tables**: 3 (relationships, activity log, suggestions)
- **Functions**: 5 (token generation, permissions, invitations)
- **Indexes**: 9 (for performance)
- **RLS Policies**: 12 (for security)

### Document Attachments
- **Tables**: 2 (documents, templates)
- **Functions**: 4 (count, list, briefing)
- **Indexes**: 8 (for performance)
- **RLS Policies**: 10 (for security)
- **Storage Bucket**: 1 (timeline-documents)
- **Storage Policies**: 6 (for file access)

## Testing After Migration

### Test Assistant Access
1. Navigate to `/assistants` in your app
2. Click "Invite Assistant"
3. Enter an email and set permissions
4. Check that invitation is created in database

### Test Document Attachments
1. Navigate to `/timeline` in your app
2. Click any timeline item
3. Click "View Documents"
4. Try uploading a PDF file
5. Verify paperclip icon appears on timeline item

## Next Steps

After successful migration:

1. **Configure Email** (optional): Set up email sending for assistant invitations
2. **Test Permissions**: Try different permission levels for assistants
3. **Upload Documents**: Test PDF, DOCX, XLSX, PPTX uploads
4. **Test Access Control**: Verify assistants can only see what they're permitted
5. **Monitor Usage**: Check Supabase logs for any errors

## Support Resources

- Assistant Setup: `src/components/assistant/` directory
- Document Setup: `DOCUMENT_ATTACHMENTS_SETUP.md`
- Assistant Errors: `ASSISTANT_MIGRATION_FIX_README.md`
- Document Errors: `DOCUMENT_MIGRATION_FIX_README.md`

## Migration Files Reference

```
supabase/migrations/
├── 20251102000012_create_assistant_system.sql       # Run FIRST
├── 20251102000013_create_document_attachments.sql   # Run SECOND
└── storage_setup.sql                                # Run THIRD

supabase/
├── CLEAN_AND_REAPPLY_ASSISTANT.sql                  # Cleanup if errors
├── CLEAN_AND_REAPPLY_DOCUMENTS.sql                  # Cleanup if errors
├── ASSISTANT_MIGRATION_FIX_README.md                # Fix guide
├── DOCUMENT_MIGRATION_FIX_README.md                 # Fix guide
└── COMPLETE_MIGRATION_GUIDE.md                      # This file
```

Good luck! 🚀
