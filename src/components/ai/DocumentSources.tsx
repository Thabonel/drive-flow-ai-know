import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Cloud,
  Upload,
  HardDrive,
  Wifi,
  Plus,
  ChevronRight
} from 'lucide-react';
import GoogleDrivePicker from '../GoogleDrivePicker';
import DragDropUpload from '../DragDropUpload';
import CloudStorageConnector from '../CloudStorageConnector';
import { LocalDocumentIndexer } from '@/components/local-documents/LocalDocumentIndexer';
import { SelectedDriveItem } from '@/types/googleDrive';

// Unified document interface for consistent callback handling
interface UnifiedDocument {
  id?: string;
  source: 'upload' | 'google_drive' | 'local' | 'cloud';
  title: string;
  type: 'file' | 'folder';
  mimeType?: string;
  // Google Drive specific fields
  folder_id?: string;
  folder_name?: string;
  folder_path?: string | null;
  isFolder?: boolean;
  // Upload specific fields
  file?: File;
  // Local document specific fields
  filePath?: string;
}

interface DocumentSourcesProps {
  onDocumentsAdded?: (documents: any[]) => void;
}

// Constants for source types and tab IDs
const DOCUMENT_SOURCES = {
  UPLOAD: 'upload',
  LOCAL: 'local',
  GOOGLE: 'google_drive', // Fixed to match UnifiedDocument interface
  CLOUD: 'cloud'
} as const;

const GOOGLE_DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

// Helper function to convert Google Drive items to unified document format
const convertGoogleDriveItems = (items: SelectedDriveItem[]): UnifiedDocument[] => {
  return items.map((item) => {
    if (!item.folder_id || !item.folder_name) {
      console.warn('Invalid Google Drive item:', item);
      throw new Error('Google Drive item missing required fields');
    }

    return {
      id: item.folder_id,
      source: 'google_drive',
      title: item.folder_name,
      type: item.isFolder ? 'folder' : 'file',
      mimeType: item.mimeType,
      folder_id: item.folder_id,
      folder_name: item.folder_name,
      folder_path: item.folder_path,
      isFolder: item.isFolder
    };
  });
};

export const DocumentSources = ({ onDocumentsAdded }: DocumentSourcesProps) => {
  const [activeTab, setActiveTab] = useState<string>(DOCUMENT_SOURCES.UPLOAD);

  // Adapter function to convert File[] to UnifiedDocument[] for upload callback
  const handleFilesAdded = (files: File[]) => {
    if (!onDocumentsAdded) return;

    const unifiedDocuments = files.map(file => ({
      source: 'upload',
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      type: 'file',
      mimeType: file.type,
      file
    }));

    onDocumentsAdded(unifiedDocuments);
  };

  // Adapter function for cloud storage connections
  const handleCloudConnection = (connection: any) => {
    if (!onDocumentsAdded || !connection) return;

    // For now, cloud storage connections don't produce documents directly
    // This is handled by the CloudStorageConnector internally
    // We'll just log the connection for debugging
    console.log('Cloud storage connection established:', connection);
  };

  const sources = useMemo(() => [
    {
      id: DOCUMENT_SOURCES.UPLOAD,
      title: 'Upload Files',
      description: 'Drag & drop or browse files from your device',
      icon: Upload,
      badge: 'Instant',
      badgeVariant: 'default' as const
    },
    {
      id: DOCUMENT_SOURCES.LOCAL,
      title: 'Local Indexing',
      description: 'Index documents from your local file system',
      icon: HardDrive,
      badge: 'Offline',
      badgeVariant: 'secondary' as const
    },
    {
      id: DOCUMENT_SOURCES.GOOGLE,
      title: 'Google Drive',
      description: 'Sync with your Google Drive folders',
      icon: Cloud,
      badge: 'Auto Sync',
      badgeVariant: 'default' as const
    },
    {
      id: DOCUMENT_SOURCES.CLOUD,
      title: 'Cloud Storage',
      description: 'Connect iCloud, Dropbox, OneDrive & more',
      icon: Wifi,
      badge: 'Coming Soon',
      badgeVariant: 'outline' as const
    }
  ], []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Documents
        </CardTitle>
        <CardDescription>
          Connect documents from various sources to your knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {sources.map((source) => (
              <TabsTrigger
                key={source.id}
                value={source.id}
                className="flex flex-col gap-1 p-3 h-auto"
              >
                <source.icon className="h-4 w-4" />
                <span className="text-xs">{source.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            {sources.map((source) => (
              <div key={`${source.id}-header`} className={`mb-4 ${activeTab === source.id ? 'block' : 'hidden'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <source.icon className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{source.title}</h3>
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                    </div>
                  </div>
                  <Badge variant={source.badgeVariant}>
                    {source.badge}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <TabsContent value={DOCUMENT_SOURCES.UPLOAD} className="space-y-4">
            <DragDropUpload onFilesAdded={handleFilesAdded} />
          </TabsContent>

          <TabsContent value={DOCUMENT_SOURCES.LOCAL} className="space-y-4">
            <LocalDocumentIndexer />
          </TabsContent>

          <TabsContent value={DOCUMENT_SOURCES.GOOGLE} className="space-y-4">
            <div className="space-y-4">
              <GoogleDrivePicker
                onItemsSelected={(items) => {
                  if (!onDocumentsAdded || items.length === 0) return;

                  try {
                    const unifiedDocuments = convertGoogleDriveItems(items);
                    onDocumentsAdded(unifiedDocuments);
                  } catch (error) {
                    console.error('Failed to convert Google Drive items:', error);
                  }
                }}
              />
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Google Drive Integration</p>
                    <p className="text-muted-foreground">
                      Automatically syncs changes from your Google Drive folders.
                      Supports Google Docs, Sheets, PDFs, and text files.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value={DOCUMENT_SOURCES.CLOUD} className="space-y-4">
            <CloudStorageConnector onConnectionEstablished={handleCloudConnection} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentSources;