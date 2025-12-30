import { useAuth } from '@/hooks/useAuth';
import { useAgentSession } from '@/hooks/useAgentSession';
import { AgentRightPane } from '@/components/agent/AgentRightPane';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

// Placeholder component - will be replaced with full AgentChat in Phase 3
function AgentChatPlaceholder({ sessionId }: { sessionId?: string }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Agent Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your autonomous AI assistant that executes commands and manages tasks.
          </p>
          {sessionId ? (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Session ID:</p>
              <code className="text-xs font-mono break-all">{sessionId}</code>
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">No active session</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground italic">
            Chat interface coming in Phase 3...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function Agent() {
  const { user } = useAuth();
  const { session } = useAgentSession({ userId: user?.id || '', enabled: true });

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left: Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <AgentChatPlaceholder sessionId={session?.id} />
      </div>

      {/* Right: Status Pane (already exists) */}
      {user && <AgentRightPane userId={user.id} />}
    </div>
  );
}
