import { RecurrencePattern } from '@/hooks/useTasks';

/**
 * Calculate the next N occurrences of a recurring task based on the pattern
 * @param startDate - The first occurrence date
 * @param pattern - The recurrence pattern
 * @param endDate - Optional end date (null for infinite)
 * @param maxOccurrences - Maximum number of occurrences to generate (default: 52 for ~1 year)
 * @returns Array of ISO date strings for each occurrence
 */
export function calculateRecurringDates(
  startDate: string,
  pattern: RecurrencePattern,
  endDate: string | null = null,
  maxOccurrences: number = 52
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  let currentDate = new Date(start);
  let count = 0;

  while (count < maxOccurrences) {
    // Check if we've exceeded the end date
    if (end && currentDate > end) {
      break;
    }

    // Add the current date (first iteration adds the start date)
    dates.push(currentDate.toISOString());
    count++;

    // Calculate the next occurrence based on frequency
    currentDate = getNextOccurrence(currentDate, pattern);

    // Safety check to prevent infinite loops
    if (!currentDate) break;
  }

  return dates;
}

/**
 * Get the next occurrence date based on the recurrence pattern
 */
function getNextOccurrence(
  currentDate: Date,
  pattern: RecurrencePattern
): Date | null {
  const next = new Date(currentDate);

  switch (pattern.frequency) {
    case 'daily':
      return getDailyNext(next, pattern.interval);

    case 'weekly':
      return getWeeklyNext(next, pattern.interval, pattern.daysOfWeek || []);

    case 'monthly':
      return getMonthlyNext(next, pattern.interval, pattern.dayOfMonth || 1);

    default:
      return null;
  }
}

/**
 * Calculate next daily occurrence
 */
function getDailyNext(date: Date, interval: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + interval);
  return next;
}

/**
 * Calculate next weekly occurrence
 * For weekly patterns, we need to find the next day that matches one of the selected days of week
 */
function getWeeklyNext(
  date: Date,
  interval: number,
  daysOfWeek: number[]
): Date {
  if (daysOfWeek.length === 0) {
    // Fallback: treat as weekly (every 7 days)
    const next = new Date(date);
    next.setDate(next.getDate() + (7 * interval));
    return next;
  }

  const next = new Date(date);
  const currentDayOfWeek = next.getDay();

  // Sort days of week to find the next one
  const sortedDays = [...daysOfWeek].sort((a, b) => a - b);

  // Find the next day in the current week
  const nextDayInWeek = sortedDays.find(day => day > currentDayOfWeek);

  if (nextDayInWeek !== undefined) {
    // Next occurrence is later this week
    const daysToAdd = nextDayInWeek - currentDayOfWeek;
    next.setDate(next.getDate() + daysToAdd);
  } else {
    // Next occurrence is in a future week
    // Jump to the interval-th next week and use the first selected day
    const daysUntilNextWeek = 7 - currentDayOfWeek + sortedDays[0];
    const weeksToSkip = interval - 1;
    next.setDate(next.getDate() + daysUntilNextWeek + (weeksToSkip * 7));
  }

  return next;
}

/**
 * Calculate next monthly occurrence
 * Handles edge cases like day 31 in months with fewer days
 */
function getMonthlyNext(
  date: Date,
  interval: number,
  dayOfMonth: number
): Date {
  const next = new Date(date);

  // Move to next month(s)
  next.setMonth(next.getMonth() + interval);

  // Set the target day, handling months with fewer days
  const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(dayOfMonth, lastDayOfMonth);

  next.setDate(targetDay);

  return next;
}

/**
 * Align a start date to the next valid occurrence based on the recurrence pattern
 * For example, if pattern is "Weekly on Monday" and startDate is Wednesday,
 * this will return the next Monday at the same time.
 *
 * @param startDate - The proposed start date (e.g., drop position on timeline)
 * @param pattern - The recurrence pattern
 * @returns Aligned ISO date string
 */
export function alignStartDateToPattern(
  startDate: string,
  pattern: RecurrencePattern
): string {
  const start = new Date(startDate);

  switch (pattern.frequency) {
    case 'daily':
      // Daily patterns don't need alignment - any day is valid
      return startDate;

    case 'weekly': {
      const daysOfWeek = pattern.daysOfWeek || [];
      if (daysOfWeek.length === 0) {
        // No specific days selected, use start date as-is
        return startDate;
      }

      const currentDayOfWeek = start.getDay();
      const sortedDays = [...daysOfWeek].sort((a, b) => a - b);

      // Check if current day is already in the pattern
      if (sortedDays.includes(currentDayOfWeek)) {
        return startDate;
      }

      // Find the next valid day
      const nextDayInWeek = sortedDays.find(day => day > currentDayOfWeek);

      if (nextDayInWeek !== undefined) {
        // Next occurrence is later this week
        const daysToAdd = nextDayInWeek - currentDayOfWeek;
        const aligned = new Date(start);
        aligned.setDate(aligned.getDate() + daysToAdd);
        return aligned.toISOString();
      } else {
        // Next occurrence is next week (use first selected day)
        const daysUntilNextWeek = 7 - currentDayOfWeek + sortedDays[0];
        const aligned = new Date(start);
        aligned.setDate(aligned.getDate() + daysUntilNextWeek);
        return aligned.toISOString();
      }
    }

    case 'monthly': {
      const dayOfMonth = pattern.dayOfMonth || 1;
      const currentDay = start.getDate();

      // If we're already on the target day, use the start date
      if (currentDay === dayOfMonth) {
        return startDate;
      }

      // If the target day hasn't passed this month, use it
      if (currentDay < dayOfMonth) {
        const aligned = new Date(start);
        const lastDayOfMonth = new Date(aligned.getFullYear(), aligned.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(dayOfMonth, lastDayOfMonth);
        aligned.setDate(targetDay);
        return aligned.toISOString();
      }

      // Target day has passed, move to next month
      const aligned = new Date(start);
      aligned.setMonth(aligned.getMonth() + 1);
      const lastDayOfMonth = new Date(aligned.getFullYear(), aligned.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(dayOfMonth, lastDayOfMonth);
      aligned.setDate(targetDay);
      return aligned.toISOString();
    }

    default:
      return startDate;
  }
}

/**
 * Format a recurrence pattern into a human-readable description
 */
export function formatRecurrenceDescription(pattern: RecurrencePattern): string {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  switch (pattern.frequency) {
    case 'daily':
      return pattern.interval === 1
        ? 'Daily'
        : `Every ${pattern.interval} days`;

    case 'weekly': {
      const days = pattern.daysOfWeek || [];
      if (days.length === 0) {
        return pattern.interval === 1 ? 'Weekly' : `Every ${pattern.interval} weeks`;
      }
      if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) {
        return 'Weekdays (Mon-Fri)';
      }
      if (days.length === 1) {
        return `Every ${DAYS[days[0]]}`;
      }
      const dayNames = days.map(d => DAYS[d]).join(', ');
      return pattern.interval === 1
        ? `Weekly (${dayNames})`
        : `Every ${pattern.interval} weeks (${dayNames})`;
    }

    case 'monthly':
      return pattern.interval === 1
        ? `Monthly on day ${pattern.dayOfMonth || 1}`
        : `Every ${pattern.interval} months on day ${pattern.dayOfMonth || 1}`;

    default:
      return 'Custom recurrence';
  }
}
