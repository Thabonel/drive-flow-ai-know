import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Brain, Send, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AIQueryInputProps {
  selectedKnowledgeBase?: { id: string; name: string };
  onClearSelection?: () => void;
}

export const AIQueryInput = ({ selectedKnowledgeBase, onClearSelection }: AIQueryInputProps) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const savePrompt = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from('saved_prompts')
        .insert({ user_id: user!.id, prompt_text: text });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-prompts', user?.id] });
    }
  });

  const quickPrompts = [
    "What are my key marketing messages?",
    "Summarize all my planning docs",
    "What should I focus on today?",
    "Find insights from recent documents"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !user) return;

    savePrompt.mutate(query);

    setIsLoading(true);
    setResponse('');

    try {
      console.log('Invoking AI query function with:', { query: query.substring(0, 50) + '...', knowledge_base_id: selectedKnowledgeBase?.id });
      
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query: query,
          knowledge_base_id: selectedKnowledgeBase?.id
        }
      });

      console.log('AI query response:', { data, error });

      if (error) throw error;
      
      setResponse(data.response || 'No response generated');
    } catch (error) {
      console.error('Error querying AI:', error);
      toast({
        title: 'Error',
        description: `Failed to process your query: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setQuery(prompt);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="h-5 w-5 mr-2" />
          AI Knowledge Assistant
        </CardTitle>
        {selectedKnowledgeBase && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="flex items-center">
              <Sparkles className="h-3 w-3 mr-1" />
              {selectedKnowledgeBase.name}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              ×
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={selectedKnowledgeBase 
              ? `Ask about ${selectedKnowledgeBase.name}...`
              : "Ask about your documents..."
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleQuickPrompt(prompt)}
              disabled={isLoading}
              className="text-xs"
            >
              {prompt}
            </Button>
          ))}
        </div>

        {response && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <Brain className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="text-sm whitespace-pre-wrap">{response}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};