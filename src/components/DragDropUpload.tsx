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
  File,
  FileImage,
  FileAudio,
  Presentation,
  Sheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DocumentParserService } from '@/services/documentParser';

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

  const acceptedTypes = DocumentParserService.getSupportedExtensions().concat([
    'text/*', 
    'application/pdf', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'audio/*',
    'image/*'
  ]);

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
      const isValidType = DocumentParserService.isSupported(file.type) || 
        acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type);
          }
          return file.type.startsWith(type.split('/*')[0]);
        });
      
      const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB limit
      
      if (!isValidType) {
        toast({
          title: 'Invalid File Type',
          description: `${file.name} is not supported. Supported formats: PDF, Word, Excel, PowerPoint, audio, images, and text files.`,
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
    const uploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading',
      id: Math.random().toString(36).substr(2, 9)
    }));

    setUploadingFiles(uploadingFiles);

    // Process files
    for (const uploadingFile of uploadingFiles) {
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
    
    try {
      // Update progress to show parsing started
      setUploadingFiles(prev => 
        prev.map(f => 
          f.id === uploadingFile.id 
            ? { ...f, progress: 10 }
            : f
        )
      );

      // Parse document using comprehensive parser
      const parsedDocument = await DocumentParserService.parseDocument(file);
      
      // Update progress to show parsing completed
      setUploadingFiles(prev => 
        prev.map(f => 
          f.id === uploadingFile.id 
            ? { ...f, progress: 80 }
            : f
        )
      );

      // Save to database with parsed content and metadata
      await saveDocument(
        parsedDocument.metadata.title || file.name, 
        parsedDocument.content, 
        parsedDocument.metadata.fileType,
        uploadingFile.id,
        parsedDocument.metadata
      );

    } catch (error) {
      console.error('Document processing error:', error);
      
      // Fallback: save basic file info
      await saveDocument(
        file.name, 
        `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        'error',
        uploadingFile.id
      );
    }
  };

  const saveDocument = async (title: string, content: string, type: string, uploadId: string, metadata?: any) => {
    try {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .insert({
          title: title.replace(/\.[^/.]+$/, ""), // Remove file extension
          content,
          user_id: user!.id,
          google_file_id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID for uploads
          category: metadata?.type || 'general',
          file_type: type,
          file_size: content.length,
          mime_type: metadata?.mimeType || (type === 'text' ? 'text/plain' : 'application/octet-stream'),
          ai_insights: metadata ? { 
            pageCount: metadata.pageCount,
            hasImages: metadata.hasImages,
            extractedImages: metadata.extractedImages,
            parsedMetadata: metadata
          } : null
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
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return FileText;
    }
    if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      return FileText;
    }
    if (file.type.includes('sheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      return Sheet;
    }
    if (file.type.includes('presentation') || file.type.includes('powerpoint') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
      return Presentation;
    }
    if (file.type.startsWith('audio/')) {
      return FileAudio;
    }
    if (file.type.startsWith('image/')) {
      return FileImage;
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
          {['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'MD', 'MP3', 'PNG'].map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type}
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