// Timeline Manager Constants

// NOW line position (30% from left, 70% for future)
export const NOW_LINE_POSITION = 0.3;

// Time scale defaults
export const DEFAULT_PIXELS_PER_HOUR = 100; // Base scale
export const MIN_PIXELS_PER_HOUR = 20;
export const MAX_PIXELS_PER_HOUR = 300;

// Vertical spacing defaults
export const DEFAULT_LAYER_HEIGHT = 80;
export const MIN_LAYER_HEIGHT = 40;
export const MAX_LAYER_HEIGHT = 150;

// Timeline margins and padding
export const TIMELINE_HEADER_HEIGHT = 60; // For time markers
export const TIMELINE_PADDING_TOP = 20;
export const TIMELINE_PADDING_BOTTOM = 20;

// Item appearance
export const ITEM_HEIGHT_RATIO = 0.7; // Item height as ratio of layer height
export const ITEM_BORDER_RADIUS = 4;
export const ITEM_PADDING = 8;

// Time markers
export const HOUR_MARKER_INTERVAL = 60; // minutes
export const SUBDIVISION_MARKER_INTERVAL = 15; // minutes

// Status colors (Tailwind classes)
export const STATUS_COLORS = {
  active: 'fill-blue-500',
  logjam: 'fill-red-500 animate-pulse',
  completed: 'fill-gray-400',
  parked: 'fill-purple-500',
};

// Default colors for new items
export const DEFAULT_ITEM_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

// Zoom increments
export const ZOOM_STEP = 20; // percentage points
export const MIN_ZOOM = 20;
export const MAX_ZOOM = 300;

// Auto-archive threshold (hours in the past)
export const DEFAULT_AUTO_ARCHIVE_HOURS = 24;

// Logjam detection threshold (minutes past end time)
export const LOGJAM_THRESHOLD_MINUTES = 0;

// Auto-park threshold (hours past end time for overdue items)
export const AUTO_PARK_HOURS = 8;

// Quick-add durations (in minutes)
export const QUICK_ADD_DURATIONS = [15, 30, 60, 120];

// Timeline visible range (hours before and after NOW)
export const DEFAULT_PAST_HOURS = 2;
export const DEFAULT_FUTURE_HOURS = 24;

// Reschedule options
export const RESCHEDULE_OPTIONS = [
  { label: '+1 hour', hours: 1 },
  { label: '+3 hours', hours: 3 },
  { label: '+6 hours', hours: 6 },
  { label: 'Tomorrow', hours: 24 },
];

// Animation durations (ms)
export const ANIMATION_DURATION = 300;

// Layer colors
export const DEFAULT_LAYER_COLORS = [
  '#64748b', // slate
  '#059669', // emerald
  '#dc2626', // red
  '#7c3aed', // violet
  '#db2777', // pink
  '#0891b2', // cyan
];

// View modes
export type TimelineViewMode = 'day' | 'week' | 'month';

export const VIEW_MODE_CONFIG = {
  day: {
    label: 'Day',
    pixelsPerHour: 200,  // 200px per hour = very detailed
    pastHours: 2,        // Show 2 hours in the past
    futureHours: 18,     // Show 18 hours in the future (total 24h)
    subdivisionMinutes: 15, // 15-minute intervals for high detail
  },
  week: {
    label: 'Week',
    pixelsPerHour: 30,   // 30px per hour = ~720px per day
    pastHours: 2,        // Show 2 hours in the past
    futureHours: 144,    // Show 6 days in the future (total 7 days)
    subdivisionMinutes: 60, // Hourly intervals
  },
  month: {
    label: 'Month',
    pixelsPerHour: 10,   // 10px per hour = ~240px per day = ~7200px per month
    pastHours: 2,        // Show 2 hours in the past
    futureHours: 552,    // Show ~3 weeks in the future (total ~30 days)
    subdivisionMinutes: 360, // 6-hour intervals
  },
};

// Calendar view configuration (Google Calendar style)
export const CALENDAR_CONFIG = {
  day: {
    columns: 1,           // Single day column
    dayStartHour: 0,      // Start at midnight
    dayEndHour: 24,       // End at midnight (full 24 hours)
    rowHeight: 60,        // 60px per hour row
    timeColumnWidth: 60,  // Width of time labels column
    headerHeight: 50,     // Height of header row
  },
  week: {
    columns: 7,           // 7 days in a week
    dayStartHour: 0,      // Start at midnight
    dayEndHour: 24,       // End at midnight (full 24 hours)
    rowHeight: 48,        // 48px per hour row (slightly smaller for week view)
    timeColumnWidth: 60,  // Width of time labels column
    headerHeight: 60,     // Height of header row (includes day name + date)
  },
};

// Get number of hours displayed in calendar view
export function getCalendarHours(config: typeof CALENDAR_CONFIG.day): number {
  return config.dayEndHour - config.dayStartHour;
}

// Calculate total calendar grid height
export function getCalendarGridHeight(config: typeof CALENDAR_CONFIG.day): number {
  return getCalendarHours(config) * config.rowHeight;
}
