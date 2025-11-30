// Main hook for timeline state management
// This is now a thin wrapper around TimelineContext to ensure all components share the same state
// Previously, each component calling useTimeline() got its own isolated state - this caused
// dropped items to not appear until page refresh.

import { useTimelineContext } from '@/contexts/TimelineContext';

// Re-export types for convenience
export type { TimelineItem, TimelineSettings, ParkedItem } from '@/lib/timelineUtils';

/**
 * Hook for accessing shared timeline state.
 *
 * IMPORTANT: This hook must be used within a TimelineProvider.
 * The Timeline page wraps its content with TimelineProvider to ensure
 * all child components (TimelineWithDnd, TimelineManager, etc.) share
 * the same state instance.
 *
 * This fixes the issue where:
 * - TimelineWithDnd's addItem() updated one state instance
 * - TimelineManager's items came from a different state instance
 * - Result: dropped items didn't appear until page refresh
 */
export function useTimeline() {
  return useTimelineContext();
}
