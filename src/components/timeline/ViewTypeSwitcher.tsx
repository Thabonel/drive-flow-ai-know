// View type switcher for timeline (Timeline vs Calendar view)

import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutList, CalendarDays } from 'lucide-react';

export type ViewType = 'timeline' | 'calendar';

interface ViewTypeSwitcherProps {
  currentViewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
}

export function ViewTypeSwitcher({ currentViewType, onViewTypeChange }: ViewTypeSwitcherProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
      <Button
        onClick={() => onViewTypeChange('timeline')}
        variant={currentViewType === 'timeline' ? 'default' : 'ghost'}
        size="sm"
        className="gap-2 px-3"
      >
        <LayoutList className="h-4 w-4" />
        Timeline
      </Button>
      <Button
        onClick={() => onViewTypeChange('calendar')}
        variant={currentViewType === 'calendar' ? 'default' : 'ghost'}
        size="sm"
        className="gap-2 px-3"
      >
        <CalendarDays className="h-4 w-4" />
        Calendar
      </Button>
    </div>
  );
}
