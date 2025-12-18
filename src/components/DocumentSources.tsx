import { useState } from 'react';
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
import GoogleDrivePicker from './GoogleDrivePicker';
import LocalFilesPicker from './LocalFilesPicker';
import DragDropUpload from './DragDropUpload';
import CloudStorageConnector from './CloudStorageConnector';

interface DocumentSourcesProps {
  onDocumentsAdded: (documents: any[]) => void;
}

const DocumentSources = ({ onDocumentsAdded }: DocumentSourcesProps) => {
  const [activeTab, setActiveTab] = useState('upload');

  const sources = [
    {
      id: 'upload',
      title: 'Upload Files',
      description: 'Drag & drop or browse files from your device',
      icon: Upload,
      badge: 'Instant',
      badgeVariant: 'default' as const
    },
    {
      id: 'local',
      title: 'Local Folders',
      description: 'Connect folders from your computer',
      icon: HardDrive,
      badge: 'Browser Support',
      badgeVariant: 'secondary' as const
    },
    {
      id: 'google',
      title: 'Google Drive',
      description: 'Sync with your Google Drive folders',
      icon: Cloud,
      badge: 'Auto Sync',
      badgeVariant: 'default' as const
    },
    {
      id: 'cloud',
      title: 'Cloud Storage',
      description: 'Connect iCloud, Dropbox, OneDrive & more',
      icon: Wifi,
      badge: 'Coming Soon',
      badgeVariant: 'outline' as const
    }
  ];

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

          <TabsContent value="upload" className="space-y-4">
            <DragDropUpload onFilesAdded={onDocumentsAdded} />
          </TabsContent>

          <TabsContent value="local" className="space-y-4">
            <LocalFilesPicker onFilesAdded={onDocumentsAdded} />
          </TabsContent>

          <TabsContent value="google" className="space-y-4">
            <div className="space-y-4">
              <GoogleDrivePicker
                onItemsSelected={(items) => {
                  // Convert Google Drive items to documents format
                  const documents = items.map(item => ({
                    source: 'google_drive',
                    folder_id: item.folder_id,
                    title: item.folder_name,
                    type: 'folder'
                  }));
                  onDocumentsAdded(documents);
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

          <TabsContent value="cloud" className="space-y-4">
            <CloudStorageConnector onConnectionEstablished={onDocumentsAdded} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentSources;
