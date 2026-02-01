import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Clock,
  Target,
  Users,
  Brain,
  CheckSquare,
  ArrowRight,
  Zap,
  MessageSquare,
  FileText,
  Calendar,
  Coffee,
  Focus
} from 'lucide-react';
import {
  UserAttentionPreferences,
  RoleMode,
  AttentionType,
  ROLE_MODE_DESCRIPTIONS,
  ATTENTION_TYPE_DESCRIPTIONS
} from '@/lib/attentionTypes';

interface EventTemplate {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  attentionType: AttentionType;
  icon: React.ReactNode;
  color: string;
  priority: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  notes?: string;
}

interface RoleBasedEventTemplatesProps {
  preferences: UserAttentionPreferences | null;
  onCreateEvent?: (template: EventTemplate, startTime?: string) => void;
  onOpenFullForm?: () => void;
  compact?: boolean;
  className?: string;
}

export function RoleBasedEventTemplates({
  preferences,
  onCreateEvent,
  onOpenFullForm,
  compact = false,
  className = ''
}: RoleBasedEventTemplatesProps) {

  const roleTemplates = useMemo((): Record<RoleMode, EventTemplate[]> => {
    return {
      maker: [
        {
          id: 'deep-focus',
          title: 'Deep Focus Work',
          description: 'Uninterrupted creative work or problem-solving',
          duration: 180, // 3 hours
          attentionType: 'create',
          icon: <Focus className="h-4 w-4" />,
          color: '#8B5CF6',
          priority: 5,
          tags: ['focus', 'create'],
          notes: 'Block distractions, turn off notifications'
        },
        {
          id: 'coding-session',
          title: 'Coding Session',
          description: 'Implementation and development work',
          duration: 120,
          attentionType: 'create',
          icon: <Brain className="h-4 w-4" />,
          color: '#10B981',
          priority: 5,
          tags: ['development', 'implementation']
        },
        {
          id: 'research-time',
          title: 'Research & Learning',
          description: 'Study, documentation, or exploration',
          duration: 90,
          attentionType: 'create',
          icon: <FileText className="h-4 w-4" />,
          color: '#F59E0B',
          priority: 4,
          tags: ['research', 'learning']
        },
        {
          id: 'break-time',
          title: 'Focused Break',
          description: 'Intentional rest to maintain energy',
          duration: 30,
          attentionType: 'recover',
          icon: <Coffee className="h-4 w-4" />,
          color: '#84CC16',
          priority: 3,
          tags: ['break', 'recovery']
        }
      ],
      marker: [
        {
          id: 'decision-batch',
          title: 'Decision Batch',
          description: 'Process multiple decisions at once',
          duration: 60,
          attentionType: 'decide',
          icon: <CheckSquare className="h-4 w-4" />,
          color: '#EF4444',
          priority: 5,
          tags: ['decisions', 'batch'],
          notes: 'Prepare list of decisions in advance'
        },
        {
          id: 'review-session',
          title: 'Review Session',
          description: 'Evaluate progress, quality, or performance',
          duration: 45,
          attentionType: 'review',
          icon: <Target className="h-4 w-4" />,
          color: '#3B82F6',
          priority: 4,
          tags: ['review', 'evaluation']
        },
        {
          id: 'strategic-planning',
          title: 'Strategic Planning',
          description: 'High-level thinking and direction setting',
          duration: 90,
          attentionType: 'decide',
          icon: <Brain className="h-4 w-4" />,
          color: '#8B5CF6',
          priority: 5,
          tags: ['strategy', 'planning']
        },
        {
          id: 'feedback-review',
          title: 'Feedback Review',
          description: 'Process and act on received feedback',
          duration: 30,
          attentionType: 'review',
          icon: <MessageSquare className="h-4 w-4" />,
          color: '#F59E0B',
          priority: 3,
          tags: ['feedback', 'improvement']
        }
      ],
      multiplier: [
        {
          id: 'team-sync',
          title: 'Team Sync',
          description: 'Coordination and alignment meeting',
          duration: 30,
          attentionType: 'connect',
          icon: <Users className="h-4 w-4" />,
          color: '#06B6D4',
          priority: 4,
          tags: ['team', 'coordination']
        },
        {
          id: 'delegation-session',
          title: 'Delegation Session',
          description: 'Hand off tasks and provide context',
          duration: 45,
          attentionType: 'connect',
          icon: <ArrowRight className="h-4 w-4" />,
          color: '#8B5CF6',
          priority: 5,
          tags: ['delegation', 'handoff']
        },
        {
          id: 'coaching-call',
          title: 'Coaching Call',
          description: 'Develop team members or provide guidance',
          duration: 60,
          attentionType: 'connect',
          icon: <Target className="h-4 w-4" />,
          color: '#10B981',
          priority: 4,
          tags: ['coaching', 'development']
        },
        {
          id: 'stakeholder-update',
          title: 'Stakeholder Update',
          description: 'Communicate progress and decisions',
          duration: 30,
          attentionType: 'connect',
          icon: <MessageSquare className="h-4 w-4" />,
          color: '#F59E0B',
          priority: 3,
          tags: ['communication', 'updates']
        },
        {
          id: 'process-optimization',
          title: 'Process Optimization',
          description: 'Improve team workflows and efficiency',
          duration: 75,
          attentionType: 'decide',
          icon: <Zap className="h-4 w-4" />,
          color: '#EF4444',
          priority: 4,
          tags: ['optimization', 'process']
        }
      ]
    };
  }, []);

  const currentRole = preferences?.current_role || 'maker';
  const currentTemplates = roleTemplates[currentRole];
  const roleDesc = ROLE_MODE_DESCRIPTIONS[currentRole];

  const getSuggestedStartTime = (template: EventTemplate): string => {
    const now = new Date();

    // For high-attention tasks, suggest peak hours if defined
    if (template.attentionType === 'create' || template.attentionType === 'decide') {
      if (preferences?.peak_hours_start) {
        const [hour, minute] = preferences.peak_hours_start.split(':').map(Number);
        const peakTime = new Date();
        peakTime.setHours(hour, minute, 0, 0);

        // If peak hours haven't started yet today, suggest peak hours
        if (peakTime > now) {
          return peakTime.toISOString();
        }
      }
    }

    // Otherwise, suggest next available slot (round to next half hour)
    const nextSlot = new Date(now);
    const minutes = nextSlot.getMinutes();
    if (minutes <= 30) {
      nextSlot.setMinutes(30, 0, 0);
    } else {
      nextSlot.setHours(nextSlot.getHours() + 1, 0, 0, 0);
    }

    return nextSlot.toISOString();
  };

  const handleCreateFromTemplate = (template: EventTemplate) => {
    const startTime = getSuggestedStartTime(template);
    onCreateEvent?.(template, startTime);
  };

  const getAttentionColor = (attentionType: AttentionType): string => {
    const colors = {
      create: 'bg-purple-100 text-purple-800 border-purple-200',
      decide: 'bg-red-100 text-red-800 border-red-200',
      connect: 'bg-blue-100 text-blue-800 border-blue-200',
      review: 'bg-orange-100 text-orange-800 border-orange-200',
      recover: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[attentionType] || colors.create;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Card>
        <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
          <CardTitle className="text-sm flex items-center gap-2">
            <span>{roleDesc.icon}</span>
            {roleDesc.label} Templates
          </CardTitle>
          <CardDescription className="text-xs">
            Quick templates optimized for your current role
          </CardDescription>
        </CardHeader>

        <CardContent className={compact ? 'pt-0 space-y-2' : 'pt-0 space-y-3'}>
          {/* Quick Templates Grid */}
          <div className="grid grid-cols-1 gap-2">
            {currentTemplates.slice(0, compact ? 3 : 6).map((template) => {
              const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[template.attentionType];

              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-1">
                        {template.icon}
                        <span className="font-medium text-sm">{template.title}</span>
                      </div>
                      <Badge className={`text-xs ${getAttentionColor(template.attentionType)}`}>
                        {attentionDesc.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(template.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Priority {template.priority}
                      </span>
                    </div>

                    {!compact && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleCreateFromTemplate(template)}
                    className="ml-3"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* View All Templates Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Calendar className="h-3 w-3 mr-1" />
                View All Templates ({currentTemplates.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{roleDesc.icon}</span>
                  {roleDesc.label} Event Templates
                </DialogTitle>
                <DialogDescription>
                  Templates optimized for {roleDesc.label.toLowerCase()} mode activities
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {currentTemplates.map((template) => {
                  const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[template.attentionType];

                  return (
                    <Card key={template.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {template.icon}
                              <h3 className="font-medium">{template.title}</h3>
                              <Badge className={`text-xs ${getAttentionColor(template.attentionType)}`}>
                                {attentionDesc.label}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                              {template.description}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(template.duration)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Priority {template.priority}
                              </span>
                            </div>

                            {template.tags && (
                              <div className="flex gap-1 flex-wrap mb-2">
                                {template.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {template.notes && (
                              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                💡 {template.notes}
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() => handleCreateFromTemplate(template)}
                            className="ml-4"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Create
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={onOpenFullForm} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Custom Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Role Switch Indicator */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Templates adapt to your role • Currently: {roleDesc.label}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}