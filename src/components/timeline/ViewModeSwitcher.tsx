// View mode switcher for timeline (Day/Week/Month/Year)
// Now uses zoom-based targeting instead of VIEW_MODE_CONFIG approach

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TimelineViewMode, VIEW_MODE_CONFIG, ZOOM_TARGET_CONFIG, getZoomTargetForMode } from '@/lib/timelineConstants';

interface ViewModeSwitcherProps {
  currentMode: TimelineViewMode;
  onModeChange: (mode: TimelineViewMode) => void;
  onZoomChange: (zoom: number) => Promise<void>;
  onTimeWindowChange: (settings: { pastHours: number; futureHours: number; subdivisionMinutes: number }) => Promise<void>;
}

export function ViewModeSwitcher({ currentMode, onModeChange, onZoomChange, onTimeWindowChange }: ViewModeSwitcherProps) {
  const modes: TimelineViewMode[] = ['day', 'week', 'month'];
  const [isTransitioning, setIsTransitioning] = useState<TimelineViewMode | null>(null);

  const handleModeClick = async (targetMode: TimelineViewMode) => {
    if (isTransitioning) return; // Prevent multiple clicks during transition

    setIsTransitioning(targetMode);

    try {
      // Get zoom and time window configuration for target mode
      const zoomConfig = ZOOM_TARGET_CONFIG[targetMode];
      const targetZoom = getZoomTargetForMode(targetMode);

      // Apply zoom change first (this gives immediate visual feedback)
      await onZoomChange(targetZoom);

      // Update time window settings separately
      await onTimeWindowChange({
        pastHours: zoomConfig.pastHours,
        futureHours: zoomConfig.futureHours,
        subdivisionMinutes: zoomConfig.subdivisionMinutes
      });

      // Update UI state
      onModeChange(targetMode);
    } catch (error) {
      console.error('Error switching view mode:', error);
      // Could add toast error here if needed
    } finally {
      setIsTransitioning(null);
    }
  };

  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
      {modes.map((mode) => {
        const config = VIEW_MODE_CONFIG[mode];
        const isActive = currentMode === mode;
        const isLoading = isTransitioning === mode;

        return (
          <Button
            key={mode}
            onClick={() => handleModeClick(mode)}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className="px-3"
            disabled={isLoading || isTransitioning !== null}
          >
            {isLoading ? '...' : config.label}
          </Button>
        );
      })}
    </div>
  );
}
