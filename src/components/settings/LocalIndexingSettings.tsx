import { useState } from 'react';
import { useLocalDocuments } from '@/hooks/useLocalDocuments';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  HardDrive,
  Folder,
  FileText,
  RefreshCw,
  Plus,
  AlertCircle,
  Loader2,
  Database
} from 'lucide-react';

/**
 * LocalIndexingSettings component provides interface for managing local document indexing.
 * Allows users to enable/disable local indexing, view statistics, and manage folders.
 */
export const LocalIndexingSettings = () => {
  const { toast } = useToast();
  const {
    isSupported,
    isInitialized,
    isScanning,
    indexStats,
    initialize,
    requestFolderAccess,
    refreshIndex
  } = useLocalDocuments();

  const [isToggling, setIsToggling] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [localIndexingEnabled, setLocalIndexingEnabled] = useState(false);

  // Helper function to format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return value.toFixed(1) + ' ' + sizes[i];
  };

  // Helper function to format timestamp to relative time
  const formatRelativeTime = (timestamp: number): string => {
    if (timestamp === 0) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Handle enabling/disabling local indexing
  const handleToggleIndexing = async (enabled: boolean) => {
    setIsToggling(true);

    try {
      if (enabled) {
        await initialize();
        setLocalIndexingEnabled(true);
        toast({
          title: 'Local Indexing Enabled',
          description: 'You can now add folders to index your local documents.',
        });
      } else {
        setLocalIndexingEnabled(false);
        toast({
          title: 'Local Indexing Disabled',
          description: 'Local document indexing has been turned off.',
        });
      }
    } catch (error) {
      console.error('Error toggling local indexing:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle local indexing. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsToggling(false);
    }
  };

  // Handle adding a new folder
  const handleAddFolder = async () => {
    setIsAddingFolder(true);

    try {
      const result = await requestFolderAccess();
      if (result) {
        toast({
          title: 'Folder Added',
          description: `Successfully added folder: ${result.permission.path}`,
        });
      }
    } catch (error) {
      console.error('Error adding folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to add folder. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingFolder(false);
    }
  };

  // Handle refreshing the index
  const handleRefreshIndex = async () => {
    try {
      const result = await refreshIndex();
      toast({
        title: 'Index Refreshed',
        description: `Scanned ${result.foldersScanned} folders and processed ${result.documentsProcessed} documents.`,
      });
    } catch (error) {
      console.error('Error refreshing index:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh index. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // If File System Access API is not supported
  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Local Document Indexing
          </CardTitle>
          <CardDescription>
            Index local documents for enhanced search capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Local document indexing is not supported in this browser.
              File System Access API is required for this feature.
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
          Index local documents for enhanced search capabilities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="local-indexing" className="text-base font-semibold">
              Enable Local Indexing
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow indexing of documents from your local file system
            </p>
          </div>
          <Switch
            id="local-indexing"
            checked={isInitialized && localIndexingEnabled}
            onCheckedChange={handleToggleIndexing}
            disabled={isToggling}
          />
        </div>

        {/* Statistics and Actions (only shown when initialized and enabled) */}
        {isInitialized && localIndexingEnabled && (
          <>
            <Separator />

            {/* Statistics */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Index Statistics
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Documents</p>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-lg font-semibold">
                      {indexStats?.totalDocuments || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Folders</p>
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-amber-500" />
                    <span className="text-lg font-semibold">
                      {indexStats?.totalFolders || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Index Size</p>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-green-500" />
                    <span className="text-lg font-semibold">
                      {formatBytes(indexStats?.indexSizeBytes || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Scan</p>
                  <div className="space-y-1">
                    <span className="text-sm font-medium">
                      {formatRelativeTime(indexStats?.lastFullScan || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Documents needing update badge */}
              {indexStats && indexStats.documentsNeedingUpdate > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <Badge variant="secondary">
                    {indexStats.documentsNeedingUpdate} documents need updating
                  </Badge>
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-4">
              <h4 className="font-medium">Actions</h4>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAddFolder}
                  disabled={isAddingFolder || isScanning}
                  className="flex-1"
                  variant="outline"
                >
                  {isAddingFolder ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Folder
                </Button>

                <Button
                  onClick={handleRefreshIndex}
                  disabled={isScanning || isAddingFolder}
                  className="flex-1"
                  variant="outline"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Index
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Initialization hint */}
        {(!isInitialized || !localIndexingEnabled) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Enable local indexing to search through documents stored on your computer.
              This feature requires permission to access selected folders.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};