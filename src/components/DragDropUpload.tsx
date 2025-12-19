import { useState, useRef, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  File
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { arrayBufferToBase64 } from '@/lib/base64Utils';

interface DragDropUploadProps {
  onFilesAdded: (files: File[]) => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  id: string;
}

const DragDropUpload = ({ onFilesAdded }: DragDropUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const acceptedTypes = [
    '.txt', '.md', '.pdf', '.docx', '.doc', '.rtf', '.fdx',
    'text/*', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-final-draft'
  ];

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to upload files.',
        variant: 'destructive',
      });
      return;
    }

    const validFiles = files.filter(file => {
      const fileName = file.name.toLowerCase();
      const fileExt = '.' + (fileName.split('.').pop() || '');

      // Check by file extension first (most reliable)
      const validExtensions = ['.txt', '.md', '.pdf', '.docx', '.doc', '.rtf', '.fdx', '.json', '.xml', '.csv'];
      const hasValidExtension = validExtensions.includes(fileExt);

      // Also check MIME type as fallback
      const validMimeTypes = [
        'text/plain', 'text/markdown', 'text/csv', 'text/xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/rtf',
        'application/json',
        'application/xml',
        'application/x-final-draft'
      ];
      const hasValidMimeType = validMimeTypes.includes(file.type) || file.type.startsWith('text/');

      const isValidType = hasValidExtension || hasValidMimeType;
      const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB limit

      if (!isValidType) {
        toast({
          title: 'Invalid File Type',
          description: `${file.name} is not a supported file type. Supported: PDF, DOCX, RTF, TXT, MD, FDX`,
          variant: 'destructive',
        });
      }

      if (!isValidSize) {
        toast({
          title: 'File Too Large',
          description: `${file.name} exceeds the 20MB limit.`,
          variant: 'destructive',
        });
      }

      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) return;

    // Initialize uploading files
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading',
      id: Math.random().toString(36).substr(2, 9)
    }));

    setUploadingFiles(newUploadingFiles);

    // Process files
    for (const uploadingFile of newUploadingFiles) {
      try {
        await processFile(uploadingFile);
      } catch (error) {
        console.error('File processing error:', error);
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, status: 'error', progress: 0 }
              : f
          )
        );
      }
    }

    onFilesAdded(validFiles);
  };

  const processFile = async (uploadingFile: UploadingFile) => {
    const { file } = uploadingFile;
    const fileName = file.name.toLowerCase();

    // Handle text files directly (fast path)
    if (file.type.startsWith('text/') || fileName.endsWith('.md') || fileName.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;

        // Update progress
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, progress: 50 }
              : f
          )
        );

        // Save to database
        await saveDocument(file.name, content, 'text', uploadingFile.id);
      };
      reader.readAsText(file);
    } else {
      // For binary files (PDF, RTF, DOCX, FDX), use the edge function to parse
      try {
        // Update progress - reading file
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, progress: 20 }
              : f
          )
        );

        // Read file as base64
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64 = arrayBufferToBase64(uint8Array);

        // Update progress - sending to parser
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, progress: 40 }
              : f
          )
        );

        // Determine mime type (browser may not detect FDX files correctly)
        let mimeType = file.type;
        if (fileName.endsWith('.fdx')) {
          mimeType = 'application/x-final-draft';
        } else if (fileName.endsWith('.rtf') && !mimeType) {
          mimeType = 'application/rtf';
        } else if (fileName.endsWith('.pdf') && !mimeType) {
          mimeType = 'application/pdf';
        }

        // Call the parse-document edge function
        const { data, error } = await supabase.functions.invoke('parse-document', {
          body: {
            fileName: file.name,
            mimeType: mimeType || 'application/octet-stream',
            fileData: base64
          }
        });

        // Update progress - parsing complete
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, progress: 80 }
              : f
          )
        );

        if (error) {
          console.error('Parse error:', error);
          throw new Error(error.message || 'Failed to parse document');
        }

        const content = data?.content || '';
        const fileType = fileName.split('.').pop() || 'binary';

        // Check for parsing errors hidden in metadata
        const actualError = data?.metadata?.parseError;
        if (actualError) {
          console.error('Document parsing error:', actualError);

          // Show user-friendly error notification
          toast({
            title: 'Document Parsing Failed',
            description: actualError.includes('ANTHROPIC_API_KEY')
              ? 'PDF extraction requires API configuration. Please contact support.'
              : `Failed to extract content from ${file.name}: ${actualError}`,
            variant: 'destructive',
          });

          // Mark upload as failed
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id
                ? { ...f, status: 'error', progress: 0 }
                : f
            )
          );
          return; // Don't save broken document
        }

        // Verify we have actual content
        if (!content || content.trim().length === 0) {
          toast({
            title: 'Empty Document',
            description: `No content could be extracted from ${file.name}`,
            variant: 'destructive',
          });

          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id
                ? { ...f, status: 'error', progress: 0 }
                : f
            )
          );
          return;
        }

        // Save to database with extracted content
        await saveDocument(file.name, content, fileType, uploadingFile.id, mimeType);

      } catch (error) {
        console.error('Binary file processing error:', error);

        // Show error notification
        toast({
          title: 'Upload Failed',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: 'destructive',
        });

        // Mark upload as failed
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, status: 'error', progress: 0 }
                : f
          )
        );
      }
    }
  };

  const saveDocument = async (title: string, content: string, type: string, uploadId: string, mimeType?: string) => {
    try {
      // Determine mime type based on file extension if not provided
      let finalMimeType = mimeType;
      if (!finalMimeType) {
        const ext = title.toLowerCase().split('.').pop();
        const mimeMap: Record<string, string> = {
          'txt': 'text/plain',
          'md': 'text/markdown',
          'pdf': 'application/pdf',
          'rtf': 'application/rtf',
          'fdx': 'application/x-final-draft',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'doc': 'application/msword'
        };
        finalMimeType = mimeMap[ext || ''] || 'application/octet-stream';
      }

      const { data, error } = await supabase
        .from('knowledge_documents')
        .insert({
          title: title.replace(/\.[^/.]+$/, ""), // Remove file extension
          content,
          user_id: user!.id,
          google_file_id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID for uploads
          category: 'general',
          file_type: type,
          file_size: content.length,
          mime_type: finalMimeType
        })
        .select()
        .single();

      if (error) throw error;

      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadId
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      );

      // If it's a document with content, trigger AI analysis
      if (content.trim()) {
        supabase.functions.invoke('ai-document-analysis', {
          body: {
            document_id: data.id,
            user_id: user!.id,
            content,
            title: data.title
          }
        }).catch(console.error);
      }

    } catch (error) {
      console.error('Save document error:', error);
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadId
            ? { ...f, status: 'error', progress: 0 }
            : f
        )
      );
    }
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      return FileText;
    }
    return File;
  };

  return (
    <div className="space-y-4">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileSelect}
      >
        <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <h3 className="text-lg font-semibold mb-2">
          {isDragOver ? 'Drop files here' : 'Drag & drop files'}
        </h3>
        <p className="text-muted-foreground mb-4">
          Or click to browse files from your computer
        </p>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Choose Files
        </Button>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {acceptedTypes.slice(0, 6).map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type.startsWith('.') ? type.toUpperCase() : type.split('/')[1]?.toUpperCase()}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Maximum file size: 20MB per file
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Uploading Files</h4>
          {uploadingFiles.map((uploadingFile) => {
            const Icon = getFileIcon(uploadingFile.file);
            return (
              <div key={uploadingFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{uploadingFile.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={uploadingFile.progress} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">
                      {uploadingFile.progress}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploadingFile.status === 'success' && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {uploadingFile.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadingFile(uploadingFile.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DragDropUpload;
