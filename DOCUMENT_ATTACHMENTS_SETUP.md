# Document Attachments Setup Guide

This guide walks you through setting up the document attachment system for timeline items.

## Prerequisites

- Supabase project with timeline_items table already created
- Database migrations applied (see below)
- Admin access to Supabase Dashboard

## Step 1: Apply Database Migration

1. Open Supabase Dashboard → SQL Editor
2. Open the migration file: `supabase/migrations/20251102000013_create_document_attachments.sql`
3. Copy the entire content
4. Paste into SQL Editor
5. Click **Run** to execute

This creates:
- `timeline_item_documents` table
- `document_templates` table
- PostgreSQL functions for document management
- RLS policies for security
- Performance indexes

## Step 2: Create Storage Bucket

1. Go to Supabase Dashboard → **Storage**
2. Click **New bucket**
3. Configure the bucket:
   - **Name**: `timeline-documents`
   - **Public**: **OFF** (unchecked)
   - **File size limit**: `10485760` (10MB)
   - **Allowed MIME types**:
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
     - `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)
4. Click **Create bucket**

## Step 3: Apply Storage Policies

1. Go to Supabase Dashboard → **SQL Editor**
2. Open the file: `supabase/storage_setup.sql`
3. Copy the entire content
4. Paste into SQL Editor
5. Click **Run** to execute

This creates RLS policies for:
- Users uploading to their own folder
- Users viewing their own files
- Assistants uploading to executive folders (if assistant system enabled)
- Assistants viewing executive files
- Users deleting/updating their own files

## Step 4: Verify Setup

Run this query in SQL Editor to verify everything is set up:

\`\`\`sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('timeline_item_documents', 'document_templates');

-- Check storage bucket exists
SELECT name, public
FROM storage.buckets
WHERE name = 'timeline-documents';

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'get_timeline_item_document_count',
  'get_timeline_item_documents',
  'create_briefing_from_template'
);
\`\`\`

Expected results:
- 2 tables found
- 1 bucket found (public = false)
- 3 functions found

## Features

### For Users

1. **Attach Documents to Timeline Items**
   - Click any timeline item
   - Click "View Documents"
   - Drag and drop files or click "Choose Files"
   - Supported formats: PDF, DOCX, XLSX, PPTX
   - Max file size: 10MB per file

2. **View Attached Documents**
   - Click timeline item → "View Documents"
   - See list of all attached documents
   - PDF files can be previewed inline
   - Download any document
   - Delete documents you uploaded

3. **Document Indicators**
   - Paperclip icon on timeline items with documents
   - Red badge shows document count (if > 1)
   - Badge in action menu shows total count

### For Assistants (if enabled)

1. **Upload Documents for Executives**
   - Requires `attach_documents` permission
   - Documents marked as "By Assistant"
   - Actions logged in activity log

2. **Briefing Packages**
   - Mark documents as "briefing package"
   - Shown first in document list
   - Special badge indicator

3. **Document Templates**
   - Create reusable document templates
   - Apply templates to timeline items
   - Track template usage

## File Storage Structure

Files are stored in the following structure:

\`\`\`
timeline-documents/
├── {user_id}/
│   ├── {timeline_item_id}/
│   │   ├── {timestamp}_{filename}.pdf
│   │   ├── {timestamp}_{filename}.docx
│   │   └── ...
│   └── ...
└── ...
\`\`\`

## Security

- **Row-Level Security (RLS)** enabled on all tables
- Users can only access their own documents
- Assistants can only access documents for executives they assist
- All uploads validated for file type and size
- Secure signed URLs for downloads (60-second expiration)

## Performance

- Indexes created on frequently queried columns
- Document count fetched efficiently with head-only queries
- Lazy loading of document lists (fetched on demand)

## Troubleshooting

### "Upload failed: Access denied"
- Check storage bucket RLS policies are applied
- Verify user is authenticated
- Check user ID matches folder structure

### "File type not allowed"
- Only PDF, DOCX, XLSX, PPTX are supported
- Check file has correct extension and MIME type

### "File too large"
- Maximum file size is 10MB
- Compress large files before uploading

### "Documents not showing"
- Refresh the timeline
- Check database migration was applied
- Verify RLS policies allow user to view documents

## API Usage

### Get document count for timeline item

\`\`\`typescript
const { count } = await supabase
  .from('timeline_item_documents')
  .select('*', { count: 'exact', head: true })
  .eq('timeline_item_id', timelineItemId);
\`\`\`

### Upload document

\`\`\`typescript
import { DocumentUploader } from '@/components/documents/DocumentUploader';

<DocumentUploader
  timelineItemId={item.id}
  onUploadComplete={() => refetchDocuments()}
  assistantRelationshipId={relationshipId} // optional
/>
\`\`\`

### View documents

\`\`\`typescript
import { DocumentViewer } from '@/components/documents/DocumentViewer';

<DocumentViewer
  open={showViewer}
  onClose={() => setShowViewer(false)}
  timelineItemId={item.id}
  timelineItemTitle={item.title}
  assistantRelationshipId={relationshipId} // optional
/>
\`\`\`

## Next Steps

1. **Email Notifications**: Add email alerts when assistants attach documents
2. **Document Search**: Add full-text search across all documents
3. **Version Control**: Track document versions and changes
4. **Bulk Operations**: Upload/download multiple documents at once
5. **Preview More Types**: Add preview support for DOCX, XLSX, PPTX

## Support

For issues or questions:
1. Check Supabase logs for errors
2. Verify all setup steps completed
3. Review browser console for client-side errors
4. Check storage bucket settings and RLS policies
