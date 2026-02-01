import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Eye,
  EyeOff,
  Target,
  Shield,
  Zap,
  Clock,
  Activity,
  Settings,
  CheckCircle,
  XCircle,
  Lightbulb,
  BarChart3,
  Timer,
  Flame,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useAdvancedAttentionBudget } from '@/hooks/useAdvancedAttentionBudget';
import { TimelineItem } from '@/lib/timelineUtils';
import {
  ATTENTION_TYPE_DESCRIPTIONS,
  ROLE_MODE_DESCRIPTIONS,
  AttentionType
} from '@/lib/attentionTypes';

interface AdvancedAttentionBudgetWidgetProps {
  items: TimelineItem[];
  selectedDate?: Date;
  className?: string;
  compact?: boolean;
  onItemAction?: (action: string, itemId: string) => void;
}

export function AdvancedAttentionBudgetWidget({
  items,
  selectedDate = new Date(),
  className,
  compact = false,
  onItemAction
}: AdvancedAttentionBudgetWidgetProps) {
  const {
    preferences,
    loading,
    error,
    realTimeBudgetStatus,
    warnings,
    contextSwitchCost,
    focusSessions,
    schedulingSuggestions,
    enforcementRules,
    dismissWarning,
    dismissSuggestion,
    applySchedulingSuggestion,
    refreshData,
    startFocusSession,
    generateSmartSuggestions
  } = useAdvancedAttentionBudget();

  const [isExpanded, setIsExpanded] = useState(!compact);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('budget');
  const [showDismissedWarnings, setShowDismissedWarnings] = useState(false);

  // Auto-refresh data when items change
  useEffect(() => {
    if (autoRefresh && preferences) {
      refreshData();
    }
  }, [items, selectedDate, preferences, autoRefresh, refreshData]);

  // Real-time update interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  const todaysItems = useMemo(() =>
    items.filter(item =>
      new Date(item.start_time).toDateString() === selectedDate.toDateString()
    ),
    [items, selectedDate]
  );

  // Calculate overall status
  const overallStatus = useMemo(() => {
    const criticalWarnings = warnings.filter(w => w.level === 'critical' || w.level === 'blocking');
    const budgetViolations = realTimeBudgetStatus.filter(s => s.isViolating);

    if (criticalWarnings.length > 0 || budgetViolations.length > 0) return 'critical';
    if (warnings.length > 0) return 'warning';
    return 'healthy';
  }, [warnings, realTimeBudgetStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    const success = await applySchedulingSuggestion(suggestionId);
    if (success && onItemAction) {
      onItemAction('apply_suggestion', suggestionId);
    }
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    await dismissSuggestion(suggestionId);
  };

  const handleDismissWarning = async (warningId: string) => {
    await dismissWarning(warningId);
  };

  const handleStartFocusSession = async (itemId: string) => {
    try {
      await startFocusSession(itemId, 'deep_work', 'strict');
      if (onItemAction) {
        onItemAction('start_focus_session', itemId);
      }
    } catch (error) {
      console.error('Error starting focus session:', error);
    }
  };

  if (!preferences) {
    return null;
  }

  if (compact && !isExpanded) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 transition-all duration-200 ${className} ${getStatusColor(overallStatus)}`}
          >
            <Brain className="h-4 w-4" />
            <span>Attention</span>
            {overallStatus === 'critical' && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                {warnings.filter(w => w.level === 'critical').length}
              </Badge>
            )}
            {overallStatus === 'warning' && (
              <Badge variant="outline" className="text-xs">
                {warnings.length}
              </Badge>
            )}
            {overallStatus === 'healthy' && (
              <Badge variant="default" className="text-xs">
                ✓
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96">
          <AdvancedAttentionBudgetWidget
            items={items}
            selectedDate={selectedDate}
            compact={false}
            onItemAction={onItemAction}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider>
      <Card className={`${className} border-l-4 ${
        overallStatus === 'critical' ? 'border-l-red-500' :
        overallStatus === 'warning' ? 'border-l-yellow-500' :
        'border-l-green-500'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">
                Advanced Attention Budget
              </CardTitle>
              <Badge
                variant="secondary"
                className={`text-xs ${getStatusColor(overallStatus)}`}
              >
                {overallStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {preferences && (
                <Badge variant="outline" className="text-xs">
                  {ROLE_MODE_DESCRIPTIONS[preferences.current_role]?.label || 'Maker'}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Settings className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAutoRefresh(!autoRefresh)}>
                    <Activity className="h-4 w-4 mr-2" />
                    Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generateSmartSuggestions(todaysItems)}>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Generate Suggestions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshData}
                disabled={loading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="budget" className="text-xs">
                Budget
                {realTimeBudgetStatus.filter(s => s.isViolating).length > 0 && (
                  <AlertCircle className="h-3 w-3 ml-1 text-red-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="warnings" className="text-xs">
                Alerts
                {warnings.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 w-4 text-[10px] p-0">
                    {warnings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs">
                Optimize
                {schedulingSuggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 text-[10px] p-0">
                    {schedulingSuggestions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="focus" className="text-xs">
                Focus
                {focusSessions.filter(s => !s.completedAt).length > 0 && (
                  <Flame className="h-3 w-3 ml-1 text-orange-500" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Budget Status Tab */}
            <TabsContent value="budget" className="space-y-4">
              <div className="space-y-3">
                {realTimeBudgetStatus
                  .filter(status => status.currentUsage > 0 || status.isViolating)
                  .map((status) => {
                    const desc = ATTENTION_TYPE_DESCRIPTIONS[status.attentionType];
                    const isOverBudget = status.isViolating;
                    const isApproaching = status.severity === 'approaching';

                    return (
                      <div key={status.attentionType} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{desc.icon}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{desc.description}</p>
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-sm font-medium">{desc.label}</span>
                            {isOverBudget && (
                              <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {Math.round(status.currentUsage / 60 * 10) / 10}h / {Math.round(status.budgetLimit / 60 * 10) / 10}h
                            </span>
                            <Badge
                              variant={isOverBudget ? "destructive" : isApproaching ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {Math.round(status.usagePercentage)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress
                          value={Math.min(status.usagePercentage, 100)}
                          className="h-2"
                          indicatorClassName={
                            isOverBudget
                              ? 'bg-red-500'
                              : isApproaching
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }
                        />
                        {status.remainingCapacity > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {Math.round(status.remainingCapacity / 60 * 10) / 10}h remaining capacity
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Context Switching Monitor */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Context Switching</span>
                  </div>
                  <Badge variant={contextSwitchCost > 15 ? "destructive" : "secondary"} className="text-xs">
                    Cost: {contextSwitchCost.toFixed(1)}
                  </Badge>
                </div>
                {contextSwitchCost > 10 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    High context switching detected - consider batching similar work
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Warnings Tab */}
            <TabsContent value="warnings" className="space-y-3">
              {warnings.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No active attention warnings
                  </p>
                  <p className="text-xs text-green-600">
                    Your attention budget is optimized
                  </p>
                </div>
              ) : (
                warnings.map((warning) => (
                  <Alert
                    key={warning.id}
                    variant={warning.level === 'critical' || warning.level === 'blocking' ? 'destructive' : 'default'}
                    className="relative"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="pr-8">
                      <div className="space-y-1">
                        <div className="font-medium">{warning.title}</div>
                        <div className="text-sm">{warning.description}</div>
                        {warning.suggestion && (
                          <div className="text-xs text-muted-foreground italic">
                            💡 {warning.suggestion}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissWarning(warning.id)}
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </Alert>
                ))
              )}
            </TabsContent>

            {/* Optimization Suggestions Tab */}
            <TabsContent value="suggestions" className="space-y-3">
              {schedulingSuggestions.length === 0 ? (
                <div className="text-center py-6">
                  <Lightbulb className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No optimization suggestions available
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateSmartSuggestions(todaysItems)}
                    className="mt-2"
                  >
                    Generate Suggestions
                  </Button>
                </div>
              ) : (
                schedulingSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="p-3 border border-blue-200 bg-blue-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(suggestion.confidenceScore * 100)}% confidence
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{suggestion.reasoning}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          💡 {suggestion.potentialBenefit}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleApplySuggestion(suggestion.id)}
                        className="text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismissSuggestion(suggestion.id)}
                        className="text-xs"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Focus Sessions Tab */}
            <TabsContent value="focus" className="space-y-3">
              <div className="space-y-3">
                {/* Active Focus Sessions */}
                {focusSessions.filter(session => !session.completedAt).map(session => (
                  <Card key={session.id} className="p-3 border-orange-200 bg-orange-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Active Focus Session</span>
                        <Badge variant="outline" className="text-xs">
                          {session.sessionType.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Timer className="h-4 w-4 text-orange-500 animate-pulse" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Protection: {session.protectionLevel} •
                      Planned: {session.plannedDuration}m
                    </p>
                  </Card>
                ))}

                {/* Focus Session Opportunities */}
                {todaysItems
                  .filter(item =>
                    item.attention_type === 'create' &&
                    item.duration_minutes >= 90 &&
                    !focusSessions.some(session => session.timelineItemId === item.id)
                  )
                  .map(item => (
                    <Card key={item.id} className="p-3 border-green-200 bg-green-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.duration_minutes}m • Eligible for focus protection
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartFocusSession(item.id)}
                          className="text-xs"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Protect
                        </Button>
                      </div>
                    </Card>
                  ))
                }

                {/* Recent Completed Sessions */}
                <div className="border-t pt-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Recent Sessions
                  </h4>
                  {focusSessions
                    .filter(session => session.completedAt)
                    .slice(0, 3)
                    .map(session => (
                      <div key={session.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-xs">{session.sessionType.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.completionRating && (
                            <Badge variant="outline" className="text-xs">
                              {session.completionRating}/5
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {session.actualDuration || session.plannedDuration}m
                          </span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}