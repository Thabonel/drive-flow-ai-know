// Calendar Time Column - left side time labels (6 AM, 7 AM, etc.)

import React from 'react';
import { format } from 'date-fns';
import { Z_INDEX_CLASSES } from '@/lib/z-index';
import { cn } from '@/lib/utils';

interface CalendarTimeColumnProps {
  startHour: number;
  endHour: number;
  rowHeight: number;
  headerHeight: number;
  width: number;
}

export function CalendarTimeColumn({
  startHour,
  endHour,
  rowHeight,
  headerHeight,
  width,
}: CalendarTimeColumnProps) {
  const hours = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    hours.push(hour);
  }

  // Format hour to 12-hour format (6 AM, 7 AM, etc.)
  const formatHour = (hour: number): string => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return format(date, 'h a');
  };

  return (
    <div
      className={cn("sticky left-0 bg-background border-r", Z_INDEX_CLASSES.CALENDAR_TIME_COLUMN)}
      style={{ width, minWidth: width }}
    >
      {/* Empty header cell */}
      <div
        className="border-b bg-muted/30"
        style={{ height: headerHeight }}
      />

      {/* Hour labels */}
      <div className="relative">
        {hours.map((hour, index) => (
          <div
            key={hour}
            className="relative border-b border-dashed border-border/60 text-xs text-muted-foreground pr-2 flex items-start justify-end"
            style={{ height: rowHeight }}
          >
            <span className="relative -top-2 bg-background px-1">
              {formatHour(hour)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
