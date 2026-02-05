import { useState, useMemo } from 'react';
import { TimelineItem } from '@/lib/timelineUtils';
import { useWorkload } from '@/hooks/useWorkload';
import { useAttentionBudget } from '@/hooks/useAttentionBudget';
import { AlertCircle, Clock, Calendar, ChevronDown, ChevronUp, Brain, Target, TrendingUp, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface WorkloadIndicatorProps {
  items: TimelineItem[];
  targetDate?: Date;
  compact?: boolean;
  showAttentionMetrics?: boolean;
}

export function WorkloadIndicator({
  items,
  targetDate,
  compact = false,
  showAttentionMetrics = true
}: WorkloadIndicatorProps) {
  const { stats } = useWorkload(items, targetDate);
  const { analyzeDay, preferences } = useAttentionBudget();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('timeline-workload-collapsed') !== 'false';
  });

  // Calculate attention metrics
  const attentionAnalysis = useMemo(() => {
    if (!preferences || !showAttentionMetrics) return null;
    return analyzeDay(items, targetDate);
  }, [analyzeDay, items, targetDate, preferences, showAttentionMetrics]);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('timeline-workload-collapsed', String(newState));
  };

  // Enhanced workload assessment with attention factors
  const getWorkloadColor = () => {
    const hasAttentionViolations = attentionAnalysis?.budgetViolations.length > 0;
    const highContextSwitches = attentionAnalysis?.contextSwitchAnalysis.severity === 'high' ||
                                attentionAnalysis?.contextSwitchAnalysis.severity === 'excessive';

    if (stats.totalPlannedHours > 8 || hasAttentionViolations) {
      return 'text-red-600 dark:text-red-400';
    } else if (stats.totalPlannedHours >= 6 || highContextSwitches) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressColor = () => {
    const hasAttentionViolations = attentionAnalysis?.budgetViolations.length > 0;
    const highContextSwitches = attentionAnalysis?.contextSwitchAnalysis.severity === 'high' ||
                                attentionAnalysis?.contextSwitchAnalysis.severity === 'excessive';

    if (stats.totalPlannedHours > 8 || hasAttentionViolations) {
      return 'bg-red-500';
    } else if (stats.totalPlannedHours >= 6 || highContextSwitches) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  const getAttentionScoreColor = () => {
    if (!attentionAnalysis) return 'text-gray-500';
    const score = attentionAnalysis.overallScore;
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span className={getWorkloadColor()}>
            {formatHours(stats.totalPlannedMinutes)} / 8h
          </span>
          {stats.isOvercommitted && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>

        {/* Attention score in compact mode */}
        {attentionAnalysis && showAttentionMetrics && (
          <div className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            <span className={getAttentionScoreColor()}>
              {attentionAnalysis.overallScore}/100
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg shadow-card">
      {/* Clickable Header - Always Visible */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Daily Workload</h3>
          {showAttentionMetrics && attentionAnalysis && (
            <Badge variant="outline" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Attention
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-sm font-medium ${getWorkloadColor()}`}>
            {stats.utilizationPercent}%
          </div>
          {showAttentionMetrics && attentionAnalysis && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className={`text-xs font-medium ${getAttentionScoreColor()}`}>
                {attentionAnalysis.overallScore}
              </span>
            </div>
          )}
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-3">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress
              value={Math.min(stats.utilizationPercent, 100)}
              className="h-3"
              indicatorClassName={getProgressColor()}
            />
            <div className="flex items-center justify-between text-sm">
              <span className={getWorkloadColor()}>
                {formatHours(stats.totalPlannedMinutes)} planned
              </span>
              <span className="text-muted-foreground">
                / 8 hour day
              </span>
            </div>
          </div>

          {/* Enhanced Breakdown with Attention Metrics */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Meetings:</span>
                <span className="font-medium">{formatHours(stats.meetingMinutes)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Available:</span>
                <span className="font-medium">{formatHours(stats.availableMinutes)}</span>
              </div>
            </div>

            {/* Attention Metrics */}
            {showAttentionMetrics && attentionAnalysis && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Attention Health</span>
                  </div>
                  <span className={`font-bold ${getAttentionScoreColor()}`}>
                    {attentionAnalysis.overallScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-muted-foreground">Switches:</span>
                    <span className={`font-medium ${
                      attentionAnalysis.contextSwitchAnalysis.severity === 'high' ||
                      attentionAnalysis.contextSwitchAnalysis.severity === 'excessive'
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {attentionAnalysis.contextSwitchAnalysis.totalSwitches}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-muted-foreground">Violations:</span>
                    <span className={`font-medium ${
                      attentionAnalysis.budgetViolations.length > 0
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {attentionAnalysis.budgetViolations.length}
                    </span>
                  </div>
                </div>

                {/* Peak Hours Optimization */}
                {attentionAnalysis.peakHoursAnalysis.optimizationScore < 70 && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border-l-2 border-yellow-400">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      Only {Math.round(attentionAnalysis.peakHoursAnalysis.highAttentionInPeakHours)}% of focus work is during peak hours
                    </p>
                  </div>
                )}

                {/* Timeline Visual Legend */}
                <div className="mt-3 pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Timeline Indicators</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-2 rounded-sm bg-gradient-to-b from-green-500/30 to-green-500/10" />
                      <span className="text-muted-foreground">Peak hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-red-500 border-dashed" style={{ borderTopWidth: 2, borderTopStyle: 'dashed' }} />
                      <span className="text-muted-foreground">Context switch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-2 rounded-sm bg-yellow-500/30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(245,158,11,0.3) 2px, rgba(245,158,11,0.3) 4px)' }} />
                      <span className="text-muted-foreground">Budget warning</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-2 rounded-sm bg-red-500/30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(239,68,68,0.4) 2px, rgba(239,68,68,0.4) 4px)' }} />
                      <span className="text-muted-foreground">Over budget</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Warning Message */}
          {stats.warningMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {stats.warningMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Positive feedback */}
          {!stats.isOvercommitted && stats.totalPlannedMinutes > 0 && (
            <p className="text-xs text-muted-foreground">
              {stats.totalPlannedHours < 6 && 'Light workload - room for more tasks'}
              {stats.totalPlannedHours >= 6 && stats.totalPlannedHours <= 8 && 'Healthy workload'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
