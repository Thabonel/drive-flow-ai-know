// Calendar Grid - Main Google Calendar-style view component

import React, { useMemo, useRef, useEffect } from 'react';
import { startOfDay, addDays, format, isSameDay, startOfWeek, isToday } from 'date-fns';
import { CalendarTimeColumn } from './CalendarTimeColumn';
import { CalendarHeader } from './CalendarHeader';
import { CalendarEvent } from './CalendarEvent';
import { TimelineItem as TimelineItemType } from '@/lib/timelineUtils';
import { TimelineViewMode, CALENDAR_CONFIG } from '@/lib/timelineConstants';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  items: TimelineItemType[];
  viewMode: TimelineViewMode;
  nowTime: Date;
  onItemClick: (item: TimelineItemType) => void;
  onItemDrop?: (item: TimelineItemType, newStartTime: string, newLayerId: string) => void;
  onItemResize?: (item: TimelineItemType, newDurationMinutes: number) => void;
  onDoubleClick?: (startTime: string, layerId: string) => void;
  defaultLayerId?: string;
}

// Find overlapping events in a day
function findOverlaps(items: TimelineItemType[]): Map<string, { count: number; index: number }> {
  const result = new Map<string, { count: number; index: number }>();

  // Sort by start time
  const sorted = [...items].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const itemStart = new Date(item.start_time).getTime();
    const itemEnd = itemStart + item.duration_minutes * 60 * 1000;

    // Find all items that overlap with this one
    const overlapping = sorted.filter((other, j) => {
      if (other.id === item.id) return false;
      const otherStart = new Date(other.start_time).getTime();
      const otherEnd = otherStart + other.duration_minutes * 60 * 1000;
      return itemStart < otherEnd && itemEnd > otherStart;
    });

    // Assign index based on position among overlapping items
    let index = 0;
    for (const other of overlapping) {
      const existingData = result.get(other.id);
      if (existingData && existingData.index >= index) {
        index = existingData.index + 1;
      }
    }

    result.set(item.id, {
      count: overlapping.length + 1,
      index: index,
    });
  }

  return result;
}

export function CalendarGrid({
  items,
  viewMode,
  nowTime,
  onItemClick,
  onItemDrop,
  onItemResize,
  onDoubleClick,
  defaultLayerId,
}: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get config based on view mode (day or week - month uses week config)
  const config = viewMode === 'day' ? CALENDAR_CONFIG.day : CALENDAR_CONFIG.week;
  const { dayStartHour, dayEndHour, rowHeight, timeColumnWidth, headerHeight } = config;
  const hours = dayEndHour - dayStartHour;

  // Calculate visible days based on view mode
  const visibleDays = useMemo(() => {
    const days: Date[] = [];

    if (viewMode === 'day') {
      // Single day view - show current day
      days.push(startOfDay(nowTime));
    } else if (viewMode === 'week') {
      // Week view - show 7 days starting from Monday
      const weekStart = startOfWeek(nowTime, { weekStartsOn: 1 }); // Monday
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }
    } else {
      // Month view - show 7 days (week) centered on current day
      const weekStart = startOfWeek(nowTime, { weekStartsOn: 1 });
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }
    }

    return days;
  }, [viewMode, nowTime]);

  // Group items by day
  const itemsByDay = useMemo(() => {
    const grouped = new Map<string, TimelineItemType[]>();

    for (const day of visibleDays) {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped.set(dayKey, []);
    }

    for (const item of items) {
      const itemDate = new Date(item.start_time);
      const dayKey = format(itemDate, 'yyyy-MM-dd');

      if (grouped.has(dayKey)) {
        grouped.get(dayKey)!.push(item);
      }
    }

    return grouped;
  }, [items, visibleDays]);

  // Calculate overlaps for each day
  const overlapsByDay = useMemo(() => {
    const result = new Map<string, Map<string, { count: number; index: number }>>();

    for (const [dayKey, dayItems] of itemsByDay) {
      result.set(dayKey, findOverlaps(dayItems));
    }

    return result;
  }, [itemsByDay]);

  // Calculate current time position
  const currentTimePosition = useMemo(() => {
    const currentHour = nowTime.getHours();
    const currentMinutes = nowTime.getMinutes();

    if (currentHour < dayStartHour || currentHour >= dayEndHour) {
      return null; // Outside visible hours
    }

    const minutesFromStart = (currentHour - dayStartHour) * 60 + currentMinutes;
    return (minutesFromStart / 60) * rowHeight;
  }, [nowTime, dayStartHour, dayEndHour, rowHeight]);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current && currentTimePosition !== null) {
      // Scroll to center current time in view
      const scrollTarget = Math.max(0, currentTimePosition - 200);
      scrollRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    }
  }, []);

  // Handle click on empty cell
  const handleCellClick = (day: Date, hour: number) => {
    if (!onDoubleClick || !defaultLayerId) return;

    const startTime = new Date(day);
    startTime.setHours(hour, 0, 0, 0);
    onDoubleClick(startTime.toISOString(), defaultLayerId);
  };

  // Handle event drag end
  const handleEventDragEnd = (item: TimelineItemType, newStartTime: string, dayOffset: number) => {
    if (!onItemDrop) return;

    // Adjust for day offset
    const adjustedTime = new Date(newStartTime);
    adjustedTime.setDate(adjustedTime.getDate() + dayOffset);

    onItemDrop(item, adjustedTime.toISOString(), item.layer_id);
  };

  // Handle event resize
  const handleEventResize = (item: TimelineItemType, newDurationMinutes: number) => {
    if (!onItemResize) return;
    onItemResize(item, newDurationMinutes);
  };

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-background">
      {/* Fixed header */}
      <CalendarHeader
        days={visibleDays}
        headerHeight={headerHeight}
        timeColumnWidth={timeColumnWidth}
      />

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        className="flex overflow-auto"
        style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '400px' }}
      >
        {/* Time column (sticky left) */}
        <CalendarTimeColumn
          startHour={dayStartHour}
          endHour={dayEndHour}
          rowHeight={rowHeight}
          headerHeight={0}
          width={timeColumnWidth}
        />

        {/* Day columns */}
        <div className="flex flex-1 relative">
          {visibleDays.map((day, dayIndex) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayItems = itemsByDay.get(dayKey) || [];
            const dayOverlaps = overlapsByDay.get(dayKey) || new Map();
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dayKey}
                className={cn(
                  "flex-1 relative border-r last:border-r-0",
                  isCurrentDay && "bg-primary/[0.02]"
                )}
              >
                {/* Hour grid lines */}
                {Array.from({ length: hours + 1 }, (_, i) => (
                  <div
                    key={i}
                    className="border-b border-dashed border-border/40 cursor-pointer hover:bg-muted/30 transition-colors"
                    style={{ height: rowHeight }}
                    onDoubleClick={() => handleCellClick(day, dayStartHour + i)}
                  />
                ))}

                {/* Current time indicator */}
                {isCurrentDay && currentTimePosition !== null && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                    style={{ top: currentTimePosition }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                )}

                {/* Events container */}
                <div className="absolute inset-0 top-0" style={{ pointerEvents: 'none' }}>
                  <div className="relative w-full h-full" style={{ pointerEvents: 'auto' }}>
                    {dayItems.map((item) => {
                      const overlapData = dayOverlaps.get(item.id) || { count: 1, index: 0 };

                      return (
                        <CalendarEvent
                          key={item.id}
                          item={item}
                          dayStartHour={dayStartHour}
                          rowHeight={rowHeight}
                          onClick={onItemClick}
                          onDragEnd={(item, newTime, dayOff) => handleEventDragEnd(item, newTime, dayOff)}
                          onResize={handleEventResize}
                          overlappingCount={overlapData.count}
                          overlappingIndex={overlapData.index}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
