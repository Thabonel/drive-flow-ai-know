import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, FolderOpen, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KnowledgeBasePreview } from '@/components/KnowledgeBasePreview';
import { AIQueryInput } from '@/components/AIQueryInput';
import { RecentDocuments } from '@/components/RecentDocuments';
import { DocumentList } from '@/components/DocumentList';
import { DailyFocusModule } from '@/components/DailyFocusModule';

import { CreateKnowledgeDocumentModal } from '@/components/CreateKnowledgeDocumentModal';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<{ id: string; name: string } | undefined>();

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

  const handleAskQuestion = (baseId: string, baseName: string) => {
    setSelectedKnowledgeBase({ id: baseId, name: baseName });
  };

  const clearKnowledgeBaseSelection = () => {
    setSelectedKnowledgeBase(undefined);
  };

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto space-y-8 px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground text-lg">Hey {user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
          </div>
          <CreateKnowledgeDocumentModal />
        </div>

        {/* AI Query Input - Prominent position */}
        <AIQueryInput 
          selectedKnowledgeBase={selectedKnowledgeBase}
          onClearSelection={clearKnowledgeBaseSelection}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.docCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Files you can search</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.baseCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Grouped docs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Folders Synced</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.folderCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">From Google Drive</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.lastSync ? new Date(stats.lastSync).toLocaleDateString() : 'Never'}</div>
              <p className="text-xs text-muted-foreground">{stats?.lastSync ? 'Latest update' : 'Not synced yet'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          <KnowledgeBasePreview onAskQuestion={handleAskQuestion} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RecentDocuments />
            <DailyFocusModule />
          </div>
          
          <DocumentList />
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common stuff you might need</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => navigate('/drive')}
                  className="w-full justify-start h-auto py-4"
                  variant="outline"
                >
                  <FolderOpen className="h-5 w-5 mr-2" />
                  Sync Google Drive
                </Button>
                <Button
                  onClick={() => navigate('/knowledge')}
                  className="w-full justify-start h-auto py-4"
                  variant="outline"
                >
                  <Brain className="h-5 w-5 mr-2" />
                  View Collections
                </Button>
                <Button
                  onClick={() => navigate('/documents')}
                  className="w-full justify-start h-auto py-4"
                  variant="outline"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  See All Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
