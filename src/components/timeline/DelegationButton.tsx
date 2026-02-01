// Component for delegating timeline items in Multiplier mode with role optimization
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
import { TimelineItem } from '@/lib/timelineUtils';
import { TrustLevel, ROLE_MODES } from '@/lib/attentionTypes';
import { ROLE_OPTIMIZATION_RULES } from '@/lib/roleOptimizer';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTimelineContext } from '@/contexts/TimelineContext';
import { Users, ArrowRight, Clock, AlertCircle, Lightbulb, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface DelegationButtonProps {
  item: TimelineItem;
  onDelegate?: (delegatedItem: TimelineItem, delegateInfo: DelegationInfo) => void;
  disabled?: boolean;
  className?: string;
}

interface DelegationInfo {
  delegate_id: string;
  trust_level: TrustLevel;
  context_notes: string;
  follow_up_type: 'work_alongside' | 'review_steps' | 'unblock_context';
  follow_up_scheduled_at?: string;
}

export function DelegationButton({
  item,
  onDelegate,
  disabled = false,
  className
}: DelegationButtonProps) {
  const { team } = useTeam();
  const { members } = useTeamMembers(team?.id);
  const { attentionPreferences } = useTimelineContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<string>('');
  const [trustLevel, setTrustLevel] = useState<TrustLevel>('experienced');
  const [contextNotes, setContextNotes] = useState('');

  const availableMembers = members?.filter(member =>
    member.user_id !== item.assigned_to && member.user_id !== item.user_id
  ) || [];

  // Role-based delegation analysis
  const delegationAnalysis = useMemo(() => {
    if (!attentionPreferences) {
      return {
        isDelegatable: item.attention_type === 'create' || item.attention_type === 'review',
        roleRecommendation: 'Consider delegation for efficiency',
        optimizationPotential: 'medium',
        reasoning: 'Standard delegation assessment',
      };
    }

    const currentRole = attentionPreferences.current_role;
    const rules = ROLE_OPTIMIZATION_RULES[currentRole];
    const isHighPriority = item.priority && item.priority >= 5;
    const isNonNegotiable = item.is_non_negotiable;
    const isLongTask = item.duration_minutes > (rules?.delegationThreshold || 60);

    let isDelegatable = false;
    let roleRecommendation = '';
    let optimizationPotential: 'high' | 'medium' | 'low' = 'low';
    let reasoning = '';

    switch (currentRole) {
      case ROLE_MODES.MULTIPLIER:
        // Multipliers should delegate most work except strategic activities
        isDelegatable = item.attention_type === 'create' || item.attention_type === 'review';
        if (isLongTask) {
          optimizationPotential = 'high';
          roleRecommendation = 'Strong delegation candidate - frees you for strategic work';
          reasoning = `Multipliers excel by enabling others. Tasks over ${rules?.delegationThreshold}min should be delegated.`;
        } else if (item.attention_type === 'create') {
          optimizationPotential = 'medium';
          roleRecommendation = 'Consider delegation to focus on team enablement';
          reasoning = 'Creation work can be delegated unless strategically critical.';
        } else {
          optimizationPotential = 'low';
          roleRecommendation = 'Quick task - may be efficient to complete yourself';
          reasoning = 'Short tasks may not benefit from delegation overhead.';
        }
        break;

      case ROLE_MODES.MARKER:
        // Markers should delegate execution work but keep decision-making
        isDelegatable = item.attention_type === 'create' || item.attention_type === 'review';
        if (item.attention_type === 'decide') {
          isDelegatable = false;
          roleRecommendation = 'Keep decision-making work - core to Marker role';
          reasoning = 'Markers should retain decision authority and strategic choices.';
        } else if (isLongTask) {
          optimizationPotential = 'high';
          roleRecommendation = 'Delegate execution to focus on decisions';
          reasoning = 'Delegating execution preserves decision-making capacity.';
        } else {
          optimizationPotential = 'medium';
          roleRecommendation = 'Consider delegation to protect decision energy';
          reasoning = 'Even small execution tasks can drain decision-making capacity.';
        }
        break;

      case ROLE_MODES.MAKER:
        // Makers should be selective about delegation - keep create work, delegate admin
        isDelegatable = item.attention_type === 'review' || item.attention_type === 'recover';
        if (item.attention_type === 'create') {
          isDelegatable = false;
          roleRecommendation = 'Keep creative work - core to Maker productivity';
          reasoning = 'Makers achieve most value through personal creative output.';
        } else if (item.attention_type === 'review') {
          optimizationPotential = 'high';
          roleRecommendation = 'Strong delegation candidate - protects focus time';
          reasoning = 'Review work interrupts deep focus and can often be delegated.';
        } else {
          optimizationPotential = 'medium';
          roleRecommendation = 'Consider delegation to minimize interruptions';
          reasoning = 'Administrative tasks fragment maker focus time.';
        }
        break;

      default:
        isDelegatable = item.attention_type === 'create' || item.attention_type === 'review';
        roleRecommendation = 'Standard delegation assessment';
        reasoning = 'General delegation guidelines apply.';
    }

    // Adjust for item characteristics
    if (isNonNegotiable && optimizationPotential === 'high') {
      optimizationPotential = 'medium';
      roleRecommendation += ' (with careful handoff due to priority)';
    }

    return {
      isDelegatable,
      roleRecommendation,
      optimizationPotential,
      reasoning,
      isHighPriority,
      isNonNegotiable,
      isLongTask,
    };
  }, [item, attentionPreferences]);

  if (!team || availableMembers.length === 0) {
    return null;
  }

  const handleDelegate = () => {
    if (!selectedDelegate) {
      toast.error('Please select a team member to delegate to');
      return;
    }

    const delegateInfo: DelegationInfo = {
      delegate_id: selectedDelegate,
      trust_level: trustLevel,
      context_notes: contextNotes,
      follow_up_type: getFollowUpType(trustLevel),
      follow_up_scheduled_at: calculateFollowUpTime()
    };

    onDelegate?.(item, delegateInfo);
    setIsOpen(false);

    // Reset form
    setSelectedDelegate('');
    setContextNotes('');
    setTrustLevel('experienced');

    toast.success(`"${item.title}" delegated successfully`);
  };

  const getFollowUpType = (trust: TrustLevel) => {
    switch (trust) {
      case 'new': return 'work_alongside';
      case 'experienced': return 'review_steps';
      case 'expert': return 'unblock_context';
      default: return 'review_steps';
    }
  };

  const calculateFollowUpTime = (): string => {
    const now = new Date();
    const followUpHours = trustLevel === 'new' ? 2 : trustLevel === 'experienced' ? 24 : 72;
    const followUpTime = new Date(now.getTime() + followUpHours * 60 * 60 * 1000);
    return followUpTime.toISOString();
  };

  const getTrustLevelDescription = (level: TrustLevel) => {
    switch (level) {
      case 'new':
        return 'New team member - requires close guidance';
      case 'experienced':
        return 'Experienced with this type of work - periodic check-ins';
      case 'expert':
        return 'Expert level - minimal oversight needed';
      default:
        return '';
    }
  };

  const getFollowUpDescription = (trust: TrustLevel) => {
    switch (trust) {
      case 'new':
        return 'Schedule "work alongside" session in 2 hours';
      case 'experienced':
        return 'Schedule "review steps" check-in in 24 hours';
      case 'expert':
        return 'Schedule "unblock/provide context" session in 72 hours';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !delegationAnalysis.isDelegatable}
          className={`gap-2 ${className || ''}`}
        >
          <Users className="h-3 w-3" />
          <span className="hidden sm:inline">Delegate</span>
          {delegationAnalysis.optimizationPotential === 'high' && (
            <Badge variant="default" className="ml-1 text-xs">
              <TrendingUp className="h-2 w-2 mr-1" />
              Recommended
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Delegate Task
          </DialogTitle>
          <DialogDescription>
            Hand off "{item.title}" to a team member with appropriate follow-up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role-based delegation insight */}
          <Alert className={`border-l-4 ${
            delegationAnalysis.optimizationPotential === 'high' ? 'border-green-500' :
            delegationAnalysis.optimizationPotential === 'medium' ? 'border-yellow-500' :
            'border-gray-300'
          }`}>
            <div className="flex items-start gap-2">
              {delegationAnalysis.optimizationPotential === 'high' ? (
                <Zap className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {attentionPreferences?.current_role ?
                    `${attentionPreferences.current_role.charAt(0).toUpperCase() + attentionPreferences.current_role.slice(1)} Mode Analysis` :
                    'Delegation Analysis'
                  }
                </div>
                <AlertDescription className="mt-1">
                  <p className="text-sm">{delegationAnalysis.roleRecommendation}</p>
                  <p className="text-xs text-muted-foreground mt-1">{delegationAnalysis.reasoning}</p>
                </AlertDescription>
              </div>
              {delegationAnalysis.optimizationPotential === 'high' && (
                <Badge variant="default" className="text-xs">
                  High Impact
                </Badge>
              )}
            </div>
          </Alert>

          {/* Warning for high-priority/non-negotiable items */}
          {(delegationAnalysis.isNonNegotiable || delegationAnalysis.isHighPriority) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {delegationAnalysis.isNonNegotiable && <p>This is a non-negotiable item.</p>}
                {delegationAnalysis.isHighPriority && <p>This is a high-priority item (Level {item.priority}).</p>}
                <p>Ensure thorough handoff and clear accountability.</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Task info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Badge variant={item.attention_type === 'create' ? 'default' : 'secondary'}>
                {item.attention_type}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {item.duration_minutes || 60} min
              </div>
            </div>
            <p className="text-sm">{item.title}</p>
          </div>

          {/* Team member selection */}
          <div className="space-y-2">
            <Label htmlFor="delegate-select">Delegate to</Label>
            <Select value={selectedDelegate} onValueChange={setSelectedDelegate}>
              <SelectTrigger id="delegate-select">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <span>{member.user?.user_metadata?.full_name || member.user?.email || 'Team Member'}</span>
                      {member.role && (
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trust level selection */}
          <div className="space-y-2">
            <Label htmlFor="trust-level">Trust Level</Label>
            <Select value={trustLevel} onValueChange={(value) => setTrustLevel(value as TrustLevel)}>
              <SelectTrigger id="trust-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['new', 'experienced', 'expert'] as TrustLevel[]).map((level) => (
                  <SelectItem key={level} value={level}>
                    <div className="space-y-1">
                      <div className="font-medium capitalize">{level}</div>
                      <div className="text-xs text-muted-foreground">
                        {getTrustLevelDescription(level)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getFollowUpDescription(trustLevel)}
            </p>
          </div>

          {/* Context notes */}
          <div className="space-y-2">
            <Label htmlFor="context-notes">Context & Instructions</Label>
            <Textarea
              id="context-notes"
              placeholder="Provide context, background, and specific instructions for the delegated work..."
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground">
              Help your team member succeed by providing clear context and expectations.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-4">
            <Button
              onClick={handleDelegate}
              className="flex-1"
              disabled={!selectedDelegate}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Delegate Task
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}