import { useState, useEffect } from 'react';
import { Users, Calendar, AlertTriangle, Clock, Bell, CheckCircle2, FileText, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Executive {
  executive_id: string;
  executive_email: string;
  is_primary: boolean;
  unread_notes: number;
  pending_delegations: number;
}

interface Conflict {
  conflict_id: string;
  conflict_type: string;
  executive_ids: string[];
  timeline_item_ids: string[];
  conflict_description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface TimelineItem {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string | null;
  executive_email?: string;
}

export function AssistantDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [selectedExecutive, setSelectedExecutive] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [coverageMode, setCoverageMode] = useState(false);

  // Load assistant's executives
  const loadExecutives = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_assistant_executives_extended', {
        p_assistant_id: user.id
      });

      if (error) throw error;

      setExecutives(data || []);
      if (data && data.length > 0 && !selectedExecutive) {
        const primary = data.find(e => e.is_primary);
        setSelectedExecutive(primary?.executive_id || data[0].executive_id);
      }
    } catch (error) {
      console.error('Error loading executives:', error);
      toast({
        title: 'Error',
        description: 'Failed to load executives',
        variant: 'destructive',
      });
    }
  };

  // Load conflicts
  const loadConflicts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('detect_cross_executive_conflicts', {
        p_assistant_id: user.id
      });

      if (error) throw error;

      setConflicts(data || []);
    } catch (error) {
      console.error('Error loading conflicts:', error);
    }
  };

  // Load upcoming timeline items for all executives
  const loadUpcomingItems = async () => {
    if (!user || executives.length === 0) return;

    try {
      const executiveIds = executives.map(e => e.executive_id);
      const now = new Date().toISOString();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59);

      const { data, error } = await supabase
        .from('timeline_items')
        .select('*')
        .in('user_id', executiveIds)
        .gte('start_time', now)
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true })
        .limit(20);

      if (error) throw error;

      // Join with executive emails
      const itemsWithExecs = data?.map(item => {
        const exec = executives.find(e => e.executive_id === item.user_id);
        return {
          ...item,
          executive_email: exec?.executive_email
        };
      });

      setUpcomingItems(itemsWithExecs || []);
    } catch (error) {
      console.error('Error loading upcoming items:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await loadExecutives();
      setIsLoading(false);
    };
    load();
  }, [user]);

  // Load conflicts and upcoming items when executives change
  useEffect(() => {
    if (executives.length > 0) {
      loadConflicts();
      loadUpcomingItems();
    }
  }, [executives]);

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (executives.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Executives Assigned</CardTitle>
          <CardDescription>
            You haven't been assigned to any executives yet. Contact your administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assistant Dashboard</h1>
          <p className="text-muted-foreground">
            Managing {executives.length} executive{executives.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={coverageMode ? 'default' : 'outline'}
            onClick={() => setCoverageMode(!coverageMode)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Coverage Mode
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executives</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executives.length}</div>
            <p className="text-xs text-muted-foreground">
              {executives.filter(e => e.is_primary).length} primary
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Notes</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executives.reduce((sum, e) => sum + e.unread_notes, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all executives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Delegations</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executives.reduce((sum, e) => sum + e.pending_delegations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Requires action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conflicts.length}</div>
            <p className="text-xs text-muted-foreground">
              {conflicts.filter(c => c.severity === 'high' || c.severity === 'critical').length} critical
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Executive List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Executives</CardTitle>
            <CardDescription>Quick switch between calendars</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {executives.map((exec) => (
                  <button
                    key={exec.executive_id}
                    onClick={() => setSelectedExecutive(exec.executive_id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                      selectedExecutive === exec.executive_id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(exec.executive_email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{exec.executive_email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {exec.is_primary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                        {exec.unread_notes > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {exec.unread_notes} notes
                          </Badge>
                        )}
                        {exec.pending_delegations > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {exec.pending_delegations} tasks
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conflicts and Alerts */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Conflicts & Alerts</CardTitle>
            <CardDescription>AI-detected scheduling conflicts</CardDescription>
          </CardHeader>
          <CardContent>
            {conflicts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No conflicts detected</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.conflict_id}
                      className="p-4 rounded-lg border border-border space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', getSeverityColor(conflict.severity))} />
                          <h4 className="font-semibold text-sm">
                            {conflict.conflict_type.replace('_', ' ').toUpperCase()}
                          </h4>
                        </div>
                        <Badge variant={conflict.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {conflict.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {conflict.conflict_description}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">View Details</Button>
                        <Button size="sm">Resolve</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Items */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule (All Executives)</CardTitle>
          <CardDescription>Unified view of upcoming events</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming events today</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {upcomingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="text-sm font-medium">
                        {new Date(item.start_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant="outline">{item.executive_email?.split('@')[0]}</Badge>
                    </div>
                    <Button size="sm" variant="ghost">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
