// Magnetic Timeline Utilities - Gap-free 24-hour timeline calculations

export interface MagneticTimelineItem {
  id: string;
  user_id: string;
  title: string;
  start_time: string; // ISO timestamp - always on current day
  duration_minutes: number;
  color: string;
  is_locked_time: boolean; // Cannot be moved/compressed
  is_flexible: boolean; // Can be compressed/expanded
  original_duration?: number; // Store original duration for flexible items
  template_id?: string | null; // Reference to template if created from one
  created_at: string;
  updated_at: string;
}

export interface MagneticTimelineBlock {
  item: MagneticTimelineItem;
  startMinutes: number; // Minutes from midnight (0-1439)
  endMinutes: number; // Minutes from midnight
  isCompressed: boolean; // Currently compressed below original duration
}

/**
 * Calculate minutes from midnight for a given ISO timestamp
 */
export function getMinutesFromMidnight(timestamp: string): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Create ISO timestamp from minutes since midnight (on current day)
 */
export function createTimestampFromMinutes(minutesFromMidnight: number, baseDate: Date = new Date()): string {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0); // Start at midnight
  date.setMinutes(minutesFromMidnight);
  return date.toISOString();
}

/**
 * Get today's midnight timestamp
 */
export function getTodayMidnight(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Check if timeline items cover exactly 24 hours
 */
export function validateFullCoverage(items: MagneticTimelineItem[]): boolean {
  if (items.length === 0) return false;

  const blocks = itemsToBlocks(items);
  const totalMinutes = blocks.reduce((sum, block) => sum + (block.endMinutes - block.startMinutes), 0);

  return totalMinutes === 1440; // 24 hours = 1440 minutes
}

/**
 * Check for gaps in timeline coverage
 */
export function findGaps(blocks: MagneticTimelineBlock[]): Array<{ start: number; end: number; duration: number }> {
  const gaps: Array<{ start: number; end: number; duration: number }> = [];

  // Sort blocks by start time
  const sorted = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes);

  // Check for gap at start (before first item)
  if (sorted.length > 0 && sorted[0].startMinutes > 0) {
    gaps.push({
      start: 0,
      end: sorted[0].startMinutes,
      duration: sorted[0].startMinutes,
    });
  }

  // Check for gaps between items
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = sorted[i].endMinutes;
    const nextStart = sorted[i + 1].startMinutes;

    if (nextStart > currentEnd) {
      gaps.push({
        start: currentEnd,
        end: nextStart,
        duration: nextStart - currentEnd,
      });
    }
  }

  // Check for gap at end (after last item)
  if (sorted.length > 0) {
    const lastEnd = sorted[sorted.length - 1].endMinutes;
    if (lastEnd < 1440) {
      gaps.push({
        start: lastEnd,
        end: 1440,
        duration: 1440 - lastEnd,
      });
    }
  }

  return gaps;
}

/**
 * Convert items to timeline blocks with calculated positions
 */
export function itemsToBlocks(items: MagneticTimelineItem[]): MagneticTimelineBlock[] {
  return items.map(item => {
    const startMinutes = getMinutesFromMidnight(item.start_time);
    const endMinutes = startMinutes + item.duration_minutes;
    const isCompressed = item.is_flexible && item.original_duration
      ? item.duration_minutes < item.original_duration
      : false;

    return {
      item,
      startMinutes,
      endMinutes,
      isCompressed,
    };
  });
}

/**
 * Magnetic reflow algorithm - automatically adjusts timeline to eliminate gaps
 *
 * Strategy:
 * 1. Keep locked items in place
 * 2. Identify gaps
 * 3. Expand flexible items proportionally to fill gaps
 * 4. If no flexible items, shift everything to close gaps
 */
export function applyMagneticReflow(
  items: MagneticTimelineItem[]
): MagneticTimelineItem[] {
  if (items.length === 0) return items;

  let blocks = itemsToBlocks(items);
  blocks.sort((a, b) => a.startMinutes - b.startMinutes);

  // Find all gaps
  const gaps = findGaps(blocks);

  if (gaps.length === 0) {
    // No gaps, check for overlaps
    return resolveOverlaps(items);
  }

  // Strategy 1: Fill gaps by shifting non-locked items
  blocks = fillGapsByShifting(blocks, gaps);

  // Strategy 2: If gaps remain, expand flexible items
  const remainingGaps = findGaps(blocks);
  if (remainingGaps.length > 0) {
    blocks = fillGapsByExpanding(blocks, remainingGaps);
  }

  // Convert blocks back to items with updated times
  return blocksToItems(blocks);
}

/**
 * Fill gaps by shifting non-locked items leftward
 */
function fillGapsByShifting(
  blocks: MagneticTimelineBlock[],
  gaps: Array<{ start: number; end: number; duration: number }>
): MagneticTimelineBlock[] {
  const result = [...blocks];

  // Process gaps from left to right
  for (const gap of gaps) {
    // Find all blocks that start after this gap
    const blocksAfterGap = result.filter(b => b.startMinutes >= gap.end);

    // Shift them left by the gap duration (unless they're locked)
    for (const block of blocksAfterGap) {
      if (!block.item.is_locked_time) {
        block.startMinutes -= gap.duration;
        block.endMinutes -= gap.duration;
      }
    }
  }

  return result;
}

/**
 * Fill remaining gaps by expanding flexible items proportionally
 */
function fillGapsByExpanding(
  blocks: MagneticTimelineBlock[],
  gaps: Array<{ start: number; end: number; duration: number }>
): MagneticTimelineBlock[] {
  const result = [...blocks];

  // Find all flexible items
  const flexibleBlocks = result.filter(b => b.item.is_flexible);

  if (flexibleBlocks.length === 0) {
    // No flexible items, can't fill gaps this way
    return result;
  }

  // Calculate total gap duration
  const totalGapDuration = gaps.reduce((sum, gap) => sum + gap.duration, 0);

  // Distribute gap duration proportionally to flexible items
  const expansionPerItem = totalGapDuration / flexibleBlocks.length;

  for (const block of flexibleBlocks) {
    const newDuration = block.item.duration_minutes + expansionPerItem;
    block.item.duration_minutes = Math.round(newDuration);
    block.endMinutes = block.startMinutes + block.item.duration_minutes;
  }

  return result;
}

/**
 * Resolve overlaps by compressing flexible items
 */
export function resolveOverlaps(items: MagneticTimelineItem[]): MagneticTimelineItem[] {
  let blocks = itemsToBlocks(items);
  blocks.sort((a, b) => a.startMinutes - b.startMinutes);

  // Check for overlaps
  for (let i = 0; i < blocks.length - 1; i++) {
    const current = blocks[i];
    const next = blocks[i + 1];

    if (current.endMinutes > next.startMinutes) {
      // Overlap detected
      const overlapDuration = current.endMinutes - next.startMinutes;

      // Strategy: Compress the current item if flexible
      if (current.item.is_flexible) {
        current.item.duration_minutes -= overlapDuration;
        current.endMinutes = current.startMinutes + current.item.duration_minutes;
      }
      // Otherwise: Shift next item forward
      else if (!next.item.is_locked_time) {
        const shift = overlapDuration;
        next.startMinutes += shift;
        next.endMinutes += shift;

        // Update start_time
        next.item.start_time = createTimestampFromMinutes(next.startMinutes);
      }
    }
  }

  return blocksToItems(blocks);
}

/**
 * Convert blocks back to items with updated timestamps
 */
function blocksToItems(blocks: MagneticTimelineBlock[]): MagneticTimelineItem[] {
  return blocks.map(block => ({
    ...block.item,
    start_time: createTimestampFromMinutes(block.startMinutes),
    duration_minutes: block.endMinutes - block.startMinutes,
  }));
}

/**
 * Insert a new item into the magnetic timeline at a specific position
 * This will trigger reflow to maintain gap-free coverage
 */
export function insertItemAtPosition(
  existingItems: MagneticTimelineItem[],
  newItem: MagneticTimelineItem,
  targetMinutesFromMidnight: number
): MagneticTimelineItem[] {
  // Set the new item's start time
  newItem.start_time = createTimestampFromMinutes(targetMinutesFromMidnight);

  // Add to items list
  const allItems = [...existingItems, newItem];

  // Apply magnetic reflow to eliminate any gaps or overlaps
  return applyMagneticReflow(allItems);
}

/**
 * Move an item to a new position and reflow
 */
export function moveItem(
  items: MagneticTimelineItem[],
  itemId: string,
  newStartMinutes: number
): MagneticTimelineItem[] {
  const updatedItems = items.map(item => {
    if (item.id === itemId) {
      // Don't move locked items
      if (item.is_locked_time) return item;

      return {
        ...item,
        start_time: createTimestampFromMinutes(newStartMinutes),
      };
    }
    return item;
  });

  return applyMagneticReflow(updatedItems);
}

/**
 * Resize an item and reflow
 */
export function resizeItem(
  items: MagneticTimelineItem[],
  itemId: string,
  newDurationMinutes: number
): MagneticTimelineItem[] {
  const updatedItems = items.map(item => {
    if (item.id === itemId) {
      // Store original duration if this is first resize
      const original_duration = item.original_duration || item.duration_minutes;

      return {
        ...item,
        duration_minutes: newDurationMinutes,
        original_duration,
      };
    }
    return item;
  });

  return applyMagneticReflow(updatedItems);
}

/**
 * Split an item at a specific time (blade tool)
 */
export function splitItemAt(
  items: MagneticTimelineItem[],
  itemId: string,
  splitMinutesFromMidnight: number
): MagneticTimelineItem[] {
  const itemToSplit = items.find(i => i.id === itemId);
  if (!itemToSplit) return items;

  const itemStartMinutes = getMinutesFromMidnight(itemToSplit.start_time);
  const itemEndMinutes = itemStartMinutes + itemToSplit.duration_minutes;

  // Validate split is within item bounds
  if (splitMinutesFromMidnight <= itemStartMinutes || splitMinutesFromMidnight >= itemEndMinutes) {
    return items;
  }

  // Calculate durations for both parts
  const firstPartDuration = splitMinutesFromMidnight - itemStartMinutes;
  const secondPartDuration = itemEndMinutes - splitMinutesFromMidnight;

  // Create two new items
  const firstPart: MagneticTimelineItem = {
    ...itemToSplit,
    id: `${itemToSplit.id}_part1_${Date.now()}`,
    duration_minutes: firstPartDuration,
    title: `${itemToSplit.title} (1/2)`,
  };

  const secondPart: MagneticTimelineItem = {
    ...itemToSplit,
    id: `${itemToSplit.id}_part2_${Date.now()}`,
    start_time: createTimestampFromMinutes(splitMinutesFromMidnight),
    duration_minutes: secondPartDuration,
    title: `${itemToSplit.title} (2/2)`,
  };

  // Remove original, add both parts
  const otherItems = items.filter(i => i.id !== itemId);
  return [...otherItems, firstPart, secondPart];
}

/**
 * Initialize a default 24-hour timeline (for new users)
 */
export function createDefault24HourTimeline(userId: string): MagneticTimelineItem[] {
  const midnight = getTodayMidnight();

  return [
    {
      id: `sleep_${Date.now()}`,
      user_id: userId,
      title: 'Sleep',
      start_time: createTimestampFromMinutes(0, midnight), // 12:00 AM
      duration_minutes: 480, // 8 hours
      color: '#6366f1', // Indigo
      is_locked_time: true,
      is_flexible: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `morning_${Date.now()}`,
      user_id: userId,
      title: 'Morning Routine',
      start_time: createTimestampFromMinutes(480, midnight), // 8:00 AM
      duration_minutes: 60, // 1 hour
      color: '#f59e0b', // Amber
      is_locked_time: false,
      is_flexible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `work_${Date.now()}`,
      user_id: userId,
      title: 'Work',
      start_time: createTimestampFromMinutes(540, midnight), // 9:00 AM
      duration_minutes: 480, // 8 hours
      color: '#3b82f6', // Blue
      is_locked_time: false,
      is_flexible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `evening_${Date.now()}`,
      user_id: userId,
      title: 'Evening',
      start_time: createTimestampFromMinutes(1020, midnight), // 5:00 PM
      duration_minutes: 420, // 7 hours
      color: '#10b981', // Green
      is_locked_time: false,
      is_flexible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}
