import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Send, Sparkles, Loader2, Save, FileText, PlusCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { DictationButton } from '@/components/DictationButton';
import { AIProgressIndicator } from '@/components/ai/AIProgressIndicator';
import { ExtractToTimelineDialog } from '@/components/ai/ExtractToTimelineDialog';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIQueryInputProps {
  selectedKnowledgeBase?: { id: string; name: string };
  onClearSelection?: () => void;
}

export const AIQueryInput = ({ selectedKnowledgeBase, onClearSelection }: AIQueryInputProps) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documentType, setDocumentType] = useState<string>('report');
  const [isSaving, setIsSaving] = useState(false);
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);
  const [timelineContent, setTimelineContent] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Fetch recent documents to generate contextual prompts
  const { data: recentDocs } = useQuery({
    queryKey: ['recent-documents-for-prompts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('category, tags, title')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Document creation templates based on document type
  const getTemplatesForType = (type: string): string[] => {
    const templates: Record<string, string[]> = {
      report: [
        "Create a comprehensive report from my documents",
        "Generate executive summary",
        "Compile findings and recommendations",
        "Analyze key trends and insights"
      ],
      summary: [
        "Summarize all key points",
        "Create bullet-point summary",
        "Extract main takeaways",
        "Brief overview of documents"
      ],
      analysis: [
        "Detailed analysis of topics",
        "Compare and contrast themes",
        "Identify patterns and connections",
        "Critical evaluation"
      ],
      notes: [
        "Convert to structured notes",
        "Create action items list",
        "Extract important quotes",
        "Organize by topics"
      ],
      brief: [
        "One-page brief",
        "Quick reference guide",
        "Highlights and key facts",
        "Essential information only"
      ]
    };

    return templates[type] || templates.report;
  };

  const quickPrompts = getTemplatesForType(documentType);

  // Auto-save long content as a document and return the doc ID
  const autoSaveAsDocument = async (content: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const firstLine = content.split('\n')[0].trim();
      const title = firstLine.length > 50
        ? firstLine.substring(0, 50) + '...'
        : firstLine || 'Auto-saved content';

      const { data, error } = await supabase
        .from('knowledge_documents')
        .insert({
          user_id: user.id,
          title: `[Auto] ${title}`,
          content: content,
          file_type: 'text',
          category: 'general',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Auto-save failed:', error);
        toast({
          title: 'Auto-save Failed',
          description: 'Could not save long content as document',
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Content Saved',
        description: 'Long content saved as document for analysis',
      });
      return data.id;
    } catch (err) {
      console.error('Auto-save exception:', err);
      return null;
    }
  };

  const LONG_MESSAGE_THRESHOLD = 10000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !user) return;

    let userMessage = query.trim();
    const originalMessage = userMessage;
    let forceUseDocuments = false;

    // Handle long messages by auto-saving as document
    if (userMessage.length > LONG_MESSAGE_THRESHOLD) {
      setIsLoading(true);
      const docId = await autoSaveAsDocument(userMessage);

      if (docId) {
        userMessage = `Please analyze the document I just shared. It contains ${Math.round(originalMessage.length / 1000)}KB of content. Provide a comprehensive summary of the key points, main themes, and any actionable insights.`;
        forceUseDocuments = true;
        queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      } else {
        setIsLoading(false);
        toast({
          title: 'Error',
          description: 'Could not save your content. Try copying it to a new document manually.',
          variant: 'destructive',
        });
        return;
      }
    }

    savePrompt.mutate(userMessage);

    // Add user message to conversation (show truncated if auto-saved)
    const displayMessage = forceUseDocuments
      ? `[Saved ${Math.round(originalMessage.length / 1000)}KB document for analysis]\n\n${originalMessage.substring(0, 500)}...`
      : userMessage;
    const newUserMessage: Message = {
      role: 'user',
      content: displayMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setQuery('');
    if (!isLoading) setIsLoading(true);

    try {
      console.log('Invoking AI query function with:', { query: userMessage.substring(0, 50) + '...', knowledge_base_id: selectedKnowledgeBase?.id });

      // Prepare conversation context
      const conversationContext = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query: userMessage,
          knowledge_base_id: selectedKnowledgeBase?.id,
          use_documents: true || forceUseDocuments,
          conversationContext
        }
      });

      console.log('AI query response:', { data, error });

      if (error) throw error;

      // Add AI response to conversation
      const aiResponse: Message = {
        role: 'assistant',
        content: data.response || 'No response generated',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiResponse]);
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

      // Add error message to conversation
      const errorResponse: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your query. Please try again or rephrase your question.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setQuery(prompt);
  };

  const handleSaveAsDocument = async () => {
    if (messages.length === 0 || !user) return;

    // Get the full conversation as the content
    const conversationText = messages.map(msg =>
      `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
    ).join('\n\n');

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-ai-document', {
        body: {
          query: `Document created using ${documentType}`,
          response: conversationText
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

      // Clear conversation after saving
      setMessages([]);

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

  const handleClearConversation = () => {
    setMessages([]);
    setQuery('');
  };

  const handleAddToTimeline = () => {
    // Get the last AI response
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      setTimelineContent(lastAssistantMessage.content);
      setShowTimelineDialog(true);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center text-xl">
            <Brain className="h-6 w-6 mr-3 text-primary" />
            Document Creator
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
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

            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="report">📊 Report</SelectItem>
                <SelectItem value="summary">📝 Summary</SelectItem>
                <SelectItem value="analysis">🔍 Analysis</SelectItem>
                <SelectItem value="notes">📋 Notes</SelectItem>
                <SelectItem value="brief">⚡ Brief</SelectItem>
              </SelectContent>
            </Select>

            {messages.length > 0 && (
              <Button
                onClick={handleClearConversation}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                New
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Conversation History */}
        {messages.length > 0 && (
          <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted border border-border'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <Brain className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <AIProgressIndicator useDocuments={true} />
              )}
            </div>
          </ScrollArea>
        )}

        {/* Quick Prompts - only show when no conversation */}
        {messages.length === 0 && (
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
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={selectedKnowledgeBase
              ? `Create a ${documentType} using ${selectedKnowledgeBase.name}...`
              : `Create a ${documentType} from your documents...`
            }
            disabled={isLoading}
            className="flex-1 min-h-[60px] resize-none text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex flex-col space-y-2">
            <DictationButton
              onTranscription={(text) => setQuery(prev => prev ? prev + ' ' + text : text)}
            />
            <Button type="submit" disabled={isLoading || !query.trim() || query.length < 3} className="h-auto px-6">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            {query.length > 0 ? (
              <span className={query.length > 10000 ? 'text-orange-500' : ''}>
                {query.length.toLocaleString()} characters
                {query.length > 10000 && ' (will auto-save as document)'}
              </span>
            ) : (
              <span>Tip: Press Ctrl/Cmd + Enter to submit</span>
            )}
          </span>

          {messages.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={handleAddToTimeline}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Add to Timeline</span>
              </Button>
              <Button
                onClick={handleSaveAsDocument}
                disabled={isSaving}
                variant="default"
                size="sm"
                className="flex items-center space-x-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save as Document'}</span>
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Extract to Timeline Dialog */}
      <ExtractToTimelineDialog
        open={showTimelineDialog}
        onClose={() => setShowTimelineDialog(false)}
        content={timelineContent}
        sourceType="ai-response"
      />
    </Card>
  );
};