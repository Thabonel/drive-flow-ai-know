// Router Inbox - Multiplier Mode Request Triage System
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Inbox,
  Route,
  Calendar,
  MessageSquare,
  X,
  Check,
  Clock,
  AlertTriangle,
  Users,
  ArrowRight,
  MoreVertical,
  FileText,
  Zap
} from 'lucide-react';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useRouterInbox } from '@/hooks/useRouterInbox';
import { useTeamWorkload } from '@/hooks/useTeamWorkload';
import { toast } from 'sonner';

interface RouterInboxItem {
  id: string;
  request_from: string;
  request_content: string;
  request_type: 'meeting' | 'task' | 'question' | 'decision' | 'approval';
  priority: number;
  status: 'pending' | 'routed' | 'scheduled' | 'declined' | 'responded' | 'converted';
  routed_to?: string;
  routing_context?: string;
  estimated_effort_hours?: number;
  deadline?: string;
  tags: string[];
  created_at: string;
  resolved_at?: string;
}

interface TriageAction {
  type: 'route' | 'schedule' | 'respond' | 'decline' | 'convert';
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
}

const TRIAGE_ACTIONS: TriageAction[] = [
  {
    type: 'route',
    label: 'Route to Team',
    icon: Route,
    description: 'Assign to a team member',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
  },
  {
    type: 'schedule',
    label: 'Schedule Meeting',
    icon: Calendar,
    description: 'Convert to calendar event',
    color: 'bg-green-100 text-green-800 hover:bg-green-200'
  },
  {
    type: 'respond',
    label: 'Quick Response',
    icon: MessageSquare,
    description: 'Send immediate response',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-200'
  },
  {
    type: 'convert',
    label: 'Convert to Doc',
    icon: FileText,
    description: 'Create shared document',
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-200'
  },
  {
    type: 'decline',
    label: 'Decline',
    icon: X,
    description: 'Politely decline request',
    color: 'bg-red-100 text-red-800 hover:bg-red-200'
  }
];

const REQUEST_TYPE_CONFIGS = {
  meeting: { icon: Calendar, color: 'bg-blue-100 text-blue-800', label: 'Meeting' },
  task: { icon: Zap, color: 'bg-green-100 text-green-800', label: 'Task' },
  question: { icon: MessageSquare, color: 'bg-purple-100 text-purple-800', label: 'Question' },
  decision: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-800', label: 'Decision' },
  approval: { icon: Check, color: 'bg-yellow-100 text-yellow-800', label: 'Approval' }
};

const PRIORITY_COLORS = {
  1: 'bg-gray-100 text-gray-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-red-100 text-red-800'
};

const RESPONSE_TEMPLATES = {
  meeting: {
    accept: "Thanks for reaching out! I'd be happy to schedule some time to discuss this. Let me check my calendar and get back to you with a few options.",
    delegate: "This looks like something [TEAM_MEMBER] would be perfect for. I'm connecting you two - they'll follow up shortly.",
    decline: "I appreciate you thinking of me for this. Unfortunately, I won't be able to take this on right now, but I'd suggest [ALTERNATIVE]."
  },
  task: {
    accept: "I can help with this. Let me review the details and I'll get started on [TIMELINE].",
    delegate: "This is right up [TEAM_MEMBER]'s alley! They're the expert on this and will do a much better job than I would. I'm looping them in now.",
    decline: "Thanks for thinking of me. This isn't something I can take on right now, but you might want to try [SUGGESTION]."
  },
  question: {
    answer: "Great question! Here's what I'd recommend: [ANSWER]. Hope that helps!",
    delegate: "[TEAM_MEMBER] is our go-to person for this type of question. I'm connecting you - they'll have much better insights than I would.",
    research: "This is a really interesting question that deserves a thoughtful response. Let me do some research and get back to you by [DATE]."
  }
};

export function RouterInbox() {
  const { team } = useTeam();
  const { members } = useTeamMembers(team?.id);
  const { inboxItems, createInboxItem, updateInboxItem, triageRequest } = useRouterInbox();
  const { teamWorkload } = useTeamWorkload(team?.id);

  const [selectedItem, setSelectedItem] = useState<RouterInboxItem | null>(null);
  const [triageAction, setTriageAction] = useState<TriageAction | null>(null);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Quick stats
  const pendingCount = inboxItems?.filter(item => item.status === 'pending').length || 0;
  const routedCount = inboxItems?.filter(item => item.status === 'routed').length || 0;
  const overdueCount = inboxItems?.filter(item => {
    if (!item.deadline) return false;
    return new Date(item.deadline) < new Date() && item.status === 'pending';
  }).length || 0;

  // Filter items
  const filteredItems = inboxItems?.filter(item => {
    const statusMatch = filterStatus === 'all' || item.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || item.priority.toString() === filterPriority;
    return statusMatch && priorityMatch;
  }) || [];

  const getPriorityLabel = (priority: number) => {
    const labels = { 1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Urgent' };
    return labels[priority as keyof typeof labels] || 'Normal';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  };

  const handleTriageAction = (item: RouterInboxItem, action: TriageAction) => {
    setSelectedItem(item);
    setTriageAction(action);
    setIsTriageModalOpen(true);
  };

  const getBestTeamMemberForRequest = (item: RouterInboxItem) => {
    if (!teamWorkload || !members) return null;

    // Simple heuristic: find team member with lowest workload and relevant skills
    const availableMembers = teamWorkload
      .filter(member => member.workload_percentage < 90) // Not overloaded
      .sort((a, b) => a.workload_percentage - b.workload_percentage);

    return availableMembers[0] || null;
  };

  if (!team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Router Inbox</CardTitle>
          <CardDescription>Join a team to access request routing features</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Inbox className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Routed</p>
                <p className="text-2xl font-bold">{routedCount}</p>
              </div>
              <Route className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Load</p>
                <p className="text-2xl font-bold">
                  {teamWorkload?.length
                    ? Math.round(teamWorkload.reduce((acc, member) => acc + member.workload_percentage, 0) / teamWorkload.length)
                    : 0}%
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="routed">Routed</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="5">Urgent</SelectItem>
            <SelectItem value="4">High</SelectItem>
            <SelectItem value="3">Medium</SelectItem>
            <SelectItem value="2">Normal</SelectItem>
            <SelectItem value="1">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inbox Items */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600">
                {filterStatus === 'pending'
                  ? 'All caught up! No pending requests to review.'
                  : 'Try adjusting your filters to see more requests.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const requestConfig = REQUEST_TYPE_CONFIGS[item.request_type];
            const isOverdue = item.deadline && new Date(item.deadline) < new Date() && item.status === 'pending';

            return (
              <Card key={item.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <requestConfig.icon className="h-4 w-4" />
                          <Badge className={requestConfig.color}>
                            {requestConfig.label}
                          </Badge>
                        </div>

                        <Badge className={PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]}>
                          {getPriorityLabel(item.priority)}
                        </Badge>

                        {item.status !== 'pending' && (
                          <Badge variant="outline" className="capitalize">
                            {item.status}
                          </Badge>
                        )}

                        {isOverdue && (
                          <Badge variant="destructive" className="animate-pulse">
                            Overdue
                          </Badge>
                        )}
                      </div>

                      <div className="mb-3">
                        <p className="font-medium text-gray-900 mb-1">From: {item.request_from}</p>
                        <p className="text-gray-700">{item.request_content}</p>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span>{getTimeAgo(item.created_at)}</span>

                        {item.estimated_effort_hours && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{item.estimated_effort_hours}h effort</span>
                          </div>
                        )}

                        {item.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {new Date(item.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {item.tags.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {item.routed_to && item.routing_context && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-2 text-green-800 text-sm">
                            <Route className="h-4 w-4" />
                            <span>Routed: {item.routing_context}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {item.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        {TRIAGE_ACTIONS.map((action) => (
                          <Button
                            key={action.type}
                            variant="outline"
                            size="sm"
                            onClick={() => handleTriageAction(item, action)}
                            className={`${action.color} border-0`}
                            title={action.description}
                          >
                            <action.icon className="h-4 w-4" />
                          </Button>
                        ))}
                      </div>
                    )}

                    {item.status !== 'pending' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Add Follow-up</DropdownMenuItem>
                          <DropdownMenuItem>Mark as Done</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Triage Action Modal */}
      <Dialog open={isTriageModalOpen} onOpenChange={setIsTriageModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {triageAction?.icon && <triageAction.icon className="h-5 w-5" />}
              {triageAction?.label}
            </DialogTitle>
            <DialogDescription>
              {triageAction?.description} for request from {selectedItem?.request_from}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && triageAction && (
            <TriageActionForm
              item={selectedItem}
              action={triageAction}
              teamMembers={members || []}
              teamWorkload={teamWorkload || []}
              onSubmit={(updates) => {
                updateInboxItem(selectedItem.id, updates);
                setIsTriageModalOpen(false);
                setSelectedItem(null);
                setTriageAction(null);
                toast.success(`Request ${triageAction.label.toLowerCase()} successfully`);
              }}
              onCancel={() => {
                setIsTriageModalOpen(false);
                setSelectedItem(null);
                setTriageAction(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate form component for triage actions
interface TriageActionFormProps {
  item: RouterInboxItem;
  action: TriageAction;
  teamMembers: any[];
  teamWorkload: any[];
  onSubmit: (updates: Partial<RouterInboxItem>) => void;
  onCancel: () => void;
}

function TriageActionForm({ item, action, teamMembers, teamWorkload, onSubmit, onCancel }: TriageActionFormProps) {
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [routingContext, setRoutingContext] = useState('');
  const [responseText, setResponseText] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');

  // Get team member options with workload info
  const memberOptions = teamMembers.map(member => {
    const workload = teamWorkload.find(w => w.user_id === member.user_id);
    return {
      ...member,
      workload_percentage: workload?.workload_percentage || 0,
      available_hours: workload?.available_hours || 0
    };
  }).sort((a, b) => a.workload_percentage - b.workload_percentage);

  const handleSubmit = () => {
    const updates: Partial<RouterInboxItem> = {};

    switch (action.type) {
      case 'route':
        updates.status = 'routed';
        updates.routed_to = selectedMember;
        updates.routing_context = routingContext;
        if (estimatedHours) updates.estimated_effort_hours = parseFloat(estimatedHours);
        break;

      case 'schedule':
        updates.status = 'scheduled';
        if (scheduleDate) updates.deadline = scheduleDate;
        break;

      case 'respond':
        updates.status = 'responded';
        updates.routing_context = responseText;
        break;

      case 'decline':
        updates.status = 'declined';
        updates.routing_context = responseText || 'Request declined';
        break;

      case 'convert':
        updates.status = 'converted';
        updates.routing_context = 'Converted to shared document';
        break;
    }

    updates.resolved_at = new Date().toISOString();
    onSubmit(updates);
  };

  // Get appropriate response template
  const getTemplate = (type: string) => {
    const templates = RESPONSE_TEMPLATES[item.request_type as keyof typeof RESPONSE_TEMPLATES];
    if (!templates) return '';
    return templates[type as keyof typeof templates] || '';
  };

  return (
    <div className="space-y-4">
      {/* Show request summary */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">{item.request_content}</p>
      </div>

      {action.type === 'route' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="member-select">Assign to Team Member</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{member.user?.user_metadata?.full_name || member.user?.email}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge
                          variant={member.workload_percentage < 50 ? 'default' :
                                   member.workload_percentage < 80 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {Math.round(member.workload_percentage)}%
                        </Badge>
                        <span className="text-gray-500">
                          {member.available_hours.toFixed(1)}h free
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="routing-context">Context for Team Member</Label>
            <Textarea
              id="routing-context"
              value={routingContext}
              onChange={(e) => setRoutingContext(e.target.value)}
              placeholder="Provide context and instructions for the assigned team member..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated-hours">Estimated Effort (hours)</Label>
            <Input
              id="estimated-hours"
              type="number"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g. 2.5"
            />
          </div>
        </>
      )}

      {action.type === 'schedule' && (
        <div className="space-y-2">
          <Label htmlFor="schedule-date">Schedule Date & Time</Label>
          <Input
            id="schedule-date"
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
        </div>
      )}

      {(action.type === 'respond' || action.type === 'decline') && (
        <div className="space-y-2">
          <Label htmlFor="response-text">
            {action.type === 'respond' ? 'Response Message' : 'Decline Reason'}
          </Label>
          <Textarea
            id="response-text"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder={
              action.type === 'respond'
                ? 'Type your response...'
                : 'Politely explain why you\'re declining...'
            }
          />

          {/* Template suggestions */}
          <div className="flex gap-2 mt-2">
            {action.type === 'respond' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResponseText(getTemplate('answer'))}
              >
                Use Answer Template
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResponseText(getTemplate(action.type === 'respond' ? 'delegate' : 'decline'))}
            >
              Use {action.type === 'respond' ? 'Delegate' : 'Decline'} Template
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSubmit} className="flex-1">
          <ArrowRight className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}