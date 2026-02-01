// Component for visualizing decision batching opportunities in Marker mode
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TimelineItem } from '@/lib/timelineUtils';
import { ATTENTION_TYPES } from '@/lib/attentionTypes';
import { Brain, Target, AlertTriangle } from 'lucide-react';

interface DecisionBatchIndicatorProps {
  items: TimelineItem[];
  currentDate: Date;
  onSuggestBatching?: (items: TimelineItem[]) => void;
}

interface DecisionGroup {
  items: TimelineItem[];
  totalDuration: number;
  timeSpan: number;
  isOptimal: boolean;
}

export function DecisionBatchIndicator({
  items,
  currentDate,
  onSuggestBatching
}: DecisionBatchIndicatorProps) {
  // Filter decision events for the current date
  const decisionEvents = items.filter(item =>
    item.attention_type === ATTENTION_TYPES.DECIDE &&
    new Date(item.start_time).toDateString() === currentDate.toDateString()
  );

  if (decisionEvents.length === 0) {
    return null;
  }

  // Analyze decision clustering
  const decisionGroups = analyzeDecisionClustering(decisionEvents);
  const totalDecisions = decisionEvents.length;
  const isolatedDecisions = decisionGroups.filter(group => group.items.length === 1);
  const batchableDecisions = isolatedDecisions.length;

  if (totalDecisions <= 1) {
    return null;
  }

  // Determine overall status
  const status = batchableDecisions === 0 ? 'good' :
                 batchableDecisions <= 2 ? 'warning' : 'critical';

  const statusConfig = {
    good: {
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: Target,
      message: 'Well-batched decisions'
    },
    warning: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: AlertTriangle,
      message: 'Some decisions could be batched'
    },
    critical: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: AlertTriangle,
      message: 'Many isolated decisions detected'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={`p-3 rounded-lg border ${config.color}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Decision Batching</span>
          <Badge variant="outline" className="text-xs">
            {totalDecisions} decisions today
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs">
          {config.message}
          {batchableDecisions > 0 && (
            <span className="ml-1">
              ({batchableDecisions} isolated decision{batchableDecisions !== 1 ? 's' : ''})
            </span>
          )}
        </p>

        {batchableDecisions > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Benefits of batching: Reduced decision fatigue, better context, improved quality
            </p>

            {onSuggestBatching && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => onSuggestBatching(isolatedDecisions.flatMap(g => g.items))}
              >
                <Brain className="h-3 w-3 mr-1" />
                Suggest Batching
              </Button>
            )}
          </div>
        )}

        {/* Show decision groups */}
        <div className="flex flex-wrap gap-1 mt-2">
          {decisionGroups.map((group, index) => (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={group.isOptimal ? "default" : "secondary"}
                    className="text-xs cursor-help"
                  >
                    {group.items.length} decision{group.items.length !== 1 ? 's' : ''}
                    {group.items.length > 1 && (
                      <span className="ml-1">
                        ({Math.round(group.timeSpan / 60)}h span)
                      </span>
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {group.isOptimal ? 'Optimal Batch' : 'Isolated Decisions'}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="text-xs">
                          {new Date(item.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} - {item.title}
                        </div>
                      ))}
                    </div>
                    {group.items.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Total: {group.totalDuration} min
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Analyze decision events to identify batching opportunities
 */
function analyzeDecisionClustering(decisionEvents: TimelineItem[]): DecisionGroup[] {
  if (decisionEvents.length === 0) return [];

  // Sort by start time
  const sortedEvents = [...decisionEvents].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const groups: DecisionGroup[] = [];
  let currentGroup: TimelineItem[] = [];
  let lastEventEnd = 0;

  // Group decisions that are within 2 hours of each other
  const MAX_GAP_MINUTES = 120;

  for (const event of sortedEvents) {
    const eventStart = new Date(event.start_time).getTime();
    const gapMinutes = currentGroup.length > 0 ?
      (eventStart - lastEventEnd) / (1000 * 60) : 0;

    if (currentGroup.length === 0 || gapMinutes <= MAX_GAP_MINUTES) {
      // Add to current group
      currentGroup.push(event);
      lastEventEnd = eventStart + (event.duration_minutes || 30) * 60 * 1000;
    } else {
      // Close current group and start new one
      if (currentGroup.length > 0) {
        groups.push(createDecisionGroup(currentGroup));
      }
      currentGroup = [event];
      lastEventEnd = eventStart + (event.duration_minutes || 30) * 60 * 1000;
    }
  }

  // Add final group
  if (currentGroup.length > 0) {
    groups.push(createDecisionGroup(currentGroup));
  }

  return groups;
}

function createDecisionGroup(items: TimelineItem[]): DecisionGroup {
  const firstEvent = items[0];
  const lastEvent = items[items.length - 1];

  const startTime = new Date(firstEvent.start_time).getTime();
  const endTime = new Date(lastEvent.start_time).getTime() +
    (lastEvent.duration_minutes || 30) * 60 * 1000;

  const totalDuration = items.reduce((total, item) =>
    total + (item.duration_minutes || 30), 0);

  const timeSpan = (endTime - startTime) / (1000 * 60); // minutes

  // Consider a group optimal if:
  // - Has 2+ decisions AND time span is reasonable (≤ 3 hours)
  // - OR is a single non-negotiable decision (acceptable to be isolated)
  const isOptimal = items.length >= 2 ? timeSpan <= 180 :
    items[0].is_non_negotiable || items[0].priority === 5;

  return {
    items,
    totalDuration,
    timeSpan,
    isOptimal
  };
}