import React, { useEffect } from 'react';
import { useLocalDocuments } from '@/hooks/useLocalDocuments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, HardDrive, AlertTriangle } from 'lucide-react';

export const LocalDocumentIndexer: React.FC = () => {
  const {
    isSupported,
    isInitialized,
    isScanning,
    indexStats,
    lastScanResult,
    initialize,
    requestFolderAccess,
    refreshIndex,
  } = useLocalDocuments();

  useEffect(() => {
    if (isSupported && !isInitialized) {
      initialize().catch((error) => {
        console.error('Failed to initialize local documents:', error);
      });
    }
  }, [isSupported, isInitialized, initialize]);

  const handleAddFolder = async () => {
    try {
      await requestFolderAccess();
    } catch (error) {
      console.error('Failed to request folder access:', error);
    }
  };

  const handleRefreshIndex = async () => {
    try {
      await refreshIndex();
    } catch (error) {
      console.error('Failed to refresh index:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    return `${Math.round(bytes / 1024)} KB`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString();
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Local document indexing is not supported in your browser. This feature requires the File System Access API which is only available in modern browsers like Chrome 86+ and Edge 86+.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Local Document Indexing
        </CardTitle>
        <CardDescription>
          Index documents from your local file system for offline searching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!indexStats ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set up local document indexing to search through documents on your computer without uploading them to the cloud.
            </p>
            <Button
              onClick={handleAddFolder}
              disabled={isScanning}
              className="w-full"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Add Folder
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Documents:</span>
                <p className="text-muted-foreground">
                  {indexStats.totalDocuments} documents indexed
                </p>
              </div>
              <div>
                <span className="font-medium">Folders:</span>
                <p className="text-muted-foreground">
                  {indexStats.totalFolders} folders monitored
                </p>
              </div>
              <div>
                <span className="font-medium">Last Scan:</span>
                <p className="text-muted-foreground">
                  {formatDate(indexStats.lastFullScan)}
                </p>
              </div>
              <div>
                <span className="font-medium">Index Size:</span>
                <p className="text-muted-foreground">
                  {formatBytes(indexStats.indexSizeBytes)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddFolder}
                disabled={isScanning}
                variant="outline"
                className="flex-1"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Add Folder
              </Button>
              <Button
                onClick={handleRefreshIndex}
                disabled={isScanning}
                variant="outline"
                className="flex-1"
              >
                {isScanning ? 'Scanning...' : 'Refresh Index'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};