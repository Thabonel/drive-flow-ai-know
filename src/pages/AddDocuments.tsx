import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Upload, HardDrive, Cloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDriveFolders } from '@/hooks/useDriveFolders';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import GoogleDrivePicker from '@/components/GoogleDrivePicker';
import GoogleAuthStatus from '@/components/GoogleAuthStatus';
import MicrosoftDrivePicker from '@/components/MicrosoftDrivePicker';
import MicrosoftAuthStatus from '@/components/MicrosoftAuthStatus';
import DropboxPicker from '@/components/DropboxPicker';
import DropboxAuthStatus from '@/components/DropboxAuthStatus';
import DragDropUpload from '@/components/DragDropUpload';
import LocalFilesPicker from '@/components/LocalFilesPicker';
import { S3Setup } from '@/components/S3Setup';
import { PageHelp } from '@/components/PageHelp';
import { AIQueryInput } from '@/components/AIQueryInput';
import { useDropboxFolders } from '@/hooks/useDropboxFolders';

export default function AddDocuments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast: hookToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');
  const [newFolderUrls, setNewFolderUrls] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { folders, addFolder, removeFolder, syncFolder } = useDriveFolders();
  const {
    folders: dropboxFolders,
    addFolder: addDropboxFolder,
    removeFolder: removeDropboxFolder,
    syncFolder: syncDropboxFolder,
    syncAllFolders: syncAllDropboxFolders
  } = useDropboxFolders();

  const { data: syncJobs } = useQuery({
    queryKey: ['sync-jobs', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const syncAllFolders = useMutation({
    mutationFn: async () => {
      if (!folders.data || folders.data.length === 0) {
        throw new Error('No folders to sync');
      }

      const results = [];
      for (const folder of folders.data) {
        try {
          const { data, error } = await supabase.functions.invoke('google-drive-sync', {
            body: { folder_id: folder.id, user_id: user!.id }
          });
          if (error) throw error;
          results.push({ folder: folder.folder_name, files: data?.files_processed || 0 });
        } catch (error: any) {
          console.error(`Error syncing folder ${folder.folder_name}:`, error);
          results.push({ folder: folder.folder_name, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['sync-jobs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['drive-folders'] });
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      
      const totalFiles = results.reduce((sum, result) => sum + (result.files || 0), 0);
      const errors = results.filter(result => result.error);
      
      hookToast({
        title: 'Sync All Completed',
        description: `Successfully synced ${totalFiles} files from ${results.length} folders.${errors.length > 0 ? ` ${errors.length} folders had errors.` : ''}`,
      });
    },
    onError: (error) => {
      hookToast({
        title: 'Sync All Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleDocumentsAdded = async (documents: any[]) => {
    if (documents.length > 0) {
      toast.success(`${documents.length} document(s) added successfully`);
      await queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      
      setTimeout(() => {
        navigate('/documents');
      }, 1500);
    }
  };

  const handleItemsFromPicker = async (items: { folder_id: string; folder_name: string; folder_path: string | null; mimeType?: string; isFolder?: boolean }[]) => {
    setIsAdding(true);
    let successCount = 0;
    let errorCount = 0;
    let fileCount = 0;
    let folderCount = 0;

    for (const item of items) {
      try {
        // Handle both old format (no mimeType) and new format
        const isFolder = item.isFolder !== undefined ? item.isFolder : true;

        if (isFolder) {
          // Add folder (existing behavior)
          await addFolder.mutateAsync({
            folder_id: item.folder_id,
            folder_name: item.folder_name,
            folder_path: item.folder_path
          });
          folderCount++;
        } else {
          // For individual files, add them as single-file "folders"
          await addFolder.mutateAsync({
            folder_id: item.folder_id,
            folder_name: item.folder_name,
            folder_path: item.folder_path
          });
          fileCount++;
        }
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      const itemsDesc = folderCount > 0 && fileCount > 0
        ? `${folderCount} folder(s) and ${fileCount} file(s)`
        : folderCount > 0
          ? `${folderCount} folder(s)`
          : fileCount > 0
            ? `${fileCount} file(s)`
            : `${successCount} item(s)`;

      hookToast({
        title: 'Items Added',
        description: `${itemsDesc} connected successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
      });
    }

    if (errorCount > 0 && successCount === 0) {
      hookToast({
        title: 'Error',
        description: 'Failed to add items. Please try again.',
        variant: 'destructive',
      });
    }

    setIsAdding(false);
  };

  const handleDropboxItemsFromPicker = async (items: { folder_id: string; folder_name: string; folder_path: string | null }[]) => {
    setIsAdding(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        await addDropboxFolder.mutateAsync(item);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      hookToast({
        title: 'Dropbox Items Added',
        description: `${successCount} item(s) connected successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
      });
    }

    if (errorCount > 0 && successCount === 0) {
      hookToast({
        title: 'Error',
        description: 'Failed to add Dropbox items. Please try again.',
        variant: 'destructive',
      });
    }

    setIsAdding(false);
  };

  const handleRemoveDropboxFolder = async (folderId: string) => {
    await removeDropboxFolder.mutateAsync(folderId);
    hookToast({
      title: 'Folder Removed',
      description: 'Dropbox folder has been disconnected.',
    });
  };

  const handleSyncDropboxFolder = async (folderId: string) => {
    hookToast({
      title: 'Sync Started',
      description: 'Syncing Dropbox folder contents...',
    });
    try {
      const result = await syncDropboxFolder.mutateAsync(folderId);
      hookToast({
        title: 'Sync Complete',
        description: `${result.files_processed} files processed`,
      });
    } catch (err) {
      hookToast({
        title: 'Sync Error',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleAddFolders = async () => {
    if (!newFolderUrls.trim()) return;
    
    setIsAdding(true);
    const urls = newFolderUrls.split('\n').filter(url => url.trim());
    let successCount = 0;
    let errorCount = 0;
    
    for (const url of urls) {
      try {
        const folderIdMatch = url.trim().match(/folders\/([a-zA-Z0-9-_]+)/);
        if (!folderIdMatch) {
          errorCount++;
          continue;
        }
        
        const folderId = folderIdMatch[1];
        
        await addFolder.mutateAsync({
          folder_id: folderId,
          folder_name: `Folder ${folderId.slice(-4)}`,
          folder_path: null,
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    setNewFolderUrls('');
    
    if (successCount > 0) {
      hookToast({
        title: 'Folders Added',
        description: `${successCount} folder(s) connected successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
      });
    }
    
    if (errorCount > 0 && successCount === 0) {
      hookToast({
        title: 'Error',
        description: 'Failed to add folders. Please check the URLs.',
        variant: 'destructive',
      });
    }
    
    setIsAdding(false);
  };

  const handleRemoveFolder = async (folderId: string) => {
    await removeFolder.mutateAsync(folderId);
    hookToast({
      title: 'Folder Removed',
      description: 'Google Drive folder has been disconnected.',
    });
  };

  const handleSyncFolder = async (folderId: string) => {
    hookToast({
      title: 'Sync Started',
      description: 'Syncing folder contents...',
    });
    try {
      const result = await syncFolder.mutateAsync(folderId);
      hookToast({
        title: 'Sync Complete',
        description: `${result.files_processed} files processed`,
      });
    } catch (err) {
      hookToast({
        title: 'Sync Error',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const getActiveSyncJob = (folderId: string) => {
    return syncJobs?.find(job => job.folder_id === folderId && job.status === 'running');
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">Add Documents</h1>
          <p className="text-muted-foreground">
            Upload documents from various sources to your knowledge base
          </p>
        </div>
        <PageHelp
          title="Add Documents Help"
          description="Add documents to your knowledge base from multiple sources OR use privacy-first local indexing. Local documents stay on your PC while cloud uploads enable sharing. Both searchable together."
          tips={[
            "🔐 Privacy Option: Use local indexing to keep sensitive documents on your PC",
            "☁️ Sharing Option: Upload to cloud for team access and backup",
            "Upload Files: Drag & drop or browse files (PDF, DOCX, TXT, MD, CSV, JSON)",
            "Local Indexing: Grant folder permissions, AI creates summaries stored locally",
            "Google Drive: Connect your account, select folders, and sync automatically",
            "Microsoft 365: Sync from OneDrive or SharePoint",
            "Amazon S3: Connect S3 buckets with credentials for automatic syncing",
            "Local documents NEVER leave your computer - complete privacy",
            "Hybrid search works across both local and cloud documents",
            "Local indexing requires modern browser (Chrome/Edge recommended)",
            "Background sync monitors local file changes automatically",
            "Sync All Folders button syncs all connected cloud folders at once",
            "View sync status and last sync time for each connected folder"
          ]}
        />
      </div>

      {/* AI Assistant for document queries */}
      <AIQueryInput />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="local" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Local Folders
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Google Drive
          </TabsTrigger>
          <TabsTrigger value="dropbox" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Dropbox
          </TabsTrigger>
          <TabsTrigger value="microsoft" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Microsoft 365
          </TabsTrigger>
          <TabsTrigger value="s3" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Amazon S3
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>Drag & drop or browse files from your device</CardDescription>
            </CardHeader>
            <CardContent>
              <DragDropUpload onFilesAdded={handleDocumentsAdded} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="local" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Local Folders</CardTitle>
              <CardDescription>Connect folders from your computer</CardDescription>
            </CardHeader>
            <CardContent>
              <LocalFilesPicker onFilesAdded={handleDocumentsAdded} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="space-y-4 mt-6">
          <GoogleAuthStatus />

          <Card>
            <CardHeader>
              <CardTitle>Add Files & Folders</CardTitle>
              <CardDescription>
                Connect files and folders from your Google Drive to start syncing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <GoogleDrivePicker onItemsSelected={handleItemsFromPicker} />
                  <p className="text-sm text-muted-foreground mt-2">
                    Browse and select files/folders directly from your Google Drive
                  </p>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="folder-urls">Paste Google Drive URLs (one per line)</Label>
                  <Textarea
                    id="folder-urls"
                    placeholder={"https://drive.google.com/drive/folders/...\nhttps://drive.google.com/drive/folders/..."}
                    value={newFolderUrls}
                    onChange={(e) => setNewFolderUrls(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleAddFolders} 
                  disabled={isAdding || !newFolderUrls.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAdding ? 'Adding...' : 'Add from URLs'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Connected Folders & Sync Status</CardTitle>
                  <CardDescription>
                    Manage your connected Google Drive folders and sync status
                  </CardDescription>
                </div>
                {folders.data && folders.data.length > 0 && (
                  <Button 
                    onClick={() => syncAllFolders.mutate()}
                    disabled={syncAllFolders.isPending}
                    variant="default"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncAllFolders.isPending ? 'animate-spin' : ''}`} />
                    {syncAllFolders.isPending ? 'Syncing All...' : 'Sync All Folders'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {folders.isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (!folders.data || folders.data.length === 0) ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No folders connected</h3>
                  <p className="text-muted-foreground">Add your first Google Drive folder to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {folders.data?.map((folder) => {
                    const activeSyncJob = getActiveSyncJob(folder.id);
                    const isSyncing = !!activeSyncJob;

                    return (
                      <div key={folder.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <FolderOpen className="h-8 w-8 text-primary" />
                          <div>
                            <h4 className="font-medium text-foreground">{folder.folder_name}</h4>
                            <p className="text-sm text-muted-foreground">{folder.folder_path}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={isSyncing ? 'default' : folder.is_active ? 'default' : 'secondary'}>
                                {isSyncing ? (
                                  <>Syncing</>
                                ) : folder.is_active ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                  </>
                                )}
                              </Badge>
                              {folder.last_synced_at && (
                                <span className="text-xs text-muted-foreground">
                                  Last sync: {new Date(folder.last_synced_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncFolder(folder.id)}
                            disabled={isSyncing}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            Sync
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFolder(folder.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dropbox" className="space-y-4 mt-6">
          <DropboxAuthStatus />

          <Card>
            <CardHeader>
              <CardTitle>Add Files & Folders</CardTitle>
              <CardDescription>
                Connect files and folders from your Dropbox to start syncing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <DropboxPicker onItemsSelected={handleDropboxItemsFromPicker} />
                  <p className="text-sm text-muted-foreground mt-2">
                    Browse and select files/folders directly from your Dropbox
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Connected Folders & Sync Status</CardTitle>
                  <CardDescription>
                    Manage your connected Dropbox folders and sync status
                  </CardDescription>
                </div>
                {dropboxFolders.data && dropboxFolders.data.length > 0 && (
                  <Button
                    onClick={() => syncAllDropboxFolders.mutate()}
                    disabled={syncAllDropboxFolders.isPending}
                    variant="default"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncAllDropboxFolders.isPending ? 'animate-spin' : ''}`} />
                    {syncAllDropboxFolders.isPending ? 'Syncing All...' : 'Sync All Folders'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {dropboxFolders.isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (!dropboxFolders.data || dropboxFolders.data.length === 0) ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No folders connected</h3>
                  <p className="text-muted-foreground">Add your first Dropbox folder to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dropboxFolders.data?.map((folder) => {
                    const isSyncing = syncDropboxFolder.isPending;

                    return (
                      <div key={folder.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <FolderOpen className="h-8 w-8 text-blue-500" />
                          <div>
                            <h4 className="font-medium text-foreground">{folder.folder_name}</h4>
                            <p className="text-sm text-muted-foreground">{folder.folder_path}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={isSyncing ? 'default' : folder.is_active ? 'default' : 'secondary'}>
                                {isSyncing ? (
                                  <>Syncing</>
                                ) : folder.is_active ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                  </>
                                )}
                              </Badge>
                              {folder.last_synced_at && (
                                <span className="text-xs text-muted-foreground">
                                  Last sync: {new Date(folder.last_synced_at).toLocaleString()}
                                </span>
                              )}
                              {folder.files_count !== null && (
                                <span className="text-xs text-muted-foreground">
                                  {folder.files_count} files
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncDropboxFolder(folder.id)}
                            disabled={isSyncing}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            Sync
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveDropboxFolder(folder.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="microsoft" className="space-y-4 mt-6">
          <MicrosoftAuthStatus />

          <Card>
            <CardHeader>
              <CardTitle>Add Files & Folders</CardTitle>
              <CardDescription>
                Connect files and folders from your OneDrive or SharePoint to start syncing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <MicrosoftDrivePicker onItemsSelected={handleItemsFromPicker} />
                  <p className="text-sm text-muted-foreground mt-2">
                    Browse and select files/folders directly from your Microsoft 365 account
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Connected Folders & Sync Status</CardTitle>
                  <CardDescription>
                    Manage your connected Microsoft 365 folders and sync status
                  </CardDescription>
                </div>
                {folders.data && folders.data.length > 0 && (
                  <Button
                    onClick={() => syncAllFolders.mutate()}
                    disabled={syncAllFolders.isPending}
                    variant="default"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncAllFolders.isPending ? 'animate-spin' : ''}`} />
                    {syncAllFolders.isPending ? 'Syncing All...' : 'Sync All Folders'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {folders.isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (!folders.data || folders.data.length === 0) ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No folders connected</h3>
                  <p className="text-muted-foreground">Add your first Microsoft 365 folder to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {folders.data?.map((folder) => {
                    const activeSyncJob = getActiveSyncJob(folder.id);
                    const isSyncing = !!activeSyncJob;

                    return (
                      <div key={folder.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <FolderOpen className="h-8 w-8 text-primary" />
                          <div>
                            <h4 className="font-medium text-foreground">{folder.folder_name}</h4>
                            <p className="text-sm text-muted-foreground">{folder.folder_path}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={isSyncing ? 'default' : folder.is_active ? 'default' : 'secondary'}>
                                {isSyncing ? (
                                  <>Syncing</>
                                ) : folder.is_active ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                  </>
                                )}
                              </Badge>
                              {folder.last_synced_at && (
                                <span className="text-xs text-muted-foreground">
                                  Last sync: {new Date(folder.last_synced_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncFolder(folder.id)}
                            disabled={isSyncing}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            Sync
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFolder(folder.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="s3" className="space-y-4 mt-6">
          <S3Setup />
        </TabsContent>
      </Tabs>
    </div>
  );
}
