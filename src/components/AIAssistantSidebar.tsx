import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Zap,
  CheckSquare,
  Clock,
  Sparkles,
  PlusCircle,
  ChevronDown,
  Trash,
} from 'lucide-react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const AIAssistantSidebar = () => {
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const [libraryOpen, setLibraryOpen] = useState(true);

  // Query for saved prompts
  const { data: savedPrompts } = useQuery({
    queryKey: ['saved-prompts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_prompts')
        .select('id, prompt_text, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching saved prompts:', error);
        return [];
      }
      return data || [];
    }
  });

  const deletePrompt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_prompts')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-prompts', user?.id] });
    }
  });

  // Query for recent AI interactions
  const { data: recentQueries } = useQuery({
    queryKey: ['recent-ai-queries', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_query_history')
        .select('id, query_text, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching AI query history:', error);
        return [];
      }

      return data || [];
    }
  });

  const quickAITools = [
    { id: 'summarize', name: 'Summarize', icon: Brain, description: 'Create quick summaries' },
    { id: 'brainstorm', name: 'Brainstorm', icon: Sparkles, description: 'Generate ideas' },
    { id: 'actions', name: 'Action Steps', icon: CheckSquare, description: 'Extract action items' },
    { id: 'insights', name: 'Insights', icon: Zap, description: 'Find key insights' },
  ];

  const handleToolClick = (toolId: string) => {
    // Scroll to AI query input and add a pre-filled prompt based on the tool
    const prompts = {
      summarize: "Please summarize my recent documents",
      brainstorm: "Help me brainstorm ideas based on my knowledge base",
      actions: "Extract action items from my recent documents",
      insights: "What key insights can you find in my documents?"
    };
    
    // Find the AI query input and set its value
    const queryInput = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement;
    if (queryInput) {
      queryInput.value = prompts[toolId as keyof typeof prompts] || '';
      queryInput.focus();
      // Scroll to the input
      queryInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSavedPromptClick = (prompt: string) => {
    const queryInput = document.querySelector(
      'input[placeholder*="Ask about"]'
    ) as HTMLInputElement;
    if (queryInput) {
      queryInput.value = prompt;
      queryInput.focus();
      queryInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="w-80 space-y-6 h-full overflow-y-auto">
      {/* Quick AI Tools */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Quick AI Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quickAITools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <Button
                key={tool.id}
                variant="outline"
                size="sm"
                className="w-full justify-start h-auto p-3"
                onClick={() => handleToolClick(tool.id)}
              >
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">{tool.description}</div>
                  </div>
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Prompt Library */}
      <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center">
                <PlusCircle className="h-4 w-4 mr-2" />
                Prompt Library
              </CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${libraryOpen ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {!savedPrompts || savedPrompts.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No saved prompts
                </div>
              ) : (
                <div className="space-y-2">
                  {savedPrompts.map((prompt: any) => (
                    <div
                      key={prompt.id}
                      className="flex items-center p-2 border rounded hover:bg-accent/50"
                    >
                      <button
                        type="button"
                        onClick={() => handleSavedPromptClick(prompt.prompt_text)}
                        className="flex-1 text-left text-sm truncate"
                      >
                        {prompt.prompt_text}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePrompt.mutate(prompt.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Recent AI Queries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Recent AI Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentQueries || recentQueries.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-2">No AI queries yet</p>
              <p className="text-xs">Start asking questions above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentQueries.map((query: any) => (
                <div key={query.id} className="p-2 border rounded cursor-pointer hover:bg-accent/50">
                  <div className="font-medium text-sm truncate">{query.query_text}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(query.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Tips */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
            AI Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-3">
            Try asking specific questions about your documents
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Examples: "What are the main themes?", "Summarize key points", "Find action items"
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={() => {
              const queryInput = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement;
              if (queryInput) {
                queryInput.focus();
                queryInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          >
            Start Asking Questions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};