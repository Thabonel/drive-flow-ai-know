// View mode switcher for timeline (Day/Week/Month/Year)

import React from 'react';
import { Button } from '@/components/ui/button';
import { TimelineViewMode, VIEW_MODE_CONFIG } from '@/lib/timelineConstants';
import { Calendar, CalendarDays, CalendarRange, CalendarClock } from 'lucide-react';

interface ViewModeSwitcherProps {
  currentMode: TimelineViewMode;
  onModeChange: (mode: TimelineViewMode) => void;
}

const VIEW_MODE_ICONS = {
  day: CalendarClock,
  week: Calendar,
  month: CalendarDays,
  year: CalendarRange,
};

export function ViewModeSwitcher({ currentMode, onModeChange }: ViewModeSwitcherProps) {
  const modes: TimelineViewMode[] = ['day', 'week', 'month', 'year'];

  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
      {modes.map((mode) => {
        const Icon = VIEW_MODE_ICONS[mode];
        const config = VIEW_MODE_CONFIG[mode];
        const isActive = currentMode === mode;

        return (
          <Button
            key={mode}
            onClick={() => onModeChange(mode)}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className="gap-1.5 px-3"
          >
            <Icon className="h-4 w-4" />
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}
