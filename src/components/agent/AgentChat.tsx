import { useRef, useEffect, useState } from 'react';
import { useAgentConversation } from '@/hooks/useAgentConversation';
import { AgentInput } from '@/components/agent/AgentInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIProgressIndicator } from '@/components/ai/AIProgressIndicator';
import { Cpu, Archive, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AgentSession {
  id: string;
  status: 'active' | 'paused' | 'completed';
  tokens_used: number;
  tokens_budget: number;
}

interface AgentChatProps {
  session: AgentSession | null;
  userId: string;
}

export function AgentChat({ session, userId }: AgentChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    conversation,
    messages,
    loading: conversationLoading,
    addMessage,
    updateMetrics,
    updateTitle,
  } = useAgentConversation({
    sessionId: session?.id,
    userId,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSubmit = async (command: string) => {
    if (!session || !conversation) {
      toast.error('No active session. Enable Agent Mode in settings.');
      return;
    }

    if (!command.trim() || command.length < 3) {
      toast.error('Command too short. Please be more specific.');
      return;
    }

    setIsLoading(true);

    try {
      // Create temporary user message for optimistic UI
      const tempUserMessage = {
        id: `temp-user-${Date.now()}`,
        conversation_id: conversation.id,
        role: 'user' as const,
        content: command,
        sequence_number: messages.length,
        metadata: {},
        timestamp: new Date().toISOString(),
      };

      addMessage(tempUserMessage);

      // Update title if first message
      if (messages.length === 0) {
        await updateTitle(command);
      }

      // TODO: Phase 4 - Call agent-translate and agent-orchestrator
      // For now, show placeholder response
      const tempAssistantMessage = {
        id: `temp-assistant-${Date.now()}`,
        conversation_id: conversation.id,
        role: 'assistant' as const,
        content: `Command received: "${command}"\n\n🚧 **Agent integration coming in Phase 4**\n\nThis is a placeholder response. In Phase 4, this will:\n1. Translate your command into tasks using agent-translate Edge Function\n2. Spawn sub-agents using agent-orchestrator Edge Function\n3. Show real-time execution status\n4. Display task completion and results`,
        sequence_number: messages.length + 1,
        metadata: {
          tasks_created: [],
          sub_agents_spawned: [],
          tokens_used: 0,
          execution_time_ms: 0,
        },
        timestamp: new Date().toISOString(),
      };

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      addMessage(tempAssistantMessage);

      // Update metrics
      await updateMetrics({
        message_count: messages.length + 2,
      });

      toast.success('Command processed (placeholder)');
    } catch (error) {
      console.error('Error processing command:', error);
      toast.error('Failed to process command');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!conversation) return;

    // TODO: Implement archive functionality
    toast('Archive feature coming soon');
  };

  const handleDownload = () => {
    if (messages.length === 0) {
      toast.error('No messages to download');
      return;
    }

    // TODO: Implement download functionality
    toast('Download feature coming soon');
  };

  const handlePrint = () => {
    if (messages.length === 0) {
      toast.error('No messages to print');
      return;
    }

    // TODO: Implement print functionality
    toast('Print feature coming soon');
  };

  if (conversationLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-accent" />
              Agent Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Agent mode is not enabled. Enable it in Settings to start using the autonomous AI assistant.
            </p>
            <Button variant="outline" asChild>
              <a href="/settings">Go to Settings</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Cpu className="h-5 w-5 text-accent" />
            {conversation?.title || 'Agent Conversation'}
          </h2>
          <Badge
            className={
              session.status === 'active'
                ? 'bg-success'
                : session.status === 'paused'
                ? 'bg-secondary'
                : 'bg-muted'
            }
          >
            {session.status}
          </Badge>
        </div>

        {/* Action Buttons */}
        {messages.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground max-w-md">
              <Cpu className="h-12 w-12 mx-auto mb-4 text-accent" />
              <h3 className="text-lg font-semibold mb-2">Welcome to Agent Mode</h3>
              <p className="text-sm mb-4">
                Give me natural language commands and I'll execute them for you.
              </p>
              <div className="text-left space-y-2 bg-muted rounded-lg p-4">
                <p className="text-sm font-medium">Example commands:</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>Schedule a meeting tomorrow at 2pm</li>
                  <li>Generate my daily briefing</li>
                  <li>Analyze my workload this week</li>
                  <li>Check my calendar for conflicts</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  <div className="text-xs opacity-70 mt-2 flex items-center gap-2">
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    {message.metadata.tokens_used && (
                      <span>• {message.metadata.tokens_used} tokens</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && <AIProgressIndicator useDocuments={false} />}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <AgentInput
        onSubmit={handleSubmit}
        disabled={isLoading || session.status !== 'active'}
        placeholder={
          session.status !== 'active'
            ? 'Session paused. Resume in Settings.'
            : 'Enter command... (e.g., "Schedule meeting tomorrow at 2pm")'
        }
      />
    </div>
  );
}
