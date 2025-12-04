/**
 * PlanList Component
 *
 * Shows all saved plans with actions to schedule or delete.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Clock,
  Calendar,
  MoreVertical,
  Trash2,
  CalendarPlus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useProjectPlans, ProjectPlan } from '@/hooks/useProjectPlans';
import { formatDuration } from '@/lib/planParser';

interface PlanListProps {
  open: boolean;
  onClose: () => void;
  onSchedulePlan: (plan: ProjectPlan) => void;
}

export function PlanList({ open, onClose, onSchedulePlan }: PlanListProps) {
  const { plans, isLoading, deletePlan } = useProjectPlans();

  const getStatusBadge = (status: ProjectPlan['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'parsed':
        return <Badge variant="outline">Ready</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Scheduled</Badge>;
      case 'applied':
        return <Badge variant="default" className="bg-green-600">Applied</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-600">In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-700">Completed</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Plans
          </DialogTitle>
          <DialogDescription>
            View and manage your project plans. Schedule a plan to add it to your timeline.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No plans yet</p>
              <p className="text-sm">Create a plan to get started</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSchedule={() => onSchedulePlan(plan)}
                  onDelete={() => deletePlan(plan.id)}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Plan Card
// ============================================================================

interface PlanCardProps {
  plan: ProjectPlan;
  onSchedule: () => void;
  onDelete: () => void;
  getStatusBadge: (status: ProjectPlan['status']) => React.ReactNode;
  formatDate: (date: string) => string;
}

function PlanCard({ plan, onSchedule, onDelete, getStatusBadge, formatDate }: PlanCardProps) {
  const hasWarnings = plan.validation_errors && plan.validation_errors.length > 0;
  const canSchedule = plan.status === 'parsed' || plan.status === 'scheduled';

  return (
    <div className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate">{plan.title}</h4>
            {getStatusBadge(plan.status)}
            {hasWarnings && (
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
            )}
          </div>

          {plan.description && (
            <p className="text-sm text-muted-foreground truncate mb-2">
              {plan.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {plan.total_tasks} task{plan.total_tasks !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(plan.total_duration_minutes)}
            </span>
            {plan.target_start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Starts {formatDate(plan.target_start_date)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canSchedule && (
            <Button size="sm" onClick={onSchedule}>
              <CalendarPlus className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          )}

          {plan.status === 'applied' && (
            <Button size="sm" variant="outline" disabled>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Applied
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canSchedule && (
                <DropdownMenuItem onClick={onSchedule}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Schedule Plan
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-yellow-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {plan.validation_errors.length} task{plan.validation_errors.length !== 1 ? 's' : ''} missing duration
          </p>
        </div>
      )}
    </div>
  );
}
