// Individual timeline item component

import React from 'react';
import { TimelineItem as TimelineItemType } from '@/lib/timelineUtils';
import {
  calculateItemX,
  calculateItemWidth,
  formatTime,
  formatDuration,
} from '@/lib/timelineUtils';
import {
  ITEM_HEIGHT_RATIO,
  ITEM_BORDER_RADIUS,
  ITEM_PADDING,
} from '@/lib/timelineConstants';

interface TimelineItemProps {
  item: TimelineItemType;
  layerIndex: number;
  layerHeight: number;
  viewportWidth: number;
  pixelsPerHour: number;
  scrollOffset: number;
  nowTime: Date;
  isSelected?: boolean;
  bladeMode?: boolean;
  onClick: (item: TimelineItemType) => void;
  onDragStart?: (item: TimelineItemType) => void;
  onDragMove?: (item: TimelineItemType, deltaX: number, deltaY: number) => void;
  onDragEnd?: (item: TimelineItemType, deltaX: number, deltaY: number) => void;
  onResize?: (item: TimelineItemType, newDurationMinutes: number) => void;
  onBladeClick?: (item: TimelineItemType, clickX: number) => void;
}

export function TimelineItem({
  item,
  layerIndex,
  layerHeight,
  viewportWidth,
  pixelsPerHour,
  scrollOffset,
  nowTime,
  isSelected = false,
  bladeMode = false,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResize,
  onBladeClick,
}: TimelineItemProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dragStartPos, setDragStartPos] = React.useState({ x: 0, y: 0 });
  const [currentDragDelta, setCurrentDragDelta] = React.useState({ x: 0, y: 0 });
  const [resizeDelta, setResizeDelta] = React.useState(0);
  const [wasDragged, setWasDragged] = React.useState(false);

  const x = calculateItemX(
    item.start_time,
    nowTime,
    viewportWidth,
    pixelsPerHour,
    scrollOffset
  );
  const width = calculateItemWidth(item.duration_minutes, pixelsPerHour);
  const height = layerHeight * ITEM_HEIGHT_RATIO;
  const y = (layerHeight - height) / 2;

  // Determine opacity based on status
  const opacity = item.status === 'completed' ? 0.5 : 1;

  // Determine if item should pulse (logjam)
  const shouldPulse = item.status === 'logjam';

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isResizing) return; // Don't drag while resizing
    e.stopPropagation(); // Prevent canvas drag
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setCurrentDragDelta({ x: 0, y: 0 });
    setWasDragged(false);
    onDragStart?.(item);
  };

  // Handle drag move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing) return; // Don't drag while resizing
    if (!isDragging) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;

    // Mark as dragged if moved more than 5 pixels
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setWasDragged(true);
    }

    setCurrentDragDelta({ x: deltaX, y: deltaY });
    onDragMove?.(item, deltaX, deltaY);
  };

  // Handle drag end
  const handleMouseUp = (e: React.MouseEvent) => {
    if (isResizing) return; // Don't end drag while resizing
    if (!isDragging) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;
    setIsDragging(false);
    setCurrentDragDelta({ x: 0, y: 0 });
    onDragEnd?.(item, deltaX, deltaY);
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent item drag
    setIsResizing(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setResizeDelta(0);
    setWasDragged(true); // Prevent click event
  };

  // Handle resize move
  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragStartPos.x;
    setResizeDelta(deltaX);
  };

  // Handle resize end
  const handleResizeEnd = (e: React.MouseEvent) => {
    if (!isResizing) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragStartPos.x;

    // Calculate new duration based on pixels dragged
    const minutesPerPixel = 60 / pixelsPerHour;
    const deltaMinutes = Math.round(deltaX * minutesPerPixel);
    const newDuration = Math.max(15, item.duration_minutes + deltaMinutes); // Minimum 15 minutes

    setIsResizing(false);
    setResizeDelta(0);

    // Only update if duration actually changed
    if (newDuration !== item.duration_minutes && onResize) {
      onResize(item, newDuration);
    }
  };

  // Handle click (only if not dragged)
  const handleClick = (e: React.MouseEvent) => {
    if (wasDragged) return;

    // If in blade mode and this item is selected, handle blade click
    if (bladeMode && isSelected && onBladeClick) {
      e.stopPropagation();
      // Get click X position relative to the SVG
      const target = e.currentTarget;
      const svg = target.ownerSVGElement;
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        onBladeClick(item, clickX);
      }
      return;
    }

    // Normal click
    onClick(item);
  };

  // Calculate display position (with drag offset)
  const displayX = x + currentDragDelta.x;
  const displayY = y + currentDragDelta.y;
  const displayWidth = Math.max(width + resizeDelta, 20); // Minimum width

  // Add global mouse handlers for resize (SVG events can be finicky)
  React.useEffect(() => {
    if (!isResizing) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.x;
      setResizeDelta(deltaX);
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.x;
      const minutesPerPixel = 60 / pixelsPerHour;
      const deltaMinutes = Math.round(deltaX * minutesPerPixel);
      const newDuration = Math.max(15, item.duration_minutes + deltaMinutes);

      setIsResizing(false);
      setResizeDelta(0);

      if (newDuration !== item.duration_minutes && onResize) {
        onResize(item, newDuration);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isResizing, dragStartPos, item, pixelsPerHour, onResize]);

  return (
    <g
      className={`timeline-item ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      {/* Item rectangle */}
      <rect
        x={displayX}
        y={displayY}
        width={Math.max(displayWidth, 2)}
        height={height}
        rx={ITEM_BORDER_RADIUS}
        ry={ITEM_BORDER_RADIUS}
        fill={item.color}
        opacity={isDragging || isResizing ? 0.6 : opacity}
        stroke={
          isDragging || isResizing
            ? '#3b82f6'
            : isSelected
            ? '#10b981'
            : item.is_locked_time
            ? '#f59e0b'
            : shouldPulse
            ? '#ef4444'
            : 'none'
        }
        strokeWidth={isDragging || isResizing ? 2 : (isSelected || item.is_locked_time || shouldPulse) ? 3 : 0}
        strokeDasharray={item.is_flexible && item.original_duration && item.duration_minutes < item.original_duration ? '4,2' : undefined}
        className={shouldPulse && !isDragging && !isResizing ? 'animate-pulse' : ''}
      />

      {/* Item text (only if wide enough) */}
      {displayWidth > 60 && (
        <text
          x={displayX + ITEM_PADDING}
          y={displayY + height / 2}
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="500"
          className="pointer-events-none select-none"
          style={{
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <tspan>{item.title}</tspan>
        </text>
      )}

      {/* Duration text (only if wide enough) */}
      {displayWidth > 100 && (
        <text
          x={displayX + ITEM_PADDING}
          y={displayY + height / 2 + 14}
          dominantBaseline="middle"
          fill="white"
          fontSize="10"
          opacity={0.8}
          className="pointer-events-none select-none"
        >
          {isResizing ? formatDuration(Math.max(15, item.duration_minutes + Math.round((resizeDelta * 60) / pixelsPerHour))) : formatDuration(item.duration_minutes)}
        </text>
      )}

      {/* Logjam indicator */}
      {shouldPulse && !isDragging && !isResizing && (
        <circle
          cx={displayX + displayWidth - 10}
          cy={displayY + 10}
          r={5}
          fill="#ef4444"
          className="animate-pulse"
        />
      )}

      {/* Completed checkmark */}
      {item.status === 'completed' && (
        <g transform={`translate(${displayX + displayWidth - 20}, ${displayY + 5})`}>
          <circle cx="8" cy="8" r="8" fill="#10b981" />
          <path
            d="M5 8 L7 10 L11 6"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Routine badge (template_id indicator) */}
      {item.template_id && displayWidth > 30 && (
        <g transform={`translate(${displayX + 5}, ${displayY + 5})`}>
          <circle cx="6" cy="6" r="6" fill="rgba(255, 255, 255, 0.3)" />
          <text
            x="6"
            y="6"
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
          >
            🔄
          </text>
        </g>
      )}

      {/* Locked time indicator */}
      {item.is_locked_time && displayWidth > 30 && (
        <g transform={`translate(${displayX + displayWidth - 15}, ${displayY + height - 15})`}>
          <circle cx="6" cy="6" r="5" fill="#f59e0b" />
          <text
            x="6"
            y="6"
            fontSize="8"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
          >
            🔒
          </text>
        </g>
      )}

      {/* Compressed/flexible indicator */}
      {item.is_flexible && item.original_duration && item.duration_minutes < item.original_duration && displayWidth > 30 && (
        <g transform={`translate(${displayX + displayWidth - 30}, ${displayY + height - 15})`}>
          <circle cx="6" cy="6" r="5" fill="#ef4444" />
          <text
            x="6"
            y="6"
            fontSize="8"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
          >
            ⚠️
          </text>
        </g>
      )}

      {/* Blade mode indicator - show crosshair when in blade mode and selected */}
      {bladeMode && isSelected && displayWidth > 40 && (
        <g>
          <line
            x1={displayX}
            y1={displayY + height / 2}
            x2={displayX + displayWidth}
            y2={displayY + height / 2}
            stroke="white"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.5"
            className="pointer-events-none"
          />
        </g>
      )}

      {/* Resize handle - right edge */}
      <rect
        x={displayX + displayWidth - 8}
        y={displayY}
        width={8}
        height={height}
        fill="transparent"
        className="cursor-ew-resize"
        onMouseDown={handleResizeStart}
        onMouseMove={handleResizeMove}
        onMouseUp={handleResizeEnd}
        style={{ cursor: 'ew-resize' }}
      />

      {/* Visual resize handle indicator (3 vertical dots) */}
      {displayWidth > 40 && !isDragging && (
        <g transform={`translate(${displayX + displayWidth - 6}, ${displayY + height / 2})`}>
          <circle cx="0" cy="-6" r="1.5" fill="white" opacity="0.5" className="pointer-events-none" />
          <circle cx="0" cy="0" r="1.5" fill="white" opacity="0.5" className="pointer-events-none" />
          <circle cx="0" cy="6" r="1.5" fill="white" opacity="0.5" className="pointer-events-none" />
        </g>
      )}
    </g>
  );
}
