import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, 
  FileText, 
  AlertCircle, 
  Check,
  HardDrive,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocalFilesPickerProps {
  onFilesAdded: (files: File[]) => void;
}

const LocalFilesPicker = ({ onFilesAdded }: LocalFilesPickerProps) => {
  const [isSupported, setIsSupported] = useState(
    'showDirectoryPicker' in window || 'webkitdirectory' in document.createElement('input')
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFolderPicker = async () => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Your browser does not support folder selection.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Try modern File System Access API first
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'read'
        });
        
        const files = await getAllFilesFromDirectory(dirHandle);
        const fileList = await Promise.all(files.map(async (fileHandle) => {
          return await fileHandle.getFile();
        }));
        
        const textFiles = fileList.filter(file => 
          file.type.startsWith('text/') || 
          file.name.endsWith('.md') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.pdf') ||
          file.name.endsWith('.docx')
        );
        
        if (textFiles.length === 0) {
          toast({
            title: 'No Compatible Files',
            description: 'No text files, PDFs, or documents found in the selected folder.',
            variant: 'destructive',
          });
          return;
        }
        
        onFilesAdded(textFiles);
        toast({
          title: 'Folder Added',
          description: `${textFiles.length} compatible file(s) found and added.`,
        });
      } else {
        // Fallback to input with webkitdirectory
        triggerLegacyFolderPicker();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: 'Failed to access folder. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerLegacyFolderPicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const textFiles = files.filter(file => 
        file.type.startsWith('text/') || 
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.pdf') ||
        file.name.endsWith('.docx')
      );
      
      if (textFiles.length > 0) {
        onFilesAdded(textFiles);
        toast({
          title: 'Folder Added',
          description: `${textFiles.length} compatible file(s) found and added.`,
        });
      } else {
        toast({
          title: 'No Compatible Files',
          description: 'No text files, PDFs, or documents found in the selected folder.',
          variant: 'destructive',
        });
      }
    };
    
    input.click();
  };

  const handleSingleFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.txt,.md,.pdf,.docx,.doc,.rtf,text/*';
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        onFilesAdded(files);
        toast({
          title: 'Files Added',
          description: `${files.length} file(s) added successfully.`,
        });
      }
    };
    
    input.click();
  };

  // Helper function to recursively get all files from a directory
  const getAllFilesFromDirectory = async (dirHandle: any): Promise<any[]> => {
    const files = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        files.push(entry);
      } else if (entry.kind === 'directory') {
        const subFiles = await getAllFilesFromDirectory(entry);
        files.push(...subFiles);
      }
    }
    return files;
  };

  if (!isSupported) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your browser doesn't support advanced folder access. You can still upload individual files.
          </AlertDescription>
        </Alert>
        
        <Button onClick={handleSingleFiles} className="w-full">
          <FileText className="h-4 w-4 mr-2" />
          Select Individual Files
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Access folders directly from your computer. Works with documents, text files, PDFs, and more.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button 
          onClick={handleFolderPicker} 
          disabled={isLoading}
          variant="outline"
          className="h-auto p-4 flex flex-col items-start gap-2"
        >
          <div className="flex items-center gap-2 w-full">
            <FolderOpen className="h-5 w-5" />
            <span className="font-medium">Select Folder</span>
          </div>
          <span className="text-xs text-muted-foreground text-left">
            Browse and select an entire folder
          </span>
          {isSupported && (
            <Badge variant="secondary" className="text-xs">
              <HardDrive className="h-3 w-3 mr-1" />
              Local Access
            </Badge>
          )}
        </Button>
        
        <Button 
          onClick={handleSingleFiles}
          variant="outline"
          className="h-auto p-4 flex flex-col items-start gap-2"
        >
          <div className="flex items-center gap-2 w-full">
            <FileText className="h-5 w-5" />
            <span className="font-medium">Select Files</span>
          </div>
          <span className="text-xs text-muted-foreground text-left">
            Choose individual files to upload
          </span>
          <Badge variant="secondary" className="text-xs">
            <Check className="h-3 w-3 mr-1" />
            All Browsers
          </Badge>
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Supported formats:</strong> TXT, MD, PDF, DOCX, DOC, RTF</p>
        <p><strong>Note:</strong> Files remain on your device until you choose to upload them</p>
      </div>
    </div>
  );
};

export default LocalFilesPicker;