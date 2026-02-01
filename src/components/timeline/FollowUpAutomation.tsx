// Follow-Up Automation System for Delegation Workflow
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Bell,
  Play,
  Pause,
  Settings,
  MessageSquare,
  Users,
  TrendingUp,
  Target,
  ArrowRight,
  Plus,
  Edit
} from 'lucide-react';
import { useFollowUpAutomation } from '@/hooks/useFollowUpAutomation';
import { useDelegations } from '@/hooks/useDelegations';
import { TrustLevel, TRUST_LEVEL_DESCRIPTIONS } from '@/lib/attentionTypes';
import { toast } from 'sonner';

interface FollowUpEvent {
  id: string;
  delegation_id: string;
  delegation_title: string;
  delegate_name: string;
  follow_up_type: 'work_alongside' | 'review_steps' | 'unblock_context' | 'completion_review';
  scheduled_at: string;
  completed_at?: string;
  notes?: string;
  next_follow_up_at?: string;
  trust_level: TrustLevel;
  status: 'scheduled' | 'completed' | 'overdue' | 'skipped';
}

interface AutomationRule {
  id: string;
  trust_level: TrustLevel;
  follow_up_type: string;
  timing_hours: number;
  is_active: boolean;
  custom_message?: string;
  conditions: {
    delegation_type?: string[];
    estimated_hours_min?: number;
    estimated_hours_max?: number;
    priority_level?: number;
  };
}

interface FollowUpTemplate {
  type: string;
  label: string;
  description: string;
  default_timing: Record<TrustLevel, number>;
  message_templates: Record<TrustLevel, string>;
}

const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  {
    type: 'work_alongside',
    label: 'Work Alongside',
    description: 'Collaborative session to work through the task together',
    default_timing: { new: 2, experienced: 24, expert: 0 },
    message_templates: {
      new: "Let's work on this together to get you started and address any questions.",
      experienced: "Quick check-in to see how things are progressing and if you need any support.",
      expert: "Available if you need context or have any blocking questions."
    }
  },
  {
    type: 'review_steps',
    label: 'Review Steps',
    description: 'Check progress and review approach at key milestones',
    default_timing: { new: 8, experienced: 24, expert: 48 },
    message_templates: {
      new: "Let's review your progress and plan the next steps together.",
      experienced: "How are things going? Want to walk through your approach?",
      expert: "Quick milestone check - everything on track?"
    }
  },
  {
    type: 'unblock_context',
    label: 'Unblock & Context',
    description: 'Provide additional context and remove blockers',
    default_timing: { new: 4, experienced: 12, expert: 24 },
    message_templates: {
      new: "Any questions or blockers? I'm here to help clarify anything.",
      experienced: "Checking in to see if you need additional context or resources.",
      expert: "Available for strategic context or removing any organizational blockers."
    }
  },
  {
    type: 'completion_review',
    label: 'Completion Review',
    description: 'Final review and feedback on completed work',
    default_timing: { new: 1, experienced: 1, expert: 1 },
    message_templates: {
      new: "Great work! Let's review what you accomplished and gather feedback.",
      experienced: "Thanks for completing this. Quick review and feedback session?",
      expert: "Excellent work as always. Brief feedback exchange when you're free."
    }
  }
];

const FOLLOW_UP_TYPE_CONFIGS = {
  work_alongside: { icon: Users, color: 'bg-blue-100 text-blue-800' },
  review_steps: { icon: Target, color: 'bg-green-100 text-green-800' },
  unblock_context: { icon: MessageSquare, color: 'bg-purple-100 text-purple-800' },
  completion_review: { icon: CheckCircle, color: 'bg-orange-100 text-orange-800' }
};

export function FollowUpAutomation() {
  const { followUpEvents, automationRules, updateAutomationRule, completeFollowUp, scheduleFollowUp } = useFollowUpAutomation();
  const { delegations } = useDelegations();

  const [selectedEvent, setSelectedEvent] = useState<FollowUpEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('upcoming');

  // Statistics
  const upcomingEvents = followUpEvents?.filter(event =>
    event.status === 'scheduled' && new Date(event.scheduled_at) > new Date()
  ) || [];

  const overdueEvents = followUpEvents?.filter(event =>
    event.status === 'scheduled' && new Date(event.scheduled_at) < new Date()
  ) || [];

  const completedEvents = followUpEvents?.filter(event =>
    event.status === 'completed'
  ) || [];

  const todayEvents = followUpEvents?.filter(event =>
    event.status === 'scheduled' &&
    new Date(event.scheduled_at).toDateString() === new Date().toDateString()
  ) || [];

  // Filter events based on selected status
  const filteredEvents = (() => {
    switch (filterStatus) {
      case 'upcoming': return upcomingEvents;
      case 'overdue': return overdueEvents;
      case 'today': return todayEvents;
      case 'completed': return completedEvents;
      default: return followUpEvents || [];
    }
  })();

  const getEventUrgency = (event: FollowUpEvent) => {
    if (event.status === 'completed') return 'completed';
    if (event.status === 'overdue') return 'overdue';

    const now = new Date();
    const eventDate = new Date(event.scheduled_at);
    const hoursDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 0) return 'overdue';
    if (hoursDiff < 1) return 'urgent';
    if (hoursDiff < 4) return 'soon';
    if (hoursDiff < 24) return 'today';
    return 'scheduled';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'border-red-300 bg-red-50';
      case 'urgent': return 'border-orange-300 bg-orange-50';
      case 'soon': return 'border-yellow-300 bg-yellow-50';
      case 'today': return 'border-blue-300 bg-blue-50';
      case 'completed': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const handleCompleteFollowUp = async (eventId: string, notes: string, scheduleNext?: boolean) => {
    try {
      await completeFollowUp(eventId, notes, scheduleNext);
      toast.success('Follow-up completed successfully');
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      toast.error('Failed to complete follow-up');
    }
  };

  const handleScheduleFollowUp = async (delegationId: string, type: string, timing: number) => {
    try {
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + timing);

      await scheduleFollowUp(delegationId, type, scheduledAt.toISOString());
      toast.success('Follow-up scheduled successfully');
    } catch (error) {
      toast.error('Failed to schedule follow-up');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Follow-Up Automation</h2>
          <p className="text-gray-600">Manage automated follow-ups for delegated tasks</p>
        </div>
        <Button onClick={() => setIsRuleModalOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Automation Rules
        </Button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Follow-ups</p>
                <p className="text-2xl font-bold">{todayEvents.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
              </div>
              <Bell className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueEvents.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{completedEvents.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="events">Follow-Up Events</TabsTrigger>
          <TabsTrigger value="automation">Automation Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {/* Filter */}
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today ({todayEvents.length})</SelectItem>
                <SelectItem value="upcoming">Upcoming ({upcomingEvents.length})</SelectItem>
                <SelectItem value="overdue">Overdue ({overdueEvents.length})</SelectItem>
                <SelectItem value="completed">Completed ({completedEvents.length})</SelectItem>
                <SelectItem value="all">All Events</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Events List */}
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {filterStatus === 'overdue' && 'No overdue follow-ups'}
                    {filterStatus === 'today' && 'No follow-ups scheduled for today'}
                    {filterStatus === 'upcoming' && 'No upcoming follow-ups'}
                    {filterStatus === 'completed' && 'No completed follow-ups'}
                    {filterStatus === 'all' && 'No follow-up events'}
                  </h3>
                  <p className="text-gray-600">
                    {filterStatus === 'overdue' && 'Great! You\'re caught up on all follow-ups.'}
                    {filterStatus === 'today' && 'Enjoy your meeting-free day!'}
                    {filterStatus === 'upcoming' && 'No future follow-ups scheduled yet.'}
                    {filterStatus === 'completed' && 'Completed follow-ups will appear here.'}
                    {filterStatus === 'all' && 'Follow-up events will appear here as delegations are created.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredEvents.map((event) => {
                const urgency = getEventUrgency(event);
                const urgencyColor = getUrgencyColor(urgency);
                const config = FOLLOW_UP_TYPE_CONFIGS[event.follow_up_type];
                const trustConfig = TRUST_LEVEL_DESCRIPTIONS[event.trust_level];

                return (
                  <Card key={event.id} className={`${urgencyColor} hover:shadow-md transition-shadow`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              <Badge className={config.color}>
                                {FOLLOW_UP_TEMPLATES.find(t => t.type === event.follow_up_type)?.label ||
                                 event.follow_up_type.replace('_', ' ')}
                              </Badge>
                            </div>

                            <Badge variant="outline">
                              {trustConfig.icon} {trustConfig.label}
                            </Badge>

                            {urgency === 'overdue' && (
                              <Badge variant="destructive" className="animate-pulse">
                                Overdue
                              </Badge>
                            )}

                            {urgency === 'urgent' && (
                              <Badge variant="default" className="bg-orange-600">
                                Due Soon
                              </Badge>
                            )}

                            {event.status === 'completed' && (
                              <Badge className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                            )}
                          </div>

                          <div className="mb-3">
                            <h4 className="font-medium text-lg mb-1">{event.delegation_title}</h4>
                            <p className="text-gray-600">with {event.delegate_name}</p>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(event.scheduled_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(event.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {urgency === 'overdue' && (
                              <span className="text-red-600 font-medium">
                                {Math.abs(Math.round((new Date().getTime() - new Date(event.scheduled_at).getTime()) / (1000 * 60 * 60)))}h overdue
                              </span>
                            )}
                            {urgency === 'urgent' && (
                              <span className="text-orange-600 font-medium">
                                In {Math.round((new Date(event.scheduled_at).getTime() - new Date().getTime()) / (1000 * 60))} minutes
                              </span>
                            )}
                          </div>

                          {event.notes && (
                            <div className="mt-2 p-2 bg-white border border-gray-200 rounded-md">
                              <p className="text-sm text-gray-700">
                                <strong>Previous notes:</strong> {event.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {event.status === 'scheduled' && (
                          <Button
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsEventModalOpen(true);
                            }}
                            variant={urgency === 'overdue' ? 'destructive' : 'default'}
                          >
                            {urgency === 'overdue' ? 'Complete Now' : 'Start Follow-up'}
                          </Button>
                        )}

                        {event.status === 'completed' && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <AutomationSettings
            rules={automationRules || []}
            onUpdateRule={updateAutomationRule}
          />
        </TabsContent>
      </Tabs>

      {/* Follow-Up Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Follow-Up</DialogTitle>
            <DialogDescription>
              Record completion of follow-up with {selectedEvent?.delegate_name}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <FollowUpCompletionForm
              event={selectedEvent}
              onComplete={handleCompleteFollowUp}
              onCancel={() => setIsEventModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Automation Settings Component
interface AutomationSettingsProps {
  rules: AutomationRule[];
  onUpdateRule: (ruleId: string, updates: Partial<AutomationRule>) => void;
}

function AutomationSettings({ rules, onUpdateRule }: AutomationSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Follow-Up Templates</CardTitle>
          <CardDescription>
            Default follow-up patterns by trust level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FOLLOW_UP_TEMPLATES.map((template) => (
              <div key={template.type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{template.label}</h4>
                  <Badge variant="outline">{template.type.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                <div className="grid grid-cols-3 gap-4">
                  {(['new', 'experienced', 'expert'] as TrustLevel[]).map(level => (
                    <div key={level} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{level}</span>
                        <Badge variant="outline" className="text-xs">
                          {template.default_timing[level] === 0 ? 'No follow-up' : `${template.default_timing[level]}h`}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        "{template.message_templates[level]}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
          <CardDescription>
            Customize when and how follow-ups are automatically scheduled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium capitalize">
                      {rule.trust_level} - {rule.follow_up_type.replace('_', ' ')}
                    </h4>
                    <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Triggers {rule.timing_hours}h after delegation
                    {rule.custom_message && ' • Custom message configured'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateRule(rule.id, { is_active: !rule.is_active })}
                >
                  {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Follow-Up Completion Form
interface FollowUpCompletionFormProps {
  event: FollowUpEvent;
  onComplete: (eventId: string, notes: string, scheduleNext?: boolean) => void;
  onCancel: () => void;
}

function FollowUpCompletionForm({ event, onComplete, onCancel }: FollowUpCompletionFormProps) {
  const [notes, setNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);

  const template = FOLLOW_UP_TEMPLATES.find(t => t.type === event.follow_up_type);
  const suggestedMessage = template?.message_templates[event.trust_level] || '';

  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium">{event.delegation_title}</h4>
        <p className="text-sm text-gray-600">
          {template?.label} with {event.delegate_name}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Follow-up Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record what was discussed, any blockers identified, next steps..."
          className="min-h-20"
        />
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Suggested talking points:</strong> {suggestedMessage}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="schedule-next"
          checked={scheduleNext}
          onChange={(e) => setScheduleNext(e.target.checked)}
          className="form-checkbox"
        />
        <label htmlFor="schedule-next" className="text-sm">
          Schedule next follow-up automatically
        </label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          onClick={() => onComplete(event.id, notes, scheduleNext)}
          className="flex-1"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete Follow-up
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}