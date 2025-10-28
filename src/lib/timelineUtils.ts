// Timeline Manager Utility Functions

import { NOW_LINE_POSITION, DEFAULT_PIXELS_PER_HOUR, LOGJAM_THRESHOLD_MINUTES } from './timelineConstants';

export interface TimelineItem {
  id: string;
  user_id: string;
  layer_id: string;
  title: string;
  start_time: string; // ISO timestamp
  duration_minutes: number;
  status: 'active' | 'logjam' | 'completed' | 'parked';
  color: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineLayer {
  id: string;
  user_id: string;
  name: string;
  color?: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimelineSettings {
  user_id: string;
  zoom_horizontal: number;
  zoom_vertical: number;
  is_locked: boolean;
  show_completed: boolean;
  auto_archive_hours: number;
}

export interface ParkedItem {
  id: string;
  user_id: string;
  title: string;
  duration_minutes: number;
  original_layer_id?: string | null;
  color: string;
  parked_at: string;
}

/**
 * Calculate the X position of an item on the timeline
 * @param startTime - ISO timestamp of when the item starts
 * @param nowTime - Current time (Date object)
 * @param viewportWidth - Width of the viewport in pixels
 * @param pixelsPerHour - Zoom level (pixels per hour)
 * @param scrollOffset - Current scroll offset in pixels
 * @returns X position in pixels
 */
export function calculateItemX(
  startTime: string,
  nowTime: Date,
  viewportWidth: number,
  pixelsPerHour: number,
  scrollOffset: number
): number {
  const startDate = new Date(startTime);
  const hoursFromNow = (startDate.getTime() - nowTime.getTime()) / (1000 * 60 * 60);
  const nowLineX = viewportWidth * NOW_LINE_POSITION;

  return nowLineX + (hoursFromNow * pixelsPerHour) + scrollOffset;
}

/**
 * Calculate the width of an item on the timeline
 * @param durationMinutes - Duration in minutes
 * @param pixelsPerHour - Zoom level (pixels per hour)
 * @returns Width in pixels
 */
export function calculateItemWidth(durationMinutes: number, pixelsPerHour: number): number {
  return (durationMinutes / 60) * pixelsPerHour;
}

/**
 * Calculate the end time of an item
 * @param startTime - ISO timestamp of when the item starts
 * @param durationMinutes - Duration in minutes
 * @returns End time as Date object
 */
export function calculateEndTime(startTime: string, durationMinutes: number): Date {
  const startDate = new Date(startTime);
  return new Date(startDate.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Check if an item should be in logjam status
 * @param item - Timeline item
 * @param nowTime - Current time (Date object)
 * @returns True if item is past due and not completed
 */
export function shouldBeLogjammed(item: TimelineItem, nowTime: Date): boolean {
  if (item.status === 'completed' || item.status === 'parked') {
    return false;
  }

  const endTime = calculateEndTime(item.start_time, item.duration_minutes);
  const minutesPastEnd = (nowTime.getTime() - endTime.getTime()) / (1000 * 60);

  return minutesPastEnd > LOGJAM_THRESHOLD_MINUTES;
}

/**
 * Format a timestamp for display (24-hour format, no AM/PM)
 * @param timestamp - ISO timestamp
 * @returns Formatted string (e.g., "14:30" or "14" for exact hours)
 */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // If minutes are 00, show only the hour (e.g., "1", "14")
  if (minutes === 0) {
    return hours.toString();
  }

  // Otherwise show hour:minutes (e.g., "1:30", "14:45")
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Format a date for display
 * @param timestamp - ISO timestamp
 * @returns Formatted string (e.g., "Mon, Jan 1")
 */
export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format duration for display
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "1h 30m" or "45m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}

/**
 * Calculate the NOW line X position
 * @param viewportWidth - Width of the viewport in pixels
 * @param isLocked - Whether timeline is in locked mode
 * @param scrollOffset - Current scroll offset (for unlocked mode)
 * @returns X position in pixels
 */
export function calculateNowLineX(
  viewportWidth: number,
  isLocked: boolean = true,
  scrollOffset: number = 0
): number {
  if (isLocked) {
    // Locked mode: NOW line fixed at 30% from left
    return viewportWidth * NOW_LINE_POSITION;
  } else {
    // Unlocked mode: NOW line moves with timeline (at actual current time position)
    return (viewportWidth * NOW_LINE_POSITION) + scrollOffset;
  }
}

/**
 * Generate time markers for the timeline
 * @param nowTime - Current time (Date object)
 * @param viewportWidth - Width of the viewport in pixels
 * @param pixelsPerHour - Zoom level (pixels per hour)
 * @param scrollOffset - Current scroll offset in pixels
 * @param hoursBeforeNow - How many hours before NOW to show
 * @param hoursAfterNow - How many hours after NOW to show
 * @param subdivisionMinutes - Interval in minutes for subdivision markers (default 360 = 6 hours)
 * @returns Array of time marker objects with isMajor flag (midnight markers are major, subdivisions are minor)
 */
export function generateTimeMarkers(
  nowTime: Date,
  viewportWidth: number,
  pixelsPerHour: number,
  scrollOffset: number,
  hoursBeforeNow: number,
  hoursAfterNow: number,
  subdivisionMinutes: number = 360 // Default to 6-hour intervals
): Array<{ x: number; time: Date; isPast: boolean; isMajor: boolean }> {
  const markers: Array<{ x: number; time: Date; isPast: boolean; isMajor: boolean }> = [];
  const nowLineX = viewportWidth * NOW_LINE_POSITION;

  // Find today's midnight (start of current day)
  const todayMidnight = new Date(nowTime);
  todayMidnight.setHours(0, 0, 0, 0);

  // Calculate how many days to show before and after NOW
  const daysBeforeNow = Math.ceil(hoursBeforeNow / 24) + 1; // Extra day for safety
  const daysAfterNow = Math.ceil(hoursAfterNow / 24) + 1;

  // Generate markers at each midnight (day boundary) - MAJOR markers
  for (let dayOffset = -daysBeforeNow; dayOffset <= daysAfterNow; dayOffset++) {
    // Calculate the FIXED midnight timestamp for this day
    const markerTime = new Date(todayMidnight.getTime() + dayOffset * 24 * 60 * 60 * 1000);

    // Calculate hours from NOW to this marker (this changes as time flows, but markerTime doesn't)
    const hoursFromNow = (markerTime.getTime() - nowTime.getTime()) / (1000 * 60 * 60);

    // Calculate X position based on how far this marker is from NOW
    const x = nowLineX + (hoursFromNow * pixelsPerHour) + scrollOffset;

    markers.push({
      x,
      time: markerTime, // This is a FIXED timestamp (e.g., "Oct 27, 12:00 AM")
      isPast: markerTime < nowTime,
      isMajor: true,
    });

    // Generate subdivision markers (MINOR markers) within this day
    if (subdivisionMinutes < 24 * 60) { // Only if subdivisions are smaller than a day
      const subdivisionsPerDay = Math.floor((24 * 60) / subdivisionMinutes);

      for (let subIndex = 1; subIndex < subdivisionsPerDay; subIndex++) {
        const subMarkerTime = new Date(markerTime.getTime() + subIndex * subdivisionMinutes * 60 * 1000);
        const subHoursFromNow = (subMarkerTime.getTime() - nowTime.getTime()) / (1000 * 60 * 60);
        const subX = nowLineX + (subHoursFromNow * pixelsPerHour) + scrollOffset;

        markers.push({
          x: subX,
          time: subMarkerTime,
          isPast: subMarkerTime < nowTime,
          isMajor: false, // Minor marker
        });
      }
    }
  }

  // Sort markers by time to ensure proper rendering order
  return markers.sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * Calculate hours from now for a given timestamp
 * @param timestamp - ISO timestamp
 * @param nowTime - Current time (Date object)
 * @returns Hours from now (negative for past)
 */
export function hoursFromNow(timestamp: string, nowTime: Date): number {
  const date = new Date(timestamp);
  return (date.getTime() - nowTime.getTime()) / (1000 * 60 * 60);
}

/**
 * Check if an item is visible in the current viewport
 * @param item - Timeline item
 * @param nowTime - Current time
 * @param viewportWidth - Width of the viewport
 * @param pixelsPerHour - Zoom level
 * @param scrollOffset - Current scroll offset
 * @returns True if item is visible
 */
export function isItemVisible(
  item: TimelineItem,
  nowTime: Date,
  viewportWidth: number,
  pixelsPerHour: number,
  scrollOffset: number
): boolean {
  const itemX = calculateItemX(item.start_time, nowTime, viewportWidth, pixelsPerHour, scrollOffset);
  const itemWidth = calculateItemWidth(item.duration_minutes, pixelsPerHour);

  return itemX + itemWidth > 0 && itemX < viewportWidth;
}

/**
 * Get a random color from the default item colors
 * @returns Hex color string
 */
export function getRandomItemColor(): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Calculate the Y position for a layer
 * @param layerIndex - Index of the layer
 * @param layerHeight - Height of each layer
 * @param headerHeight - Height of the timeline header
 * @returns Y position in pixels
 */
export function calculateLayerY(
  layerIndex: number,
  layerHeight: number,
  headerHeight: number
): number {
  return headerHeight + (layerIndex * layerHeight);
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Reschedule an item by adding hours to its start time
 * @param currentStartTime - Current start time (ISO timestamp)
 * @param hoursToAdd - Hours to add
 * @returns New start time as ISO timestamp
 */
export function rescheduleItem(currentStartTime: string, hoursToAdd: number): string {
  const date = new Date(currentStartTime);
  date.setHours(date.getHours() + hoursToAdd);
  return date.toISOString();
}

/**
 * Check if items are in the archive window (too far in the past)
 * @param item - Timeline item
 * @param nowTime - Current time
 * @param autoArchiveHours - How many hours in the past to auto-archive
 * @returns True if item should be archived
 */
export function shouldBeArchived(
  item: TimelineItem,
  nowTime: Date,
  autoArchiveHours: number
): boolean {
  if (item.status !== 'completed') {
    return false;
  }

  const endTime = calculateEndTime(item.start_time, item.duration_minutes);
  const hoursPastEnd = (nowTime.getTime() - endTime.getTime()) / (1000 * 60 * 60);

  return hoursPastEnd > autoArchiveHours;
}
