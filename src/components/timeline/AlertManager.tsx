/**
 * AlertManager - Unified Alert Display System
 *
 * Consolidates AttentionBudgetAlerts, ContextSwitchWarning, and PeakHoursOptimizer
 * into a single, managed alert system to prevent overlapping UI elements.
 */

import { useState, useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  XCircle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TimelineItem } from '@/lib/timelineUtils';
import { UserAttentionPreferences, ATTENTION_TYPE_DESCRIPTIONS } from '@/lib/attentionTypes';
import { analyzeAttentionBudget } from '@/lib/attentionBudgetEngine';
import { Z_INDEX_CLASSES } from '@/lib/z-index';
import { cn } from '@/lib/utils';

interface AlertManagerProps {
  items: TimelineItem[];
  preferences: UserAttentionPreferences | null;
  currentDate: Date;
  onTakeAction?: (action: string, data?: any) => void;
  onDismiss?: (alertId: string) => void;
  className?: string;
  maxVisible?: number;
}

interface ManagedAlert {
  id: string;
  type: 'attention' | 'context' | 'peak-hours';
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
  priority: number; // Higher number = higher priority
}

export function AlertManager({
  items,
  preferences,
  currentDate,
  onTakeAction,
  onDismiss,
  className = '',
  maxVisible = 2
}: AlertManagerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Analyze attention budget and generate alerts
  const analysis = useMemo(() => {
    if (!preferences) return null;
    return analyzeAttentionBudget(items, preferences, currentDate);
  }, [items, preferences, currentDate]);

  // Generate all alerts from different sources
  const allAlerts = useMemo((): ManagedAlert[] => {
    if (!analysis || !preferences) return [];

    const alerts: ManagedAlert[] = [];

    // 1. Attention Budget Alerts (highest priority)
    analysis.budgetViolations.forEach((violation) => {
      const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[violation.attentionType];
      const usageHours = Math.round((violation.currentUsage / 60) * 10) / 10;
      const limitHours = Math.round((violation.budgetLimit / 60) * 10) / 10;

      if (violation.severity === 'critical' || violation.severity === 'exceeded') {
        alerts.push({
          id: `budget-violation-${violation.attentionType}`,
          type: 'attention',
          severity: 'high',
          title: `${attentionDesc.label} Budget Exceeded`,
          message: `You've used ${usageHours}h of ${limitHours}h budgeted for ${attentionDesc.label.toLowerCase()} activities today.`,
          icon: <XCircle className="h-4 w-4" />,
          priority: 100,
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
          type: 'attention',
          severity: 'medium',
          title: `${attentionDesc.label} Budget Warning`,
          message: `Only ${remainingHours}h remaining of your ${limitHours}h ${attentionDesc.label.toLowerCase()} budget today.`,
          icon: <AlertTriangle className="h-4 w-4" />,
          priority: 80,
          actions: [
            {
              label: 'Adjust Schedule',
              action: 'adjust-schedule',
              data: { attentionType: violation.attentionType },
              variant: 'outline'
            }
          ],
          dismissible: true
        });
      }
    });

    // 2. Context Switch Warnings (medium priority)
    // TODO: Add context switch analysis when available
    // This would analyze items for frequent context switching between different attention types

    // 3. Peak Hours Optimization (lower priority)
    // TODO: Add peak hours optimization when available
    // This would suggest moving high-attention tasks to user's peak energy hours

    // Sort by priority (highest first)
    return alerts.sort((a, b) => b.priority - a.priority);
  }, [analysis, preferences]);

  // Filter out dismissed alerts
  const visibleAlerts = allAlerts.filter(alert => !dismissedAlerts.has(alert.id));

  // Determine which alerts to show
  const alertsToShow = showAllAlerts ? visibleAlerts : visibleAlerts.slice(0, maxVisible);
  const hiddenAlertsCount = visibleAlerts.length - alertsToShow.length;

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
    onDismiss?.(alertId);
  };

  const handleAction = (action: string, data?: any) => {
    onTakeAction?.(action, data);
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "space-y-2 max-w-2xl",
      Z_INDEX_CLASSES.ALERTS,
      className
    )}>
      {alertsToShow.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.severity === 'high' ? 'destructive' : 'default'}
          className="relative"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5 text-current">
              {alert.icon}
            </div>

            <div className="flex-1 min-w-0">
              <AlertDescription>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{alert.title}</span>
                      <Badge variant={
                        alert.severity === 'high' ? 'destructive' :
                        alert.severity === 'medium' ? 'secondary' : 'outline'
                      }>
                        {alert.type === 'attention' ? 'Budget' :
                         alert.type === 'context' ? 'Context' : 'Peak Hours'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>

                  {alert.actions && alert.actions.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {alert.actions.map((action, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant={action.variant || 'outline'}
                          onClick={() => handleAction(action.action, action.data)}
                          className="text-xs"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </div>

            {alert.dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(alert.id)}
                className="flex-shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Alert>
      ))}

      {/* Show More/Less Button */}
      {hiddenAlertsCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAllAlerts(!showAllAlerts)}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          {showAllAlerts ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show {hiddenAlertsCount} More Alert{hiddenAlertsCount > 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}
    </div>
  );
}