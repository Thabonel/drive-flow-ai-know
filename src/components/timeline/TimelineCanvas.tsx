// Main SVG timeline canvas component

import React, { useRef, useState, useEffect } from 'react';
import { TimelineItem } from './TimelineItem';
import { useTimelineContext } from '@/contexts/TimelineContext';
import { TimelinePhilosophy } from './TimelinePhilosophy';
import { AttentionVisualization } from './AttentionVisualization';
import { AttentionBudgetAlerts } from './AttentionBudgetAlerts';
import { ContextSwitchWarning } from './ContextSwitchWarning';
import { PeakHoursOptimizer } from './PeakHoursOptimizer';
import {
  TimelineItem as TimelineItemType,
  TimelineLayer,
  generateTimeMarkers,
  calculateNowLineX,
  calculateLayerY,
  formatTime,
  formatDate,
} from '@/lib/timelineUtils';
import {
  NOW_LINE_POSITION,
  TIMELINE_HEADER_HEIGHT,
  DEFAULT_PAST_HOURS,
  DEFAULT_FUTURE_HOURS,
} from '@/lib/timelineConstants';

interface TimelineCanvasProps {
  items: TimelineItemType[];
  layers: TimelineLayer[];
  nowTime: Date;
  scrollOffset: number;
  pixelsPerHour: number;
  layerHeight: number;
  isLocked: boolean;
  showCompleted: boolean;
  pastHours?: number;
  futureHours?: number;
  subdivisionMinutes?: number;
  onItemClick: (item: TimelineItemType) => void;
  onDrag?: (deltaX: number) => void;
  onItemDrop?: (item: TimelineItemType, newStartTime: string, newLayerId: string) => void;
  onItemResize?: (item: TimelineItemType, newDurationMinutes: number) => void;
  onDoubleClick?: (startTime: string, layerId: string) => void;
  onCanvasReady?: (svg: SVGSVGElement) => void;
}

export function TimelineCanvas({
  items,
  layers,
  nowTime,
  scrollOffset,
  pixelsPerHour,
  layerHeight,
  isLocked,
  showCompleted,
  pastHours = DEFAULT_PAST_HOURS,
  futureHours = DEFAULT_FUTURE_HOURS,
  subdivisionMinutes = 360,
  onItemClick,
  onDrag,
  onItemDrop,
  onItemResize,
  onDoubleClick,
  onCanvasReady,
}: TimelineCanvasProps) {
  const { checkBudgetViolation, attentionPreferences } = useTimelineContext();
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewportWidth, setViewportWidth] = useState(0);

  // Update viewport width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (svgRef.current) {
        setViewportWidth(svgRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Expose SVG element to parent for drag-drop calculations
  useEffect(() => {
    if (svgRef.current && onCanvasReady) {
      onCanvasReady(svgRef.current);
    }
  }, [onCanvasReady]);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isLocked) return;

    const deltaX = e.clientX - dragStart.x;
    onDrag?.(deltaX);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle item drag end - calculate new time and layer
  const handleItemDragEnd = (item: TimelineItemType, deltaX: number, deltaY: number) => {
    if (!onItemDrop) return;

    // Calculate time change from horizontal drag
    const hoursChanged = deltaX / pixelsPerHour;
    const currentStartTime = new Date(item.start_time);
    const newStartTime = new Date(currentStartTime.getTime() + hoursChanged * 60 * 60 * 1000);

    // Calculate layer change from vertical drag
    const layerIndexChange = Math.round(deltaY / layerHeight);
    const currentLayer = visibleLayers.find(l => l.id === item.layer_id);
    if (!currentLayer) return;

    const currentLayerIndex = visibleLayers.indexOf(currentLayer);
    const newLayerIndex = Math.max(0, Math.min(visibleLayers.length - 1, currentLayerIndex + layerIndexChange));
    const newLayer = visibleLayers[newLayerIndex];

    // Only update if something changed
    if (newLayer.id !== item.layer_id || Math.abs(hoursChanged) > 0.01) {
      onItemDrop(item, newStartTime.toISOString(), newLayer.id);
    }
  };

  // Handle double-click on canvas - create item at clicked position
  const handleCanvasDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onDoubleClick || visibleLayers.length === 0) return;

    // Get SVG coordinates
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Skip if clicked in header area
    if (y < TIMELINE_HEADER_HEIGHT) return;

    // Calculate which layer was clicked
    const layerY = y - TIMELINE_HEADER_HEIGHT;
    const layerIndex = Math.floor(layerY / layerHeight);
    if (layerIndex < 0 || layerIndex >= visibleLayers.length) return;
    const clickedLayer = visibleLayers[layerIndex];

    // Calculate time from X position
    // Reverse the calculateItemX formula: x = nowLineX + (hoursFromNow * pixelsPerHour) + scrollOffset
    // So: hoursFromNow = (x - nowLineX - scrollOffset) / pixelsPerHour
    const nowLineX = calculateNowLineX(viewportWidth, isLocked, scrollOffset);
    const hoursFromNow = (x - nowLineX - scrollOffset) / pixelsPerHour;
    const clickedTime = new Date(nowTime.getTime() + hoursFromNow * 60 * 60 * 1000);

    onDoubleClick(clickedTime.toISOString(), clickedLayer.id);
  };

  // Calculate dimensions
  const visibleLayers = layers.filter(l => l.is_visible);
  const totalHeight = TIMELINE_HEADER_HEIGHT + (visibleLayers.length * layerHeight);
  const nowLineX = calculateNowLineX(viewportWidth, isLocked, scrollOffset);

  // Helper to calculate budget status for an item
  const getBudgetStatusForItem = (item: TimelineItemType): 'within' | 'warning' | 'over' | null => {
    if (!item.attention_type) return null;

    const itemDate = new Date(item.start_time);
    const budgetStatuses = checkBudgetViolation(items, itemDate);

    const statusForType = budgetStatuses.find(status => status.attention_type === item.attention_type);
    if (!statusForType) return null;

    if (statusForType.is_over_budget) return 'over';
    if (statusForType.usage_percentage >= 80) return 'warning';
    return 'within';
  };

  // Generate time markers
  const timeMarkers = generateTimeMarkers(
    nowTime,
    viewportWidth,
    pixelsPerHour,
    scrollOffset,
    pastHours,
    futureHours,
    subdivisionMinutes
  );

  // Filter items based on showCompleted setting
  const filteredItems = showCompleted
    ? items
    : items.filter(item => item.status !== 'completed');

  return (
    <div className="relative w-full">
      {/* Attention budget alerts and context switch warnings overlay */}
      {attentionPreferences && (
        <div className="absolute top-0 left-0 right-0 z-20 p-4 space-y-3">
          <AttentionBudgetAlerts
            items={filteredItems}
            preferences={attentionPreferences}
            currentDate={nowTime}
            onTakeAction={(action, data) => {
              // Handle attention budget actions
              console.log('Attention action:', action, data);
              // Could emit events to parent or implement specific actions here
            }}
            onDismiss={(alertId) => {
              // Handle alert dismissal
              console.log('Dismiss alert:', alertId);
              // Could store dismissed alerts in local storage or state
            }}
            compact={true}
            className="max-w-2xl"
          />

          <ContextSwitchWarning
            items={filteredItems}
            preferences={attentionPreferences}
            currentDate={nowTime}
            onBatchSuggestion={(batchItems, targetTime) => {
              // Handle batching suggestions
              console.log('Batch suggestion:', batchItems.map(item => item.title), 'at', targetTime);
              // Could implement automatic batching or show UI to confirm
            }}
            onOptimizeSchedule={() => {
              // Handle schedule optimization request
              console.log('Optimize schedule requested');
              // Could trigger AI optimization or open optimization dialog
            }}
            compact={true}
            className="max-w-2xl"
          />

          <PeakHoursOptimizer
            items={filteredItems}
            preferences={attentionPreferences}
            currentDate={nowTime}
            onOptimizeSchedule={(suggestions) => {
              // Handle peak hours optimization suggestions
              console.log('Peak hours optimization:', suggestions);
              // Could implement automatic rescheduling or show confirmation UI
            }}
            onUpdatePeakHours={(startTime, endTime) => {
              // Handle peak hours updates
              console.log('Update peak hours:', startTime, endTime);
              // Could update user preferences via API
            }}
            compact={true}
            className="max-w-2xl"
          />
        </div>
      )}

      {/* Attention visualization overlay */}
      {attentionPreferences && (
        <AttentionVisualization
          items={filteredItems}
          preferences={attentionPreferences}
          currentDate={nowTime}
          pixelsPerHour={pixelsPerHour}
          scrollOffset={scrollOffset}
          nowLineX={nowLineX}
          viewportWidth={viewportWidth}
          layerHeight={layerHeight}
          headerHeight={TIMELINE_HEADER_HEIGHT}
        />
      )}

      <svg
      ref={svgRef}
      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-[0_4px_20px_-2px_rgba(10,35,66,0.15),0_16px_40px_-4px_rgba(10,35,66,0.25)]"
      style={{
        height: `${totalHeight}px`,
        cursor: isDragging ? 'grabbing' : (isLocked ? 'default' : 'grab'),
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleCanvasDoubleClick}
    >
      {/* SVG Filter Definitions */}
      <defs>
        {/* NOW line glow effect */}
        <filter id="now-line-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="currentColor"
        className="text-gray-50 dark:text-gray-900"
      />

      {/* Time markers header section */}
      <g className="time-markers-header">
        <rect
          x="0"
          y="0"
          width="100%"
          height={TIMELINE_HEADER_HEIGHT}
          fill="currentColor"
          className="text-gray-100 dark:text-gray-800"
        />

        {/* Time markers */}
        {timeMarkers.map((marker, index) => (
          <g key={index}>
            {/* Vertical line */}
            <line
              x1={marker.x}
              y1={marker.isMajor ? 0 : 40}
              x2={marker.x}
              y2={totalHeight}
              stroke="currentColor"
              className={
                marker.isPast
                  ? 'text-gray-300 dark:text-gray-700'
                  : 'text-gray-400 dark:text-gray-600'
              }
              strokeWidth={marker.isMajor ? 2 : 1}
              opacity={marker.isMajor ? 0.5 : 0.2}
            />

            {/* Time labels */}
            {marker.isMajor ? (
              // Major markers: Show both date and time
              <>
                <text
                  x={marker.x + 5}
                  y={15}
                  fontSize="10"
                  fill="currentColor"
                  className={
                    marker.isPast
                      ? 'text-gray-500 dark:text-gray-500'
                      : 'text-gray-700 dark:text-gray-300'
                  }
                >
                  {formatDate(marker.time.toISOString())}
                </text>
                <text
                  x={marker.x + 5}
                  y={30}
                  fontSize="12"
                  fontWeight="500"
                  fill="currentColor"
                  className={
                    marker.isPast
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-800 dark:text-gray-200'
                  }
                >
                  {formatTime(marker.time.toISOString())}
                </text>
              </>
            ) : (
              // Minor markers: Show only time
              <text
                x={marker.x + 3}
                y={55}
                fontSize="10"
                fill="currentColor"
                className={
                  marker.isPast
                    ? 'text-gray-400 dark:text-gray-600'
                    : 'text-gray-500 dark:text-gray-500'
                }
              >
                {formatTime(marker.time.toISOString())}
              </text>
            )}
          </g>
        ))}
      </g>

      {/* Layer backgrounds and labels */}
      {visibleLayers.map((layer, index) => {
        const y = calculateLayerY(index, layerHeight, TIMELINE_HEADER_HEIGHT);

        return (
          <g key={layer.id}>
            {/* Layer background - uniform dark color with light border */}
            <rect
              x="0"
              y={y}
              width="100%"
              height={layerHeight}
              fill="currentColor"
              className="text-gray-50 dark:text-gray-900"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={1}
              opacity={0.5}
            />

            {/* Layer name label (on the left, in past area) */}
            <text
              x={10}
              y={y + layerHeight / 2}
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="500"
              fill="currentColor"
              className="text-gray-600 dark:text-gray-400"
              opacity={0.7}
            >
              {layer.name}
            </text>

            {/* Layer separator */}
            <line
              x1="0"
              y1={y + layerHeight}
              x2="100%"
              y2={y + layerHeight}
              stroke="currentColor"
              className="text-gray-300 dark:text-gray-700"
              strokeWidth={1}
            />
          </g>
        );
      })}

      {/* Timeline items */}
      {filteredItems.length === 0 ? (
        // Empty state with philosophy
        <foreignObject x="0" y="100" width={viewportWidth} height="400">
          <div className="flex items-center justify-center py-12 px-4">
            <TimelinePhilosophy mode="standalone" />
          </div>
        </foreignObject>
      ) : (
        // Existing items rendering
        filteredItems.map((item) => {
          const layer = visibleLayers.find(l => l.id === item.layer_id);
          if (!layer) return null;

          const layerIndex = visibleLayers.indexOf(layer);
          const y = calculateLayerY(layerIndex, layerHeight, TIMELINE_HEADER_HEIGHT);

          return (
            <g key={item.id} transform={`translate(0, ${y})`}>
              <TimelineItem
                item={item}
                layerIndex={layerIndex}
                layerHeight={layerHeight}
                viewportWidth={viewportWidth}
                pixelsPerHour={pixelsPerHour}
                scrollOffset={scrollOffset}
                nowTime={nowTime}
                onClick={onItemClick}
                onDragEnd={handleItemDragEnd}
                onResize={onItemResize}
                attentionBudgetStatus={getBudgetStatusForItem(item)}
              />
            </g>
          );
        })
      )}

      {/* NOW line - rendered last to appear on top of all layers and items */}
      <g className="now-line">
        <line
          x1={nowLineX}
          y1={0}
          x2={nowLineX}
          y2={totalHeight}
          stroke="#ef4444"
          strokeWidth={3}
          opacity={0.8}
          filter="url(#now-line-glow)"
        />
        {/* Date label */}
        <text
          x={nowLineX + 5}
          y={15}
          fontSize="10"
          fill="#ef4444"
        >
          {formatDate(nowTime.toISOString())}
        </text>
        {/* Time label */}
        <text
          x={nowLineX + 5}
          y={30}
          fontSize="12"
          fontWeight="500"
          fill="#ef4444"
        >
          {formatTime(nowTime.toISOString())}
        </text>
        {/* NOW label */}
        <text
          x={nowLineX + 5}
          y={45}
          fontSize="12"
          fontWeight="bold"
          fill="#ef4444"
        >
          NOW
        </text>
      </g>
    </svg>
    </div>
  );
}
