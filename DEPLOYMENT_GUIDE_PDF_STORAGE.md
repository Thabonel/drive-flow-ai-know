# PDF Storage Deployment Guide

This guide explains how to deploy the dual storage feature for PDFs (original file + extracted text).

## Overview

The system now supports storing both:
1. **Original PDF files** with actual images/graphics (stored in Supabase Storage)
2. **Extracted text content** with image descriptions (stored in database for AI querying)

Users can view the original PDF with images intact, while the AI can understand the content through text descriptions.

## Prerequisites

- Supabase project access (project ID: `fskwutnoxbbflzqrphro`)
- Database migration privileges
- Storage bucket creation privileges

## Step 1: Apply Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Go to [Supabase SQL Editor](https://app.supabase.com/project/fskwutnoxbbflzqrphro/sql)
2. Create a new query and paste the following SQL:

```sql
-- Migration: Add original file storage to knowledge_documents
-- Allows storing original PDFs while keeping extracted text for AI

-- Add storage fields for original files
ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS original_file_size BIGINT;

-- Add index for storage_path lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_storage_path
  ON knowledge_documents(storage_path);

-- Add comments explaining the dual storage approach
COMMENT ON COLUMN knowledge_documents.content IS 'Extracted text content with [IMAGE: ...] descriptions for AI understanding';
COMMENT ON COLUMN knowledge_documents.file_url IS 'Public URL to original file (e.g., PDF with actual images) for user viewing';
COMMENT ON COLUMN knowledge_documents.storage_path IS 'Internal Supabase Storage path for file management and deletion';
COMMENT ON COLUMN knowledge_documents.original_file_size IS 'Size of original uploaded file in bytes (may differ from extracted content length)';
```

3. Run the query
4. Verify success in the table editor

### Option B: Using Supabase CLI

```bash
npx supabase db push
```

## Step 2: Create Storage Bucket

1. Go to [Supabase Storage](https://app.supabase.com/project/fskwutnoxbbflzqrphro/storage/buckets)
2. Click "New bucket"
3. Configure the bucket:
   - **Name**: `documents`
   - **Public bucket**: YES (checked) - allows users to view their PDFs
   - **File size limit**: 20 MB (matches upload limit)
   - **Allowed MIME types**:
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/rtf`
     - `application/x-final-draft`

4. Click "Create bucket"

### Configure Storage Policies (RLS)

After creating the bucket, add these policies:

#### Policy 1: Allow users to upload their own files

```sql
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow users to view their own files

```sql
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Allow users to delete their own files

```sql
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Step 3: Update TypeScript Types (Optional but Recommended)

After applying the migration, regenerate TypeScript types:

```bash
npx supabase gen types typescript --project-id fskwutnoxbbflzqrphro > src/integrations/supabase/types.ts
```

This ensures TypeScript knows about the new `file_url`, `storage_path`, and `original_file_size` columns.

## Step 4: Deploy Frontend Changes

The following files have been updated and need to be deployed:

- `src/components/DragDropUpload.tsx` - Uploads original files to storage
- `src/components/PDFViewer.tsx` - **NEW** - Displays original PDFs
- `src/components/DocumentViewerModal.tsx` - Shows tabs for Original/Extracted views

Deploy using your standard deployment process (e.g., push to main branch for Netlify/Vercel auto-deploy).

## Step 5: Deploy Edge Function Changes

The PDF parsing function has been enhanced to extract image descriptions:

```bash
# Set the access token
export SUPABASE_ACCESS_TOKEN=sbp_c5e0384f68889e9d6177f27624b8f6863b1e22cd

# Deploy the parse-document function
npx supabase functions deploy parse-document
```

## Step 6: Test the Feature

1. **Upload a new PDF with images**:
   - Go to Documents page
   - Upload a PDF containing images/charts
   - Watch the progress bar (should show "Extracting content..." during processing)

2. **Verify dual storage**:
   - Check that the upload completes successfully
   - Open the document in the viewer
   - Confirm you see two tabs: "Original PDF" and "Extracted Text (for AI)"

3. **Test Original PDF tab**:
   - Click "Original PDF" tab
   - Verify the PDF displays with actual images
   - Test zoom controls (50%, 100%, 200%)
   - Test "Open in New Tab" button
   - Test "Download" button

4. **Test Extracted Text tab**:
   - Click "Extracted Text (for AI)" tab
   - Verify you see text content
   - Look for `[IMAGE: ...]` markers describing visuals
   - Confirm the note explaining the dual storage approach

5. **Test AI Querying**:
   - Go to AI Query page
   - Ask a question about content from the PDF
   - Verify the AI can reference both text AND visual elements
   - Example: "What does the chart on page 3 show?"

## Verification Checklist

- [ ] Database migration applied successfully
- [ ] Storage bucket `documents` created
- [ ] Storage policies configured (INSERT, SELECT, DELETE)
- [ ] TypeScript types regenerated
- [ ] Frontend code deployed
- [ ] Edge function `parse-document` deployed
- [ ] Test PDF uploaded successfully
- [ ] Original PDF displays in viewer
- [ ] Extracted text contains `[IMAGE: ...]` descriptions
- [ ] AI queries can reference visual content
- [ ] Download and zoom controls work

## Troubleshooting

### Storage Upload Errors

**Error**: "Storage upload error: Bucket not found"
- **Solution**: Ensure the `documents` bucket exists in Supabase Storage

**Error**: "Storage upload error: Row Level Security policy violation"
- **Solution**: Verify the storage policies are configured correctly (see Step 2)

### PDF Viewer Issues

**Error**: PDF doesn't display (shows loading spinner forever)
- **Solution**: Check browser console for CORS errors. Ensure the storage bucket is public.

**Error**: "Failed to load PDF"
- **Solution**: Click "Open in New Tab" to verify the file URL is accessible

### Type Errors

**Error**: TypeScript errors about `file_url` property
- **Solution**: Run `npx supabase gen types typescript` to regenerate types

## Rollback Plan

If issues occur, you can rollback the changes:

1. **Rollback database migration**:
```sql
ALTER TABLE knowledge_documents
  DROP COLUMN IF EXISTS file_url,
  DROP COLUMN IF EXISTS storage_path,
  DROP COLUMN IF EXISTS original_file_size;

DROP INDEX IF EXISTS idx_knowledge_documents_storage_path;
```

2. **Delete storage bucket**:
   - Go to Supabase Storage
   - Delete the `documents` bucket

3. **Revert frontend code**:
```bash
git revert <commit-hash>
git push
```

## Migration Path for Existing Documents

Existing documents will continue to work normally:
- They won't have `file_url` or `storage_path` (will be NULL)
- The DocumentViewerModal will show only the extracted text (no tabs)
- No user-visible changes for old documents

If you want to regenerate storage for existing PDFs:
1. Users can re-upload their PDFs
2. Or run a batch migration script (contact support for assistance)

## Support

For issues or questions, contact the development team or create an issue in the repository.

---

**Deployed by**: [Your Name]
**Date**: 2025-12-26
**Version**: 1.0.0
