import { useRef, useEffect, useState } from 'react';
import { useAgentConversation } from '@/hooks/useAgentConversation';
import { AgentInput } from '@/components/agent/AgentInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIProgressIndicator } from '@/components/ai/AIProgressIndicator';
import { Cpu, Archive, Download, Printer, X, Calendar, FileText, BarChart3, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import type { SubAgent } from '@/components/agent/AgentRightPane';

interface TranslatedTask {
  title: string;
  description: string;
  agent_type: 'calendar' | 'briefing' | 'analysis';
  priority: number;
  estimated_duration: number;
}

interface TranslationResponse {
  tasks: TranslatedTask[];
  metadata: {
    task_count: number;
    translation_duration_ms: number;
    user_id: string;
  };
}

interface OrchestratorResponse {
  message: string;
  sub_agents_created: number;
  agents: Array<{
    id: string;
    type: string;
    status: string;
  }>;
}

interface AgentSession {
  id: string;
  status: 'active' | 'paused' | 'completed';
  tokens_used: number;
  tokens_budget: number;
}

interface AgentChatProps {
  session: AgentSession | null;
  userId: string;
  selectedTask?: SubAgent | null;
  onCloseTaskDetail?: () => void;
}

export function AgentChat({ session, userId, selectedTask, onCloseTaskDetail }: AgentChatProps) {
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
    const startTime = Date.now();

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

      // Get user's timezone offset (in hours from UTC)
      // Positive = ahead of UTC (e.g., +2 for Africa/Johannesburg)
      // Note: getTimezoneOffset returns minutes behind UTC, so we negate and convert to hours
      const timezoneOffset = -(new Date().getTimezoneOffset() / 60);

      // Step 1: Call agent-translate to convert command to tasks
      const { data: translateData, error: translateError } = await supabase.functions.invoke<TranslationResponse>(
        'agent-translate',
        {
          body: {
            unstructured_input: command,
            timezone_offset: timezoneOffset,
          },
        }
      );

      if (translateError) {
        throw new Error(translateError.message || 'Translation failed');
      }

      if (!translateData?.tasks || translateData.tasks.length === 0) {
        // No tasks extracted - provide helpful feedback
        const noTasksMessage = {
          id: `temp-assistant-${Date.now()}`,
          conversation_id: conversation.id,
          role: 'assistant' as const,
          content: `I understood your request but couldn't extract specific tasks from it.\n\n**Your input:** "${command}"\n\nTry being more specific, for example:\n- "Schedule a meeting with [name] tomorrow at 2pm"\n- "Generate my daily briefing for today"\n- "Analyze my task completion rate this week"`,
          sequence_number: messages.length + 1,
          metadata: {
            tasks_created: [],
            sub_agents_spawned: [],
            tokens_used: 0,
            execution_time_ms: Date.now() - startTime,
          },
          timestamp: new Date().toISOString(),
        };
        addMessage(noTasksMessage);
        return;
      }

      // Step 2: Call agent-orchestrator to spawn sub-agents
      const { data: orchestratorData, error: orchestratorError } = await supabase.functions.invoke<OrchestratorResponse>(
        'agent-orchestrator',
        {
          body: {},
        }
      );

      if (orchestratorError) {
        console.error('Orchestrator error:', orchestratorError);
        // Continue even if orchestrator fails - tasks are still created
      }

      // Format the response message
      const executionTime = Date.now() - startTime;
      const taskList = translateData.tasks.map((task, idx) => {
        const icon = task.agent_type === 'calendar' ? '📅' : task.agent_type === 'briefing' ? '📝' : '📊';
        const priorityLabel = task.priority >= 4 ? '🔴 High' : task.priority >= 3 ? '🟡 Normal' : '🟢 Low';
        return `${idx + 1}. ${icon} **${task.title}**\n   - ${task.description}\n   - Priority: ${priorityLabel} | Duration: ~${task.estimated_duration} min`;
      }).join('\n\n');

      const agentSummary = orchestratorData?.agents?.length
        ? `\n\n**Sub-agents spawned:** ${orchestratorData.agents.map(a => `${a.type} (${a.status})`).join(', ')}`
        : '';

      const responseContent = `**Command understood!** I've created ${translateData.tasks.length} task${translateData.tasks.length > 1 ? 's' : ''}:\n\n${taskList}${agentSummary}\n\n---\n*Processing time: ${executionTime}ms*`;

      const assistantMessage = {
        id: `temp-assistant-${Date.now()}`,
        conversation_id: conversation.id,
        role: 'assistant' as const,
        content: responseContent,
        sequence_number: messages.length + 1,
        metadata: {
          tasks_created: translateData.tasks.map(t => t.title),
          sub_agents_spawned: orchestratorData?.agents?.map(a => a.id) || [],
          tokens_used: translateData.metadata?.translation_duration_ms || 0,
          execution_time_ms: executionTime,
        },
        timestamp: new Date().toISOString(),
      };

      addMessage(assistantMessage);

      // Update metrics
      await updateMetrics({
        message_count: messages.length + 2,
      });

      toast.success(`Created ${translateData.tasks.length} task${translateData.tasks.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error processing command:', error);

      // Show error message in chat
      const errorMessage = {
        id: `temp-error-${Date.now()}`,
        conversation_id: conversation.id,
        role: 'assistant' as const,
        content: `**Error processing your command**\n\n${error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}\n\nIf this continues, check that your session is active in Settings.`,
        sequence_number: messages.length + 1,
        metadata: {
          error: true,
          execution_time_ms: Date.now() - startTime,
        },
        timestamp: new Date().toISOString(),
      };
      addMessage(errorMessage);

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

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'calendar':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'briefing':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'analysis':
        return <BarChart3 className="h-5 w-5 text-purple-500" />;
      default:
        return <Cpu className="h-5 w-5 text-accent" />;
    }
  };

  const getPriorityBadge = (priority?: number) => {
    if (!priority) return null;
    if (priority >= 4) return <Badge variant="destructive">High Priority</Badge>;
    if (priority >= 3) return <Badge variant="secondary">Normal</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Show task detail view when a task is selected
  if (selectedTask) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getAgentIcon(selectedTask.agent_type)}
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedTask.task_data?.title || `${selectedTask.agent_type} Task`}
                </h2>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedTask.agent_type} Agent
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onCloseTaskDetail}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Task Details */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6 max-w-2xl">
            {/* Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-success">Completed</Badge>
                  {getPriorityBadge(selectedTask.task_data?.priority)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedTask.completed_at && (
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-medium">
                        {new Date(selectedTask.completed_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedTask.duration_ms && (
                    <div>
                      <p className="text-muted-foreground">Execution Time</p>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(selectedTask.duration_ms)}
                      </p>
                    </div>
                  )}
                  {selectedTask.task_data?.estimated_duration && (
                    <div>
                      <p className="text-muted-foreground">Estimated Duration</p>
                      <p className="font-medium">{selectedTask.task_data.estimated_duration} min</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(selectedTask.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {selectedTask.task_data?.description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedTask.task_data.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {selectedTask.result_data && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTask.result_data.timeline_items_created && (
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>{selectedTask.result_data.timeline_items_created} timeline item(s) created</span>
                    </div>
                  )}
                  {selectedTask.result_data.message && (
                    <p className="text-sm text-muted-foreground">
                      {selectedTask.result_data.message}
                    </p>
                  )}
                  {/* Show raw result data for debugging/transparency */}
                  <details className="mt-4">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      View raw data
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(selectedTask.result_data, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            )}

            {/* Error (if any) */}
            {selectedTask.error_message && (
              <Card className="border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive">{selectedTask.error_message}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t">
          <Button variant="outline" onClick={onCloseTaskDetail} className="w-full">
            Back to Chat
          </Button>
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
