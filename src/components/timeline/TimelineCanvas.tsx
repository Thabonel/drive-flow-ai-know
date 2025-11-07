// Main SVG timeline canvas component

import React, { useRef, useState, useEffect } from 'react';
import { TimelineItem } from './TimelineItem';
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
}: TimelineCanvasProps) {
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
    <svg
      ref={svgRef}
      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
      style={{
        height: `${totalHeight}px`,
        cursor: isDragging ? 'grabbing' : (isLocked ? 'default' : 'grab'),
        // Multi-layer shadow system: contact + ambient + diffusion with asymmetric blur simulation
        boxShadow: `
          1.2px 3.2px 2px rgba(18, 25, 38, 0.07),
          1.2px 3.2px 8px rgba(18, 25, 38, 0.08),
          1.2px 3.2px 24px rgba(18, 25, 38, 0.10),
          inset 0 1px 0 rgba(255, 255, 255, 0.5)
        `,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleCanvasDoubleClick}
    >
      {/* SVG Filter Definitions - Professional Multi-Layer 3D Shadow System */}
      <defs>
        {/* Normal state - Triple shadow composite with mathematical falloff
            Elevation = 4px
            - Contact shadow: offset minimal, tight blur
            - Soft ambient: medium offset, medium blur
            - Diffusion shadow: large offset, large blur with asymmetric blur (horizontal 0.85x vertical)
        */}
        <filter id="timeline-shadow-normal" x="-100%" y="-100%" width="300%" height="300%">
          {/* Layer 1: Contact Shadow - Creates immediate depth perception */}
          <feDropShadow
            dx="1.2"
            dy="3.2"
            stdDeviation="1"
            floodColor="rgba(18, 25, 38, 0.07)"
            result="contactShadow"
          />

          {/* Layer 2: Soft Ambient Shadow - Mid-range diffusion */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="ambientBlur"/>
          <feOffset in="ambientBlur" dx="1.2" dy="3.2" result="ambientOffset"/>
          <feFlood floodColor="rgba(18, 25, 38, 0.08)" result="ambientColor"/>
          <feComposite in="ambientColor" in2="ambientOffset" operator="in" result="ambientShadow"/>

          {/* Layer 3: Diffusion Shadow - Long-range soft shadow with asymmetric blur */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="12 10.2" result="diffusionBlur"/>
          <feOffset in="diffusionBlur" dx="1.2" dy="3.2" result="diffusionOffset"/>
          <feFlood floodColor="rgba(18, 25, 38, 0.10)" result="diffusionColor"/>
          <feComposite in="diffusionColor" in2="diffusionOffset" operator="in" result="diffusionShadow"/>

          {/* Edge Lighting - Top edge highlight for realism */}
          <feFlood floodColor="rgba(255, 255, 255, 0.5)" result="edgeHighlight"/>
          <feComposite in="edgeHighlight" in2="SourceAlpha" operator="in" result="edgeComp"/>
          <feMorphology in="edgeComp" operator="erode" radius="0.5" result="edgeThin"/>

          {/* Combine all layers with proper stacking order */}
          <feMerge>
            <feMergeNode in="diffusionShadow"/>
            <feMergeNode in="ambientShadow"/>
            <feMergeNode in="contactShadow"/>
            <feMergeNode in="SourceGraphic"/>
            <feMergeNode in="edgeThin"/>
          </feMerge>
        </filter>

        {/* Active state - Enhanced elevation for dragging/resizing
            Elevation = 8px (2x normal)
            Mathematical scaling: shadow_blur(8) = 2 + (8 * 1.5) = 14
                                 shadow_offset_y(8) = 8 * 0.8 = 6.4
                                 shadow_offset_x(8) = 8 * 0.3 = 2.4
                                 shadow_opacity = base * (1 + 8 * 0.015) = base * 1.12
        */}
        <filter id="timeline-shadow-active" x="-100%" y="-100%" width="300%" height="300%">
          {/* Layer 1: Contact Shadow - Increased opacity */}
          <feDropShadow
            dx="2.4"
            dy="6.4"
            stdDeviation="1"
            floodColor="rgba(18, 25, 38, 0.08)"
            result="contactShadow"
          />

          {/* Layer 2: Soft Ambient Shadow - Scaled blur */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="ambientBlur"/>
          <feOffset in="ambientBlur" dx="2.4" dy="6.4" result="ambientOffset"/>
          <feFlood floodColor="rgba(18, 25, 38, 0.09)" result="ambientColor"/>
          <feComposite in="ambientColor" in2="ambientOffset" operator="in" result="ambientShadow"/>

          {/* Layer 3: Diffusion Shadow - Large asymmetric blur */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="24 20.4" result="diffusionBlur"/>
          <feOffset in="diffusionBlur" dx="2.4" dy="6.4" result="diffusionOffset"/>
          <feFlood floodColor="rgba(18, 25, 38, 0.12)" result="diffusionColor"/>
          <feComposite in="diffusionColor" in2="diffusionOffset" operator="in" result="diffusionShadow"/>

          {/* Edge Lighting - More pronounced on elevated items */}
          <feFlood floodColor="rgba(255, 255, 255, 0.6)" result="edgeHighlight"/>
          <feComposite in="edgeHighlight" in2="SourceAlpha" operator="in" result="edgeComp"/>
          <feMorphology in="edgeComp" operator="erode" radius="0.5" result="edgeThin"/>

          {/* Combine all layers */}
          <feMerge>
            <feMergeNode in="diffusionShadow"/>
            <feMergeNode in="ambientShadow"/>
            <feMergeNode in="contactShadow"/>
            <feMergeNode in="SourceGraphic"/>
            <feMergeNode in="edgeThin"/>
          </feMerge>
        </filter>

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

      {/* NOW line */}
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

      {/* Layer backgrounds and labels */}
      {visibleLayers.map((layer, index) => {
        const y = calculateLayerY(index, layerHeight, TIMELINE_HEADER_HEIGHT);

        return (
          <g key={layer.id}>
            {/* Layer background */}
            <rect
              x="0"
              y={y}
              width="100%"
              height={layerHeight}
              fill="currentColor"
              className={
                index % 2 === 0
                  ? 'text-gray-50 dark:text-gray-900'
                  : 'text-white dark:text-gray-850'
              }
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
      {filteredItems.map((item) => {
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
            />
          </g>
        );
      })}
    </svg>
  );
}
