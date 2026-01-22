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
  Cpu,
  Calendar,
  FileText,
  BarChart3,
  Sun,
  History
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
  task_data?: {
    title?: string;
    description?: string;
  };
  result_data?: any;
  created_at: string;
}

interface TimelineItem {
  id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  color: string;
}

export function AgentRightPane({ userId }: { userId: string }) {
  const { session, loading: sessionLoading } = useAgentSession({
    userId,
    enabled: true, // This component only renders when agent mode is enabled
  });
  const [recentGoals, setRecentGoals] = useState<AgentMemory[]>([]);
  const [activeAgents, setActiveAgents] = useState<SubAgent[]>([]);
  const [todayItems, setTodayItems] = useState<TimelineItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<SubAgent[]>([]);
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

        // Fetch recent completed sub-agents (activity history)
        const { data: completedAgents } = await supabase
          .from('sub_agents')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5);

        setRecentActivity(completedAgents || []);
      } catch (error) {
        console.error('Error fetching agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch today's timeline items (independent of session)
    const fetchTodayItems = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: items } = await supabase
          .from('timeline_items')
          .select('*')
          .eq('user_id', userId)
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())
          .order('start_time', { ascending: true })
          .limit(10);

        setTodayItems(items || []);
      } catch (error) {
        console.error('Error fetching today items:', error);
      }
    };

    fetchAgentData();
    fetchTodayItems();

    if (!session) return;

    // Set up real-time subscriptions for sub-agents
    const subAgentsChannel = supabase
      .channel(`sub_agents:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sub_agents',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          console.log('Sub-agent update:', payload);
          // Refetch data when sub-agents change
          fetchAgentData();
        }
      )
      .subscribe();

    // Set up real-time subscriptions for agent memory (goals)
    const memoryChannel = supabase
      .channel(`agent_memory:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_memory',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          console.log('Agent memory update:', payload);
          // Refetch data when new memory entries are added
          fetchAgentData();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(subAgentsChannel);
      supabase.removeChannel(memoryChannel);
    };
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
                  <Cpu className="h-4 w-4 text-accent" />
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

          {/* Today's Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="h-4 w-4 text-yellow-500" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayItems.length > 0 ? (
                <div className="space-y-2">
                  {todayItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 text-sm">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: item.color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeOfDay(item.start_time)} • {item.duration_minutes}min
                        </p>
                      </div>
                      {item.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No items scheduled for today</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {recentActivity.map((agent) => (
                    <div key={agent.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        {getAgentIcon(agent.agent_type)}
                        <span className="font-medium truncate flex-1">
                          {agent.task_data?.title || `${agent.agent_type} task`}
                        </span>
                        <CheckCircle2 className="h-3 w-3 text-success" />
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        {formatTimeAgo(agent.created_at)}
                        {agent.result_data?.timeline_items_created && (
                          <> • {agent.result_data.timeline_items_created} item(s) created</>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
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

/**
 * Format time of day from ISO timestamp to local time (e.g., "3:00 PM")
 */
function formatTimeOfDay(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
