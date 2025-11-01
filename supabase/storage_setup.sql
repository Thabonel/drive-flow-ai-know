-- Supabase Storage Setup for Timeline Documents
-- Run this in Supabase Dashboard > SQL Editor after creating the storage bucket

-- First, create the bucket via Supabase Dashboard > Storage:
-- 1. Click "New bucket"
-- 2. Name: timeline-documents
-- 3. Public: OFF (unchecked)
-- 4. File size limit: 10485760 (10MB)
-- 5. Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.openxmlformats-officedocument.presentationml.presentation

-- Then run these policies:

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'timeline-documents' AND
  (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'timeline-documents' AND
  (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Policy: Assistants can upload to executive folders
CREATE POLICY "Assistants can upload to executive folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'timeline-documents' AND
  EXISTS (
    SELECT 1 FROM assistant_relationships ar
    WHERE ar.executive_id::TEXT = (storage.foldername(name))[1]
      AND ar.assistant_id = auth.uid()
      AND ar.status = 'active'
      AND (ar.permissions->>'attach_documents')::BOOLEAN = TRUE
  )
);

-- Policy: Assistants can view executive files
CREATE POLICY "Assistants can view executive files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'timeline-documents' AND
  EXISTS (
    SELECT 1 FROM assistant_relationships ar
    WHERE ar.executive_id::TEXT = (storage.foldername(name))[1]
      AND ar.assistant_id = auth.uid()
      AND ar.status = 'active'
      AND (ar.permissions->>'view_documents')::BOOLEAN = TRUE
  )
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'timeline-documents' AND
  (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'timeline-documents' AND
  (storage.foldername(name))[1] = auth.uid()::TEXT
);
