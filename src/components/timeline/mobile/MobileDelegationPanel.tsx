import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGestures } from '@/hooks/useGestures';
import { TimelineItem } from '@/lib/timelineUtils';
import { TrustLevel } from '@/lib/attentionTypes';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Vibrate, VoiceInput } from '@/lib/haptics';
import {
  Users,
  ArrowRight,
  Clock,
  AlertCircle,
  Mic,
  MicOff,
  Star,
  StarHalf,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface MobileDelegationPanelProps {
  item: TimelineItem;
  onDelegate?: (delegatedItem: TimelineItem, delegateInfo: DelegationInfo) => void;
  disabled?: boolean;
  className?: string;
  trigger?: React.ReactNode;
}

export interface DelegationInfo {
  delegate_id: string;
  trust_level: TrustLevel;
  context_notes: string;
  follow_up_type: 'work_alongside' | 'review_steps' | 'unblock_context';
  follow_up_scheduled_at?: string;
}

export function MobileDelegationPanel({
  item,
  onDelegate,
  disabled = false,
  className,
  trigger
}: MobileDelegationPanelProps) {
  const { team } = useTeam();
  const { members } = useTeamMembers(team?.id);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<string>('');
  const [trustLevel, setTrustLevel] = useState<TrustLevel>('experienced');
  const [contextNotes, setContextNotes] = useState('');
  const [isVoiceInput, setIsVoiceInput] = useState(false);

  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const availableMembers = members?.filter(member =>
    member.user_id !== item.assigned_to && member.user_id !== item.user_id
  ) || [];

  // Handle swipe gestures for quick delegation
  const { isGesturing } = useGestures([
    {
      type: 'swipe',
      action: 'delegate',
      callback: (gesture) => {
        if (!isOpen) return;

        if (gesture.direction === 'up' && selectedDelegate) {
          // Quick delegate with current settings
          handleQuickDelegate();
        } else if (gesture.direction === 'left') {
          // Previous team member
          const currentIndex = availableMembers.findIndex(m => m.user_id === selectedDelegate);
          if (currentIndex > 0) {
            setSelectedDelegate(availableMembers[currentIndex - 1].user_id);
            Vibrate.selection();
          }
        } else if (gesture.direction === 'right') {
          // Next team member
          const currentIndex = availableMembers.findIndex(m => m.user_id === selectedDelegate);
          if (currentIndex < availableMembers.length - 1) {
            setSelectedDelegate(availableMembers[currentIndex + 1].user_id);
            Vibrate.selection();
          }
        }
      }
    },
    {
      type: 'longpress',
      action: 'edit',
      callback: () => {
        if (isOpen && !isVoiceInput) {
          startVoiceInput();
        }
      }
    }
  ]);

  if (!team || availableMembers.length === 0 || !isMobile) {
    return null;
  }

  // Check if this item is suitable for delegation
  const isDelegatable = item.attention_type === 'create' || item.attention_type === 'review';
  const isHighPriority = item.priority && item.priority >= 5;
  const isNonNegotiable = item.is_non_negotiable;
  const shouldWarnAboutDelegation = isHighPriority || isNonNegotiable;

  const startVoiceInput = async () => {
    try {
      setIsVoiceInput(true);
      Vibrate.heavy();

      const transcript = await VoiceInput.start({
        language: 'en-US',
        continuous: true,
        maxDuration: 30000 // 30 seconds
      });

      if (transcript) {
        setContextNotes(prev => prev ? `${prev}\n${transcript}` : transcript);
        toast.success('Voice input added');
      }
    } catch (error) {
      console.error('Voice input failed:', error);
      toast.error('Voice input failed');
    } finally {
      setIsVoiceInput(false);
    }
  };

  const handleQuickDelegate = () => {
    if (!selectedDelegate) {
      toast.error('Please select a team member to delegate to');
      Vibrate.error();
      return;
    }

    handleDelegate();
  };

  const handleDelegate = () => {
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

    Vibrate.success();
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

  const getTrustLevelIcon = (level: TrustLevel) => {
    switch (level) {
      case 'new': return <User className="h-4 w-4" />;
      case 'experienced': return <StarHalf className="h-4 w-4" />;
      case 'expert': return <Star className="h-4 w-4" />;
    }
  };

  const getTrustLevelDescription = (level: TrustLevel) => {
    switch (level) {
      case 'new':
        return 'New team member - requires close guidance and frequent check-ins';
      case 'experienced':
        return 'Experienced with this type of work - periodic check-ins needed';
      case 'expert':
        return 'Expert level - minimal oversight required, autonomous execution';
    }
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || !isDelegatable}
      className={`gap-2 rounded-xl shadow-neu-flat hover:shadow-neu-raised transition-all duration-150 ${className || ''}`}
    >
      <Users className="h-4 w-4" />
      <span>Delegate</span>
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Delegate Task
          </SheetTitle>
          <SheetDescription>
            Hand off "{item.title}" to a team member with appropriate follow-up
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-6 h-full pb-20">
          <div className="space-y-6">
            {/* Warning for high-priority/non-negotiable items */}
            {shouldWarnAboutDelegation && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <div className="text-sm text-orange-700">
                      {isNonNegotiable && <p className="font-medium">This is a non-negotiable item.</p>}
                      {isHighPriority && <p className="font-medium">This is a high-priority item (Level {item.priority}).</p>}
                      <p>Consider if delegation is appropriate and provide extra context.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task info */}
            <Card className="border-2 border-muted">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    variant={item.attention_type === 'create' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {item.attention_type}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {item.duration_minutes || 60} min
                  </div>
                </div>
                <p className="font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                )}
              </CardContent>
            </Card>

            {/* Team member selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Team Member</Label>
              <p className="text-sm text-muted-foreground">
                Swipe left/right to navigate team members
              </p>
              <div className="grid gap-3">
                {availableMembers.map((member) => (
                  <Card
                    key={member.user_id}
                    className={`
                      cursor-pointer transition-all duration-200 border-2
                      ${selectedDelegate === member.user_id
                        ? 'border-primary shadow-neu-pressed bg-primary/5'
                        : 'border-transparent shadow-neu-flat hover:shadow-neu-raised'
                      }
                    `}
                    onClick={() => {
                      setSelectedDelegate(member.user_id);
                      Vibrate.selection();
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {member.user?.user_metadata?.full_name || member.user?.email || 'Team Member'}
                          </div>
                          {member.role && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {member.role}
                            </Badge>
                          )}
                        </div>
                        {selectedDelegate === member.user_id && (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Trust level selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Trust Level</Label>
              <div className="grid gap-3">
                {(['new', 'experienced', 'expert'] as TrustLevel[]).map((level) => (
                  <Card
                    key={level}
                    className={`
                      cursor-pointer transition-all duration-200 border-2
                      ${trustLevel === level
                        ? 'border-primary shadow-neu-pressed bg-primary/5'
                        : 'border-transparent shadow-neu-flat hover:shadow-neu-raised'
                      }
                    `}
                    onClick={() => {
                      setTrustLevel(level);
                      Vibrate.selection();
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {getTrustLevelIcon(level)}
                        <div className="flex-1">
                          <div className="font-medium capitalize">{level}</div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getTrustLevelDescription(level)}
                          </p>
                        </div>
                        {trustLevel === level && (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Context notes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Context & Instructions</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startVoiceInput}
                  disabled={isVoiceInput}
                  className="gap-2"
                >
                  {isVoiceInput ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      <span>Voice</span>
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                ref={textareaRef}
                placeholder="Provide context, background, and specific instructions for the delegated work... (Long press for voice input)"
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                className="min-h-24 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Help your team member succeed by providing clear context and expectations.
                Long press the text area for voice input.
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Bottom Action */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDelegate}
              className="flex-1 gap-2 h-12 rounded-xl"
              disabled={!selectedDelegate}
            >
              <ArrowRight className="h-5 w-5" />
              Delegate Task
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="h-12 px-4 rounded-xl"
            >
              Cancel
            </Button>
          </div>
          {selectedDelegate && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Swipe up on this panel to quick delegate
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}