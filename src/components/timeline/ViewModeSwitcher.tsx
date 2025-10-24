// View mode switcher for timeline (Day/Week/Month/Year)

import React from 'react';
import { Button } from '@/components/ui/button';
import { TimelineViewMode, VIEW_MODE_CONFIG } from '@/lib/timelineConstants';

interface ViewModeSwitcherProps {
  currentMode: TimelineViewMode;
  onModeChange: (mode: TimelineViewMode) => void;
}

export function ViewModeSwitcher({ currentMode, onModeChange }: ViewModeSwitcherProps) {
  const modes: TimelineViewMode[] = ['day', 'week', 'month', 'year'];

  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
      {modes.map((mode) => {
        const config = VIEW_MODE_CONFIG[mode];
        const isActive = currentMode === mode;

        return (
          <Button
            key={mode}
            onClick={() => onModeChange(mode)}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className="px-3"
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}
