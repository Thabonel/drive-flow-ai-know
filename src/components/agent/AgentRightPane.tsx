import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAgentSession } from '@/hooks/useAgentSession';
import {
  Activity,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  FileText,
  BarChart3
} from 'lucide-react';

interface AgentMemory {
  id: string;
  memory_type: string;
  content: any;
  created_at: string;
}

interface SubAgent {
  id: string;
  agent_type: string;
  status: string;
  created_at: string;
}

export function AgentRightPane({ userId }: { userId: string }) {
  const { session, loading: sessionLoading } = useAgentSession({
    userId,
    enabled: true, // This component only renders when agent mode is enabled
  });
  const [recentGoals, setRecentGoals] = useState<AgentMemory[]>([]);
  const [activeAgents, setActiveAgents] = useState<SubAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgentData = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        // Fetch recent goals
        const { data: goalsData } = await supabase
          .from('agent_memory')
          .select('*')
          .eq('session_id', session.id)
          .eq('memory_type', 'goal')
          .order('created_at', { ascending: false })
          .limit(3);

        setRecentGoals(goalsData || []);

        // Fetch active sub-agents
        const { data: agentsData } = await supabase
          .from('sub_agents')
          .select('*')
          .eq('session_id', session.id)
          .in('status', ['active', 'pending'])
          .order('created_at', { ascending: false })
          .limit(5);

        setActiveAgents(agentsData || []);
      } catch (error) {
        console.error('Error fetching agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAgentData, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const getStatusBadge = () => {
    if (!session) return <Badge variant="secondary">Inactive</Badge>;

    switch (session.status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="secondary">{session.status}</Badge>;
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      case 'briefing':
        return <FileText className="h-4 w-4" />;
      case 'analysis':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getAgentStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Activity className="h-3 w-3 text-success animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading || sessionLoading) {
    return (
      <div className="w-80 border-l bg-background p-4 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
          <p className="text-sm">Loading agent status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-background flex flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Agent Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Agent Status
                </CardTitle>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {session ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasks Completed</span>
                    <span className="font-medium">{session.tasks_completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sub-Agents</span>
                    <span className="font-medium">{session.sub_agents_spawned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token Usage</span>
                    <span className="font-medium">
                      {session.tokens_used.toLocaleString()} / {session.tokens_budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Active</span>
                    <span className="font-medium">{formatTimeAgo(session.last_active_at)}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No active session</p>
              )}
            </CardContent>
          </Card>

          {/* Current Goals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Current Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentGoals.length > 0 ? (
                <div className="space-y-2">
                  {recentGoals.map((goal) => (
                    <div key={goal.id} className="text-sm">
                      <p className="font-medium">{goal.content.title || goal.content.description || 'Unnamed goal'}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(goal.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active goals</p>
              )}
            </CardContent>
          </Card>

          {/* Active Sub-Agents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Active Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAgents.length > 0 ? (
                <div className="space-y-2">
                  {activeAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getAgentIcon(agent.agent_type)}
                        <span className="font-medium capitalize">{agent.agent_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getAgentStatusIcon(agent.status)}
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(agent.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active agents</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button className="w-full text-left text-sm hover:bg-accent hover:text-accent-foreground rounded px-2 py-1.5 transition-colors">
                📅 Check today's schedule
              </button>
              <button className="w-full text-left text-sm hover:bg-accent hover:text-accent-foreground rounded px-2 py-1.5 transition-colors">
                📝 Generate briefing
              </button>
              <button className="w-full text-left text-sm hover:bg-accent hover:text-accent-foreground rounded px-2 py-1.5 transition-colors">
                📊 Analyze workload
              </button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
