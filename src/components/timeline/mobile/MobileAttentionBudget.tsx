import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAttentionBudgetGestures } from '@/hooks/useGestures';
import { useAttentionBudget } from '@/hooks/useAttentionBudget';
import { TimelineItem } from '@/lib/timelineUtils';
import {
  ATTENTION_TYPE_DESCRIPTIONS,
  ROLE_MODE_DESCRIPTIONS
} from '@/lib/attentionTypes';
import { Vibrate } from '@/lib/haptics';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Target,
  Clock,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface MobileAttentionBudgetProps {
  items: TimelineItem[];
  selectedDate?: Date;
  className?: string;
  onBudgetWarning?: (warnings: string[]) => void;
}

export function MobileAttentionBudget({
  items,
  selectedDate = new Date(),
  className,
  onBudgetWarning
}: MobileAttentionBudgetProps) {
  const {
    preferences,
    dailyUsage,
    loading,
    error,
    refreshUsage,
    checkBudgetViolation,
    calculateContextSwitches,
    getAttentionWarnings,
  } = useAttentionBudget();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [currentAttentionTypeIndex, setCurrentAttentionTypeIndex] = useState(0);
  const [scale, setScale] = useState(1);

  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-refresh usage when items change
  useEffect(() => {
    if (preferences) {
      const targetDate = selectedDate.toISOString().split('T')[0];
      refreshUsage(targetDate);
    }
  }, [items, selectedDate, preferences, refreshUsage]);

  // Handle swipe gestures for navigation
  const { isGesturing } = useAttentionBudgetGestures(
    () => {
      // Swipe left - next attention type
      if (budgetStatus.length > 0) {
        const nextIndex = (currentAttentionTypeIndex + 1) % budgetStatus.length;
        setCurrentAttentionTypeIndex(nextIndex);
        Vibrate.selection();
      }
    },
    () => {
      // Swipe right - previous attention type
      if (budgetStatus.length > 0) {
        const prevIndex = (currentAttentionTypeIndex - 1 + budgetStatus.length) % budgetStatus.length;
        setCurrentAttentionTypeIndex(prevIndex);
        Vibrate.selection();
      }
    },
    (newScale: number) => {
      // Pinch to zoom
      setScale(Math.min(Math.max(newScale, 0.8), 1.5));
    }
  );

  if (!preferences || !isMobile) {
    return null;
  }

  const budgetStatus = checkBudgetViolation(items, selectedDate);
  const contextSwitches = calculateContextSwitches(items, selectedDate);
  const warnings = getAttentionWarnings(items, selectedDate);

  // Trigger warning callback
  useEffect(() => {
    if (warnings.length > 0) {
      onBudgetWarning?.(warnings);
    }
  }, [warnings, onBudgetWarning]);

  const totalItems = budgetStatus.reduce((sum, status) => sum + status.items_count, 0);
  const overBudgetCount = budgetStatus.filter(status => status.is_over_budget).length;
  const contextSwitchBudget = preferences.attention_budgets.context_switches || 3;

  // Get overall status
  const getOverallStatus = () => {
    if (overBudgetCount > 0) return 'over-budget';
    if (warnings.length > 0) return 'warning';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();
  const statusColors = {
    'over-budget': 'text-destructive border-destructive',
    'warning': 'text-yellow-600 border-yellow-300',
    'healthy': 'text-green-600 border-green-300'
  };

  // Filter to active attention types
  const activeBudgetStatus = budgetStatus.filter(status =>
    status.items_count > 0 || status.is_over_budget
  );

  const currentAttentionType = activeBudgetStatus[currentAttentionTypeIndex];

  return (
    <>
      {/* Compact Mobile Card */}
      <Card
        ref={cardRef}
        className={`
          relative overflow-hidden transition-all duration-200 border-2
          ${statusColors[overallStatus]}
          ${isGesturing ? 'scale-95' : ''}
          ${className}
        `}
        style={{ transform: `scale(${scale})` }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Attention Budget</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {ROLE_MODE_DESCRIPTIONS[preferences.current_role].label}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Quick Status Overview */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">
                {totalItems} tasks
              </span>
            </div>
            <div className="flex items-center gap-2">
              {overallStatus === 'over-budget' && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              <Badge
                variant={overallStatus === 'over-budget' ? 'destructive' :
                         overallStatus === 'warning' ? 'outline' : 'default'}
                className="text-xs"
              >
                {overallStatus === 'healthy' ? '✓ On Track' :
                 overallStatus === 'warning' ? '⚠ Warning' :
                 `${overBudgetCount} Over Budget`}
              </Badge>
            </div>
          </div>

          {/* Current Attention Type (Swipeable) */}
          {currentAttentionType && (
            <div className="space-y-2 p-3 bg-card rounded-xl border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{ATTENTION_TYPE_DESCRIPTIONS[currentAttentionType.attention_type].icon}</span>
                  <span className="text-sm font-medium">
                    {ATTENTION_TYPE_DESCRIPTIONS[currentAttentionType.attention_type].label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {currentAttentionType.items_count}/{currentAttentionType.budget_limit}
                  </span>
                  {activeBudgetStatus.length > 1 && (
                    <Badge variant="outline" className="text-xs">
                      {currentAttentionTypeIndex + 1}/{activeBudgetStatus.length}
                    </Badge>
                  )}
                </div>
              </div>
              <Progress
                value={Math.min(currentAttentionType.usage_percentage, 100)}
                className="h-3"
                indicatorClassName={
                  currentAttentionType.is_over_budget
                    ? 'bg-destructive'
                    : currentAttentionType.usage_percentage >= 80
                      ? 'bg-yellow-500'
                      : 'bg-primary'
                }
              />
              {currentAttentionType.total_duration_minutes > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{Math.round(currentAttentionType.total_duration_minutes / 60 * 10) / 10}h</span>
                </div>
              )}
            </div>
          )}

          {/* Context Switching Alert */}
          {contextSwitches > contextSwitchBudget && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                High context switching ({contextSwitches}/{contextSwitchBudget})
              </span>
            </div>
          )}

          {/* Expanded View */}
          {isExpanded && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{totalItems}</div>
                  <div className="text-xs text-muted-foreground">Total Tasks</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{contextSwitches}</div>
                  <div className="text-xs text-muted-foreground">Context Switches</div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailSheetOpen(true)}
                className="w-full gap-2"
              >
                <Target className="h-4 w-4" />
                View Full Details
              </Button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshUsage(selectedDate.toISOString().split('T')[0])}
              disabled={loading}
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs">Refresh</span>
            </Button>

            {activeBudgetStatus.length > 1 && (
              <div className="text-xs text-muted-foreground">
                Swipe to navigate types
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Attention Budget Details
            </SheetTitle>
            <SheetDescription>
              Full breakdown for {selectedDate.toLocaleDateString()}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="mt-6 h-full">
            <div className="space-y-4">
              {/* Warnings Section */}
              {warnings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Warnings</h3>
                  {warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* All Attention Types */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Budget Breakdown</h3>
                {budgetStatus.map((status) => {
                  const desc = ATTENTION_TYPE_DESCRIPTIONS[status.attention_type];

                  return (
                    <Card key={status.attention_type} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{desc.icon}</span>
                            <span className="font-medium">{desc.label}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {status.items_count}/{status.budget_limit}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {status.usage_percentage}%
                            </div>
                          </div>
                        </div>

                        <Progress
                          value={Math.min(status.usage_percentage, 100)}
                          className="h-3"
                          indicatorClassName={
                            status.is_over_budget
                              ? 'bg-destructive'
                              : status.usage_percentage >= 80
                                ? 'bg-yellow-500'
                                : 'bg-primary'
                          }
                        />

                        {status.total_duration_minutes > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {Math.round(status.total_duration_minutes / 60 * 10) / 10}h scheduled
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Context Switching Detail */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">Context Switching</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {contextSwitches}/{contextSwitchBudget}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round((contextSwitches / contextSwitchBudget) * 100)}%
                      </div>
                    </div>
                  </div>

                  <Progress
                    value={Math.min((contextSwitches / contextSwitchBudget) * 100, 100)}
                    className="h-3"
                    indicatorClassName={
                      contextSwitches > contextSwitchBudget
                        ? 'bg-destructive'
                        : contextSwitches >= contextSwitchBudget * 0.8
                          ? 'bg-yellow-500'
                          : 'bg-primary'
                    }
                  />

                  <p className="text-xs text-muted-foreground">
                    {contextSwitches > contextSwitchBudget ? 'High' : 'Normal'} cognitive switching load
                  </p>
                </div>
              </Card>

              {/* Role Context */}
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Current Role</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {ROLE_MODE_DESCRIPTIONS[preferences.current_role].description}
                </div>
              </Card>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}