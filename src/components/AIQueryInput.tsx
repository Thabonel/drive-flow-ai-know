import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Brain, Send, Sparkles, Loader2, Save, FileText } from 'lucide-react';
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
  const [lastQuery, setLastQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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
      setLastQuery(query);
    } catch (error) {
      console.error('Error querying AI:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      toast({
        title: 'Query Failed',
        description: `Failed to process your query: ${errorMessage}`,
        variant: 'destructive',
      });
      
      // Set a helpful response message
      setResponse('Sorry, I encountered an error processing your query. Please try again or rephrase your question.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setQuery(prompt);
  };

  const handleSaveAsDocument = async () => {
    if (!response || !lastQuery || !user) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-ai-document', {
        body: {
          query: lastQuery,
          response: response
        }
      });

      if (error) throw error;

      toast({
        title: 'Document Saved!',
        description: `"${data.document.title}" has been saved to your documents with category "${data.document.category}".`,
      });

      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      queryClient.invalidateQueries({ queryKey: ['recent-documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save the document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl">
            <Brain className="h-6 w-6 mr-3 text-primary" />
            AI Knowledge Assistant
          </CardTitle>
          {selectedKnowledgeBase && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="flex items-center py-1 px-3">
                <Sparkles className="h-3 w-3 mr-1" />
                {selectedKnowledgeBase.name}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClearSelection}>
                ×
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={selectedKnowledgeBase 
              ? `Ask about ${selectedKnowledgeBase.name}...`
              : "Ask about your documents..."
            }
            disabled={isLoading}
            className="flex-1 h-12 text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            maxLength={500}
          />
          <Button type="submit" disabled={isLoading || !query.trim() || query.length < 3} className="h-12 px-6">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>

        <div className="text-xs text-muted-foreground">
          {query.length > 0 && (
            <span className={query.length > 450 ? 'text-orange-500' : ''}>
              {query.length}/500 characters
            </span>
          )}
          {query.length === 0 && (
            <span>Tip: Press Ctrl/Cmd + Enter to submit</span>
          )}
        </div>

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
          <div className="space-y-4">
            <div className="p-6 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start space-x-3">
                <Brain className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{response}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleSaveAsDocument}
                disabled={isSaving || !response}
                variant="outline"
                className="flex items-center space-x-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save as Document'}</span>
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};