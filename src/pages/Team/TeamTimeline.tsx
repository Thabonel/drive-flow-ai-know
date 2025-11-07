import React, { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calendar, Clock, CheckCircle2, Circle, Users, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TeamTimelineItem {
  id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  color: string;
  completed_at: string | null;
  team_id: string;
  visibility: 'personal' | 'team' | 'assigned';
  assigned_to: string | null;
  user_id: string;
  created_at: string;
}

/**
 * Team Timeline Page
 *
 * Shows team-shared timeline items and allows:
 * - Viewing team tasks and events
 * - Filtering by team member (assigned tasks)
 * - Viewing task status and progress
 * - Context: Team leaders can assign tasks, all members see shared calendar
 */
export default function TeamTimeline() {
  const { team, isAdmin, isLoading: teamLoading } = useTeam();
  const { members, isLoading: membersLoading } = useTeamMembers(team?.id);
  const [filterMemberId, setFilterMemberId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: timelineItems, isLoading } = useQuery({
    queryKey: ['team-timeline', team?.id, filterMemberId, filterStatus],
    queryFn: async () => {
      if (!team?.id) return [];

      let query = supabase
        .from('timeline_items')
        .select('*')
        .eq('team_id', team.id)
        .in('visibility', ['team', 'assigned'])
        .order('start_time', { ascending: false });

      // Filter by assigned member if specified
      if (filterMemberId !== 'all') {
        query = query.eq('assigned_to', filterMemberId);
      }

      // Filter by status if specified
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching team timeline:', error);
        throw error;
      }

      return data as TeamTimelineItem[];
    },
    enabled: !!team?.id,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getAssignedMember = (assignedTo: string | null) => {
    if (!assignedTo) return null;
    return members.find((m) => m.user_id === assignedTo);
  };

  if (teamLoading || membersLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Alert className="mb-6">
          <Users className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">No Team Found</p>
            <p>You need to create a team to use team features. Team features require a Business subscription.</p>
          </AlertDescription>
        </Alert>
        <Card className="p-6 text-center">
          <CardTitle className="mb-4">Get Started with Teams</CardTitle>
          <CardDescription className="mb-6">
            Collaborate with your team on shared documents, tasks, and timelines.
          </CardDescription>
          <Button onClick={() => window.location.href = '/team/create'}>
            Create Your Team
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Team Timeline
          </h1>
          <p className="text-muted-foreground mt-2">
            Shared tasks and events visible to all team members
          </p>
        </div>
        <Button onClick={() => window.location.href = '/timeline'}>
          View Full Timeline
        </Button>
      </div>

      {/* Team Context Info */}
      <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Shared Calendar:</strong> Team tasks are visible to all members.
          {isAdmin && ' As an admin, you can assign tasks to team members.'}
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Select value={filterMemberId} onValueChange={setFilterMemberId}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.user?.user_metadata?.full_name || member.user?.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline Items */}
      {timelineItems && timelineItems.length > 0 ? (
        <div className="space-y-3">
          {timelineItems.map((item) => {
            const assignedMember = getAssignedMember(item.assigned_to);

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(item.status)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              {new Date(item.start_time).toLocaleDateString()} at{' '}
                              {new Date(item.start_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              {item.duration_minutes} min
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-col gap-2 items-end">
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                          {item.visibility === 'team' && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              Team
                            </Badge>
                          )}
                          {assignedMember && (
                            <Badge variant="secondary" className="text-xs">
                              Assigned to{' '}
                              {assignedMember.user?.user_metadata?.full_name ||
                                assignedMember.user?.email}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Completed info */}
                      {item.completed_at && (
                        <p className="text-xs text-green-600 mt-2">
                          Completed {formatDistanceToNow(new Date(item.completed_at))} ago
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No team timeline items</h3>
            <p className="text-muted-foreground text-center mb-4">
              {filterMemberId !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Team tasks and events will appear here when created.'}
            </p>
            <Button onClick={() => window.location.href = '/timeline'}>
              Go to Timeline
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Item Count */}
      <div className="text-sm text-muted-foreground text-center">
        {timelineItems?.length || 0} team timeline item(s)
      </div>
    </div>
  );
}
