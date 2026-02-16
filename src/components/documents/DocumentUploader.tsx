import { useState, useCallback } from 'react';
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import heic2any from 'heic2any';
import { HEICWorkflow } from '../HEICWorkflow';

interface DocumentUploaderProps {
  timelineItemId: string;
  onUploadComplete?: () => void;
  maxFiles?: number;
  showProgress?: boolean;
  assistantRelationshipId?: string | null;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  id: string;
}

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUploader({
  timelineItemId,
  onUploadComplete,
  maxFiles = 10,
  showProgress = true,
  assistantRelationshipId = null,
}: DocumentUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showHEICWorkflow, setShowHEICWorkflow] = useState(false);
  const [currentHEICFile, setCurrentHEICFile] = useState<File | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
      return `Invalid file type. Allowed: PDF, DOCX, XLSX, PPTX, Images (JPG, PNG, GIF, WebP, HEIC)`;
    }

    // Check file size (higher limit for images)
    const maxSize = file.type.startsWith('image/') ? 25 * 1024 * 1024 : MAX_FILE_SIZE; // 25MB for images, 10MB for docs
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }

    // Check file name length
    if (file.name.length > 255) {
      return `File name too long. Maximum 255 characters`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const fileId = Math.random().toString(36).substring(7);

    // Add to uploading files
    setUploadingFiles((prev) => [
      ...prev,
      {
        file,
        progress: 0,
        status: 'uploading',
        id: fileId,
      },
    ]);

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Convert HEIC/HEIF to JPEG for iPhone photos
      let processedFile = file;
      if (file.type === 'image/heic' || file.type === 'image/heif') {
        console.log('🔄 Converting HEIC to JPEG...');
        toast({
          title: 'Converting photo',
          description: 'Converting iPhone photo to JPEG format...',
        });

        try {
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          }) as Blob;

          // Create a new File object from the converted Blob
          processedFile = new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: file.lastModified
          });

          console.log('✅ HEIC conversion successful');
        } catch (conversionError) {
          console.error('❌ HEIC conversion failed:', conversionError);
          throw new Error('Failed to convert HEIC image. Please try a different format.');
        }
      }

      // Generate storage path: userId/timelineItemId/fileName
      const timestamp = Date.now();
      const sanitizedFileName = processedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${user.id}/${timelineItemId}/${timestamp}_${sanitizedFileName}`;

      // Update progress
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 10 } : f))
      );

      // Upload to Supabase Storage (using processed file)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('timeline-documents')
        .upload(storagePath, processedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Update progress
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 50 } : f))
      );

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('timeline-documents')
        .getPublicUrl(storagePath);

      // Update progress
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 75 } : f))
      );

      // Insert document record (using processed file metadata)
      const { error: insertError } = await supabase
        .from('timeline_item_documents')
        .insert({
          timeline_item_id: timelineItemId,
          uploaded_by_user_id: user.id,
          file_name: processedFile.name, // Use processed file name (HEIC converted to .jpg)
          file_url: urlData.publicUrl,
          file_size: processedFile.size, // Use processed file size
          mime_type: processedFile.type, // Use processed file type (image/jpeg for converted HEIC)
          storage_path: storagePath,
          uploaded_via_assistant: !!assistantRelationshipId,
          assistant_relationship_id: assistantRelationshipId,
        });

      if (insertError) {
        // Clean up uploaded file
        await supabase.storage.from('timeline-documents').remove([storagePath]);
        throw insertError;
      }

      // Update progress to complete
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: 'success' } : f))
      );

      // Log activity if uploaded by assistant
      if (assistantRelationshipId) {
        await supabase.rpc('log_assistant_activity', {
          p_relationship_id: assistantRelationshipId,
          p_action_type: 'attached_document',
          p_description: `Attached document: ${processedFile.name}`,
          p_target_type: 'timeline_item',
          p_target_id: timelineItemId,
        });
      }

      // Remove from list after 2 seconds
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
      }, 2000);

      const uploadMessage = processedFile !== file ?
        `${file.name} (converted to ${processedFile.name}) has been attached` :
        `${processedFile.name} has been attached`;

      toast({
        title: 'Document uploaded',
        description: uploadMessage,
      });

      onUploadComplete?.();
    } catch (error) {
      console.error('Upload error:', error);

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );

      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
    }
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Check max files
      if (uploadingFiles.length + fileArray.length > maxFiles) {
        toast({
          title: 'Too many files',
          description: `Maximum ${maxFiles} files allowed`,
          variant: 'destructive',
        });
        return;
      }

      // Check for HEIC files and handle them with workflow
      const heicFiles = fileArray.filter(file =>
        file.type === 'image/heic' || file.type === 'image/heif'
      );

      const otherFiles = fileArray.filter(file =>
        file.type !== 'image/heic' && file.type !== 'image/heif'
      );

      // If there's exactly one HEIC file, show the comprehensive workflow
      if (heicFiles.length === 1 && otherFiles.length === 0) {
        setCurrentHEICFile(heicFiles[0]);
        setShowHEICWorkflow(true);
        return;
      }

      // If there are multiple HEIC files, process them with simple conversion
      if (heicFiles.length > 1) {
        toast({
          title: 'Multiple HEIC files',
          description: 'Processing multiple HEIC files with automatic conversion',
        });
      }

      // Upload each file (HEIC files will be converted automatically)
      fileArray.forEach((file) => {
        uploadFile(file);
      });
    },
    [uploadingFiles.length, maxFiles, uploadFile, setCurrentHEICFile, setShowHEICWorkflow, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input
      e.target.value = '';
    },
    [handleFiles]
  );

  const removeUploadingFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleHEICWorkflowComplete = useCallback((convertedFile: File, originalFile: File) => {
    // Close the workflow
    setShowHEICWorkflow(false);
    setCurrentHEICFile(null);

    // Upload the converted file
    uploadFile(convertedFile);

    toast({
      title: 'HEIC conversion completed',
      description: `${originalFile.name} converted and uploaded as ${convertedFile.name}`,
    });
  }, [uploadFile, toast]);

  const handleHEICWorkflowCancel = useCallback(() => {
    setShowHEICWorkflow(false);
    setCurrentHEICFile(null);
  }, []);

  // Show HEIC workflow if applicable
  if (showHEICWorkflow && currentHEICFile) {
    return (
      <HEICWorkflow
        initialFile={currentHEICFile}
        onComplete={handleHEICWorkflowComplete}
        onCancel={handleHEICWorkflowCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600'}
          hover:border-primary hover:bg-primary/5
        `}
      >
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm font-medium mb-2">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          PDF, DOCX, XLSX, PPTX, Images (JPG, PNG, GIF, WebP, HEIC) • Max 25MB for images, 10MB for documents
        </p>
        <input
          type="file"
          id="file-upload"
          multiple
          accept={Object.values(ALLOWED_TYPES).join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose Files
        </Button>
      </div>

      {/* Uploading files */}
      {showProgress && uploadingFiles.length > 0 && (
        <div className="space-y-3">
          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-card"
            >
              <div className="flex-shrink-0">
                {uploadingFile.status === 'uploading' && (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                )}
                {uploadingFile.status === 'success' && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {uploadingFile.status === 'error' && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium truncate">
                    {uploadingFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground ml-2">
                    {(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {uploadingFile.status === 'uploading' && (
                  <Progress value={uploadingFile.progress} className="h-1" />
                )}

                {uploadingFile.status === 'error' && uploadingFile.error && (
                  <p className="text-xs text-red-500">{uploadingFile.error}</p>
                )}

                {uploadingFile.status === 'success' && (
                  <p className="text-xs text-green-500">Upload complete</p>
                )}
              </div>

              {uploadingFile.status !== 'uploading' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadingFile(uploadingFile.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info alert */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Documents are securely stored and can be accessed by you and authorized assistants.
          {assistantRelationshipId && ' Uploaded as assistant.'}
        </AlertDescription>
      </Alert>
    </div>
  );
}
