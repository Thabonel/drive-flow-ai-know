import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Eye,
  EyeOff,
  Target
} from 'lucide-react';
import { useAttentionBudget } from '@/hooks/useAttentionBudget';
import { TimelineItem } from '@/lib/timelineUtils';
import {
  ATTENTION_TYPE_DESCRIPTIONS,
  ROLE_MODE_DESCRIPTIONS
} from '@/lib/attentionTypes';

interface AttentionBudgetWidgetProps {
  items: TimelineItem[];
  selectedDate?: Date;
  className?: string;
  compact?: boolean;
}

export function AttentionBudgetWidget({
  items,
  selectedDate = new Date(),
  className,
  compact = false
}: AttentionBudgetWidgetProps) {
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

  const [isExpanded, setIsExpanded] = useState(!compact);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh usage when items change
  useEffect(() => {
    if (autoRefresh && preferences) {
      const targetDate = selectedDate.toISOString().split('T')[0];
      refreshUsage(targetDate);
    }
  }, [items, selectedDate, preferences, autoRefresh, refreshUsage]);

  if (!preferences) {
    return null;
  }

  const budgetStatus = checkBudgetViolation(items, selectedDate);
  const contextSwitches = calculateContextSwitches(items, selectedDate);
  const warnings = getAttentionWarnings(items, selectedDate);

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

  if (compact && !isExpanded) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 ${className}`}
          >
            <Brain className="h-4 w-4" />
            <span>Attention</span>
            {overallStatus === 'over-budget' && (
              <Badge variant="destructive" className="text-xs">
                {overBudgetCount}
              </Badge>
            )}
            {overallStatus === 'warning' && (
              <Badge variant="outline" className="text-xs">
                !
              </Badge>
            )}
            {overallStatus === 'healthy' && (
              <Badge variant="default" className="text-xs">
                ✓
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <AttentionBudgetWidget
            items={items}
            selectedDate={selectedDate}
            compact={false}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              Attention Budget
            </CardTitle>
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {preferences && (
              <Badge variant="secondary" className="text-xs">
                {ROLE_MODE_DESCRIPTIONS[preferences.current_role].label}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshUsage(selectedDate.toISOString().split('T')[0])}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Warnings */}
        {warnings.length > 0 && (
          <Alert variant={overallStatus === 'over-budget' ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <div className="space-y-1">
                {warnings.map((warning, index) => (
                  <div key={index}>{warning}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Budget Status by Type */}
        <div className="space-y-3">
          {budgetStatus
            .filter(status => status.items_count > 0 || status.is_over_budget)
            .map((status) => {
              const desc = ATTENTION_TYPE_DESCRIPTIONS[status.attention_type];
              return (
                <div key={status.attention_type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{desc.icon}</span>
                      <span className="text-sm font-medium">{desc.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {status.items_count}/{status.budget_limit}
                      </span>
                      {status.is_over_budget && (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  </div>
                  <Progress
                    value={Math.min(status.usage_percentage, 100)}
                    className="h-2"
                    indicatorClassName={
                      status.is_over_budget
                        ? 'bg-destructive'
                        : status.usage_percentage >= 80
                          ? 'bg-yellow-500'
                          : 'bg-primary'
                    }
                  />
                  {status.total_duration_minutes > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Math.round(status.total_duration_minutes / 60 * 10) / 10}h scheduled
                    </p>
                  )}
                </div>
              );
            })}
        </div>

        {/* Context Switching */}
        {contextSwitches > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Context Switching</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {contextSwitches}/{contextSwitchBudget}
                </span>
                {contextSwitches > contextSwitchBudget && (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                )}
              </div>
            </div>
            <Progress
              value={Math.min((contextSwitches / contextSwitchBudget) * 100, 100)}
              className="h-2"
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
        )}

        {/* Summary */}
        {totalItems > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total scheduled tasks
              </span>
              <Badge variant="secondary" className="text-xs">
                {totalItems}
              </Badge>
            </div>
            {overallStatus === 'healthy' && warnings.length === 0 && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Attention budget is on track
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {totalItems === 0 && (
          <div className="text-center py-4">
            <Brain className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No attention-typed tasks scheduled for {selectedDate.toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}