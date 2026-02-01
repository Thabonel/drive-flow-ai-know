// Component for warning about focus block fragmentation
import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TimelineItem } from '@/lib/timelineUtils';
import { ATTENTION_TYPES, RoleMode, ROLE_MODES } from '@/lib/attentionTypes';
import { MakerModeBehaviors, FocusBlock } from '@/lib/roleBasedBehaviors';
import {
  AlertTriangle,
  Shield,
  Clock,
  Target,
  ArrowRight,
  Lightbulb
} from 'lucide-react';

interface FocusProtectionAlertProps {
  newEvent: {
    start_time: string;
    duration_minutes: number;
    attention_type: string;
    title?: string;
  };
  existingItems: TimelineItem[];
  currentRole?: RoleMode;
  onSuggestAlternative?: (suggestion: AlternativeScheduling) => void;
  onProceedAnyway?: () => void;
  showDialog?: boolean;
}

interface AlternativeScheduling {
  suggestedStartTime: string;
  reason: string;
  benefitDescription: string;
  protectedFocusBlock: FocusBlock;
}

interface FragmentationAnalysis {
  willFragment: boolean;
  affectedFocusBlocks: FocusBlock[];
  fragmentationType: 'minor' | 'moderate' | 'severe';
  alternativeTimes: AlternativeScheduling[];
  impactDescription: string;
}

export function FocusProtectionAlert({
  newEvent,
  existingItems,
  currentRole = ROLE_MODES.MAKER,
  onSuggestAlternative,
  onProceedAnyway,
  showDialog = false
}: FocusProtectionAlertProps) {

  const analysis = useMemo(() =>
    analyzeFocusFragmentation(newEvent, existingItems),
    [newEvent, existingItems]
  );

  // Only show for roles that care about focus protection (primarily Makers)
  if (currentRole !== ROLE_MODES.MAKER || !analysis.willFragment) {
    return null;
  }

  const severityConfig = {
    minor: {
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600'
    },
    moderate: {
      color: 'bg-orange-50 border-orange-200 text-orange-800',
      icon: AlertTriangle,
      iconColor: 'text-orange-600'
    },
    severe: {
      color: 'bg-red-50 border-red-200 text-red-800',
      icon: Shield,
      iconColor: 'text-red-600'
    }
  };

  const config = severityConfig[analysis.fragmentationType];
  const AlertIcon = config.icon;

  if (showDialog) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Shield className="h-4 w-4" />
            Focus Protection
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertIcon className={`h-5 w-5 ${config.iconColor}`} />
              Focus Block Fragmentation Warning
            </DialogTitle>
            <DialogDescription>
              This scheduling will interrupt existing focus time.
            </DialogDescription>
          </DialogHeader>
          <FocusProtectionContent
            analysis={analysis}
            onSuggestAlternative={onSuggestAlternative}
            onProceedAnyway={onProceedAnyway}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Alert className={config.color}>
      <AlertIcon className={`h-4 w-4 ${config.iconColor}`} />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <strong>Focus Protection Warning:</strong> {analysis.impactDescription}
          </div>

          {analysis.alternativeTimes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Alternative scheduling options:</p>
              <div className="space-y-1">
                {analysis.alternativeTimes.slice(0, 2).map((alternative, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded border">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {new Date(alternative.suggestedStartTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {alternative.reason}
                      </div>
                    </div>
                    {onSuggestAlternative && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSuggestAlternative(alternative)}
                        className="ml-2 h-7 text-xs"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Maker mode prioritizes uninterrupted deep work
            </div>
            {onProceedAnyway && (
              <Button variant="outline" size="sm" onClick={onProceedAnyway}>
                Schedule Anyway
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function FocusProtectionContent({
  analysis,
  onSuggestAlternative,
  onProceedAnyway
}: {
  analysis: FragmentationAnalysis;
  onSuggestAlternative?: (suggestion: AlternativeScheduling) => void;
  onProceedAnyway?: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Impact analysis */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Impact Analysis</h4>
        <p className="text-sm text-muted-foreground mb-3">{analysis.impactDescription}</p>

        <div className="space-y-2">
          {analysis.affectedFocusBlocks.map((block, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white border rounded">
              <div>
                <div className="text-sm font-medium">
                  {new Date(block.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {new Date(block.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(block.durationMinutes / 60 * 10) / 10}h {block.attentionType} block
                </div>
              </div>
              <Badge variant={block.durationMinutes >= 120 ? "default" : "secondary"}>
                <Target className="h-3 w-3 mr-1" />
                Focus Time
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Alternative suggestions */}
      {analysis.alternativeTimes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Suggested Alternatives
          </h4>
          <div className="space-y-2">
            {analysis.alternativeTimes.map((alternative, index) => (
              <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">
                    {new Date(alternative.suggestedStartTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })} - {new Date(alternative.suggestedStartTime).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  {onSuggestAlternative && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSuggestAlternative(alternative)}
                      className="h-7"
                    >
                      Use This Time
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">{alternative.reason}</p>
                <p className="text-xs text-green-600">{alternative.benefitDescription}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-4 border-t">
        {onProceedAnyway && (
          <Button variant="outline" onClick={onProceedAnyway} className="flex-1">
            <Clock className="h-4 w-4 mr-2" />
            Schedule Anyway
          </Button>
        )}
        <div className="text-xs text-muted-foreground">
          Protecting focus time improves deep work quality
        </div>
      </div>
    </div>
  );
}

function analyzeFocusFragmentation(
  newEvent: { start_time: string; duration_minutes: number; attention_type: string; title?: string },
  existingItems: TimelineItem[]
): FragmentationAnalysis {

  const eventStart = new Date(newEvent.start_time);
  const eventEnd = new Date(eventStart.getTime() + newEvent.duration_minutes * 60000);

  // Identify existing focus blocks
  const focusBlocks = MakerModeBehaviors.identifyFocusBlocks(existingItems);

  // Find blocks that would be fragmented
  const affectedBlocks = focusBlocks.filter(block => {
    const blockStart = new Date(block.startTime);
    const blockEnd = new Date(block.endTime);

    // Check if this is a significant focus block worth protecting
    if (block.attentionType !== ATTENTION_TYPES.CREATE || block.durationMinutes < 120) {
      return false;
    }

    // Check for overlap
    return (eventStart < blockEnd && eventEnd > blockStart);
  });

  if (affectedBlocks.length === 0) {
    return {
      willFragment: false,
      affectedFocusBlocks: [],
      fragmentationType: 'minor',
      alternativeTimes: [],
      impactDescription: ''
    };
  }

  // Determine fragmentation severity
  const fragmentationType = determineFragmentationSeverity(affectedBlocks, newEvent);

  // Generate impact description
  const impactDescription = generateImpactDescription(affectedBlocks, newEvent);

  // Generate alternative scheduling suggestions
  const alternativeTimes = generateAlternativeScheduling(newEvent, affectedBlocks, existingItems);

  return {
    willFragment: true,
    affectedFocusBlocks: affectedBlocks,
    fragmentationType,
    alternativeTimes,
    impactDescription
  };
}

function determineFragmentationSeverity(
  affectedBlocks: FocusBlock[],
  newEvent: { duration_minutes: number }
): 'minor' | 'moderate' | 'severe' {

  const totalAffectedDuration = affectedBlocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  const longestBlock = Math.max(...affectedBlocks.map(block => block.durationMinutes));

  // Severe: Long meeting interrupting multiple or very long focus blocks
  if ((newEvent.duration_minutes >= 60 && affectedBlocks.length > 1) ||
      (longestBlock >= 240 && newEvent.duration_minutes >= 30)) {
    return 'severe';
  }

  // Moderate: Significant interruption to focus time
  if (newEvent.duration_minutes >= 30 || totalAffectedDuration >= 180) {
    return 'moderate';
  }

  // Minor: Small interruption
  return 'minor';
}

function generateImpactDescription(
  affectedBlocks: FocusBlock[],
  newEvent: { duration_minutes: number; title?: string }
): string {

  const totalFocusTime = affectedBlocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  const eventTitle = newEvent.title || 'This event';

  if (affectedBlocks.length === 1) {
    const block = affectedBlocks[0];
    return `${eventTitle} (${newEvent.duration_minutes}m) will fragment a ${Math.round(block.durationMinutes / 60 * 10) / 10}h focus block. This may reduce deep work effectiveness.`;
  }

  return `${eventTitle} (${newEvent.duration_minutes}m) will fragment ${affectedBlocks.length} focus blocks totaling ${Math.round(totalFocusTime / 60 * 10) / 10}h. Consider batching interruptions or rescheduling.`;
}

function generateAlternativeScheduling(
  newEvent: { start_time: string; duration_minutes: number },
  affectedBlocks: FocusBlock[],
  existingItems: TimelineItem[]
): AlternativeScheduling[] {

  const alternatives: AlternativeScheduling[] = [];
  const eventDate = new Date(newEvent.start_time);

  // Strategy 1: Schedule before the focus blocks
  for (const block of affectedBlocks) {
    const blockStart = new Date(block.startTime);
    const suggestedStart = new Date(blockStart.getTime() - (newEvent.duration_minutes + 15) * 60000);

    // Check if this time slot is available
    if (suggestedStart > new Date() && isTimeSlotAvailable(suggestedStart, newEvent.duration_minutes, existingItems)) {
      alternatives.push({
        suggestedStartTime: suggestedStart.toISOString(),
        reason: `Schedule before ${Math.round(block.durationMinutes / 60 * 10) / 10}h focus block`,
        benefitDescription: `Preserves uninterrupted deep work time`,
        protectedFocusBlock: block
      });
    }
  }

  // Strategy 2: Schedule after the focus blocks
  for (const block of affectedBlocks) {
    const blockEnd = new Date(block.endTime);
    const suggestedStart = new Date(blockEnd.getTime() + 15 * 60000); // 15min buffer

    if (isTimeSlotAvailable(suggestedStart, newEvent.duration_minutes, existingItems)) {
      alternatives.push({
        suggestedStartTime: suggestedStart.toISOString(),
        reason: `Schedule after ${Math.round(block.durationMinutes / 60 * 10) / 10}h focus block`,
        benefitDescription: `Allows completion of deep work before switching context`,
        protectedFocusBlock: block
      });
    }
  }

  // Strategy 3: Schedule on a different day if no same-day options
  if (alternatives.length === 0) {
    const nextDay = new Date(eventDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(9, 0, 0, 0); // Default to 9 AM next day

    alternatives.push({
      suggestedStartTime: nextDay.toISOString(),
      reason: 'Schedule on next available day',
      benefitDescription: 'Preserves today\'s focus blocks and provides fresh context tomorrow',
      protectedFocusBlock: affectedBlocks[0]
    });
  }

  // Sort by proximity to original time and limit to 3 suggestions
  return alternatives
    .sort((a, b) => {
      const aTime = Math.abs(new Date(a.suggestedStartTime).getTime() - eventDate.getTime());
      const bTime = Math.abs(new Date(b.suggestedStartTime).getTime() - eventDate.getTime());
      return aTime - bTime;
    })
    .slice(0, 3);
}

function isTimeSlotAvailable(
  startTime: Date,
  durationMinutes: number,
  existingItems: TimelineItem[]
): boolean {

  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  return !existingItems.some(item => {
    const itemStart = new Date(item.start_time);
    const itemEnd = new Date(itemStart.getTime() + (item.duration_minutes || 0) * 60000);

    // Check for overlap
    return startTime < itemEnd && endTime > itemStart;
  });
}