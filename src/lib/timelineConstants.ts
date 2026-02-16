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
    totalHours: 20,           // 20 hours total
    pastRatio: 0.15,          // 15% past (3 hours)
    futureRatio: 0.85,        // 85% future (17 hours)
    pixelsPerHour: 200,
    subdivisionMinutes: 15,   // 15-minute intervals
  },
  week: {
    label: 'Week',
    totalHours: 168,          // 7 days * 24 hours
    pastRatio: 0.15,          // 15% past (~25 hours ≈ 1 day)
    futureRatio: 0.85,        // 85% future (~143 hours ≈ 6 days)
    pixelsPerHour: 30,
    subdivisionMinutes: 180,  // 3-hour intervals
  },
  month: {
    label: 'Month',
    totalHours: 720,          // 30 days * 24 hours
    pastRatio: 0.15,          // 15% past (~108 hours ≈ 4.5 days)
    futureRatio: 0.85,        // 85% future (~612 hours ≈ 25.5 days)
    pixelsPerHour: 10,
    subdivisionMinutes: 360,  // 6-hour intervals
  },
};

// Helper functions for proportional view system
export function getPastHours(config: typeof VIEW_MODE_CONFIG.day): number {
  return config.totalHours * config.pastRatio;
}

export function getFutureHours(config: typeof VIEW_MODE_CONFIG.day): number {
  return config.totalHours * config.futureRatio;
}

export function getScaledUIElements(config: typeof VIEW_MODE_CONFIG.day) {
  const { pixelsPerHour } = config;
  return {
    headerHeight: Math.max(40, pixelsPerHour * 0.3),        // Scale with time, minimum 40px
    layerHeight: Math.max(60, pixelsPerHour * 0.4),         // Scale with time, minimum 60px
    fontSize: Math.max(8, pixelsPerHour / 20),               // Readable at all scales, minimum 8px
    nowLineLabelWidth: pixelsPerHour * 0.25,                 // Proportional to scale
  };
}

export function getOptimalSubdivision(config: typeof VIEW_MODE_CONFIG.day, viewportWidth: number = ESTIMATED_VIEWPORT_WIDTH): number {
  // Calculate subdivision to maintain consistent marker density (~30-40 visible markers)
  const viewportHours = viewportWidth / config.pixelsPerHour;
  const targetMarkers = 35;
  const subdivisionMinutes = (viewportHours * 60) / targetMarkers;

  // Round to reasonable intervals (15, 30, 60, 90, 180, 360 minutes)
  const intervals = [15, 30, 60, 90, 180, 360];
  return intervals.reduce((prev, curr) =>
    Math.abs(curr - subdivisionMinutes) < Math.abs(prev - subdivisionMinutes) ? curr : prev
  );
}

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

// Recently created item detection threshold (2 minutes)
export const RECENTLY_CREATED_THRESHOLD_MS = 2 * 60 * 1000;

// Weekly calibration check interval (1 hour)
export const CALIBRATION_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Weekly calibration trigger window (Monday 8 AM - 11 AM)
export const CALIBRATION_WINDOW = {
  dayOfWeek: 1, // Monday
  startHour: 8,
  endHour: 11,
};

// Default estimated viewport width for calculations
export const ESTIMATED_VIEWPORT_WIDTH = 1200;

// Snap interval for timeline items (minutes)
export const SNAP_INTERVAL_MINUTES = 15;
