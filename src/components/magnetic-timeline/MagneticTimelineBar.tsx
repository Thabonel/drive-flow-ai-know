// Magnetic Timeline Bar - Horizontal 24-hour visualization

import { useState, useRef } from 'react';
import { MagneticTimelineItem, getMinutesFromMidnight } from '@/lib/magneticTimelineUtils';
import { cn } from '@/lib/utils';

interface MagneticTimelineBarProps {
  items: MagneticTimelineItem[];
  currentMinutes: number;
  selectedItemId: string | null;
  bladeMode: boolean;
  onItemClick: (item: MagneticTimelineItem) => void;
  onItemMove: (itemId: string, newMinutes: number) => void;
  onItemResize: (itemId: string, newDuration: number) => void;
  onBladeClick: (minutes: number) => void;
}

export function MagneticTimelineBar({
  items,
  currentMinutes,
  selectedItemId,
  bladeMode,
  onItemClick,
  onItemMove,
  onItemResize,
  onBladeClick,
}: MagneticTimelineBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    itemId: string;
    type: 'move' | 'resize';
    startX: number;
    startMinutes: number;
    startDuration: number;
  } | null>(null);

  const totalMinutes = 1440; // 24 hours

  // Convert minutes to percentage for positioning
  const minutesToPercent = (minutes: number) => {
    return (minutes / totalMinutes) * 100;
  };

  // Convert pixel position to minutes
  const pixelsToMinutes = (pixels: number) => {
    if (!barRef.current) return 0;
    const barWidth = barRef.current.offsetWidth;
    return Math.round((pixels / barWidth) * totalMinutes);
  };

  const handleBarClick = (e: React.MouseEvent) => {
    if (!bladeMode || !barRef.current) return;

    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const minutes = pixelsToMinutes(x);

    onBladeClick(minutes);
  };

  const handleItemMouseDown = (e: React.MouseEvent, item: MagneticTimelineItem, type: 'move' | 'resize') => {
    e.stopPropagation();

    if (item.is_locked_time && type === 'move') {
      return; // Can't move locked items
    }

    const startMinutes = getMinutesFromMidnight(item.start_time);

    setDragState({
      itemId: item.id,
      type,
      startX: e.clientX,
      startMinutes,
      startDuration: item.duration_minutes,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !barRef.current) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaMinutes = pixelsToMinutes(deltaX);

    if (dragState.type === 'move') {
      let newMinutes = dragState.startMinutes + deltaMinutes;
      // Clamp to 0-1439
      newMinutes = Math.max(0, Math.min(totalMinutes - 1, newMinutes));

      // Visual feedback during drag (you can add a preview here)
    } else if (dragState.type === 'resize') {
      let newDuration = dragState.startDuration + deltaMinutes;
      // Minimum 15 minutes
      newDuration = Math.max(15, newDuration);

      // Visual feedback during resize
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaMinutes = pixelsToMinutes(deltaX);

    if (dragState.type === 'move') {
      let newMinutes = dragState.startMinutes + deltaMinutes;
      newMinutes = Math.max(0, Math.min(totalMinutes - 1, newMinutes));
      onItemMove(dragState.itemId, newMinutes);
    } else if (dragState.type === 'resize') {
      let newDuration = dragState.startDuration + deltaMinutes;
      newDuration = Math.max(15, newDuration);
      onItemResize(dragState.itemId, newDuration);
    }

    setDragState(null);
  };

  // Format time for display
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {/* Time markers */}
      <div className="relative h-6 text-xs text-muted-foreground">
        {[0, 6, 12, 18, 24].map((hour) => (
          <div
            key={hour}
            className="absolute"
            style={{ left: `${(hour / 24) * 100}%` }}
          >
            {hour === 24 ? '00:00' : `${hour.toString().padStart(2, '0')}:00`}
          </div>
        ))}
      </div>

      {/* Main timeline bar */}
      <div
        ref={barRef}
        className={cn(
          "relative h-24 bg-muted rounded-lg border-2 border-border overflow-hidden",
          bladeMode && "cursor-crosshair"
        )}
        onClick={handleBarClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
          style={{ left: `${minutesToPercent(currentMinutes)}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
        </div>

        {/* Timeline items */}
        {items.map((item) => {
          const startMinutes = getMinutesFromMidnight(item.start_time);
          const left = minutesToPercent(startMinutes);
          const width = minutesToPercent(item.duration_minutes);
          const isSelected = item.id === selectedItemId;
          const isPast = startMinutes + item.duration_minutes < currentMinutes;
          const isCompressed = item.is_flexible && item.original_duration &&
            item.duration_minutes < item.original_duration;

          return (
            <div
              key={item.id}
              className={cn(
                "absolute top-2 bottom-2 rounded transition-all",
                isSelected && "ring-2 ring-primary ring-offset-2",
                isPast && "opacity-60",
                item.is_locked_time && "border-2 border-yellow-500",
                isCompressed && "border-2 border-orange-500 border-dashed",
                !item.is_locked_time && "cursor-move hover:opacity-80"
              )}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: item.color,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onItemClick(item);
              }}
              onMouseDown={(e) => handleItemMouseDown(e, item, 'move')}
            >
              {/* Item content */}
              <div className="px-2 py-1 h-full flex items-center justify-between text-white text-sm font-medium">
                <span className="truncate flex-1">{item.title}</span>

                {/* Indicators */}
                <div className="flex items-center gap-1">
                  {item.is_locked_time && (
                    <div className="text-yellow-300 text-xs">🔒</div>
                  )}
                  {isCompressed && (
                    <div className="text-orange-300 text-xs">⚠️</div>
                  )}
                </div>
              </div>

              {/* Resize handle (right edge) */}
              <div
                className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                onMouseDown={(e) => handleItemMouseDown(e, item, 'resize')}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          );
        })}

        {/* Blade cursor line (when in blade mode and item selected) */}
        {bladeMode && selectedItemId && (
          <div className="absolute top-0 bottom-0 pointer-events-none">
            {/* This would show a line following the mouse */}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-yellow-500 rounded" />
          Locked time
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-orange-500 border-dashed rounded" />
          Compressed (flexible)
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          Current time
        </div>
      </div>
    </div>
  );
}
