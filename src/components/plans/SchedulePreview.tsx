/**
 * SchedulePreview Component
 *
 * Configure scheduling options and preview the plan before applying.
 * Shows day-by-day breakdown with exact times.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Split,
} from 'lucide-react';
import { useProjectPlans, ProjectPlan } from '@/hooks/useProjectPlans';
import { formatDuration, calculatePlanDays } from '@/lib/planParser';
import { DaySchedule } from '@/lib/planScheduler';

interface SchedulePreviewProps {
  open: boolean;
  onClose: () => void;
  plan: ProjectPlan | null;
  onApplied?: () => void;
}

export function SchedulePreview({ open, onClose, plan, onApplied }: SchedulePreviewProps) {
  const {
    schedulePreview,
    generateSchedulePreview,
    applyToTimeline,
    clearSchedulePreview,
    isApplying,
  } = useProjectPlans();

  // Scheduling options
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(4);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [allowSplitting, setAllowSplitting] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);

  if (!plan) return null;

  // Calculate estimates
  const totalMinutes = plan.total_duration_minutes;
  const { workDays, calendarDays } = calculatePlanDays(
    totalMinutes,
    maxHoursPerDay * 60,
    skipWeekends
  );

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    try {
      await generateSchedulePreview({
        planId: plan.id,
        startDate: new Date(startDate),
        workingHoursStart,
        workingHoursEnd,
        maxMinutesPerDay: maxHoursPerDay * 60,
        skipWeekends,
        allowTaskSplitting: allowSplitting,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    applyToTimeline(plan.id, {
      onSuccess: () => {
        onClose();
        onApplied?.();
      },
    });
  };

  const handleClose = () => {
    if (!isApplying) {
      clearSchedulePreview();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Schedule: {plan.title}
          </DialogTitle>
          <DialogDescription>
            Configure when to start and how much time per day. Your task durations are fixed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Scheduling Options */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Scheduling Options
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  {/* Max Hours/Day */}
                  <div className="space-y-2">
                    <Label htmlFor="max-hours">Max Hours/Day</Label>
                    <Input
                      id="max-hours"
                      type="number"
                      min={1}
                      max={12}
                      value={maxHoursPerDay}
                      onChange={(e) => setMaxHoursPerDay(parseInt(e.target.value) || 4)}
                    />
                  </div>

                  {/* Working Hours Start */}
                  <div className="space-y-2">
                    <Label htmlFor="work-start">Work Hours Start</Label>
                    <Input
                      id="work-start"
                      type="time"
                      value={workingHoursStart}
                      onChange={(e) => setWorkingHoursStart(e.target.value)}
                    />
                  </div>

                  {/* Working Hours End */}
                  <div className="space-y-2">
                    <Label htmlFor="work-end">Work Hours End</Label>
                    <Input
                      id="work-end"
                      type="time"
                      value={workingHoursEnd}
                      onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="skip-weekends"
                      checked={skipWeekends}
                      onCheckedChange={setSkipWeekends}
                    />
                    <Label htmlFor="skip-weekends" className="cursor-pointer">
                      Skip weekends
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="allow-splitting"
                      checked={allowSplitting}
                      onCheckedChange={setAllowSplitting}
                    />
                    <Label htmlFor="allow-splitting" className="cursor-pointer">
                      Allow splitting tasks
                    </Label>
                  </div>
                </div>

                {/* Estimate */}
                <div className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">
                    Total: {formatDuration(totalMinutes)} across {plan.total_tasks} tasks
                  </span>
                  <span className="font-medium">
                    ~{workDays} work day{workDays !== 1 ? 's' : ''}
                    {skipWeekends && workDays > 5 && ` (~${calendarDays} calendar days)`}
                  </span>
                </div>

                <Button
                  onClick={handleGenerateSchedule}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Generate Schedule
                    </>
                  )}
                </Button>
              </div>

              {/* Schedule Preview */}
              {schedulePreview && (
                <div className="space-y-4">
                  <Separator />

                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Schedule Preview</h3>
                    <Badge variant="outline">
                      {schedulePreview.result.totalDays} day{schedulePreview.result.totalDays !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Warnings */}
                  {schedulePreview.result.warnings.length > 0 && (
                    <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription>
                        <ul className="list-disc list-inside text-sm">
                          {schedulePreview.result.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Day by Day */}
                  <div className="space-y-3">
                    {schedulePreview.days.map((day) => (
                      <DayCard key={day.date} day={day} />
                    ))}
                  </div>

                  {/* Unscheduled Tasks */}
                  {schedulePreview.result.unscheduledTasks.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium mb-1">Could not schedule:</p>
                        <ul className="list-disc list-inside text-sm">
                          {schedulePreview.result.unscheduledTasks.map((t) => (
                            <li key={t.id}>
                              {t.title} ({formatDuration(t.user_defined_duration_minutes)})
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!schedulePreview || isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply to Timeline
                {schedulePreview && (
                  <Badge variant="secondary" className="ml-2">
                    {schedulePreview.result.scheduledBlocks.length} items
                  </Badge>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Day Card Component
// ============================================================================

function DayCard({ day }: { day: DaySchedule }) {
  const dateObj = new Date(day.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Day Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{formattedDate}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {formatDuration(day.totalMinutes)}
        </Badge>
      </div>

      {/* Time Blocks */}
      <div className="divide-y">
        {day.blocks.map((block, i) => (
          <div
            key={`${block.taskId}-${i}`}
            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30"
          >
            {/* Time */}
            <span className="text-sm text-muted-foreground w-20 shrink-0">
              {block.startTime}
            </span>

            {/* Color indicator */}
            <div
              className="w-1 h-8 rounded-full shrink-0"
              style={{ backgroundColor: '#3b82f6' }}
            />

            {/* Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm truncate">{block.title}</span>
                {block.splitInfo && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    <Split className="h-3 w-3 mr-1" />
                    Part {block.splitInfo.part}/{block.splitInfo.totalParts}
                  </Badge>
                )}
              </div>
            </div>

            {/* Duration */}
            <Badge variant="secondary" className="shrink-0">
              {formatDuration(block.durationMinutes)}
            </Badge>

            {/* End time */}
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground w-14 shrink-0">
              {block.endTime}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
