import { useAuth } from '@/hooks/useAuth';
import { useAgentSession } from '@/hooks/useAgentSession';
import { AgentRightPane } from '@/components/agent/AgentRightPane';
import { AgentChat } from '@/components/agent/AgentChat';

export function Agent() {
  const { user } = useAuth();
  const { session } = useAgentSession({ userId: user?.id || '', enabled: true });

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left: Chat Interface */}
      <div className="flex-1 overflow-hidden">
        {user ? (
          <AgentChat session={session} userId={user.id} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>

      {/* Right: Status Pane (already exists) */}
      {user && <AgentRightPane userId={user.id} />}
    </div>
  );
}
