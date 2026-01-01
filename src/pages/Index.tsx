import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, FolderOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KnowledgeBasePreview } from '@/components/KnowledgeBasePreview';
import { AIQueryInput } from '@/components/AIQueryInput';
import { RecentDocuments } from '@/components/RecentDocuments';
import { DailyFocusModule } from '@/components/DailyFocusModule';
import { PageHelp } from '@/components/PageHelp';
import { CreateKnowledgeDocumentModal } from '@/components/CreateKnowledgeDocumentModal';

const Index = () => {
  const { user } = useAuth();
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<{ id: string; name: string } | undefined>();

  // Compact stats for overview
  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [docs, bases, folders] = await Promise.all([
        supabase.from('knowledge_documents').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('knowledge_bases').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('google_drive_folders').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);

      return {
        docCount: docs.count ?? 0,
        baseCount: bases.count ?? 0,
        folderCount: folders.count ?? 0,
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
        {/* Header with Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PageHelp
              title="Dashboard Help"
              description="Your dashboard provides quick access to AI queries and key information."
              tips={[
                "Use the AI query box to ask questions about your documents",
                "Select a knowledge base for more focused AI answers",
                "Daily Focus shows your priorities and upcoming tasks",
                "Recent Documents provides quick access to recently added files"
              ]}
            />
            {/* Compact inline stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {stats?.docCount ?? 0} docs
              </span>
              <span className="flex items-center gap-1">
                <Brain className="h-4 w-4" />
                {stats?.baseCount ?? 0} collections
              </span>
              <span className="flex items-center gap-1">
                <FolderOpen className="h-4 w-4" />
                {stats?.folderCount ?? 0} synced
              </span>
            </div>
          </div>
          <CreateKnowledgeDocumentModal />
        </div>

        {/* AI Query Input - Prominent position */}
        <AIQueryInput
          selectedKnowledgeBase={selectedKnowledgeBase}
          onClearSelection={clearKnowledgeBaseSelection}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DailyFocusModule />
          <RecentDocuments />
        </div>

        {/* Knowledge Bases - Compact view */}
        <KnowledgeBasePreview onAskQuestion={handleAskQuestion} />
      </div>
    </div>
  );
};

export default Index;
