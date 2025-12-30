import { useState } from 'react';
import { TimelineItem } from '@/lib/timelineUtils';
import { useWorkload } from '@/hooks/useWorkload';
import { AlertCircle, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface WorkloadIndicatorProps {
  items: TimelineItem[];
  targetDate?: Date;
  compact?: boolean;
}

export function WorkloadIndicator({ items, targetDate, compact = false }: WorkloadIndicatorProps) {
  const { stats } = useWorkload(items, targetDate);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('timeline-workload-collapsed') !== 'false';
  });

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('timeline-workload-collapsed', String(newState));
  };

  // Determine color based on workload
  const getWorkloadColor = () => {
    if (stats.totalPlannedHours > 8) {
      return 'text-red-600 dark:text-red-400';
    } else if (stats.totalPlannedHours >= 6) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressColor = () => {
    if (stats.totalPlannedHours > 8) {
      return 'bg-red-500';
    } else if (stats.totalPlannedHours >= 6) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
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
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4" />
        <span className={getWorkloadColor()}>
          {formatHours(stats.totalPlannedMinutes)} / 8h
        </span>
        {stats.isOvercommitted && (
          <AlertCircle className="h-4 w-4 text-red-500" />
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
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-sm font-medium ${getWorkloadColor()}`}>
            {stats.utilizationPercent}%
          </div>
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

          {/* Breakdown */}
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
