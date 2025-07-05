import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const SyncStatus = () => {
  // In a real app this would fetch sync progress from Supabase
  const folders = [
    {
      id: '1',
      name: 'Sample Folder',
      path: '/sample/path',
      lastSyncedAt: null,
      isSyncing: false,
    },
  ];

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
          {folders.map(folder => (
            <div key={folder.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">{folder.name}</h4>
                <p className="text-sm text-muted-foreground">{folder.path}</p>
                {folder.lastSyncedAt && (
                  <span className="text-xs text-muted-foreground">Last sync: {new Date(folder.lastSyncedAt).toLocaleString()}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{folder.isSyncing ? 'Syncing' : 'Idle'}</Badge>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncStatus;
