import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, BookOpen, Clock, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface KnowledgeBasePreviewProps {
  onAskQuestion?: (baseId: string, baseName: string) => void;
}

export const KnowledgeBasePreview = ({ onAskQuestion }: KnowledgeBasePreviewProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: knowledgeBases, isLoading } = useQuery({
    queryKey: ['knowledge-bases-preview', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(6);
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const getTypeColor = (type: string) => {
    const colors = {
      prompts: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      marketing: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      specs: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      general: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Knowledge Bases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Knowledge Bases
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/knowledge')}>
            View All
          </Button>
        </div>
        <CardDescription>Your AI-powered knowledge collections</CardDescription>
      </CardHeader>
      <CardContent>
        {!knowledgeBases || knowledgeBases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="mb-2">No knowledge bases yet</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/knowledge')}>
              Create Your First KB
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {knowledgeBases.map((kb) => (
              <div
                key={kb.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-sm">{kb.title}</h4>
                    <Badge variant="outline" className={getTypeColor(kb.type)}>
                      {kb.type}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {kb.source_document_ids?.length || 0} docs
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {kb.updated_at ? new Date(kb.updated_at).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAskQuestion?.(kb.id, kb.title)}
                    className="h-8 px-2"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Ask
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};