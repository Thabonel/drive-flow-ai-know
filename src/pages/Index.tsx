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
import { PageHelp } from '@/components/PageHelp';

import { CreateKnowledgeDocumentModal } from '@/components/CreateKnowledgeDocumentModal';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<{ id: string; name: string } | undefined>();
  const [showMore, setShowMore] = useState(false);

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
          <div className="flex items-center gap-3">
            <PageHelp
              title="Dashboard Help"
              description="Your dashboard provides quick access to AI queries and key information. Ask questions across all your documents or select a specific knowledge base for focused results."
              tips={[
                "Use the AI query box to ask questions about your documents",
                "Select a specific knowledge base for more focused AI answers",
                "Daily Focus shows your priorities and upcoming tasks",
                "Recent Documents provides quick access to recently added files",
                "Click 'Show More' to view stats, knowledge bases, and quick actions",
                "Create new documents with the '+ New Document' button",
                "Quick Actions let you sync Google Drive, view collections, or see all documents"
              ]}
            />
          </div>
          <CreateKnowledgeDocumentModal />
        </div>

        {/* AI Query Input - Prominent position */}
        <AIQueryInput
          selectedKnowledgeBase={selectedKnowledgeBase}
          onClearSelection={clearKnowledgeBaseSelection}
        />

        {/* Main Content - Primary Sections */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <DailyFocusModule />
            <RecentDocuments />
          </div>

          {/* Additional Content - Hidden by default */}
          {showMore && (
            <div className="space-y-8 animate-in fade-in-50">
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

              <KnowledgeBasePreview onAskQuestion={handleAskQuestion} />

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
          )}

          {/* Show More / Show Less Toggle */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setShowMore(!showMore)}
              className="gap-2"
            >
              {showMore ? (
                <>
                  <TrendingUp className="h-4 w-4 rotate-180" />
                  Show Less
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Show More
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
