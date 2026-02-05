// Timeline Calculation Utilities
// Consolidates duplicate calculations from TimelineManager, TimelineWithDnd, and TimelineCanvas

import {
  NOW_LINE_POSITION,
  VIEW_MODE_CONFIG,
  TimelineViewMode,
  DEFAULT_LAYER_HEIGHT,
} from './timelineConstants';

/**
 * Calculate pixels per hour based on settings and view mode
 * Used in: TimelineManager, TimelineWithDnd, TimelineCanvas
 */
export function calculatePixelsPerHour(
  zoomHorizontal: number,
  viewMode: TimelineViewMode
): number {
  const viewModeConfig = VIEW_MODE_CONFIG[viewMode];
  const basePixelsPerHour = viewModeConfig.pixelsPerHour;
  return (zoomHorizontal / 100) * basePixelsPerHour;
}

/**
 * Calculate layer height based on zoom settings
 */
export function calculateLayerHeight(zoomVertical: number): number {
  return (zoomVertical / 100) * DEFAULT_LAYER_HEIGHT;
}

/**
 * Calculate scroll offset to show a specific number of past hours
 */
export function calculateInitialScrollOffset(
  pastHours: number,
  pixelsPerHour: number,
  viewportWidth: number = 1200
): number {
  return pastHours * pixelsPerHour - NOW_LINE_POSITION * viewportWidth;
}

/**
 * Calculate scroll offset to jump to a specific date
 */
export function calculateScrollOffsetForDate(
  targetDate: Date,
  nowTime: Date,
  pixelsPerHour: number,
  viewportWidth: number = 1200
): number {
  const hoursDiff = (targetDate.getTime() - nowTime.getTime()) / (1000 * 60 * 60);
  return -hoursDiff * pixelsPerHour + NOW_LINE_POSITION * viewportWidth;
}

/**
 * Convert pixel position to time offset in hours from NOW
 */
export function pixelToHoursFromNow(
  relativeX: number,
  viewportWidth: number,
  scrollOffset: number,
  pixelsPerHour: number
): number {
  const nowLineX = viewportWidth * NOW_LINE_POSITION;
  return (relativeX - nowLineX - scrollOffset) / pixelsPerHour;
}

/**
 * Convert hours from NOW to pixel position
 */
export function hoursFromNowToPixel(
  hoursFromNow: number,
  viewportWidth: number,
  scrollOffset: number,
  pixelsPerHour: number
): number {
  const nowLineX = viewportWidth * NOW_LINE_POSITION;
  return nowLineX + (hoursFromNow * pixelsPerHour) + scrollOffset;
}

/**
 * Calculate time from pixel position
 */
export function pixelToTime(
  relativeX: number,
  viewportWidth: number,
  scrollOffset: number,
  pixelsPerHour: number,
  nowTime: Date
): Date {
  const hoursFromNow = pixelToHoursFromNow(relativeX, viewportWidth, scrollOffset, pixelsPerHour);
  return new Date(nowTime.getTime() + hoursFromNow * 60 * 60 * 1000);
}

/**
 * Snap time to nearest interval (default 15 minutes)
 */
export function snapToInterval(date: Date, intervalMinutes: number = 15): Date {
  const snapped = new Date(date);
  const minutes = snapped.getMinutes();
  const snappedMinutes = Math.round(minutes / intervalMinutes) * intervalMinutes;
  snapped.setMinutes(snappedMinutes);
  snapped.setSeconds(0);
  snapped.setMilliseconds(0);
  return snapped;
}

/**
 * Get jump increment in hours based on view mode
 */
export function getJumpIncrementHours(viewMode: TimelineViewMode): number {
  switch (viewMode) {
    case 'day':
      return 24; // 1 day
    case 'week':
      return 24 * 7; // 1 week
    case 'month':
      return 24 * 30; // ~1 month
    default:
      return 24 * 7; // default to 1 week
  }
}

/**
 * Get label for navigation buttons based on view mode
 */
export function getJumpLabel(viewMode: TimelineViewMode): string {
  switch (viewMode) {
    case 'day':
      return 'Day';
    case 'week':
      return 'Week';
    case 'month':
      return 'Month';
    default:
      return 'Week';
  }
}

/**
 * Calculate which layer index a Y position falls into
 */
export function calculateLayerIndex(
  relativeY: number,
  headerHeight: number,
  totalHeight: number,
  layerCount: number
): number {
  const layerY = relativeY - headerHeight;
  const layerHeight = (totalHeight - headerHeight) / layerCount;
  const index = Math.floor(layerY / layerHeight);
  return Math.max(0, Math.min(index, layerCount - 1));
}

/**
 * Check if a date is within the current week
 */
export function isDateInCurrentWeek(date: Date, weekStart: Date): boolean {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return date >= weekStart && date <= weekEnd;
}

/**
 * Get the start of the current week (Monday)
 */
export function getCurrentWeekStart(date: Date = new Date()): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Format a week start date as ISO string (YYYY-MM-DD)
 */
export function formatWeekStartDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
