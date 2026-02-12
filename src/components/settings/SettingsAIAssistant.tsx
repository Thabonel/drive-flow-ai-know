import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundTasks } from '@/contexts/BackgroundTasksContext';
import { DictationButton } from '@/components/DictationButton';
import { AIProgressIndicator } from '@/components/ai/AIProgressIndicator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const SettingsAIAssistant = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { submitTask, tasks, getTask, clearTask } = useBackgroundTasks();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingTaskIdRef = useRef<string | null>(null);

  // Settings-specific quick prompts
  const settingsQuickPrompts = [
    "How do I change my theme?",
    "Help me configure my AI settings",
    "How do I manage my privacy preferences?",
    "Explain the billing options",
    "How do I connect Google Drive?",
    "What are the enterprise features?",
    "How do I enable multi-factor authentication?",
    "Help me understand offline mode"
  ];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Watch for background task completion and update local messages
  useEffect(() => {
    if (!pendingTaskIdRef.current) return;

    const task = getTask(pendingTaskIdRef.current);
    if (!task) return;

    if (task.status === 'completed' && task.result) {
      // Add AI response to local conversation
      const aiResponse: Message = {
        role: 'assistant',
        content: task.result,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
      clearTask(task.id); // Remove from background since we've shown it inline
      pendingTaskIdRef.current = null;
    } else if (task.status === 'failed') {
      const errorResponse: Message = {
        role: 'assistant',
        content: task.error || 'Sorry, I encountered an error processing your query.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsLoading(false);
      clearTask(task.id);
      pendingTaskIdRef.current = null;
    }
  }, [tasks, getTask, clearTask]);

  // Stop AI generation
  const handleStopGeneration = () => {
    if (pendingTaskIdRef.current) {
      clearTask(pendingTaskIdRef.current);
      pendingTaskIdRef.current = null;
      setIsLoading(false);
      toast({
        title: 'Stopped',
        description: 'Generation stopped',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !user) return;

    const userMessage = query.trim();

    // Add user message to conversation
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setQuery('');
    if (!isLoading) setIsLoading(true);

    // Prepare conversation context
    const conversationContext = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Enhance the query with settings context
    const settingsContextQuery = `This is a settings help question. Please provide guidance about AI Query Hub settings, configuration, or account management. User question: ${userMessage}`;

    // Submit as background task - will continue even if user navigates away
    const taskId = submitTask({
      query: settingsContextQuery,
      knowledgeBaseId: undefined, // Settings help doesn't need documents
      knowledgeBaseName: undefined,
      conversationContext
    });

    // Track this task so we can show results inline when it completes
    pendingTaskIdRef.current = taskId;
  };

  const handleQuickPrompt = (prompt: string) => {
    setQuery(prompt);
  };

  const handleClearConversation = () => {
    setMessages([]);
    setQuery('');
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center text-xl">
            <Settings className="h-6 w-6 mr-3 text-primary" />
            Settings Assistant
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {messages.length > 0 && (
              <Button
                onClick={handleClearConversation}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Clear Chat
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
                    {message.role === 'assistant' ? (
                      <div className="flex items-start space-x-2">
                        <Settings className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <AIProgressIndicator useDocuments={false} />
              )}
            </div>
          </ScrollArea>
        )}

        {/* Settings Help Quick Prompts - only show when no conversation */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {settingsQuickPrompts.map((prompt, index) => (
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
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask me about your settings, account configuration, or how to use features..."
            disabled={isLoading}
            className="flex-1 min-h-[60px] resize-none text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex flex-col space-y-2">
            <DictationButton
              onTranscription={(text) => setQuery(prev => prev ? prev + ' ' + text : text)}
            />
            {isLoading ? (
              <Button
                type="button"
                onClick={handleStopGeneration}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 h-auto px-6"
              >
                <X className="h-5 w-5" />
              </Button>
            ) : (
              <Button type="submit" disabled={!query.trim() || query.length < 3} className="h-auto px-6">
                <Send className="h-5 w-5" />
              </Button>
            )}
          </div>
        </form>

        <div className="flex justify-end items-center text-xs text-muted-foreground">
          <span>
            {query.length > 0 ? (
              <span>{query.length.toLocaleString()} characters</span>
            ) : (
              <span>Tip: Press Enter to submit, Shift+Enter for new line</span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};