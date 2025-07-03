import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Plus, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const GoogleDrive = () => {
  const [folders, setFolders] = useState<any[]>([]);
  const [newFolderUrls, setNewFolderUrls] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const handleAddFolders = async () => {
    if (!newFolderUrls.trim()) return;
    
    setIsAdding(true);
    const urls = newFolderUrls.split('\n').filter(url => url.trim());
    let successCount = 0;
    let errorCount = 0;
    
    for (const url of urls) {
      try {
        // Extract folder ID from Google Drive URL
        const folderIdMatch = url.trim().match(/folders\/([a-zA-Z0-9-_]+)/);
        if (!folderIdMatch) {
          errorCount++;
          continue;
        }
        
        const folderId = folderIdMatch[1];
        
        // TODO: Implement actual Google Drive API integration
        const newFolder = {
          id: `${Date.now()}-${Math.random()}`,
          folder_id: folderId,
          folder_name: `Sample Folder ${folderId.slice(-4)}`,
          folder_path: '/sample/path',
          is_active: true,
          last_synced_at: null,
        };
        
        setFolders(prev => [...prev, newFolder]);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    setNewFolderUrls('');
    
    if (successCount > 0) {
      toast({
        title: 'Folders Added',
        description: `${successCount} folder(s) connected successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
      });
    }
    
    if (errorCount > 0 && successCount === 0) {
      toast({
        title: 'Error',
        description: 'Failed to add folders. Please check the URLs.',
        variant: 'destructive',
      });
    }
    
    setIsAdding(false);
  };

  const handleRemoveFolder = async (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    toast({
      title: 'Folder Removed',
      description: 'Google Drive folder has been disconnected.',
    });
  };

  const handleSyncFolder = async (folderId: string) => {
    toast({
      title: 'Sync Started',
      description: 'Syncing folder contents...',
    });
    
    // TODO: Implement actual sync logic
    setTimeout(() => {
      setFolders(prev => prev.map(f => 
        f.id === folderId 
          ? { ...f, last_synced_at: new Date().toISOString() }
          : f
      ));
      
      toast({
        title: 'Sync Complete',
        description: 'Folder has been synced successfully.',
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Google Drive Integration</h1>
        <p className="text-muted-foreground">Connect and manage your shared Google Drive folders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Folder</CardTitle>
          <CardDescription>
            Paste the URL of a shared Google Drive folder to start syncing its contents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-urls">Google Drive Folder URLs (one per line)</Label>
            <Textarea
              id="folder-urls"
              placeholder="https://drive.google.com/drive/folders/...&#10;https://drive.google.com/drive/folders/..."
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
            {isAdding ? 'Adding...' : 'Add Folders'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Folders</CardTitle>
          <CardDescription>
            Manage your connected Google Drive folders and sync status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {folders.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No folders connected</h3>
              <p className="text-muted-foreground">Add your first Google Drive folder to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {folders.map((folder) => (
                <div key={folder.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <FolderOpen className="h-8 w-8 text-primary" />
                    <div>
                      <h4 className="font-medium text-foreground">{folder.folder_name}</h4>
                      <p className="text-sm text-muted-foreground">{folder.folder_path}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={folder.is_active ? 'default' : 'secondary'}>
                          {folder.is_active ? (
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
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleDrive;