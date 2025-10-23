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
  onClick: (item: TimelineItemType) => void;
  onDragStart?: (item: TimelineItemType) => void;
  onDragMove?: (item: TimelineItemType, deltaX: number, deltaY: number) => void;
  onDragEnd?: (item: TimelineItemType, deltaX: number, deltaY: number) => void;
}

export function TimelineItem({
  item,
  layerIndex,
  layerHeight,
  viewportWidth,
  pixelsPerHour,
  scrollOffset,
  nowTime,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
}: TimelineItemProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartPos, setDragStartPos] = React.useState({ x: 0, y: 0 });
  const [currentDragDelta, setCurrentDragDelta] = React.useState({ x: 0, y: 0 });

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
    e.stopPropagation(); // Prevent canvas drag
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setCurrentDragDelta({ x: 0, y: 0 });
    onDragStart?.(item);
  };

  // Handle drag move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;
    setCurrentDragDelta({ x: deltaX, y: deltaY });
    onDragMove?.(item, deltaX, deltaY);
  };

  // Handle drag end
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;
    setIsDragging(false);
    setCurrentDragDelta({ x: 0, y: 0 });
    onDragEnd?.(item, deltaX, deltaY);
  };

  // Handle click (only if not dragging)
  const handleClick = (e: React.MouseEvent) => {
    if (Math.abs(currentDragDelta.x) < 5 && Math.abs(currentDragDelta.y) < 5) {
      onClick(item);
    }
  };

  // Calculate display position (with drag offset)
  const displayX = x + currentDragDelta.x;
  const displayY = y + currentDragDelta.y;

  return (
    <g
      className={`timeline-item transition-transform ${isDragging ? 'cursor-grabbing' : 'cursor-grab hover:scale-105'}`}
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
        width={Math.max(width, 2)}
        height={height}
        rx={ITEM_BORDER_RADIUS}
        ry={ITEM_BORDER_RADIUS}
        fill={item.color}
        opacity={isDragging ? 0.6 : opacity}
        stroke={isDragging ? '#3b82f6' : (shouldPulse ? '#ef4444' : 'none')}
        strokeWidth={isDragging ? 2 : (shouldPulse ? 3 : 0)}
        className={shouldPulse && !isDragging ? 'animate-pulse' : ''}
      />

      {/* Item text (only if wide enough) */}
      {width > 60 && (
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
      {width > 100 && (
        <text
          x={displayX + ITEM_PADDING}
          y={displayY + height / 2 + 14}
          dominantBaseline="middle"
          fill="white"
          fontSize="10"
          opacity={0.8}
          className="pointer-events-none select-none"
        >
          {formatDuration(item.duration_minutes)}
        </text>
      )}

      {/* Logjam indicator */}
      {shouldPulse && !isDragging && (
        <circle
          cx={displayX + width - 10}
          cy={displayY + 10}
          r={5}
          fill="#ef4444"
          className="animate-pulse"
        />
      )}

      {/* Completed checkmark */}
      {item.status === 'completed' && (
        <g transform={`translate(${displayX + width - 20}, ${displayY + 5})`}>
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
    </g>
  );
}
