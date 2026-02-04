/**
 * Centralized Z-Index Management System
 *
 * Defines all z-index values used throughout the Timeline interface
 * to prevent overlapping elements and create clear layer hierarchy.
 */

export const Z_INDEX = {
  // Base layers
  BACKGROUND: 0,
  CONTENT: 1,

  // Timeline layers
  TIMELINE_BASE: 10,
  TIMELINE_ITEMS: 15,
  TIMELINE_HOVER: 20,
  TIMELINE_DRAGGING: 25,
  TIMELINE_NOW_LINE: 30,

  // UI Overlays (ordered by priority)
  CALENDAR_HEADERS: 35,
  CALENDAR_TIME_COLUMN: 40,
  DRAG_PREVIEW: 45,
  ALERTS: 50,
  QUICK_ADD_FORMS: 55,
  TOOLTIPS: 60,
  POPOVERS: 65,

  // Top level overlays
  DRAG_OVERLAY: 70,
  MODALS: 80,
  NOTIFICATIONS: 90,
  CRITICAL_ALERTS: 100,
} as const;

// Type for z-index values
export type ZIndexLevel = typeof Z_INDEX[keyof typeof Z_INDEX];

/**
 * Helper function to get z-index value with optional offset
 */
export function getZIndex(level: keyof typeof Z_INDEX, offset: number = 0): number {
  return Z_INDEX[level] + offset;
}

/**
 * CSS class mapping for common z-index levels
 */
export const Z_INDEX_CLASSES = {
  BACKGROUND: 'z-0',
  CONTENT: 'z-[1]',
  TIMELINE_BASE: 'z-[10]',
  TIMELINE_ITEMS: 'z-[15]',
  TIMELINE_HOVER: 'z-[20]',
  TIMELINE_DRAGGING: 'z-[25]',
  TIMELINE_NOW_LINE: 'z-[30]',
  CALENDAR_HEADERS: 'z-[35]',
  CALENDAR_TIME_COLUMN: 'z-[40]',
  DRAG_PREVIEW: 'z-[45]',
  ALERTS: 'z-[50]',
  QUICK_ADD_FORMS: 'z-[55]',
  TOOLTIPS: 'z-[60]',
  POPOVERS: 'z-[65]',
  DRAG_OVERLAY: 'z-[70]',
  MODALS: 'z-[80]',
  NOTIFICATIONS: 'z-[90]',
  CRITICAL_ALERTS: 'z-[100]',
} as const;