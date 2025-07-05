import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Plus, BookOpen, Lightbulb, BarChart3, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const KnowledgeBases = () => {
  const { user } = useAuth();
  const { data: knowledgeBases, isLoading } = useQuery({
    queryKey: ['knowledge-bases', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const getTypeIcon = (type: string) => {
    const icons = {
      prompts: Brain,
      marketing: BarChart3,
      specs: BookOpen,
      general: Lightbulb,
    };
    return icons[type as keyof typeof icons] || Lightbulb;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      prompts: 'bg-blue-500',
      marketing: 'bg-green-500',
      specs: 'bg-purple-500',
      general: 'bg-gray-500',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Bases</h1>
          <p className="text-muted-foreground">AI-generated collections of synthesized knowledge</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Knowledge Base
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Loading...</div>
        ) : !knowledgeBases || knowledgeBases.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No knowledge bases yet</h3>
                <p className="text-muted-foreground mb-4">
                  AI will automatically create knowledge bases as you add more documents
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Manual Knowledge Base
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          knowledgeBases.map((kb) => {
            const TypeIcon = getTypeIcon(kb.type);
            return (
              <Card key={kb.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg ${getTypeColor(kb.type)} bg-opacity-10`}>
                        <TypeIcon className={`h-5 w-5 text-${kb.type === 'prompts' ? 'blue' : kb.type === 'marketing' ? 'green' : kb.type === 'specs' ? 'purple' : 'gray'}-600`} />
                      </div>
                      <Badge variant="secondary">
                        {kb.type.charAt(0).toUpperCase() + kb.type.slice(1)}
                      </Badge>
                    </div>
                    <Badge variant={kb.is_active ? 'default' : 'secondary'}>
                      {kb.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{kb.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {kb.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {kb.source_document_ids.length} source documents
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(kb.last_updated_from_source).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm">
                      <BookOpen className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Brain className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How Knowledge Bases Work</CardTitle>
          <CardDescription>
            Understanding the AI-powered knowledge synthesis process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium text-foreground mb-2">Document Analysis</h4>
              <p className="text-sm text-muted-foreground">
                AI analyzes and categorizes documents from your Google Drive folders
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Brain className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium text-foreground mb-2">Content Synthesis</h4>
              <p className="text-sm text-muted-foreground">
                Related content is merged and synthesized into comprehensive knowledge bases
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Lightbulb className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium text-foreground mb-2">Actionable Insights</h4>
              <p className="text-sm text-muted-foreground">
                Generated knowledge bases provide actionable insights and recommendations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeBases;