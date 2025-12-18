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
    '.txt', '.md', '.pdf', '.docx', '.doc', '.rtf',
    'text/*', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type);
        }
        return file.type.startsWith(type.split('/*')[0]);
      });

      const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB limit

      if (!isValidType) {
        toast({
          title: 'Invalid File Type',
          description: `${file.name} is not a supported file type.`,
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

    // Simulate upload progress for text files (direct processing)
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
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
      // For binary files, we'd typically upload to storage first
      // For now, we'll simulate processing
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, progress }
              : f
          )
        );
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await saveDocument(file.name, '', 'binary', uploadingFile.id);
    }
  };

  const saveDocument = async (title: string, content: string, type: string, uploadId: string) => {
    try {
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
          mime_type: type === 'text' ? 'text/plain' : 'application/octet-stream'
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
