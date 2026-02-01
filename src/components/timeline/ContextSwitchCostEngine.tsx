import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Clock,
  AlertTriangle,
  BarChart3,
  Zap,
  ArrowRight,
  Timer,
  Target,
  Lightbulb
} from 'lucide-react';
import { TimelineItem } from '@/lib/timelineUtils';
import {
  AttentionType,
  ATTENTION_TYPE_DESCRIPTIONS,
  ATTENTION_TYPES
} from '@/lib/attentionTypes';
import { useAdvancedAttentionBudget } from '@/hooks/useAdvancedAttentionBudget';

interface ContextSwitchEvent {
  id: string;
  fromType: AttentionType;
  toType: AttentionType;
  fromTime: string;
  toTime: string;
  timeBetween: number;
  costScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
}

interface ContextSwitchAnalysis {
  totalSwitches: number;
  totalCost: number;
  averageCost: number;
  highestCost: number;
  switchPattern: string;
  optimizationOpportunities: number;
  efficiency: number;
}

interface ContextSwitchCostEngineProps {
  items: TimelineItem[];
  selectedDate?: Date;
  className?: string;
  onOptimizationSuggestion?: (suggestion: string) => void;
}

export function ContextSwitchCostEngine({
  items,
  selectedDate = new Date(),
  className,
  onOptimizationSuggestion
}: ContextSwitchCostEngineProps) {
  const {
    calculateContextSwitchCost,
    preferences
  } = useAdvancedAttentionBudget();

  const [switchEvents, setSwitchEvents] = useState<ContextSwitchEvent[]>([]);
  const [analysis, setAnalysis] = useState<ContextSwitchAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOptimizations, setShowOptimizations] = useState(false);

  // Filter items for selected date
  const dayItems = useMemo(() => {
    const targetDate = selectedDate.toDateString();
    return items
      .filter(item => {
        const itemDate = new Date(item.start_time).toDateString();
        return itemDate === targetDate && item.attention_type;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [items, selectedDate]);

  // Calculate context switches when items change
  useEffect(() => {
    if (dayItems.length <= 1) {
      setSwitchEvents([]);
      setAnalysis(null);
      return;
    }

    calculateSwitchEvents();
  }, [dayItems, preferences]);

  const calculateSwitchEvents = async () => {
    if (!preferences || dayItems.length <= 1) return;

    setLoading(true);
    try {
      const events: ContextSwitchEvent[] = [];
      let totalCost = 0;

      for (let i = 1; i < dayItems.length; i++) {
        const prevItem = dayItems[i - 1];
        const currentItem = dayItems[i];

        if (prevItem.attention_type && currentItem.attention_type &&
            prevItem.attention_type !== currentItem.attention_type) {

          const prevEnd = new Date(prevItem.start_time);
          prevEnd.setMinutes(prevEnd.getMinutes() + (prevItem.duration_minutes || 0));

          const currentStart = new Date(currentItem.start_time);
          const timeBetween = Math.max(0, (currentStart.getTime() - prevEnd.getTime()) / (1000 * 60));

          const costScore = await calculateContextSwitchCost(
            prevItem.attention_type as AttentionType,
            currentItem.attention_type as AttentionType,
            timeBetween
          );

          const severity = getSeverity(costScore);
          const suggestion = getSuggestion(prevItem.attention_type as AttentionType, currentItem.attention_type as AttentionType, timeBetween);

          events.push({
            id: `${prevItem.id}-${currentItem.id}`,
            fromType: prevItem.attention_type as AttentionType,
            toType: currentItem.attention_type as AttentionType,
            fromTime: prevItem.start_time,
            toTime: currentItem.start_time,
            timeBetween,
            costScore,
            severity,
            suggestion
          });

          totalCost += costScore;
        }
      }

      setSwitchEvents(events);

      // Calculate analysis
      if (events.length > 0) {
        const analysis: ContextSwitchAnalysis = {
          totalSwitches: events.length,
          totalCost,
          averageCost: totalCost / events.length,
          highestCost: Math.max(...events.map(e => e.costScore)),
          switchPattern: identifySwitchPattern(events),
          optimizationOpportunities: events.filter(e => e.severity === 'high' || e.severity === 'critical').length,
          efficiency: calculateEfficiency(events)
        };
        setAnalysis(analysis);
      }

    } catch (error) {
      console.error('Error calculating context switches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverity = (costScore: number): ContextSwitchEvent['severity'] => {
    if (costScore >= 7) return 'critical';
    if (costScore >= 5) return 'high';
    if (costScore >= 3) return 'medium';
    return 'low';
  };

  const getSuggestion = (fromType: AttentionType, toType: AttentionType, timeBetween: number): string => {
    if (timeBetween < 15) {
      return `Add buffer time between ${fromType} and ${toType} work`;
    }
    if ((fromType === ATTENTION_TYPES.CREATE && toType === ATTENTION_TYPES.CONNECT) ||
        (fromType === ATTENTION_TYPES.CONNECT && toType === ATTENTION_TYPES.CREATE)) {
      return 'Consider batching social interactions separately from creative work';
    }
    if (fromType === ATTENTION_TYPES.DECIDE && toType === ATTENTION_TYPES.CREATE) {
      return 'Add recovery time after decision-making before creative work';
    }
    return 'Consider grouping similar attention types together';
  };

  const identifySwitchPattern = (events: ContextSwitchEvent[]): string => {
    const typeSequence = events.map(e => `${e.fromType}→${e.toType}`);
    const frequentPattern = getMostFrequentPattern(typeSequence);
    return frequentPattern || 'Mixed switching pattern';
  };

  const getMostFrequentPattern = (patterns: string[]): string | null => {
    const counts = patterns.reduce((acc, pattern) => {
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostFrequent = Object.entries(counts)
      .sort(([,a], [,b]) => b - a)[0];

    return mostFrequent && mostFrequent[1] > 1 ? mostFrequent[0] : null;
  };

  const calculateEfficiency = (events: ContextSwitchEvent[]): number => {
    if (events.length === 0) return 100;

    const maxPossibleCost = events.length * 10; // Assuming max cost of 10 per switch
    const actualCost = events.reduce((sum, event) => sum + event.costScore, 0);

    return Math.max(0, Math.round((1 - (actualCost / maxPossibleCost)) * 100));
  };

  const getSeverityColor = (severity: ContextSwitchEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAttentionTypeIcon = (type: AttentionType) => {
    return ATTENTION_TYPE_DESCRIPTIONS[type]?.icon || '◯';
  };

  const getAttentionTypeLabel = (type: AttentionType) => {
    return ATTENTION_TYPE_DESCRIPTIONS[type]?.label || type;
  };

  if (dayItems.length <= 1) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Context Switch Cost Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Need multiple tasks to analyze context switching
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Context Switch Cost Engine
            </CardTitle>
            <div className="flex items-center gap-2">
              {analysis && (
                <Badge variant={analysis.efficiency >= 70 ? 'default' : 'destructive'} className="text-xs">
                  {analysis.efficiency}% Efficiency
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOptimizations(!showOptimizations)}
                className="h-6 w-6 p-0"
              >
                <Lightbulb className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Brain className="h-6 w-6 animate-pulse text-primary" />
              <span className="ml-2 text-sm">Analyzing context switches...</span>
            </div>
          ) : (
            <>
              {/* Summary Metrics */}
              {analysis && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Total Switches</span>
                    </div>
                    <div className="text-lg font-bold">{analysis.totalSwitches}</div>
                    <div className="text-xs text-muted-foreground">
                      Avg cost: {analysis.averageCost.toFixed(1)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Total Cost</span>
                    </div>
                    <div className="text-lg font-bold">{analysis.totalCost.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">
                      Peak: {analysis.highestCost.toFixed(1)}
                    </div>
                  </div>
                </div>
              )}

              {/* Efficiency Progress */}
              {analysis && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cognitive Efficiency</span>
                    <span className="text-sm text-muted-foreground">{analysis.efficiency}%</span>
                  </div>
                  <Progress
                    value={analysis.efficiency}
                    className="h-2"
                    indicatorClassName={
                      analysis.efficiency >= 80 ? 'bg-green-500' :
                      analysis.efficiency >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }
                  />
                  {analysis.efficiency < 60 && (
                    <p className="text-xs text-red-600">
                      High context switching detected - consider optimization
                    </p>
                  )}
                </div>
              )}

              {/* Context Switch Events */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Context Switches Today</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {switchEvents.map((event) => (
                    <HoverCard key={event.id}>
                      <HoverCardTrigger asChild>
                        <div
                          className={`p-2 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm ${getSeverityColor(event.severity)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {getAttentionTypeIcon(event.fromType)}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="text-sm">
                                {getAttentionTypeIcon(event.toType)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.toTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {event.costScore.toFixed(1)}
                              </Badge>
                              {event.severity === 'critical' && (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          </div>
                          {event.timeBetween < 30 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-orange-500" />
                              <span className="text-xs text-orange-600">
                                Only {Math.round(event.timeBetween)}m gap
                              </span>
                            </div>
                          )}
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-semibold">Context Switch Details</span>
                            <Badge variant={
                              event.severity === 'critical' ? 'destructive' :
                              event.severity === 'high' ? 'secondary' : 'outline'
                            }>
                              {event.severity} impact
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-muted-foreground">From</div>
                              <div>{getAttentionTypeLabel(event.fromType)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">To</div>
                              <div>{getAttentionTypeLabel(event.toType)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Gap Time</div>
                              <div>{Math.round(event.timeBetween)} minutes</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Cost Score</div>
                              <div>{event.costScore.toFixed(1)} / 10</div>
                            </div>
                          </div>
                          {event.suggestion && (
                            <Alert className="mt-2">
                              <Lightbulb className="h-4 w-4" />
                              <AlertDescription className="text-sm">
                                {event.suggestion}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>

              {/* Optimization Suggestions */}
              {showOptimizations && analysis && analysis.optimizationOpportunities > 0 && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">Optimization Opportunities</div>
                      <div className="text-sm space-y-1">
                        {analysis.optimizationOpportunities > 0 && (
                          <div>• {analysis.optimizationOpportunities} high-cost switches could be optimized</div>
                        )}
                        {analysis.switchPattern !== 'Mixed switching pattern' && (
                          <div>• Pattern detected: {analysis.switchPattern}</div>
                        )}
                        <div>• Consider batching similar attention types together</div>
                        <div>• Add 15-30 minute buffers between different work types</div>
                      </div>
                      {onOptimizationSuggestion && (
                        <Button
                          size="sm"
                          onClick={() => onOptimizationSuggestion('batch_similar_types')}
                          className="mt-2"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Apply Optimizations
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Pattern Analysis */}
              {analysis && analysis.switchPattern !== 'Mixed switching pattern' && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm font-medium">Pattern Analysis</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Most common switch: {analysis.switchPattern}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}