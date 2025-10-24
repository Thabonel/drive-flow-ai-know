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

// Quick-add durations (in minutes)
export const QUICK_ADD_DURATIONS = [15, 30, 60, 120];

// Timeline visible range (hours before and after NOW)
export const DEFAULT_PAST_HOURS = 12;
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
export type TimelineViewMode = 'day' | 'week' | 'month' | 'year';

export const VIEW_MODE_CONFIG = {
  day: {
    label: 'Day',
    pixelsPerHour: 200,  // 200px per hour = very detailed
    pastHours: 6,        // Show 6 hours in the past
    futureHours: 18,     // Show 18 hours in the future (total 24h)
  },
  week: {
    label: 'Week',
    pixelsPerHour: 30,   // 30px per hour = ~720px per day
    pastHours: 24,       // Show 1 day in the past
    futureHours: 144,    // Show 6 days in the future (total 7 days)
  },
  month: {
    label: 'Month',
    pixelsPerHour: 7,    // 7px per hour = ~168px per day = ~5040px per month
    pastHours: 168,      // Show 1 week in the past
    futureHours: 552,    // Show ~3 weeks in the future (total ~30 days)
  },
  year: {
    label: 'Year',
    pixelsPerHour: 1.5,  // 1.5px per hour = ~36px per day = ~13,140px per year
    pastHours: 720,      // Show 1 month in the past
    futureHours: 8040,   // Show ~11 months in the future (total ~12 months)
  },
};
