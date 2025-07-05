import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, FolderOpen, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [docs, bases, folders] = await Promise.all([
        supabase.from('knowledge_documents').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('knowledge_bases').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('google_drive_folders').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);

      const lastSyncRes = await supabase
        .from('google_drive_folders')
        .select('last_synced_at')
        .eq('user_id', user!.id)
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        docCount: docs.count ?? 0,
        baseCount: bases.count ?? 0,
        folderCount: folders.count ?? 0,
        lastSync: lastSyncRes.data?.last_synced_at ?? null,
      };
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email}</h1>
        <p className="text-muted-foreground">Your AI-powered knowledge management dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.docCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">From your Google Drive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Bases</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.baseCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">AI-generated collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Folders</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.folderCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Google Drive folders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}</div>
            <p className="text-xs text-muted-foreground">{stats?.lastSync ? 'Most recent sync' : 'No syncs yet'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with your knowledge management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/drive')}
              className="w-full justify-start"
              variant="outline"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Connect Google Drive Folders
            </Button>
            <Button 
              onClick={() => navigate('/knowledge')}
              className="w-full justify-start"
              variant="outline"
            >
              <Brain className="h-4 w-4 mr-2" />
              View Knowledge Bases
            </Button>
            <Button 
              onClick={() => navigate('/documents')}
              className="w-full justify-start"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Browse Documents
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your knowledge base</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm">Connect your Google Drive folders to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
