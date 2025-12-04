/**
 * Plan Parser - Regex-based duration extraction
 *
 * CRITICAL: This parser uses REGEX to extract durations, NOT AI.
 * AI is never allowed to estimate or modify durations.
 * AI only schedules (assigns times to fixed-duration blocks).
 */

// Use native crypto.randomUUID() instead of uuid package

// ============================================================================
// TYPES
// ============================================================================

export interface PlanTask {
  id: string;
  index: number;
  title: string;
  description: string | null;
  user_defined_duration_minutes: number;  // IMMUTABLE - set by this parser
  dependencies: string[];
  constraints: {
    can_split: boolean;
    preferred_time: 'morning' | 'afternoon' | null;
    layer_id: string | null;
  };
  schedule: {
    status: 'unscheduled' | 'scheduled' | 'completed';
    scheduled_date: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    timeline_item_id: string | null;
    split_info: { part: number; total_parts: number } | null;
  };
  color: string;
  is_flexible: boolean;
}

export interface ParseResult {
  tasks: PlanTask[];
  totalDurationMinutes: number;
  warnings: ParseWarning[];
  errors: ParseError[];
}

export interface ParseWarning {
  line: number;
  message: string;
  suggestion: string;
}

export interface ParseError {
  line: number;
  message: string;
  raw: string;
}

// ============================================================================
// DURATION PARSING (REGEX ONLY - NO AI)
// ============================================================================

/**
 * Parse duration string to minutes.
 * Supports: 30m, 2h, 1.5h, 1h30m, 90min, 2 hours, etc.
 *
 * @param durationStr - The duration string to parse
 * @returns Minutes as integer, or null if unparseable
 */
export function parseDuration(durationStr: string): number | null {
  if (!durationStr) return null;

  const normalized = durationStr.toLowerCase().trim();

  // Pattern: Combined hours and minutes (e.g., "1h30m", "1h 30m", "1hr 30min")
  const combinedMatch = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(?:h|hr|hour|hours)\s*(\d+)\s*(?:m|min|mins|minutes?)$/
  );
  if (combinedMatch) {
    const hours = parseFloat(combinedMatch[1]);
    const mins = parseInt(combinedMatch[2], 10);
    return Math.round(hours * 60 + mins);
  }

  // Pattern: Hours only (e.g., "2h", "1.5hr", "2 hours")
  const hoursMatch = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)$/
  );
  if (hoursMatch) {
    return Math.round(parseFloat(hoursMatch[1]) * 60);
  }

  // Pattern: Minutes only (e.g., "30m", "45min", "90 minutes")
  const minsMatch = normalized.match(
    /^(\d+)\s*(?:m|min|mins|minutes?)$/
  );
  if (minsMatch) {
    return parseInt(minsMatch[1], 10);
  }

  // Pattern: Days (e.g., "1d", "2 days") - converted based on context later
  const daysMatch = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(?:d|day|days)$/
  );
  if (daysMatch) {
    // Return as negative to signal "days" - caller converts based on max_minutes_per_day
    return -Math.round(parseFloat(daysMatch[1]) * 1000); // -1000 = 1 day marker
  }

  // Pattern: Plain number (assume minutes)
  const plainNumber = normalized.match(/^(\d+)$/);
  if (plainNumber) {
    return parseInt(plainNumber[1], 10);
  }

  return null;
}

/**
 * Extract duration tag from a line of text.
 * Looks for patterns like [duration: 2h] or [2h] or (duration: 30m)
 *
 * @param line - Line of text to search
 * @returns Duration in minutes, or null if not found
 */
export function extractDurationFromLine(line: string): {
  duration: number | null;
  cleanedLine: string;
} {
  // Pattern 1: [duration: Xh] or [duration: Xm]
  const durationTagMatch = line.match(/\[duration:\s*([^\]]+)\]/i);
  if (durationTagMatch) {
    const duration = parseDuration(durationTagMatch[1]);
    const cleanedLine = line.replace(durationTagMatch[0], '').trim();
    return { duration, cleanedLine };
  }

  // Pattern 2: [Xh] or [Xm] (shorthand)
  const shorthandMatch = line.match(/\[(\d+(?:\.\d+)?(?:h|m|hr|min|hours?|minutes?))\]/i);
  if (shorthandMatch) {
    const duration = parseDuration(shorthandMatch[1]);
    const cleanedLine = line.replace(shorthandMatch[0], '').trim();
    return { duration, cleanedLine };
  }

  // Pattern 3: (Xh) or (Xm) in parentheses
  const parenMatch = line.match(/\((\d+(?:\.\d+)?(?:h|m|hr|min|hours?|minutes?))\)/i);
  if (parenMatch) {
    const duration = parseDuration(parenMatch[1]);
    const cleanedLine = line.replace(parenMatch[0], '').trim();
    return { duration, cleanedLine };
  }

  // Pattern 4: Inline "- 2 hours" or "- 30 min" at end of line
  const inlineMatch = line.match(/[-–]\s*(\d+(?:\.\d+)?)\s*(h|m|hr|min|hours?|minutes?)\s*$/i);
  if (inlineMatch) {
    const duration = parseDuration(`${inlineMatch[1]}${inlineMatch[2]}`);
    const cleanedLine = line.replace(inlineMatch[0], '').trim();
    return { duration, cleanedLine };
  }

  return { duration: null, cleanedLine: line };
}

// ============================================================================
// MARKDOWN PARSING
// ============================================================================

/**
 * Parse markdown content into structured tasks.
 * Only extracts tasks with explicit duration tags.
 *
 * @param content - Markdown content with duration tags
 * @returns Parsed tasks with warnings for missing durations
 */
export function parseMarkdownPlan(content: string): ParseResult {
  const lines = content.split('\n');
  const tasks: PlanTask[] = [];
  const warnings: ParseWarning[] = [];
  const errors: ParseError[] = [];

  let currentTask: Partial<PlanTask> | null = null;
  let taskIndex = 0;

  // Default colors for variety
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
    '#ec4899', // pink
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip empty lines
    if (!line.trim()) continue;

    // Check for heading (## Task Title [duration: 2h])
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      // Save previous task if exists
      if (currentTask?.title) {
        if (currentTask.user_defined_duration_minutes) {
          tasks.push(finalizeTask(currentTask, taskIndex++, colors));
        } else {
          warnings.push({
            line: lineNumber - 1,
            message: `Task "${currentTask.title}" has no duration specified`,
            suggestion: `Add [duration: Xh] to the task heading`,
          });
        }
      }

      // Start new task
      const { duration, cleanedLine } = extractDurationFromLine(headingMatch[2]);
      currentTask = {
        title: cleanedLine.replace(/^#+\s*/, '').trim(),
        user_defined_duration_minutes: duration || undefined,
        description: null,
      };
      continue;
    }

    // Check for list item as task (- Task [duration: 1h])
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      const { duration, cleanedLine } = extractDurationFromLine(listMatch[1]);

      // If this list item has a duration, treat it as a task
      if (duration !== null) {
        // Save previous task
        if (currentTask?.title && currentTask.user_defined_duration_minutes) {
          tasks.push(finalizeTask(currentTask, taskIndex++, colors));
        }

        tasks.push(finalizeTask({
          title: cleanedLine.replace(/^[-*]\s*/, '').trim(),
          user_defined_duration_minutes: duration,
          description: null,
        }, taskIndex++, colors));

        currentTask = null;
        continue;
      }

      // Otherwise, it's description for current task
      if (currentTask) {
        currentTask.description = currentTask.description
          ? `${currentTask.description}\n${listMatch[1]}`
          : listMatch[1];
      }
      continue;
    }

    // Regular text - add to current task description
    if (currentTask && line.trim()) {
      currentTask.description = currentTask.description
        ? `${currentTask.description}\n${line.trim()}`
        : line.trim();
    }
  }

  // Don't forget last task
  if (currentTask?.title) {
    if (currentTask.user_defined_duration_minutes) {
      tasks.push(finalizeTask(currentTask, taskIndex++, colors));
    } else {
      warnings.push({
        line: lines.length,
        message: `Task "${currentTask.title}" has no duration specified`,
        suggestion: `Add [duration: Xh] to the task heading`,
      });
    }
  }

  const totalDurationMinutes = tasks.reduce(
    (sum, t) => sum + t.user_defined_duration_minutes,
    0
  );

  return { tasks, totalDurationMinutes, warnings, errors };
}

/**
 * Create a complete PlanTask from partial data
 */
function finalizeTask(
  partial: Partial<PlanTask>,
  index: number,
  colors: string[]
): PlanTask {
  return {
    id: crypto.randomUUID(),
    index,
    title: partial.title || 'Untitled Task',
    description: partial.description || null,
    user_defined_duration_minutes: partial.user_defined_duration_minutes || 0,
    dependencies: [],
    constraints: {
      can_split: false,
      preferred_time: null,
      layer_id: null,
    },
    schedule: {
      status: 'unscheduled',
      scheduled_date: null,
      scheduled_start: null,
      scheduled_end: null,
      timeline_item_id: null,
      split_info: null,
    },
    color: colors[index % colors.length],
    is_flexible: true,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that all tasks have durations.
 * Returns errors for any tasks missing durations.
 */
export function validatePlan(tasks: PlanTask[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const task of tasks) {
    if (!task.user_defined_duration_minutes || task.user_defined_duration_minutes <= 0) {
      errors.push(`Task "${task.title}" has no valid duration`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format minutes as human-readable duration
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Calculate how many days a plan will take
 */
export function calculatePlanDays(
  totalMinutes: number,
  maxMinutesPerDay: number,
  skipWeekends: boolean
): { workDays: number; calendarDays: number } {
  const workDays = Math.ceil(totalMinutes / maxMinutesPerDay);

  if (!skipWeekends) {
    return { workDays, calendarDays: workDays };
  }

  // Estimate calendar days including weekends
  const weeks = Math.floor(workDays / 5);
  const remainder = workDays % 5;
  const calendarDays = weeks * 7 + remainder;

  return { workDays, calendarDays };
}
