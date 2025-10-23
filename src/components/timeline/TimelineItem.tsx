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
}: TimelineItemProps) {
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

  return (
    <g
      className="timeline-item cursor-pointer transition-transform hover:scale-105"
      onClick={() => onClick(item)}
    >
      {/* Item rectangle */}
      <rect
        x={x}
        y={y}
        width={Math.max(width, 2)}
        height={height}
        rx={ITEM_BORDER_RADIUS}
        ry={ITEM_BORDER_RADIUS}
        fill={item.color}
        opacity={opacity}
        stroke={shouldPulse ? '#ef4444' : 'none'}
        strokeWidth={shouldPulse ? 3 : 0}
        className={shouldPulse ? 'animate-pulse' : ''}
      />

      {/* Item text (only if wide enough) */}
      {width > 60 && (
        <text
          x={x + ITEM_PADDING}
          y={y + height / 2}
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
          x={x + ITEM_PADDING}
          y={y + height / 2 + 14}
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
      {shouldPulse && (
        <circle
          cx={x + width - 10}
          cy={y + 10}
          r={5}
          fill="#ef4444"
          className="animate-pulse"
        />
      )}

      {/* Completed checkmark */}
      {item.status === 'completed' && (
        <g transform={`translate(${x + width - 20}, ${y + 5})`}>
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
