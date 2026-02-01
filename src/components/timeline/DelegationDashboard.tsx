// Enhanced Delegation Dashboard for Multiplier Mode
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Star,
  Target,
  Calendar,
  MessageSquare,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useTeam } from '@/hooks/useTeam';
import { useDelegations } from '@/hooks/useDelegations';
import { useTeamWorkload } from '@/hooks/useTeamWorkload';
import { TrustLevel, TRUST_LEVEL_DESCRIPTIONS } from '@/lib/attentionTypes';
import { toast } from 'sonner';

interface Delegation {
  id: string;
  title: string;
  description?: string;
  delegate_id: string;
  delegate_name: string;
  trust_level: TrustLevel;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  estimated_hours?: number;
  actual_hours?: number;
  completion_percentage: number;
  success_rating?: number;
  follow_up_events: string[];
  created_at: string;
  completed_at?: string;
  next_follow_up?: string;
  requirements?: string;
  blocked_reason?: string;
}

interface TeamMember {
  user_id: string;
  name: string;
  workload_percentage: number;
  available_hours: number;
  current_focus_area?: string;
  skills: string[];
}

interface DelegationAnalytics {
  total_delegations: number;
  completed_delegations: number;
  success_rate: number;
  average_rating: number;
  trust_level_breakdown: {
    new: number;
    experienced: number;
    expert: number;
  };
  avg_completion_time_hours: number;
}

export function DelegationDashboard() {
  const { team } = useTeam();
  const { delegations, createDelegation, updateDelegation, analytics } = useDelegations();
  const { teamWorkload, updateWorkload } = useTeamWorkload(team?.id);

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTrustLevel, setSelectedTrustLevel] = useState<string>('all');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null);

  // Filter delegations based on selected filters
  const filteredDelegations = delegations?.filter(delegation => {
    const statusMatch = selectedStatus === 'all' || delegation.status === selectedStatus;
    const trustMatch = selectedTrustLevel === 'all' || delegation.trust_level === selectedTrustLevel;
    return statusMatch && trustMatch;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrustLevelColor = (level: TrustLevel) => {
    const config = TRUST_LEVEL_DESCRIPTIONS[level];
    return `bg-${config.color.slice(1)} text-white`; // Remove # from color
  };

  const getFollowUpUrgency = (nextFollowUp?: string) => {
    if (!nextFollowUp) return 'none';

    const now = new Date();
    const followUpDate = new Date(nextFollowUp);
    const hoursDiff = (followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 0) return 'overdue';
    if (hoursDiff < 4) return 'urgent';
    if (hoursDiff < 24) return 'soon';
    return 'scheduled';
  };

  const handleUpdateDelegation = async (updates: Partial<Delegation>) => {
    if (!selectedDelegation) return;

    try {
      await updateDelegation(selectedDelegation.id, updates);
      toast.success('Delegation updated successfully');
      setIsUpdateModalOpen(false);
      setSelectedDelegation(null);
    } catch (error) {
      toast.error('Failed to update delegation');
    }
  };

  if (!team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delegation Dashboard</CardTitle>
          <CardDescription>Join a team to start delegating tasks</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Delegations</p>
                <p className="text-2xl font-bold">{analytics?.total_delegations || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">
                  {analytics?.success_rate ? `${Math.round(analytics.success_rate)}%` : '0%'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold">
                  {analytics?.average_rating ? analytics.average_rating.toFixed(1) : 'N/A'}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Time</p>
                <p className="text-2xl font-bold">
                  {analytics?.avg_completion_time_hours
                    ? `${Math.round(analytics.avg_completion_time_hours)}h`
                    : 'N/A'
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Delegations</TabsTrigger>
          <TabsTrigger value="team">Team Workload</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedTrustLevel} onValueChange={setSelectedTrustLevel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by trust level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trust Levels</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="experienced">Experienced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delegations List */}
          <div className="space-y-3">
            {filteredDelegations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No delegations found</h3>
                  <p className="text-gray-600">
                    {selectedStatus === 'all' && selectedTrustLevel === 'all'
                      ? 'Start delegating tasks to see them here.'
                      : 'Try adjusting your filters to see more delegations.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredDelegations.map((delegation) => (
                <Card key={delegation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-lg">{delegation.title}</h4>
                          <Badge className={getStatusColor(delegation.status)}>
                            {delegation.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {TRUST_LEVEL_DESCRIPTIONS[delegation.trust_level].label}
                          </Badge>
                        </div>

                        <p className="text-gray-600 mb-3">{delegation.description}</p>

                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{delegation.delegate_name}</span>
                          </div>

                          {delegation.estimated_hours && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{delegation.estimated_hours}h estimated</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(delegation.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{Math.round(delegation.completion_percentage)}%</span>
                          </div>
                          <Progress
                            value={delegation.completion_percentage}
                            className="h-2"
                          />
                        </div>

                        {/* Follow-up indicator */}
                        {delegation.next_follow_up && (
                          <div className="mt-2">
                            {(() => {
                              const urgency = getFollowUpUrgency(delegation.next_follow_up);
                              return (
                                <Badge
                                  variant={urgency === 'overdue' ? 'destructive' :
                                          urgency === 'urgent' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {urgency === 'overdue' && 'Follow-up overdue'}
                                  {urgency === 'urgent' && 'Follow-up urgent'}
                                  {urgency === 'soon' && 'Follow-up today'}
                                  {urgency === 'scheduled' && 'Follow-up scheduled'}
                                </Badge>
                              );
                            })()}
                          </div>
                        )}

                        {delegation.blocked_reason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-center gap-2 text-red-800 text-sm">
                              <AlertCircle className="h-4 w-4" />
                              <span>Blocked: {delegation.blocked_reason}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDelegation(delegation);
                          setIsUpdateModalOpen(true);
                        }}
                      >
                        Update
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Workload Overview</CardTitle>
              <CardDescription>
                Current capacity and availability of team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamWorkload?.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{member.name}</h4>
                        {member.current_focus_area && (
                          <Badge variant="outline">{member.current_focus_area}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-sm text-gray-600">Workload:</span>
                        <Progress value={member.workload_percentage} className="flex-1 max-w-32 h-2" />
                        <span className="text-sm font-medium">{Math.round(member.workload_percentage)}%</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{member.available_hours.toFixed(1)}h available</span>
                        {member.skills.length > 0 && (
                          <span>Skills: {member.skills.join(', ')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {member.workload_percentage < 50 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Available
                        </Badge>
                      ) : member.workload_percentage < 80 ? (
                        <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                          Moderate
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Overloaded
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Trust Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.trust_level_breakdown && (
                  <div className="space-y-3">
                    {Object.entries(analytics.trust_level_breakdown).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            level === 'new' ? 'bg-yellow-400' :
                            level === 'experienced' ? 'bg-green-400' : 'bg-purple-400'
                          }`} />
                          <span className="capitalize">{level}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Success Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {analytics?.success_rate ? `${Math.round(analytics.success_rate)}%` : '0%'}
                      </span>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Avg Completion Time</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {analytics?.avg_completion_time_hours
                          ? `${Math.round(analytics.avg_completion_time_hours)}h`
                          : 'N/A'
                        }
                      </span>
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Avg Rating</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {analytics?.average_rating ? analytics.average_rating.toFixed(1) : 'N/A'}
                      </span>
                      <Star className="h-4 w-4 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Update Delegation Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Delegation</DialogTitle>
            <DialogDescription>
              Update the status and progress of "{selectedDelegation?.title}"
            </DialogDescription>
          </DialogHeader>

          {selectedDelegation && (
            <DelegationUpdateForm
              delegation={selectedDelegation}
              onUpdate={handleUpdateDelegation}
              onCancel={() => setIsUpdateModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component for delegation update form
interface DelegationUpdateFormProps {
  delegation: Delegation;
  onUpdate: (updates: Partial<Delegation>) => void;
  onCancel: () => void;
}

function DelegationUpdateForm({ delegation, onUpdate, onCancel }: DelegationUpdateFormProps) {
  const [status, setStatus] = useState(delegation.status);
  const [completionPercentage, setCompletionPercentage] = useState(delegation.completion_percentage);
  const [actualHours, setActualHours] = useState(delegation.actual_hours?.toString() || '');
  const [successRating, setSuccessRating] = useState(delegation.success_rating?.toString() || '');
  const [blockedReason, setBlockedReason] = useState(delegation.blocked_reason || '');

  const handleSubmit = () => {
    const updates: Partial<Delegation> = {
      status,
      completion_percentage: completionPercentage,
      ...(actualHours && { actual_hours: parseFloat(actualHours) }),
      ...(successRating && { success_rating: parseInt(successRating) }),
      ...(status === 'blocked' && blockedReason && { blocked_reason: blockedReason }),
      ...(status === 'completed' && { completed_at: new Date().toISOString() })
    };

    onUpdate(updates);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="completion">Completion Percentage</Label>
        <Input
          id="completion"
          type="number"
          min="0"
          max="100"
          value={completionPercentage}
          onChange={(e) => setCompletionPercentage(parseInt(e.target.value) || 0)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="actual-hours">Actual Hours (Optional)</Label>
        <Input
          id="actual-hours"
          type="number"
          step="0.5"
          value={actualHours}
          onChange={(e) => setActualHours(e.target.value)}
          placeholder="e.g. 2.5"
        />
      </div>

      {status === 'completed' && (
        <div className="space-y-2">
          <Label htmlFor="rating">Success Rating (1-5)</Label>
          <Select value={successRating} onValueChange={setSuccessRating}>
            <SelectTrigger>
              <SelectValue placeholder="Rate the delegation success" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Poor</SelectItem>
              <SelectItem value="2">2 - Fair</SelectItem>
              <SelectItem value="3">3 - Good</SelectItem>
              <SelectItem value="4">4 - Very Good</SelectItem>
              <SelectItem value="5">5 - Excellent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {status === 'blocked' && (
        <div className="space-y-2">
          <Label htmlFor="blocked-reason">Blocked Reason</Label>
          <Textarea
            id="blocked-reason"
            value={blockedReason}
            onChange={(e) => setBlockedReason(e.target.value)}
            placeholder="Describe what's blocking progress..."
          />
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSubmit} className="flex-1">
          Update Delegation
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}