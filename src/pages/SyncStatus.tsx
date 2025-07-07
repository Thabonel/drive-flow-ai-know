import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const SyncStatus = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: folders, isLoading } = useQuery({
    queryKey: ['google-drive-folders', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_drive_folders')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    }
  });

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

  const syncFolder = useMutation({
    mutationFn: async (folderId: string) => {
      // Call the Google Drive sync edge function
      const { data, error } = await supabase.functions.invoke('google-drive-sync', {
        body: { folder_id: folderId, user_id: user!.id }
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-jobs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['google-drive-folders', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', user?.id] });
      toast({
        title: 'Sync Completed',
        description: `Successfully synced ${data?.files_processed || 0} files. AI analysis in progress.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Sync Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSyncFolder = (folderId: string) => {
    syncFolder.mutate(folderId);
  };

  const getActiveSyncJob = (folderId: string) => {
    return syncJobs?.find(job => job.folder_id === folderId && job.status === 'running');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sync Status</h1>
        <p className="text-muted-foreground">Monitor and trigger folder syncs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Folders</CardTitle>
          <CardDescription>Connected Google Drive folders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !folders || folders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No folders connected yet</p>
            </div>
          ) : (
            folders.map(folder => {
              const activeSyncJob = getActiveSyncJob(folder.id);
              const isSyncing = !!activeSyncJob;
              
              return (
                <div key={folder.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">{folder.folder_name}</h4>
                    <p className="text-sm text-muted-foreground">{folder.folder_path || 'No path'}</p>
                    {folder.last_synced_at && (
                      <span className="text-xs text-muted-foreground">
                        Last sync: {new Date(folder.last_synced_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={isSyncing ? 'default' : 'secondary'}>
                      {isSyncing ? 'Syncing' : 'Idle'}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSyncFolder(folder.id)}
                      disabled={isSyncing || syncFolder.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncStatus;
