// Calendar Grid - Main Google Calendar-style view component

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { startOfDay, addDays, format, isSameDay, startOfWeek, isToday, startOfMonth, endOfMonth, getDay, isSameMonth } from 'date-fns';
import { CalendarTimeColumn } from './CalendarTimeColumn';
import { CalendarHeader } from './CalendarHeader';
import { CalendarEvent } from './CalendarEvent';
import { TimelineItem as TimelineItemType } from '@/lib/timelineUtils';
import { TimelineViewMode, CALENDAR_CONFIG } from '@/lib/timelineConstants';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarGridProps {
  items: TimelineItemType[];
  viewMode: TimelineViewMode;
  nowTime: Date;
  viewDate?: Date; // The date to center the view on (for navigation)
  onItemClick: (item: TimelineItemType) => void;
  onItemDrop?: (item: TimelineItemType, newStartTime: string, newLayerId: string) => void;
  onItemResize?: (item: TimelineItemType, newDurationMinutes: number) => void;
  onDoubleClick?: (startTime: string, layerId: string) => void;
  onQuickAdd?: (title: string, startTime: string, durationMinutes: number, layerId: string) => Promise<boolean>;
  onOpenFullEditor?: (startTime: string, layerId: string) => void; // Open full AddItemForm
  defaultLayerId?: string;
}

// Quick add popup state
interface QuickAddState {
  visible: boolean;
  x: number;
  y: number;
  startTime: Date | null;
  endTime: Date | null;
}

// Drag to create state
interface DragCreateState {
  isDragging: boolean;
  day: Date | null;
  startHour: number;
  startMinutes: number;
  endHour: number;
  endMinutes: number;
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
  viewDate,
  onItemClick,
  onItemDrop,
  onItemResize,
  onDoubleClick,
  onQuickAdd,
  onOpenFullEditor,
  defaultLayerId,
}: CalendarGridProps) {
  // Use viewDate for calendar navigation, fallback to nowTime
  const baseDate = viewDate || nowTime;
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick add popup state
  const [quickAdd, setQuickAdd] = useState<QuickAddState>({
    visible: false,
    x: 0,
    y: 0,
    startTime: null,
    endTime: null,
  });
  const [quickAddTitle, setQuickAddTitle] = useState('');

  // Drag to create state
  const [dragCreate, setDragCreate] = useState<DragCreateState>({
    isDragging: false,
    day: null,
    startHour: 0,
    startMinutes: 0,
    endHour: 0,
    endMinutes: 0,
  });

  // Last action for undo
  const [lastAction, setLastAction] = useState<{ item: TimelineItemType; prevStartTime: string } | null>(null);

  // Day column width for accurate cross-day dragging
  const [dayColumnWidth, setDayColumnWidth] = useState(150);

  // Get config based on view mode (day or week - month uses week config)
  const config = viewMode === 'day' ? CALENDAR_CONFIG.day : CALENDAR_CONFIG.week;
  const { dayStartHour, dayEndHour, rowHeight, timeColumnWidth, headerHeight } = config;
  const hours = dayEndHour - dayStartHour;

  // Calculate visible days based on view mode
  const visibleDays = useMemo(() => {
    const days: Date[] = [];

    if (viewMode === 'day') {
      // Single day view - show selected day
      days.push(startOfDay(baseDate));
    } else if (viewMode === 'week') {
      // Week view - show 7 days starting from Monday of the week containing baseDate
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }
    } else {
      // Month view - show full month calendar (up to 6 weeks)
      const monthStart = startOfMonth(baseDate);
      const monthEnd = endOfMonth(baseDate);

      // Start from the Monday of the week containing the 1st of the month
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });

      // End on the Sunday of the week containing the last day of the month
      const lastDayOfWeek = getDay(monthEnd);
      const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek; // Sunday = 0
      const calendarEnd = addDays(monthEnd, daysToAdd);

      // Generate all days from calendarStart to calendarEnd
      let current = calendarStart;
      while (current <= calendarEnd) {
        days.push(current);
        current = addDays(current, 1);
      }
    }

    return days;
  }, [viewMode, baseDate]);

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

  // Calculate day column width for accurate cross-day dragging
  useEffect(() => {
    const updateColumnWidth = () => {
      if (gridRef.current && visibleDays.length > 0) {
        const width = gridRef.current.offsetWidth / visibleDays.length;
        setDayColumnWidth(width);
      }
    };

    updateColumnWidth();
    window.addEventListener('resize', updateColumnWidth);
    return () => window.removeEventListener('resize', updateColumnWidth);
  }, [visibleDays.length]);

  // Focus input when quick add popup opens
  useEffect(() => {
    if (quickAdd.visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [quickAdd.visible]);

  // Close quick add on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickAdd.visible && gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setQuickAdd(prev => ({ ...prev, visible: false }));
        setQuickAddTitle('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [quickAdd.visible]);

  // Track mouse position for distinguishing click vs drag
  const mouseDownPos = useRef<{ x: number; y: number; day: Date; hour: number; rect: DOMRect } | null>(null);

  // Track last click for double-click detection
  const lastClickRef = useRef<{ time: number; day: Date; hour: number } | null>(null);

  // Handle single click on empty cell - show quick add popup
  const handleCellClick = (e: React.MouseEvent, day: Date, hour: number, minutes: number = 0) => {
    if (!defaultLayerId) {
      toast.error('Please create a layer first');
      return;
    }

    const startTime = new Date(day);
    startTime.setHours(hour, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1); // Default 1 hour

    // Position popup near click
    const rect = (e.target as HTMLElement).getBoundingClientRect();

    setQuickAdd({
      visible: true,
      x: rect.left,
      y: rect.top,
      startTime,
      endTime,
    });
    setQuickAddTitle('');
  };

  // Handle mouse down for drag-to-create
  const handleCellMouseDown = (e: React.MouseEvent, day: Date, hour: number) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault(); // Prevent text selection

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const minuteOffset = Math.floor((relativeY / rowHeight) * 60);

    // Store initial position to detect drag vs click
    mouseDownPos.current = { x: e.clientX, y: e.clientY, day, hour, rect };

    setDragCreate({
      isDragging: true,
      day,
      startHour: hour,
      startMinutes: minuteOffset,
      endHour: hour,
      endMinutes: minuteOffset + 30, // Minimum 30 min
    });
  };

  // Handle mouse move for drag-to-create
  const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragCreate.isDragging || !dragCreate.day) return;

    const gridEl = gridRef.current;
    if (!gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const relativeY = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0);
    const totalMinutes = Math.floor((relativeY / rowHeight) * 60) + dayStartHour * 60;
    const endHour = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    setDragCreate(prev => ({
      ...prev,
      endHour: Math.max(prev.startHour, Math.min(endHour, dayEndHour)),
      endMinutes: endHour >= prev.startHour ? endMinutes : prev.startMinutes + 30,
    }));
  }, [dragCreate.isDragging, dragCreate.day, rowHeight, dayStartHour, dayEndHour]);

  // Handle mouse up for drag-to-create
  const handleGridMouseUp = useCallback((e?: React.MouseEvent | MouseEvent) => {
    // Use synchronous ref instead of async state to avoid race condition
    if (!mouseDownPos.current) return;

    // Check if this was a simple click (minimal movement) vs a drag
    const isSimpleClick = e &&
      Math.abs(e.clientX - mouseDownPos.current.x) < 5 &&
      Math.abs(e.clientY - mouseDownPos.current.y) < 5;

    if (isSimpleClick) {
      const clickDay = mouseDownPos.current.day;
      const clickHour = mouseDownPos.current.hour;
      const now = Date.now();

      // Check for double-click (within 300ms, same day and hour)
      if (lastClickRef.current &&
          now - lastClickRef.current.time < 300 &&
          isSameDay(clickDay, lastClickRef.current.day) &&
          clickHour === lastClickRef.current.hour) {
        // Double-click - open full editor immediately
        if (onOpenFullEditor && defaultLayerId) {
          const startTime = new Date(clickDay);
          startTime.setHours(clickHour, 0, 0, 0);
          onOpenFullEditor(startTime.toISOString(), defaultLayerId);
        }
        lastClickRef.current = null;
        mouseDownPos.current = null;
        setDragCreate({
          isDragging: false,
          day: null,
          startHour: 0,
          startMinutes: 0,
          endHour: 0,
          endMinutes: 0,
        });
        return;
      }

      // Single click - show quick add popup
      lastClickRef.current = { time: now, day: clickDay, hour: clickHour };

      const startTime = new Date(clickDay);
      startTime.setHours(clickHour, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      setQuickAdd({
        visible: true,
        x: mouseDownPos.current.rect.left,
        y: mouseDownPos.current.rect.top,
        startTime,
        endTime,
      });
    } else if (dragCreate.isDragging && dragCreate.day) {
      // Drag - show quick add for the dragged duration
      const startTime = new Date(dragCreate.day);
      startTime.setHours(dragCreate.startHour, dragCreate.startMinutes, 0, 0);

      const endTime = new Date(dragCreate.day);
      endTime.setHours(dragCreate.endHour, dragCreate.endMinutes, 0, 0);

      // Ensure minimum duration
      if (endTime <= startTime) {
        endTime.setMinutes(startTime.getMinutes() + 30);
      }

      setQuickAdd({
        visible: true,
        x: 100,
        y: (dragCreate.startHour - dayStartHour) * rowHeight,
        startTime,
        endTime,
      });
    }

    mouseDownPos.current = null;
    setDragCreate({
      isDragging: false,
      day: null,
      startHour: 0,
      startMinutes: 0,
      endHour: 0,
      endMinutes: 0,
    });
  }, [dragCreate, dayStartHour, rowHeight]);

  // Handle quick add submit
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.startTime || !quickAdd.endTime) return;

    if (!quickAddTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!defaultLayerId) {
      toast.error('Please create a layer first');
      return;
    }

    const durationMinutes = Math.round((quickAdd.endTime.getTime() - quickAdd.startTime.getTime()) / 60000);

    if (onQuickAdd) {
      await onQuickAdd(quickAddTitle.trim(), quickAdd.startTime.toISOString(), durationMinutes, defaultLayerId);
      // No success toast - item appearing on timeline is confirmation
    } else if (onDoubleClick) {
      // Fallback to double-click handler
      onDoubleClick(quickAdd.startTime.toISOString(), defaultLayerId);
    }

    setQuickAdd(prev => ({ ...prev, visible: false }));
    setQuickAddTitle('');
  };

  // Handle quick add cancel
  const handleQuickAddCancel = () => {
    setQuickAdd(prev => ({ ...prev, visible: false }));
    setQuickAddTitle('');
  };

  // Handle event drag end with undo toast
  const handleEventDragEnd = (item: TimelineItemType, newStartTime: string, dayOffset: number) => {
    if (!onItemDrop) return;

    // Save for undo
    const prevStartTime = item.start_time;

    // Adjust for day offset
    const adjustedTime = new Date(newStartTime);
    adjustedTime.setDate(adjustedTime.getDate() + dayOffset);

    onItemDrop(item, adjustedTime.toISOString(), item.layer_id);

    // Show undo toast
    setLastAction({ item, prevStartTime });
    toast(`Moved "${item.title}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          if (onItemDrop) {
            onItemDrop(item, prevStartTime, item.layer_id);
            toast.success('Move undone');
          }
        },
      },
      duration: 5000,
    });
  };

  // Handle event resize
  const handleEventResize = (item: TimelineItemType, newDurationMinutes: number) => {
    if (!onItemResize) return;
    onItemResize(item, newDurationMinutes);
  };

  // Month view - render a traditional calendar grid
  if (viewMode === 'month') {
    const weeks: Date[][] = [];
    for (let i = 0; i < visibleDays.length; i += 7) {
      weeks.push(visibleDays.slice(i, i + 7));
    }

    return (
      <div className="flex flex-col border rounded-lg overflow-hidden bg-background">
        {/* Month header */}
        <div className="text-center py-3 bg-muted/30 border-b">
          <h2 className="text-lg font-semibold">{format(baseDate, 'MMMM yyyy')}</h2>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 border-b bg-muted/20">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-center py-2 text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks grid */}
        <div className="flex-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0" style={{ minHeight: '100px' }}>
              {week.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayItems = itemsByDay.get(dayKey) || [];
                const isCurrentDay = isToday(day);
                const isCurrentMonth = isSameMonth(day, baseDate);

                return (
                  <div
                    key={dayKey}
                    className={cn(
                      "border-r last:border-r-0 p-1 min-h-[100px] cursor-pointer hover:bg-muted/20 transition-colors",
                      !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                      isCurrentDay && "bg-primary/5"
                    )}
                    onClick={(e) => {
                      // Click to add event at 9 AM by default
                      const clickDay = new Date(day);
                      clickDay.setHours(9, 0, 0, 0);
                      handleCellClick(e, clickDay, 9);
                    }}
                  >
                    {/* Day number */}
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isCurrentDay && "w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    )}>
                      {format(day, 'd')}
                    </div>

                    {/* Events for this day */}
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: item.color, color: 'white' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onItemClick(item);
                          }}
                          title={`${item.title} - ${format(new Date(item.start_time), 'h:mm a')}`}
                        >
                          {format(new Date(item.start_time), 'h:mm')} {item.title}
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{dayItems.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Quick add popup for month view */}
        {quickAdd.visible && quickAdd.startTime && (
          <div
            className="fixed z-50 bg-background border rounded-lg shadow-lg p-3 min-w-[250px]"
            style={{
              left: Math.min(quickAdd.x, window.innerWidth - 280),
              top: Math.min(quickAdd.y, window.innerHeight - 150),
            }}
          >
            <form onSubmit={handleQuickAddSubmit} className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {format(quickAdd.startTime, 'EEE, MMM d')} at {format(quickAdd.startTime, 'h:mm a')}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleQuickAddCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                ref={inputRef}
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                placeholder="Add title"
                className="text-sm"
                autoFocus
              />
              <div className="flex justify-between items-center gap-2">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-xs px-0"
                  onClick={() => {
                    if (onOpenFullEditor && quickAdd.startTime && defaultLayerId) {
                      onOpenFullEditor(quickAdd.startTime.toISOString(), defaultLayerId);
                      setQuickAdd(prev => ({ ...prev, visible: false }));
                      setQuickAddTitle('');
                    }
                  }}
                >
                  More options
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleQuickAddCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!quickAddTitle.trim()}>
                    Save
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Day/Week view - Google Calendar style with time columns
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
        className="flex overflow-y-scroll overflow-x-auto"
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
        <div
          ref={gridRef}
          className="flex flex-1 relative"
          style={{ minHeight: (hours + 1) * rowHeight }}
          onMouseMove={handleGridMouseMove}
          onMouseUp={(e) => handleGridMouseUp(e)}
          onMouseLeave={() => {
            // Cancel drag if mouse leaves without releasing
            mouseDownPos.current = null;
            setDragCreate({
              isDragging: false,
              day: null,
              startHour: 0,
              startMinutes: 0,
              endHour: 0,
              endMinutes: 0,
            });
          }}
        >
          {visibleDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayItems = itemsByDay.get(dayKey) || [];
            const dayOverlaps = overlapsByDay.get(dayKey) || new Map();
            const isCurrentDay = isToday(day);
            const isDragDay = dragCreate.isDragging && dragCreate.day && isSameDay(dragCreate.day, day);

            return (
              <div
                key={dayKey}
                className={cn(
                  "flex-1 relative border-r last:border-r-0",
                  isCurrentDay && "bg-primary/[0.02]"
                )}
                style={{ minHeight: (hours + 1) * rowHeight }}
              >
                {/* Hour grid lines - click/drag to create */}
                {Array.from({ length: hours + 1 }, (_, i) => (
                  <div
                    key={i}
                    className="border-b border-dashed border-border/40 cursor-pointer hover:bg-muted/30 transition-colors"
                    style={{ height: rowHeight }}
                    onMouseDown={(e) => handleCellMouseDown(e, day, dayStartHour + i)}
                  />
                ))}

                {/* Drag-to-create preview overlay */}
                {isDragDay && (() => {
                  const previewStart = new Date(day);
                  previewStart.setHours(dragCreate.startHour, dragCreate.startMinutes, 0, 0);
                  const previewEnd = new Date(day);
                  previewEnd.setHours(dragCreate.endHour, dragCreate.endMinutes, 0, 0);

                  return (
                    <div
                      className="absolute left-1 right-1 bg-primary/30 border-2 border-primary border-dashed rounded pointer-events-none z-20"
                      style={{
                        top: ((dragCreate.startHour - dayStartHour) * 60 + dragCreate.startMinutes) / 60 * rowHeight,
                        height: Math.max(
                          ((dragCreate.endHour - dragCreate.startHour) * 60 + dragCreate.endMinutes - dragCreate.startMinutes) / 60 * rowHeight,
                          rowHeight / 2
                        ),
                      }}
                    >
                      <div className="p-1 text-xs text-primary font-medium">
                        {format(previewStart, 'h:mm a')} - {format(previewEnd, 'h:mm a')}
                      </div>
                    </div>
                  );
                })()}

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

                {/* Events container - pointer-events:none so clicks pass through to grid cells */}
                <div className="absolute inset-0 top-0" style={{ pointerEvents: 'none' }}>
                  <div className="relative w-full h-full">
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
                          dayColumnWidth={dayColumnWidth}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick add popup */}
          {quickAdd.visible && quickAdd.startTime && (
            <div
              className="absolute z-50 bg-background border rounded-lg shadow-lg p-3 min-w-[250px]"
              style={{
                left: Math.min(quickAdd.x, window.innerWidth - 280),
                top: Math.min(quickAdd.y, window.innerHeight - 150),
              }}
            >
              <form onSubmit={handleQuickAddSubmit} className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {format(quickAdd.startTime, 'h:mm a')} - {quickAdd.endTime && format(quickAdd.endTime, 'h:mm a')}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleQuickAddCancel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  ref={inputRef}
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  placeholder="Add title"
                  className="text-sm"
                  autoFocus
                />
                <div className="flex justify-between items-center gap-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs px-0"
                    onClick={() => {
                      if (onOpenFullEditor && quickAdd.startTime && defaultLayerId) {
                        onOpenFullEditor(quickAdd.startTime.toISOString(), defaultLayerId);
                        setQuickAdd(prev => ({ ...prev, visible: false }));
                        setQuickAddTitle('');
                      }
                    }}
                  >
                    More options
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={handleQuickAddCancel}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={!quickAddTitle.trim()}>
                      Save
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
