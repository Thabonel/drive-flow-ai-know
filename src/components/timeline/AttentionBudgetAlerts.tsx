import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  XCircle,
  Clock,
  TrendingDown,
  ArrowRight,
  Calendar,
  X
} from 'lucide-react';
import { TimelineItem } from '@/lib/timelineUtils';
import { UserAttentionPreferences, ATTENTION_TYPE_DESCRIPTIONS } from '@/lib/attentionTypes';
import { analyzeAttentionBudget } from '@/lib/attentionBudgetEngine';

interface AttentionBudgetAlertsProps {
  items: TimelineItem[];
  preferences: UserAttentionPreferences | null;
  currentDate: Date;
  onDismiss?: (alertId: string) => void;
  onTakeAction?: (action: string, data?: any) => void;
  compact?: boolean;
  className?: string;
}

interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical' | 'suggestion';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  icon: React.ReactNode;
  actions?: {
    label: string;
    action: string;
    data?: any;
    variant?: 'default' | 'outline' | 'destructive';
  }[];
  dismissible?: boolean;
}

export function AttentionBudgetAlerts({
  items,
  preferences,
  currentDate,
  onDismiss,
  onTakeAction,
  compact = false,
  className = ''
}: AttentionBudgetAlertsProps) {

  const analysis = useMemo(() => {
    if (!preferences) return null;
    return analyzeAttentionBudget(items, preferences, currentDate);
  }, [items, preferences, currentDate]);

  const alerts = useMemo((): BudgetAlert[] => {
    if (!analysis || !preferences) return [];

    const alerts: BudgetAlert[] = [];

    // Budget violation alerts
    analysis.budgetViolations.forEach((violation) => {
      const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[violation.attentionType];
      const usageHours = Math.round((violation.currentUsage / 60) * 10) / 10;
      const limitHours = Math.round((violation.budgetLimit / 60) * 10) / 10;

      if (violation.severity === 'critical' || violation.severity === 'exceeded') {
        alerts.push({
          id: `budget-violation-${violation.attentionType}`,
          type: 'critical',
          severity: 'high',
          title: `${attentionDesc.label} Budget Exceeded`,
          message: `You've used ${usageHours}h of ${limitHours}h budgeted for ${attentionDesc.label.toLowerCase()} activities today.`,
          icon: <XCircle className="h-4 w-4" />,
          actions: [
            {
              label: 'Reschedule Items',
              action: 'reschedule-attention-type',
              data: { attentionType: violation.attentionType },
              variant: 'outline'
            },
            {
              label: 'Increase Budget',
              action: 'increase-budget',
              data: { attentionType: violation.attentionType, currentLimit: violation.budgetLimit },
              variant: 'outline'
            }
          ],
          dismissible: true
        });
      } else if (violation.severity === 'approaching') {
        const remainingHours = Math.round(((violation.budgetLimit - violation.currentUsage) / 60) * 10) / 10;
        alerts.push({
          id: `budget-warning-${violation.attentionType}`,
          type: 'warning',
          severity: 'medium',
          title: `${attentionDesc.label} Budget Warning`,
          message: `Only ${remainingHours}h remaining in your ${attentionDesc.label.toLowerCase()} budget (${usageHours}h used of ${limitHours}h).`,
          icon: <AlertTriangle className="h-4 w-4" />,
          actions: [
            {
              label: 'Review Schedule',
              action: 'review-attention-schedule',
              data: { attentionType: violation.attentionType },
              variant: 'outline'
            }
          ],
          dismissible: true
        });
      }
    });

    // Context switching alerts
    if (analysis.contextSwitchAnalysis.totalSwitches > (preferences.attention_budgets.context_switches || 3)) {
      const excessSwitches = analysis.contextSwitchAnalysis.totalSwitches - (preferences.attention_budgets.context_switches || 3);
      alerts.push({
        id: 'context-switch-warning',
        type: 'warning',
        severity: 'medium',
        title: 'High Context Switching Detected',
        message: `${analysis.contextSwitchAnalysis.totalSwitches} context switches today (${excessSwitches} over budget). This may reduce your focus effectiveness.`,
        icon: <TrendingDown className="h-4 w-4" />,
        actions: [
          {
            label: 'Batch Similar Tasks',
            action: 'suggest-batching',
            data: { switches: analysis.contextSwitchAnalysis.switchPoints },
            variant: 'outline'
          },
          {
            label: 'View Timeline',
            action: 'show-context-switches',
            data: {},
            variant: 'outline'
          }
        ],
        dismissible: true
      });
    }

    // Peak hours optimization suggestions
    if (preferences.peak_hours_start && preferences.peak_hours_end) {
      const [peakStart] = preferences.peak_hours_start.split(':').map(Number);
      const [peakEnd] = preferences.peak_hours_end.split(':').map(Number);

      // Check if high-attention tasks are scheduled outside peak hours
      const highAttentionOutsidePeak = items.filter(item => {
        if (!item.attention_type || item.attention_type !== 'create') return false;

        const itemStart = new Date(item.start_time);
        const itemHour = itemStart.getHours();

        // Check if outside peak hours
        return itemHour < peakStart || itemHour >= peakEnd;
      });

      if (highAttentionOutsidePeak.length > 0) {
        alerts.push({
          id: 'peak-hours-optimization',
          type: 'suggestion',
          severity: 'low',
          title: 'Peak Hours Optimization',
          message: `${highAttentionOutsidePeak.length} creative tasks scheduled outside your peak hours (${preferences.peak_hours_start}-${preferences.peak_hours_end}).`,
          icon: <Clock className="h-4 w-4" />,
          actions: [
            {
              label: 'Optimize Schedule',
              action: 'optimize-peak-hours',
              data: { items: highAttentionOutsidePeak.map(item => item.id) },
              variant: 'outline'
            }
          ],
          dismissible: true
        });
      }
    }

    // Overall attention score alerts
    if (analysis.overallScore !== undefined && analysis.overallScore < 60) {
      const scoreLevel = analysis.overallScore < 40 ? 'critical' : 'warning';
      alerts.push({
        id: 'attention-score-low',
        type: scoreLevel,
        severity: analysis.overallScore < 40 ? 'high' : 'medium',
        title: 'Low Attention Score',
        message: `Your attention optimization score is ${analysis.overallScore}/100. Consider reorganizing your schedule.`,
        icon: <TrendingDown className="h-4 w-4" />,
        actions: [
          {
            label: 'AI Optimize Day',
            action: 'ai-optimize-day',
            data: {},
            variant: 'default'
          },
          {
            label: 'Manual Review',
            action: 'review-schedule',
            data: {},
            variant: 'outline'
          }
        ],
        dismissible: true
      });
    }

    return alerts;
  }, [analysis, preferences, items]);

  // Filter alerts by severity for display order
  const sortedAlerts = useMemo(() => {
    return alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const typeOrder = { critical: 3, warning: 2, suggestion: 1 };

      // Sort by severity first, then type
      if (a.severity !== b.severity) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return typeOrder[b.type] - typeOrder[a.type];
    });
  }, [alerts]);

  if (!analysis || sortedAlerts.length === 0) {
    return null;
  }

  // Show only top 3 alerts in compact mode
  const displayAlerts = compact ? sortedAlerts.slice(0, 3) : sortedAlerts;

  const getAlertVariant = (type: string): 'default' | 'destructive' => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {displayAlerts.map((alert) => (
        <Alert key={alert.id} variant={getAlertVariant(alert.type)}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {alert.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">{alert.title}</h4>
                <Badge
                  variant={alert.type === 'critical' ? 'destructive' : alert.type === 'warning' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>

              <AlertDescription className="text-sm">
                {alert.message}
              </AlertDescription>

              {alert.actions && alert.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {alert.actions.map((action, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={action.variant || 'outline'}
                      onClick={() => onTakeAction?.(action.action, action.data)}
                      className="text-xs h-7"
                    >
                      {action.label}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {alert.dismissible && onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(alert.id)}
                className="h-6 w-6 p-0 flex-shrink-0"
                title="Dismiss alert"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </Alert>
      ))}

      {compact && sortedAlerts.length > 3 && (
        <Alert variant="default">
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            {sortedAlerts.length - 3} more attention alerts available.
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 ml-2"
              onClick={() => onTakeAction?.('show-all-alerts', {})}
            >
              View all alerts
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}