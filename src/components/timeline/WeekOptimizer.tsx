import React, { useState, useCallback } from 'react';
import { useSupabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Clock, ArrowRight, Sparkles, AlertTriangle, TrendingUp } from 'lucide-react';

interface TimelineItem {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  attention_type?: string;
  priority?: number;
  is_non_negotiable?: boolean;
  context_switch_cost?: number;
  layer_name?: string;
}

interface OptimizationChange {
  type: 'move' | 'cluster' | 'extend' | 'break' | 'delegate';
  item_id: string;
  old_time: string;
  new_time: string;
  reason: string;
  impact: string;
}

interface WeekOptimizationResult {
  originalSchedule: TimelineItem[];
  optimizedSchedule: TimelineItem[];
  changes: OptimizationChange[];
  improvements: {
    contextSwitchesReduced: number;
    focusBlocksExtended: number;
    attentionBudgetImproved: number;
    delegationOpportunities: number;
  };
  explanation: string;
  weeklyScore: {
    before: number;
    after: number;
  };
}

interface WeekOptimizerProps {
  currentSchedule: TimelineItem[];
  userRole: 'maker' | 'marker' | 'multiplier';
  userZone: 'wartime' | 'peacetime';
  onApplyOptimization: (optimizedSchedule: TimelineItem[]) => void;
  onSelectiveApply: (changes: OptimizationChange[]) => void;
}

const WeekOptimizer: React.FC<WeekOptimizerProps> = ({
  currentSchedule,
  userRole,
  userZone,
  onApplyOptimization,
  onSelectiveApply
}) => {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<WeekOptimizationResult | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleOptimizeWeek = useCallback(async () => {
    if (!user || currentSchedule.length === 0) return;

    setIsOptimizing(true);
    setError(null);

    try {
      // Get user's attention preferences
      const { data: preferencesData } = await supabase.functions.invoke('attention-preferences');
      const preferences = preferencesData?.preferences || {
        current_role: userRole,
        current_zone: userZone,
        non_negotiable_weekly_hours: 5,
        attention_budgets: {
          decide: 2,
          context_switches: 3,
          meetings: 4
        },
        peak_hours_start: '09:00',
        peak_hours_end: '12:00'
      };

      // Call AI week optimizer
      const { data, error } = await supabase.functions.invoke('ai-week-optimizer', {
        body: {
          currentSchedule,
          preferences: {
            ...preferences,
            current_role: userRole,
            current_zone: userZone
          },
          constraints: {
            max_daily_hours: 10,
            min_break_between_blocks: 15,
            preserve_lunch_time: true,
            respect_external_calendar: true
          },
          optimizationGoals: ['focus', 'efficiency', 'balance']
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to optimize week');
      }

      setOptimizationResult(data);
      setSelectedChanges(new Set(data.changes.map((change: OptimizationChange) => change.item_id)));

    } catch (error) {
      console.error('Week optimization error:', error);
      setError(error instanceof Error ? error.message : 'Failed to optimize schedule');
    } finally {
      setIsOptimizing(false);
    }
  }, [user, currentSchedule, userRole, userZone, supabase]);

  const handleApplyAllChanges = useCallback(() => {
    if (!optimizationResult) return;
    onApplyOptimization(optimizationResult.optimizedSchedule);
    setOptimizationResult(null);
  }, [optimizationResult, onApplyOptimization]);

  const handleApplySelectedChanges = useCallback(() => {
    if (!optimizationResult) return;
    const selectedChangesList = optimizationResult.changes.filter(change =>
      selectedChanges.has(change.item_id)
    );
    onSelectiveApply(selectedChangesList);
    setOptimizationResult(null);
  }, [optimizationResult, selectedChanges, onSelectiveApply]);

  const toggleChangeSelection = useCallback((itemId: string) => {
    setSelectedChanges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'move': return <ArrowRight className="h-4 w-4" />;
      case 'cluster': return <CheckCircle2 className="h-4 w-4" />;
      case 'extend': return <TrendingUp className="h-4 w-4" />;
      case 'break': return <Clock className="h-4 w-4" />;
      case 'delegate': return <AlertTriangle className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'move': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cluster': return 'bg-green-100 text-green-800 border-green-200';
      case 'extend': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'break': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delegate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!optimizationResult) {
    return (
      <Card className="shadow-neu-raised rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Week Optimizer
          </CardTitle>
          <CardDescription>
            Let AI optimize your weekly schedule based on your {userRole} role and {userZone} mode.
            Reduces context switching, protects focus time, and improves attention budget compliance.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-xl">
                <div className="text-sm text-muted-foreground">Current Schedule</div>
                <div className="text-2xl font-bold text-primary">
                  {currentSchedule.length} items
                </div>
              </div>

              <div className="p-3 bg-muted rounded-xl">
                <div className="text-sm text-muted-foreground">Mode</div>
                <div className="text-2xl font-bold text-primary capitalize">
                  {userRole} • {userZone}
                </div>
              </div>
            </div>

            <Button
              onClick={handleOptimizeWeek}
              disabled={isOptimizing || currentSchedule.length === 0}
              className="w-full bg-gradient-primary hover:opacity-90 text-white"
              size="lg"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Optimizing Your Week...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Rewrite My Week
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              AI will analyze your schedule for attention optimization, context switch reduction,
              and role-specific improvements.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Overview */}
      <Card className="shadow-neu-raised rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Week Optimization Results
          </CardTitle>
          <CardDescription>
            AI analyzed your {currentSchedule.length} scheduled items and found {optimizationResult.changes.length} improvement opportunities.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Score Improvement */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
              <div>
                <div className="font-semibold text-green-800">Weekly Score Improvement</div>
                <div className="text-sm text-green-600">
                  Better role fit and attention optimization
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-800">
                  {optimizationResult.weeklyScore.before} → {optimizationResult.weeklyScore.after}
                </div>
                <div className="text-sm text-green-600">
                  +{optimizationResult.weeklyScore.after - optimizationResult.weeklyScore.before} points
                </div>
              </div>
            </div>

            {/* Improvements Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">
                  {optimizationResult.improvements.contextSwitchesReduced}
                </div>
                <div className="text-sm text-blue-600">Context Switches Reduced</div>
              </div>

              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">
                  {optimizationResult.improvements.focusBlocksExtended}
                </div>
                <div className="text-sm text-purple-600">Focus Blocks Extended</div>
              </div>

              <div className="text-center p-3 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">
                  {optimizationResult.improvements.attentionBudgetImproved}
                </div>
                <div className="text-sm text-green-600">Budget Improved</div>
              </div>

              <div className="text-center p-3 bg-orange-50 rounded-xl">
                <div className="text-2xl font-bold text-orange-600">
                  {optimizationResult.improvements.delegationOpportunities}
                </div>
                <div className="text-sm text-orange-600">Delegation Ideas</div>
              </div>
            </div>

            {/* AI Explanation */}
            <div className="p-4 bg-muted rounded-xl">
              <div className="font-semibold mb-2">AI Optimization Strategy</div>
              <p className="text-sm text-muted-foreground">
                {optimizationResult.explanation}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposed Changes */}
      <Card className="shadow-neu-raised rounded-2xl">
        <CardHeader>
          <CardTitle>Proposed Changes ({optimizationResult.changes.length})</CardTitle>
          <CardDescription>
            Review and select which optimizations to apply to your schedule.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {optimizationResult.changes.map((change, index) => (
              <div
                key={index}
                className={`p-4 border rounded-xl transition-all cursor-pointer ${
                  selectedChanges.has(change.item_id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleChangeSelection(change.item_id)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedChanges.has(change.item_id)}
                    onChange={() => toggleChangeSelection(change.item_id)}
                    className="mt-1 accent-primary"
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="secondary"
                        className={`${getChangeTypeColor(change.type)} border`}
                      >
                        {getChangeTypeIcon(change.type)}
                        <span className="ml-1 capitalize">{change.type}</span>
                      </Badge>

                      <span className="font-medium">
                        {currentSchedule.find(item => item.id === change.item_id)?.title || 'Unknown Item'}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      {formatTime(change.old_time)} → {formatTime(change.new_time)}
                    </div>

                    <div className="text-sm">
                      <div className="mb-1 font-medium">{change.reason}</div>
                      <div className="text-muted-foreground">{change.impact}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleApplyAllChanges}
              className="flex-1 bg-gradient-primary hover:opacity-90 text-white"
            >
              Apply All Changes ({optimizationResult.changes.length})
            </Button>

            <Button
              onClick={handleApplySelectedChanges}
              variant="outline"
              className="flex-1"
              disabled={selectedChanges.size === 0}
            >
              Apply Selected ({selectedChanges.size})
            </Button>

            <Button
              onClick={() => setOptimizationResult(null)}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeekOptimizer;