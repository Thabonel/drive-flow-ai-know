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
import {
  ATTENTION_TYPE_DESCRIPTIONS,
  AttentionType,
} from '@/lib/attentionTypes';

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
  onResize?: (item: TimelineItemType, newDurationMinutes: number) => void;
  documentCount?: number;
  attentionBudgetStatus?: 'within' | 'warning' | 'over' | null;
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
  onResize,
  documentCount = 0,
  attentionBudgetStatus = null,
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

  // Get budget status styling with enhanced visual feedback
  const getBudgetStatusStyling = () => {
    // Non-negotiable items get special protected styling
    if (item.is_non_negotiable) {
      return {
        stroke: '#dc2626',
        strokeWidth: 3,
        strokeDasharray: '8,4',
        filter: 'drop-shadow(0 0 6px rgba(220, 38, 38, 0.4))',
        className: 'animate-pulse-slow'
      };
    }

    // Priority-based styling enhancements
    const basePriorityGlow = item.priority && item.priority > 3 ?
      'drop-shadow(0 0 3px rgba(245, 158, 11, 0.3))' : '';

    switch (attentionBudgetStatus) {
      case 'over':
        return {
          stroke: '#ef4444',
          strokeWidth: 2.5,
          strokeDasharray: '6,3',
          filter: `drop-shadow(0 0 6px #ef4444) ${basePriorityGlow}`,
          className: 'budget-violation-blink'
        };
      case 'warning':
        return {
          stroke: '#f59e0b',
          strokeWidth: 2,
          strokeDasharray: '4,2',
          filter: `drop-shadow(0 0 4px #f59e0b) ${basePriorityGlow}`,
          className: 'budget-warning-pulse'
        };
      case 'within':
        return {
          stroke: '#10b981',
          strokeWidth: 1.5,
          filter: `drop-shadow(0 0 2px #10b981) ${basePriorityGlow}`
        };
      default:
        return {
          stroke: isDragging || isResizing ? '#3b82f6' : (shouldPulse ? '#ef4444' : 'none'),
          strokeWidth: isDragging || isResizing ? 2 : (shouldPulse ? 3 : 0),
          filter: basePriorityGlow || undefined
        };
    }
  };

  const budgetStyling = getBudgetStatusStyling();

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
    if (!wasDragged) {
      onClick(item);
    }
  };

  // Get attention type color for enhanced styling
  const getAttentionTypeColor = () => {
    if (!item.attention_type) return '#6b7280';
    return ATTENTION_TYPE_DESCRIPTIONS[item.attention_type as AttentionType]?.color || '#6b7280';
  };

  // Calculate display position (with drag offset)
  // Use fallback values to prevent undefined/NaN in SVG attributes
  const displayX = Number.isFinite(x + currentDragDelta.x) ? x + currentDragDelta.x : 0;
  const displayY = Number.isFinite(y + currentDragDelta.y) ? y + currentDragDelta.y : 0;
  const displayWidth = Number.isFinite(width + resizeDelta) ? Math.max(width + resizeDelta, 20) : 20; // Minimum width

  // Don't render if critical values are invalid
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

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
        {/* Item rectangle with enhanced styling */}
        <rect
          x={displayX}
          y={displayY}
          width={Math.max(displayWidth, 2)}
          height={height}
          rx={ITEM_BORDER_RADIUS}
          ry={ITEM_BORDER_RADIUS}
          fill={item.color}
          opacity={isDragging || isResizing ? 0.7 : opacity}
          stroke={budgetStyling.stroke}
          strokeWidth={budgetStyling.strokeWidth}
          strokeDasharray={budgetStyling.strokeDasharray}
          filter={budgetStyling.filter}
          className={`
            ${shouldPulse && !isDragging && !isResizing ? 'animate-pulse' : ''}
            ${budgetStyling.className || ''}
            timeline-item-rect transition-all duration-200 ease-in-out
          `}
        />

        {/* Attention type accent bar */}
        {item.attention_type && displayWidth > 20 && (
          <rect
            x={displayX}
            y={displayY}
            width={4}
            height={height}
            rx={2}
            fill={getAttentionTypeColor()}
            opacity="0.8"
            className="attention-accent-bar"
          />
        )}

        {/* Context switch cost indicator line */}
        {item.attention_type && displayWidth > 40 && (
          <line
            x1={displayX}
            y1={displayY + height}
            x2={displayX + Math.min(displayWidth, 80)}
            y2={displayY + height}
            stroke={getAttentionTypeColor()}
            strokeWidth="2"
            opacity="0.6"
            className="context-switch-indicator"
          />
        )}

      {/* Item text (only if wide enough) */}
      {displayWidth > 60 && (
        <text
          x={displayX + ITEM_PADDING + (item.attention_type ? 24 : 0)}
          y={displayY + height / 2 - (item.attention_type && displayWidth > 120 ? 6 : 0)}
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

      {/* Attention type label (for larger items) */}
      {item.attention_type && displayWidth > 120 && (
        <text
          x={displayX + ITEM_PADDING + 24}
          y={displayY + height / 2 + 8}
          dominantBaseline="middle"
          fill="white"
          fontSize="10"
          opacity={0.8}
          className="pointer-events-none select-none"
          style={{
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {ATTENTION_TYPE_DESCRIPTIONS[item.attention_type as AttentionType]?.label}
        </text>
      )}

      {/* Duration text (only if wide enough and no attention type label) */}
      {displayWidth > 100 && !(item.attention_type && displayWidth > 120) && (
        <text
          x={displayX + ITEM_PADDING + (item.attention_type ? 24 : 0)}
          y={displayY + height / 2 + 14}
          dominantBaseline="middle"
          fill="white"
          fontSize="10"
          opacity={0.8}
          className="pointer-events-none select-none"
        >
          {isResizing
            ? formatDuration(Math.max(15, item.duration_minutes + Math.round((resizeDelta * 60) / pixelsPerHour)))
            : formatDuration(item.planned_duration_minutes || item.duration_minutes)}
        </text>
      )}

      {/* Duration text for very wide items with attention type */}
      {item.attention_type && displayWidth > 180 && (
        <text
          x={displayX + displayWidth - 80}
          y={displayY + height / 2 + 8}
          dominantBaseline="middle"
          fill="white"
          fontSize="10"
          opacity={0.8}
          className="pointer-events-none select-none"
        >
          {isResizing
            ? formatDuration(Math.max(15, item.duration_minutes + Math.round((resizeDelta * 60) / pixelsPerHour)))
            : formatDuration(item.planned_duration_minutes || item.duration_minutes)}
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

      {/* Attention Type Indicator */}
      {item.attention_type && displayWidth > 60 && (
        <g transform={`translate(${displayX + 8}, ${displayY + 6})`}>
          {/* Attention type icon background */}
          <circle
            cx="8"
            cy="8"
            r="8"
            fill={ATTENTION_TYPE_DESCRIPTIONS[item.attention_type as AttentionType]?.color || '#6b7280'}
            opacity="0.9"
          />
          {/* Attention type emoji/icon */}
          <text
            x="8"
            y="8"
            dominantBaseline="middle"
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
            className="pointer-events-none select-none"
          >
            {ATTENTION_TYPE_DESCRIPTIONS[item.attention_type as AttentionType]?.icon || '•'}
          </text>
        </g>
      )}

      {/* Priority Indicator */}
      {item.priority && item.priority > 3 && displayWidth > 40 && (
        <g transform={`translate(${displayX + (item.attention_type ? 30 : 8)}, ${displayY + 6})`}>
          {/* High priority indicator */}
          <polygon
            points="8,2 12,8 8,14 4,8"
            fill="#f59e0b"
            opacity="0.9"
          />
          <text
            x="8"
            y="8"
            dominantBaseline="middle"
            textAnchor="middle"
            fill="white"
            fontSize="8"
            fontWeight="bold"
            className="pointer-events-none select-none"
          >
            !
          </text>
        </g>
      )}

      {/* Non-negotiable indicator with enhanced protection styling */}
      {item.is_non_negotiable && displayWidth > 40 && (
        <g transform={`translate(${displayX + displayWidth - 22}, ${displayY + 4})`}>
          {/* Enhanced shield background */}
          <circle
            cx="10"
            cy="10"
            r="10"
            fill="rgba(220, 38, 38, 0.2)"
            stroke="#dc2626"
            strokeWidth="1"
            className="animate-pulse-slow"
          />
          {/* Shield icon for non-negotiable items */}
          <path
            d="M10 3 C10 3 14 4 14 8 C14 12 10 15 10 15 C10 15 6 12 6 8 C6 4 10 3 10 3 Z"
            fill="#dc2626"
            opacity="0.9"
          />
          {/* Lock symbol for protection */}
          <rect
            x="8"
            y="9"
            width="4"
            height="3"
            rx="0.5"
            fill="white"
            fontSize="6"
          />
          <path
            d="M8.5 9 C8.5 8.2 9.2 7.5 10 7.5 C10.8 7.5 11.5 8.2 11.5 9"
            stroke="white"
            strokeWidth="1"
            fill="none"
          />
        </g>
      )}

      {/* Document attachment indicator */}
      {documentCount > 0 && displayWidth > 80 && (
        <g transform={`translate(${displayX + displayWidth - (item.status === 'completed' ? 40 : 25)}, ${displayY + height - 18})`}>
          {/* Paperclip icon background */}
          <circle cx="8" cy="8" r="8" fill="rgba(255, 255, 255, 0.9)" />
          {/* Paperclip icon - simplified */}
          <path
            d="M6 10 L6 6 C6 5 7 4 8 4 C9 4 10 5 10 6 L10 10 C10 11.5 9 12.5 7.5 12.5 C6 12.5 5 11.5 5 10 L5 6"
            stroke="#3b82f6"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Count badge */}
          {documentCount > 1 && (
            <>
              <circle cx="12" cy="4" r="4" fill="#ef4444" />
              <text
                x="12"
                y="4"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="white"
                fontSize="6"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {documentCount > 9 ? '9+' : documentCount}
              </text>
            </>
          )}
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
