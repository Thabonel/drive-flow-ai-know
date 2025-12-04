/**
 * Plan Scheduler - Constraint Satisfaction Solver
 *
 * ARCHITECTURE: "Tetris" Block Placement
 * - Blocks (tasks) have FIXED sizes (user-defined durations)
 * - Grid (calendar) has defined boundaries (working hours, max/day)
 * - This solver PLACES blocks, never RESIZES them
 *
 * AI BOUNDARY: AI can suggest optimal placement order,
 * but the actual scheduling math is done here with exact durations.
 */

import { PlanTask, formatDuration } from './planParser';

// ============================================================================
// TYPES
// ============================================================================

export interface SchedulingConfig {
  startDate: Date;
  workingHoursStart: string;  // "09:00"
  workingHoursEnd: string;    // "17:00"
  maxMinutesPerDay: number;
  skipWeekends: boolean;
  allowTaskSplitting: boolean;
  existingItems: ExistingItem[];
}

export interface ExistingItem {
  id: string;
  start_time: string;  // ISO timestamp
  duration_minutes: number;
  title: string;
  is_meeting: boolean;
}

export interface ScheduledBlock {
  taskId: string;
  taskIndex: number;
  title: string;
  date: string;              // "2024-12-09"
  startTime: string;         // "09:00"
  endTime: string;           // "10:00"
  durationMinutes: number;   // UNCHANGED from user input
  splitInfo: { part: number; totalParts: number } | null;
  conflict: ConflictInfo | null;
}

export interface ConflictInfo {
  type: 'overlap' | 'exceeds_day' | 'outside_hours';
  conflictsWith?: string;  // Item title
  message: string;
}

export interface ScheduleResult {
  scheduledBlocks: ScheduledBlock[];
  totalDays: number;
  warnings: string[];
  unscheduledTasks: PlanTask[];  // Tasks that couldn't be scheduled
}

// ============================================================================
// TIME UTILITIES
// ============================================================================

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function formatTime(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function addMinutes(timeStr: string, minutes: number): string {
  const { hours, minutes: mins } = parseTime(timeStr);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return formatTime(newHours, newMins);
}

function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return formatTime(hours, mins);
}

function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

interface TimeSlot {
  start: number;  // Minutes from midnight
  end: number;
}

function getExistingBlocksForDate(
  date: string,
  existingItems: ExistingItem[]
): TimeSlot[] {
  return existingItems
    .filter(item => item.start_time.startsWith(date))
    .map(item => {
      const startTime = new Date(item.start_time);
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      return {
        start: startMinutes,
        end: startMinutes + item.duration_minutes,
      };
    })
    .sort((a, b) => a.start - b.start);
}

function findAvailableSlot(
  date: string,
  durationMinutes: number,
  config: SchedulingConfig,
  usedMinutesToday: number
): { startTime: string; endTime: string } | null {
  const workStart = timeToMinutes(config.workingHoursStart);
  const workEnd = timeToMinutes(config.workingHoursEnd);
  const existingBlocks = getExistingBlocksForDate(date, config.existingItems);

  // Check if we've exceeded daily limit
  if (usedMinutesToday + durationMinutes > config.maxMinutesPerDay) {
    return null;
  }

  // Check if task fits in working hours at all
  if (durationMinutes > (workEnd - workStart)) {
    return null;
  }

  // Find first available slot
  let searchStart = workStart;

  for (const block of existingBlocks) {
    // Check if there's room before this block
    if (block.start - searchStart >= durationMinutes) {
      const endMinutes = searchStart + durationMinutes;
      if (endMinutes <= workEnd) {
        return {
          startTime: minutesToTime(searchStart),
          endTime: minutesToTime(endMinutes),
        };
      }
    }
    // Move search start to after this block
    searchStart = Math.max(searchStart, block.end);
  }

  // Check if there's room after all existing blocks
  if (workEnd - searchStart >= durationMinutes) {
    return {
      startTime: minutesToTime(searchStart),
      endTime: minutesToTime(searchStart + durationMinutes),
    };
  }

  return null;
}

// ============================================================================
// MAIN SCHEDULER
// ============================================================================

/**
 * Schedule tasks into available time slots.
 *
 * CRITICAL: This function NEVER modifies task durations.
 * It only assigns start/end times to fixed-size blocks.
 *
 * @param tasks - Tasks with USER-DEFINED durations (immutable)
 * @param config - Scheduling constraints
 * @returns Scheduled blocks with exact placements
 */
export function schedulePlan(
  tasks: PlanTask[],
  config: SchedulingConfig
): ScheduleResult {
  const scheduledBlocks: ScheduledBlock[] = [];
  const warnings: string[] = [];
  const unscheduledTasks: PlanTask[] = [];

  let currentDate = new Date(config.startDate);
  let usedMinutesToday = 0;
  let totalDays = 0;

  // Sort tasks by index (preserve user's order)
  const sortedTasks = [...tasks].sort((a, b) => a.index - b.index);

  for (const task of sortedTasks) {
    const duration = task.user_defined_duration_minutes;

    // Skip to next workday if needed
    while (config.skipWeekends && isWeekend(currentDate)) {
      currentDate = addDays(currentDate, 1);
    }

    // Try to find a slot for this task
    let scheduled = false;
    let attempts = 0;
    const maxAttempts = 365; // Prevent infinite loops

    while (!scheduled && attempts < maxAttempts) {
      attempts++;

      // Skip weekends
      while (config.skipWeekends && isWeekend(currentDate)) {
        currentDate = addDays(currentDate, 1);
        usedMinutesToday = 0;
      }

      const dateStr = formatDateString(currentDate);

      // Check if task fits in remaining day capacity
      const remainingToday = config.maxMinutesPerDay - usedMinutesToday;

      if (duration <= remainingToday) {
        // Task fits in current day
        const slot = findAvailableSlot(
          dateStr,
          duration,
          config,
          usedMinutesToday
        );

        if (slot) {
          scheduledBlocks.push({
            taskId: task.id,
            taskIndex: task.index,
            title: task.title,
            date: dateStr,
            startTime: slot.startTime,
            endTime: slot.endTime,
            durationMinutes: duration,  // UNCHANGED
            splitInfo: null,
            conflict: null,
          });

          usedMinutesToday += duration;
          scheduled = true;
          totalDays = Math.max(totalDays, attempts);
        } else {
          // No slot available today, try next day
          currentDate = addDays(currentDate, 1);
          usedMinutesToday = 0;
        }
      } else if (config.allowTaskSplitting && remainingToday >= 30) {
        // Split task across days
        const partDuration = remainingToday;
        const slot = findAvailableSlot(
          dateStr,
          partDuration,
          config,
          usedMinutesToday
        );

        if (slot) {
          // Calculate total parts needed
          const remainingDuration = duration - partDuration;
          const totalParts = Math.ceil(duration / config.maxMinutesPerDay) + 1;

          // Schedule first part
          scheduledBlocks.push({
            taskId: task.id,
            taskIndex: task.index,
            title: `${task.title} (Part 1)`,
            date: dateStr,
            startTime: slot.startTime,
            endTime: slot.endTime,
            durationMinutes: partDuration,
            splitInfo: { part: 1, totalParts },
            conflict: null,
          });

          usedMinutesToday += partDuration;

          // Move to next day for remaining parts
          currentDate = addDays(currentDate, 1);
          usedMinutesToday = 0;

          // Schedule remaining parts
          let remaining = remainingDuration;
          let partNum = 2;

          while (remaining > 0) {
            while (config.skipWeekends && isWeekend(currentDate)) {
              currentDate = addDays(currentDate, 1);
            }

            const nextDateStr = formatDateString(currentDate);
            const partSize = Math.min(remaining, config.maxMinutesPerDay);
            const nextSlot = findAvailableSlot(
              nextDateStr,
              partSize,
              config,
              0
            );

            if (nextSlot) {
              scheduledBlocks.push({
                taskId: task.id,
                taskIndex: task.index,
                title: `${task.title} (Part ${partNum})`,
                date: nextDateStr,
                startTime: nextSlot.startTime,
                endTime: nextSlot.endTime,
                durationMinutes: partSize,
                splitInfo: { part: partNum, totalParts },
                conflict: null,
              });

              remaining -= partSize;
              partNum++;
              usedMinutesToday = partSize;

              if (remaining > 0) {
                currentDate = addDays(currentDate, 1);
                usedMinutesToday = 0;
              }
            } else {
              currentDate = addDays(currentDate, 1);
              usedMinutesToday = 0;
            }
          }

          scheduled = true;
          warnings.push(
            `Task "${task.title}" (${formatDuration(duration)}) was split across ${totalParts} days`
          );
        } else {
          currentDate = addDays(currentDate, 1);
          usedMinutesToday = 0;
        }
      } else {
        // Can't fit and can't split - move to next day
        currentDate = addDays(currentDate, 1);
        usedMinutesToday = 0;
      }
    }

    if (!scheduled) {
      unscheduledTasks.push(task);
      warnings.push(
        `Could not schedule "${task.title}" (${formatDuration(duration)}) - task too large or no available slots`
      );
    }
  }

  // Calculate total unique days used
  const uniqueDates = new Set(scheduledBlocks.map(b => b.date));

  return {
    scheduledBlocks,
    totalDays: uniqueDates.size,
    warnings,
    unscheduledTasks,
  };
}

// ============================================================================
// SCHEDULE PREVIEW
// ============================================================================

export interface DaySchedule {
  date: string;
  dayName: string;
  blocks: ScheduledBlock[];
  totalMinutes: number;
}

/**
 * Group scheduled blocks by day for display
 */
export function groupByDay(blocks: ScheduledBlock[]): DaySchedule[] {
  const dayMap = new Map<string, ScheduledBlock[]>();

  for (const block of blocks) {
    const existing = dayMap.get(block.date) || [];
    existing.push(block);
    dayMap.set(block.date, existing);
  }

  const days: DaySchedule[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const [date, dateBlocks] of dayMap) {
    const dateObj = new Date(date);
    days.push({
      date,
      dayName: dayNames[dateObj.getDay()],
      blocks: dateBlocks.sort((a, b) =>
        timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      ),
      totalMinutes: dateBlocks.reduce((sum, b) => sum + b.durationMinutes, 0),
    });
  }

  return days.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// CONVERT TO TIMELINE ITEMS
// ============================================================================

export interface TimelineItemCreate {
  title: string;
  start_time: string;  // ISO timestamp
  duration_minutes: number;
  color: string;
  is_flexible: boolean;
  plan_id: string;
  plan_task_id: string;
}

/**
 * Convert scheduled blocks to timeline item format
 */
export function toTimelineItems(
  blocks: ScheduledBlock[],
  planId: string,
  tasks: PlanTask[]
): TimelineItemCreate[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  return blocks.map(block => {
    const task = taskMap.get(block.taskId);

    // Create ISO timestamp from date and time
    const startDateTime = new Date(`${block.date}T${block.startTime}:00`);

    return {
      title: block.title,
      start_time: startDateTime.toISOString(),
      duration_minutes: block.durationMinutes,
      color: task?.color || '#3b82f6',
      is_flexible: task?.is_flexible ?? true,
      plan_id: planId,
      plan_task_id: block.taskId,
    };
  });
}
