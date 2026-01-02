// Calendar Event - Single event positioned within a day column

import React, { useState, useRef, useEffect } from 'react';
import { TimelineItem as TimelineItemType } from '@/lib/timelineUtils';
import { format, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Check, Clock, Tag } from 'lucide-react';

interface CalendarEventProps {
  item: TimelineItemType;
  dayStartHour: number;
  rowHeight: number;
  onClick: (item: TimelineItemType) => void;
  onDragEnd?: (item: TimelineItemType, newStartTime: string, dayOffset: number) => void;
  onResize?: (item: TimelineItemType, newDurationMinutes: number) => void;
  overlappingCount?: number;
  overlappingIndex?: number;
  dayColumnWidth?: number; // Actual column width for accurate cross-day drag
}

export function CalendarEvent({
  item,
  dayStartHour,
  rowHeight,
  onClick,
  onDragEnd,
  onResize,
  overlappingCount = 1,
  overlappingIndex = 0,
  dayColumnWidth = 150,
}: CalendarEventProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeDelta, setResizeDelta] = useState(0);
  const dragStartRef = useRef({ x: 0, y: 0, startY: 0 });
  const eventRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasDragged = useRef(false);

  // Calculate position
  const startTime = new Date(item.start_time);
  const startHour = startTime.getHours();
  const startMinutes = startTime.getMinutes();

  // Position from top (relative to start hour)
  const minutesFromStart = (startHour - dayStartHour) * 60 + startMinutes;
  const top = (minutesFromStart / 60) * rowHeight;

  // Height based on duration
  const height = Math.max((item.duration_minutes / 60) * rowHeight, 24); // Minimum 24px

  // Width for overlapping events
  const widthPercent = 100 / overlappingCount;
  const leftPercent = overlappingIndex * widthPercent;

  // Determine opacity and style based on status
  const opacity = item.status === 'completed' ? 0.6 : 1;
  const isLogjam = item.status === 'logjam';

  // Handle click (only if not dragged)
  const handleClick = (e: React.MouseEvent) => {
    if (!wasDragged.current) {
      e.stopPropagation();
      onClick(item);
    }
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isResizing) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, startY: top };
    setDragOffset({ x: 0, y: 0 });
    wasDragged.current = false;
  };

  // Handle resize start
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, startY: 0 };
    setResizeDelta(0);
    wasDragged.current = true;
  };

  // Global mouse handlers
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          wasDragged.current = true;
        }

        setDragOffset({ x: deltaX, y: deltaY });
      } else if (isResizing) {
        const deltaY = e.clientY - dragStartRef.current.y;
        setResizeDelta(deltaY);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging && wasDragged.current && onDragEnd) {
        const deltaY = e.clientY - dragStartRef.current.y;
        const deltaX = e.clientX - dragStartRef.current.x;

        // Calculate new time based on Y delta
        const minutesDelta = Math.round((deltaY / rowHeight) * 60);
        const newStartTime = new Date(item.start_time);
        newStartTime.setMinutes(newStartTime.getMinutes() + minutesDelta);

        // Calculate day offset based on X delta using actual column width
        const dayOffset = Math.round(deltaX / dayColumnWidth);

        onDragEnd(item, newStartTime.toISOString(), dayOffset);
      }

      if (isResizing && onResize) {
        const deltaY = e.clientY - dragStartRef.current.y;
        const minutesDelta = Math.round((deltaY / rowHeight) * 60);
        const newDuration = Math.max(15, item.duration_minutes + minutesDelta);
        onResize(item, newDuration);
      }

      setIsDragging(false);
      setIsResizing(false);
      setDragOffset({ x: 0, y: 0 });
      setResizeDelta(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, item, rowHeight, onDragEnd, onResize]);

  // Calculate display values with drag offset
  const displayTop = top + (isDragging ? dragOffset.y : 0);
  const displayHeight = height + (isResizing ? resizeDelta : 0);
  const displayLeft = `calc(${leftPercent}% + 2px)`;
  const displayWidth = `calc(${widthPercent}% - 4px)`;

  // Format time for display
  const timeDisplay = format(startTime, 'h:mm a');
  const endTime = addMinutes(startTime, item.duration_minutes);
  const endTimeDisplay = format(endTime, 'h:mm a');

  // Hover handlers with delay
  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 300); // Show tooltip after 300ms hover
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={eventRef}
      className={cn(
        "absolute rounded px-2 py-1 text-xs cursor-pointer overflow-hidden transition-shadow group",
        isDragging && "shadow-lg z-50",
        isLogjam && "ring-2 ring-red-500 animate-pulse"
      )}
      style={{
        top: `${displayTop}px`,
        height: `${Math.max(displayHeight, 20)}px`,
        left: displayLeft,
        width: displayWidth,
        backgroundColor: item.color,
        opacity: isDragging || isResizing ? 0.8 : opacity,
        zIndex: isDragging ? 100 : isHovered ? 50 : 10,
        pointerEvents: 'auto', // Enable clicks on events even though parent has pointer-events:none
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Event content */}
      <div className="flex flex-col h-full text-white">
        {/* Title */}
        <div className="font-medium truncate flex items-center gap-1">
          {item.status === 'completed' && (
            <Check className="h-3 w-3 flex-shrink-0" />
          )}
          <span className="truncate">{item.title}</span>
        </div>

        {/* Time (only if tall enough) */}
        {displayHeight > 36 && (
          <div className="text-[10px] opacity-80 truncate">
            {timeDisplay}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20"
        onMouseDown={handleResizeMouseDown}
      />

      {/* Visual resize indicator (dots) */}
      {displayHeight > 30 && !isDragging && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
          <div className="w-1 h-1 rounded-full bg-white/40" />
          <div className="w-1 h-1 rounded-full bg-white/40" />
          <div className="w-1 h-1 rounded-full bg-white/40" />
        </div>
      )}

      {/* Hover tooltip - like Google Calendar */}
      {isHovered && !isDragging && !isResizing && (
        <div
          className="absolute left-full top-0 ml-2 z-[200] bg-background border rounded-lg shadow-lg p-3 min-w-[200px] max-w-[280px] pointer-events-none"
          style={{ transform: 'translateY(-10%)' }}
        >
          {/* Title */}
          <h4 className="font-semibold text-foreground text-sm mb-2 line-clamp-2">
            {item.title}
          </h4>

          {/* Time range */}
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {format(startTime, 'EEE, MMM d')} · {timeDisplay} - {endTimeDisplay}
            </span>
          </div>

          {/* Duration */}
          <div className="text-xs text-muted-foreground mb-2">
            {item.duration_minutes >= 60
              ? `${Math.floor(item.duration_minutes / 60)}h ${item.duration_minutes % 60 > 0 ? `${item.duration_minutes % 60}m` : ''}`
              : `${item.duration_minutes}m`
            }
          </div>

          {/* Status badge */}
          {item.status && (
            <div className="flex items-center gap-2">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full capitalize",
                  item.status === 'completed' && "bg-green-100 text-green-700",
                  item.status === 'active' && "bg-blue-100 text-blue-700",
                  item.status === 'logjam' && "bg-red-100 text-red-700",
                  item.status === 'parked' && "bg-gray-100 text-gray-700"
                )}
              >
                {item.status}
              </span>
            </div>
          )}

          {/* Click hint */}
          <div className="text-[10px] text-muted-foreground mt-2 border-t pt-2">
            Click to edit · Drag to move
          </div>
        </div>
      )}
    </div>
  );
}
