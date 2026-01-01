// Calendar Header - day headers (Mon 15, Tue 16, etc.)

import React from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarHeaderProps {
  days: Date[];
  headerHeight: number;
  timeColumnWidth: number;
}

export function CalendarHeader({
  days,
  headerHeight,
  timeColumnWidth,
}: CalendarHeaderProps) {
  return (
    <div
      className="sticky top-0 z-30 flex border-b bg-background"
      style={{ height: headerHeight }}
    >
      {/* Empty cell above time column */}
      <div
        className="sticky left-0 z-40 bg-background border-r flex items-center justify-center"
        style={{ width: timeColumnWidth, minWidth: timeColumnWidth }}
      >
        <span className="text-xs text-muted-foreground">Time</span>
      </div>

      {/* Day headers */}
      <div className="flex flex-1">
        {days.map((day, index) => {
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex-1 flex flex-col items-center justify-center border-r last:border-r-0 px-2",
                isCurrentDay && "bg-primary/5"
              )}
            >
              {/* Day name (Mon, Tue, etc.) */}
              <span className={cn(
                "text-xs font-medium uppercase tracking-wider",
                isCurrentDay ? "text-primary" : "text-muted-foreground"
              )}>
                {format(day, 'EEE')}
              </span>

              {/* Date number with circle highlight for today */}
              <span className={cn(
                "text-lg font-semibold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full",
                isCurrentDay && "bg-primary text-primary-foreground"
              )}>
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
