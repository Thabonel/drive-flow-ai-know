import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingDown,
  ArrowRight,
  Clock,
  RefreshCw,
  Zap,
  Target,
  Brain,
  ChevronRight
} from 'lucide-react';
import { TimelineItem } from '@/lib/timelineUtils';
import {
  UserAttentionPreferences,
  ATTENTION_TYPE_DESCRIPTIONS,
  calculateContextSwitchCost,
  AttentionType
} from '@/lib/attentionTypes';
import { format, isToday } from 'date-fns';

interface ContextSwitchWarningProps {
  items: TimelineItem[];
  preferences: UserAttentionPreferences | null;
  currentDate: Date;
  onBatchSuggestion?: (batchItems: TimelineItem[], targetTime?: string) => void;
  onOptimizeSchedule?: () => void;
  compact?: boolean;
  className?: string;
}

interface SwitchPoint {
  time: string;
  fromItem: TimelineItem;
  toItem: TimelineItem;
  fromType: AttentionType;
  toType: AttentionType;
  cost: number;
  severity: 'low' | 'medium' | 'high';
}

interface BatchingSuggestion {
  attentionType: AttentionType;
  items: TimelineItem[];
  currentSwitches: number;
  potentialReduction: number;
  suggestedTimeSlot?: string;
}

export function ContextSwitchWarning({
  items,
  preferences,
  currentDate,
  onBatchSuggestion,
  onOptimizeSchedule,
  compact = false,
  className = ''
}: ContextSwitchWarningProps) {

  const switchAnalysis = useMemo(() => {
    if (!preferences) return null;

    const targetDate = currentDate.toISOString().split('T')[0];

    // Filter and sort items for the target date
    const dayItems = items
      .filter(item => {
        const itemDate = new Date(item.start_time).toISOString().split('T')[0];
        return itemDate === targetDate && item.attention_type;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (dayItems.length < 2) return null;

    const switches: SwitchPoint[] = [];
    let totalCost = 0;

    // Calculate all context switches
    for (let i = 1; i < dayItems.length; i++) {
      const fromItem = dayItems[i - 1];
      const toItem = dayItems[i];

      if (fromItem.attention_type && toItem.attention_type &&
          fromItem.attention_type !== toItem.attention_type) {

        const cost = calculateContextSwitchCost(
          fromItem.attention_type,
          toItem.attention_type,
          preferences.current_role
        );

        const severity = cost >= 8 ? 'high' : cost >= 5 ? 'medium' : 'low';

        switches.push({
          time: toItem.start_time,
          fromItem,
          toItem,
          fromType: fromItem.attention_type,
          toType: toItem.attention_type,
          cost,
          severity
        });

        totalCost += cost;
      }
    }

    const budgetLimit = preferences.attention_budgets.context_switches || 3;
    const isOverBudget = switches.length > budgetLimit;
    const costScore = Math.min(100, Math.round(totalCost * 10));

    return {
      switches,
      totalSwitches: switches.length,
      totalCost,
      costScore,
      budgetLimit,
      isOverBudget,
      dayItems
    };
  }, [items, preferences, currentDate]);

  const batchingSuggestions = useMemo((): BatchingSuggestion[] => {
    if (!switchAnalysis) return [];

    // Group items by attention type
    const itemsByType = new Map<AttentionType, TimelineItem[]>();
    switchAnalysis.dayItems.forEach(item => {
      if (item.attention_type) {
        if (!itemsByType.has(item.attention_type)) {
          itemsByType.set(item.attention_type, []);
        }
        itemsByType.get(item.attention_type)!.push(item);
      }
    });

    const suggestions: BatchingSuggestion[] = [];

    // Find types with multiple scattered instances
    itemsByType.forEach((typeItems, attentionType) => {
      if (typeItems.length >= 2) {
        // Calculate current switches for this type
        let currentSwitches = 0;
        for (const switchPoint of switchAnalysis.switches) {
          if (switchPoint.fromType === attentionType || switchPoint.toType === attentionType) {
            currentSwitches++;
          }
        }

        // Calculate potential reduction if batched
        const potentialReduction = Math.max(0, currentSwitches - 1);

        if (potentialReduction > 0) {
          // Suggest time slot (earliest item's time)
          const earliestTime = typeItems[0].start_time;

          suggestions.push({
            attentionType,
            items: typeItems,
            currentSwitches,
            potentialReduction,
            suggestedTimeSlot: earliestTime
          });
        }
      }
    });

    // Sort by potential reduction (highest first)
    return suggestions.sort((a, b) => b.potentialReduction - a.potentialReduction);
  }, [switchAnalysis]);

  if (!switchAnalysis || !preferences) {
    return null;
  }

  const showWarning = switchAnalysis.isOverBudget || switchAnalysis.costScore >= 70;
  const isToday_ = isToday(currentDate);
  const dateLabel = isToday_ ? 'Today' : format(currentDate, 'MMM d');

  if (!showWarning && batchingSuggestions.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main context switch warning */}
      {showWarning && (
        <Alert variant={switchAnalysis.costScore >= 80 ? 'destructive' : 'default'}>
          <TrendingDown className="h-4 w-4" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">High Context Switching Detected</span>
              <Badge
                variant={switchAnalysis.costScore >= 80 ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                Cost Score: {switchAnalysis.costScore}/100
              </Badge>
            </div>

            <AlertDescription>
              {dateLabel} you have {switchAnalysis.totalSwitches} context switches
              ({switchAnalysis.totalSwitches - switchAnalysis.budgetLimit} over your budget of {switchAnalysis.budgetLimit}).
              This may reduce your focus effectiveness.
            </AlertDescription>

            <div className="flex gap-2 mt-3">
              {onOptimizeSchedule && (
                <Button size="sm" variant="outline" onClick={onOptimizeSchedule}>
                  <Brain className="h-3 w-3 mr-1" />
                  AI Optimize
                </Button>
              )}

              {batchingSuggestions.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Auto-suggest the best batching opportunity
                    const bestSuggestion = batchingSuggestions[0];
                    onBatchSuggestion?.(bestSuggestion.items, bestSuggestion.suggestedTimeSlot);
                  }}
                >
                  <Target className="h-3 w-3 mr-1" />
                  Quick Batch
                </Button>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Batching suggestions */}
      {batchingSuggestions.length > 0 && (
        <Card>
          <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Batching Opportunities
            </CardTitle>
            <CardDescription className="text-xs">
              Group similar tasks together to reduce context switching
            </CardDescription>
          </CardHeader>

          <CardContent className={compact ? 'pt-0 space-y-2' : 'pt-0 space-y-3'}>
            {batchingSuggestions.slice(0, compact ? 2 : 3).map((suggestion) => {
              const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[suggestion.attentionType];
              const suggestedTime = suggestion.suggestedTimeSlot
                ? format(new Date(suggestion.suggestedTimeSlot), 'h:mm a')
                : 'TBD';

              return (
                <div
                  key={suggestion.attentionType}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{attentionDesc.icon}</span>
                      <span className="font-medium text-sm">{attentionDesc.label} Tasks</span>
                      <Badge variant="outline" className="text-xs">
                        -{suggestion.potentialReduction} switches
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {suggestion.items.length} tasks • Suggest batching around {suggestedTime}
                    </div>

                    {!compact && (
                      <div className="mt-2 space-y-1">
                        {suggestion.items.slice(0, 2).map((item) => (
                          <div key={item.id} className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(item.start_time), 'h:mm a')} - {item.title}
                          </div>
                        ))}
                        {suggestion.items.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{suggestion.items.length - 2} more tasks
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onBatchSuggestion?.(suggestion.items, suggestion.suggestedTimeSlot)}
                    className="ml-3"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}

            {batchingSuggestions.length > (compact ? 2 : 3) && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" className="text-xs">
                  Show {batchingSuggestions.length - (compact ? 2 : 3)} more suggestions
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* High-cost switches breakdown */}
      {switchAnalysis.switches.some(s => s.severity === 'high') && !compact && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-destructive" />
              High-Cost Context Switches
            </CardTitle>
            <CardDescription className="text-xs">
              These transitions require significant mental effort
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0 space-y-2">
            {switchAnalysis.switches
              .filter(s => s.severity === 'high')
              .slice(0, 3)
              .map((switchPoint, index) => {
                const fromDesc = ATTENTION_TYPE_DESCRIPTIONS[switchPoint.fromType];
                const toDesc = ATTENTION_TYPE_DESCRIPTIONS[switchPoint.toType];
                const switchTime = format(new Date(switchPoint.time), 'h:mm a');

                return (
                  <div key={index} className="flex items-center gap-3 p-2 bg-destructive/5 rounded-md">
                    <div className="flex items-center gap-2 text-xs">
                      <span>{fromDesc.icon}</span>
                      <span className="font-medium">{fromDesc.label}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{toDesc.icon}</span>
                      <span className="font-medium">{toDesc.label}</span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      at {switchTime}
                    </div>

                    <Badge variant="destructive" className="text-xs ml-auto">
                      Cost: {switchPoint.cost}/10
                    </Badge>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}