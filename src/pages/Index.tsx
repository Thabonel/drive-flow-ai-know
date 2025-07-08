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
import { AIAssistantSidebar } from '@/components/AIAssistantSidebar';
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
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className="flex-1 space-y-6 pr-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Command Center</h1>
            <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email}</p>
          </div>
          <CreateKnowledgeDocumentModal />
        </div>

        {/* AI Query Input - Prominent position */}
        <AIQueryInput 
          selectedKnowledgeBase={selectedKnowledgeBase}
          onClearSelection={clearKnowledgeBaseSelection}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="text-2xl font-bold">{stats?.lastSync ? new Date(stats.lastSync).toLocaleDateString() : 'Never'}</div>
              <p className="text-xs text-muted-foreground">{stats?.lastSync ? 'Most recent sync' : 'No syncs yet'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <KnowledgeBasePreview onAskQuestion={handleAskQuestion} />
            <RecentDocuments />
            <DocumentList />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Get started with your knowledge work</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <DailyFocusModule />
            
            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest updates from your knowledge work</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="mb-2">No activity yet</p>
                  <p className="text-sm">Start creating and querying your knowledge bases</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      <div className="w-80 border-l bg-muted/30 p-6">
        <AIAssistantSidebar />
      </div>
    </div>
  );
};

export default Index;
