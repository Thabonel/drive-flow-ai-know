# How to Complete the Executive-Assistant System Installation

## What Happened

The migration `20251031000003_executive_assistant_system.sql` was only partially applied to your database. It created the `user_roles` table but may be missing the other 5 tables.

## Solution: Run the Completion Migration

I've created a comprehensive completion migration that will safely finish the installation.

### Step 1: Apply the Completion Migration

**Option A: Via Supabase SQL Editor (Recommended)**

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Go to: **SQL Editor** (in left sidebar)
3. Click: **New Query**
4. Copy the entire contents of: `supabase/migrations/20251031000005_complete_executive_assistant_system.sql`
5. Paste into the SQL Editor
6. Click: **Run**

You should see output like:
```
✓ SUCCESS: All components installed!
Tables created: 6/6
Enum types created: 7/7
Helper functions created: 4/4
```

**Option B: Via Supabase CLI**

```bash
supabase db push
```

This will push all new migrations including the completion script.

---

### Step 2: Verify Installation

After running the migration, verify everything is set up correctly:

1. In Supabase SQL Editor, run: `verify_executive_system.sql`
2. Or copy/paste the verification script below:

```sql
-- Quick verification
SELECT
  'Tables' as component,
  COUNT(*) as created,
  6 as expected
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_roles',
    'assistant_relationships',
    'timeline_documents',
    'timeline_item_documents',
    'executive_daily_briefs',
    'assistant_audit_log'
  )

UNION ALL

SELECT
  'Enums',
  COUNT(DISTINCT typname),
  7
FROM pg_type
WHERE typname IN (
  'user_role_type', 'subscription_tier', 'relationship_status',
  'attachment_type', 'brief_status', 'storage_provider', 'audit_action_type'
)

UNION ALL

SELECT
  'Functions',
  COUNT(*),
  4
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'check_assistant_permission',
    'get_user_role',
    'can_user_access_timeline_item',
    'log_assistant_action'
  );
```

Expected output:
```
component  | created | expected
-----------|---------|----------
Tables     | 6       | 6
Enums      | 7       | 7
Functions  | 4       | 4
```

---

### Step 3: Create Storage Bucket (Required for Document Upload)

1. In Supabase Dashboard, go to: **Storage**
2. Click: **New Bucket**
3. Name: `timeline-documents`
4. Make it **Public** or set custom policies
5. Click: **Create bucket**

Optional: Set up RLS policies for the bucket:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'timeline-documents');

-- Allow users to view their own documents
CREATE POLICY "Users can view their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'timeline-documents');
```

---

## What Gets Created

### 6 New Tables:
1. ✅ **user_roles** - Role types, subscriptions, feature flags
2. ✅ **assistant_relationships** - Executive-assistant delegated access
3. ✅ **timeline_documents** - Document storage metadata
4. ✅ **timeline_item_documents** - Document attachments to timeline items
5. ✅ **executive_daily_briefs** - AI-generated daily summaries
6. ✅ **assistant_audit_log** - Complete audit trail

### 7 Enum Types:
- user_role_type, subscription_tier, relationship_status
- attachment_type, brief_status, storage_provider, audit_action_type

### 4 Helper Functions:
- `check_assistant_permission()` - Check if assistant has specific permission
- `get_user_role()` - Get user's role type
- `can_user_access_timeline_item()` - Access control check
- `log_assistant_action()` - Manual audit logging

### 30+ RLS Policies:
- Complete row-level security for all tables
- Permission-based access for assistants
- Confidential document protection
- Audit log access control

### Automatic Features:
- Audit logging triggers on timeline_items and timeline_documents
- Auto-create user_role on signup
- updated_at triggers
- 25+ performance indexes

---

## Using the System

After installation, you can use the utility functions in your app:

```typescript
import {
  createAssistantRelationship,
  uploadDocument,
  attachDocumentToItem,
  createDailyBrief,
  getExecutiveAuditLog
} from '@/lib/assistantUtils';

// Create relationship
const relationship = await createAssistantRelationship(
  executiveId,
  assistantId,
  {
    manage_timeline: true,
    upload_documents: true,
    create_items: true,
    edit_items: true,
    delete_items: false,
    view_confidential: false
  }
);

// Upload document
const doc = await uploadDocument({
  file: selectedFile,
  forUserId: executiveId,
  documentDate: '2025-11-01',
  tags: ['meeting', 'Q4'],
  isConfidential: true
});

// Attach to timeline item
await attachDocumentToItem(itemId, doc.id, 'briefing');

// View audit log
const logs = await getExecutiveAuditLog(executiveId, {
  action: 'create',
  limit: 50
});
```

---

## Troubleshooting

### If you get errors about duplicate objects:

The migration is idempotent (safe to run multiple times). It uses `CREATE IF NOT EXISTS` and `DROP ... IF EXISTS` patterns.

### If some components are missing:

Run the diagnostic script:
```bash
cat diagnose_db.sql
```

Copy the output and I can help identify what's missing.

### If you want to start fresh:

**⚠️ WARNING: This will delete all data in these tables!**

```sql
DROP TABLE IF EXISTS assistant_audit_log CASCADE;
DROP TABLE IF EXISTS executive_daily_briefs CASCADE;
DROP TABLE IF EXISTS timeline_item_documents CASCADE;
DROP TABLE IF EXISTS timeline_documents CASCADE;
DROP TABLE IF EXISTS assistant_relationships CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

DROP TYPE IF EXISTS audit_action_type;
DROP TYPE IF EXISTS storage_provider;
DROP TYPE IF EXISTS brief_status;
DROP TYPE IF EXISTS attachment_type;
DROP TYPE IF EXISTS relationship_status;
DROP TYPE IF EXISTS subscription_tier;
DROP TYPE IF EXISTS user_role_type;
```

Then re-run the completion migration.

---

## Next Steps After Installation

1. ✅ Build UI components for:
   - Assistant relationship management
   - Document upload interface
   - Daily brief creator/viewer
   - Audit log viewer

2. ✅ Integrate with your Timeline Manager

3. ✅ Set up Stripe subscriptions for tiered features

4. ✅ Create Edge Functions for:
   - AI-generated daily briefs
   - Document OCR/parsing
   - Intelligent insights

---

**Questions?** Check the verification output or run `diagnose_db.sql` to see what exists in your database.
