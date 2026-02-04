// Responsive Timeline Canvas - Mobile-First SVG Timeline with Touch Support
// Addresses viewport-aware rendering and gesture interactions

import { useState, useRef, useEffect, useCallback } from 'react';
import { TimelineItem, TimelineLayer } from '@/lib/timelineUtils';
import { TimelineViewMode } from '@/lib/timelineConstants';
import { useInterfaceMode } from './InterfaceModeController';
import { useIsMobile } from '@/hooks/useResponsive';
import { Z_INDEX_CLASSES } from '@/lib/z-index';

interface ResponsiveTimelineCanvasProps {
  items: TimelineItem[];
  layers: TimelineLayer[];
  settings?: { zoom_horizontal?: number; zoom_vertical?: number; is_locked?: boolean };
  viewMode: TimelineViewMode;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
  pixelsPerHour: number;
  layerHeight: number;
  onItemClick?: (item: TimelineItem) => void;
  onItemDoubleClick?: (item: TimelineItem) => void;
  onAddItemClick?: (startTime: string, layerId: string) => void;
}

interface TouchState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startTime: number;
  scrollStartOffset: number;
  zoomStartScale: number;
  isPinching: boolean;
  initialDistance: number;
}

// Hook for responsive breakpoints
const useResponsiveBreakpoints = () => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
};

// Hook for touch gesture handling
const useTouchGestures = (
  svgRef: React.RefObject<SVGSVGElement>,
  onScrollChange: (offset: number) => void,
  onZoomChange: (scale: number) => void,
  initialScrollOffset: number,
  initialZoom: number
) => {
  const touchState = useRef<TouchState | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - start scroll
      const touch = e.touches[0];
      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        startTime: Date.now(),
        scrollStartOffset: initialScrollOffset,
        zoomStartScale: initialZoom,
        isPinching: false,
        initialDistance: 0,
      };
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (touchState.current) {
        touchState.current.isPinching = true;
        touchState.current.initialDistance = distance;
      }
    }
  }, [initialScrollOffset, initialZoom]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault(); // Prevent browser zoom/scroll

    if (!touchState.current) return;

    if (e.touches.length === 1 && !touchState.current.isPinching) {
      // Single touch - handle scroll
      const touch = e.touches[0];
      const deltaX = touchState.current.lastX - touch.clientX;
      const deltaY = touchState.current.lastY - touch.clientY;

      // Horizontal scroll (primary)
      const scrollDelta = deltaX * 2; // Amplify movement
      onScrollChange(touchState.current.scrollStartOffset + scrollDelta);

      touchState.current.lastX = touch.clientX;
      touchState.current.lastY = touch.clientY;

    } else if (e.touches.length === 2) {
      // Two touches - handle pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (touchState.current.initialDistance > 0) {
        const scaleChange = currentDistance / touchState.current.initialDistance;
        const newZoom = Math.max(0.1, Math.min(5, touchState.current.zoomStartScale * scaleChange));
        onZoomChange(newZoom);
      }
    }
  }, [onScrollChange, onZoomChange]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchState.current) return;

    // Handle tap vs drag
    const touchDuration = Date.now() - touchState.current.startTime;
    const touchDistance = Math.sqrt(
      Math.pow(touchState.current.lastX - touchState.current.startX, 2) +
      Math.pow(touchState.current.lastY - touchState.current.startY, 2)
    );

    // Reset touch state
    touchState.current = null;
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.addEventListener('touchstart', handleTouchStart, { passive: false });
    svg.addEventListener('touchmove', handleTouchMove, { passive: false });
    svg.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      svg.removeEventListener('touchstart', handleTouchStart);
      svg.removeEventListener('touchmove', handleTouchMove);
      svg.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, svgRef]);
};

export const ResponsiveTimelineCanvas: React.FC<ResponsiveTimelineCanvasProps> = ({
  items,
  layers,
  settings,
  viewMode,
  scrollOffset,
  onScrollOffsetChange,
  pixelsPerHour,
  layerHeight,
  onItemClick,
  onItemDoubleClick,
  onAddItemClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { config } = useInterfaceMode();
  const isMobile = useIsMobile();
  const breakpoint = useResponsiveBreakpoints();

  // Responsive dimensions
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const width = rect.width || window.innerWidth - 40; // Account for padding
        const height = Math.max(400, Math.min(800, window.innerHeight * 0.6));
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Touch gesture handling
  useTouchGestures(
    svgRef,
    onScrollOffsetChange,
    (zoom) => {
      // Handle zoom change - would need to be passed up to parent
      console.log('Zoom change:', zoom);
    },
    scrollOffset,
    (settings?.zoom_horizontal || 100) / 100
  );

  // Responsive viewport calculations
  const viewportWidth = dimensions.width;
  const viewportHeight = dimensions.height;

  // Calculate visible time range based on scroll offset
  const startTime = new Date(Date.now() - (scrollOffset / pixelsPerHour) * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + (viewportWidth / pixelsPerHour) * 60 * 60 * 1000);

  // Filter items to only render visible ones (performance optimization)
  const visibleItems = items.filter(item => {
    const itemStart = new Date(item.start_time);
    const itemEnd = new Date(itemStart.getTime() + item.duration_minutes * 60 * 1000);
    return itemEnd >= startTime && itemStart <= endTime;
  });

  // Filter visible layers
  const visibleLayers = layers.filter(layer => layer.is_visible);

  // Responsive layer height calculation
  const responsiveLayerHeight = breakpoint === 'mobile'
    ? Math.max(40, layerHeight * 0.8) // Minimum 40px on mobile
    : breakpoint === 'tablet'
    ? Math.max(50, layerHeight * 0.9) // Minimum 50px on tablet
    : layerHeight; // Full height on desktop

  // NOW line position
  const nowLineX = scrollOffset + (Date.now() - startTime.getTime()) / (1000 * 60 * 60) * pixelsPerHour;

  // Responsive styling
  const canvasStyles = {
    touchAction: 'none', // Prevent browser scrolling
    userSelect: 'none' as const,
    cursor: isMobile ? 'default' : 'grab',
  };

  const renderTimelineItem = (item: TimelineItem, layer: TimelineLayer, yPosition: number) => {
    const itemStart = new Date(item.start_time);
    const x = scrollOffset + (itemStart.getTime() - startTime.getTime()) / (1000 * 60 * 60) * pixelsPerHour;
    const width = Math.max(5, (item.duration_minutes / 60) * pixelsPerHour); // Minimum 5px width

    // Responsive text sizing
    const fontSize = breakpoint === 'mobile' ? '12px' : breakpoint === 'tablet' ? '13px' : '14px';
    const padding = breakpoint === 'mobile' ? 4 : 6;

    // Status-based styling
    const isOverdue = item.status === 'logjam';
    const isCompleted = item.status === 'completed';

    const itemColor = isCompleted
      ? '#10b981' // Green for completed
      : isOverdue
      ? '#ef4444' // Red for overdue
      : layer.color || '#3b82f6'; // Default blue

    return (
      <g key={item.id} className="timeline-item">
        {/* Main item rectangle */}
        <rect
          x={x}
          y={yPosition + 2}
          width={width}
          height={responsiveLayerHeight - 4}
          fill={itemColor}
          rx={4}
          stroke={isOverdue ? '#dc2626' : 'transparent'}
          strokeWidth={isOverdue ? 2 : 0}
          className={`
            cursor-pointer transition-all duration-200
            hover:brightness-110 hover:drop-shadow-lg
            ${isOverdue ? 'animate-pulse' : ''}
          `}
          onClick={() => onItemClick?.(item)}
          onDoubleClick={() => onItemDoubleClick?.(item)}
        />

        {/* Item text (responsive visibility) */}
        {width > (breakpoint === 'mobile' ? 30 : 40) && (
          <text
            x={x + padding}
            y={yPosition + responsiveLayerHeight / 2 + 4}
            fontSize={fontSize}
            fill="white"
            textAnchor="start"
            className="pointer-events-none select-none font-medium"
          >
            {item.title}
          </text>
        )}

        {/* Priority indicator (mobile optimization) */}
        {item.priority && item.priority > 7 && (
          <circle
            cx={x + width - 8}
            cy={yPosition + 8}
            r={4}
            fill="#fbbf24"
            className="drop-shadow-sm"
          />
        )}
      </g>
    );
  };

  const renderNowLine = () => {
    if (nowLineX < 0 || nowLineX > viewportWidth) return null;

    return (
      <g className="now-line">
        <line
          x1={nowLineX}
          y1={0}
          x2={nowLineX}
          y2={viewportHeight}
          stroke="#ef4444"
          strokeWidth={isMobile ? 2 : 3}
          className="drop-shadow-sm"
        />
        <circle
          cx={nowLineX}
          cy={10}
          r={isMobile ? 4 : 5}
          fill="#ef4444"
          className="drop-shadow-sm"
        />
        <text
          x={nowLineX + 10}
          y={25}
          fontSize={isMobile ? '12px' : '14px'}
          fill="#ef4444"
          className="font-bold pointer-events-none select-none"
        >
          NOW
        </text>
      </g>
    );
  };

  const renderTimeGrid = () => {
    const gridLines = [];
    const majorTickInterval = breakpoint === 'mobile' ? 2 : 1; // Every 2 hours on mobile, 1 hour on desktop
    const minorTickInterval = breakpoint === 'mobile' ? 1 : 0.5; // Every hour on mobile, 30min on desktop

    // Calculate grid range
    const startHour = Math.floor((startTime.getTime()) / (1000 * 60 * 60));
    const endHour = Math.ceil((endTime.getTime()) / (1000 * 60 * 60));

    for (let hour = startHour; hour <= endHour; hour += minorTickInterval) {
      const tickTime = new Date(hour * 60 * 60 * 1000);
      const x = scrollOffset + (tickTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * pixelsPerHour;

      if (x >= -50 && x <= viewportWidth + 50) {
        const isMajorTick = hour % majorTickInterval === 0;

        gridLines.push(
          <line
            key={hour}
            x1={x}
            y1={0}
            x2={x}
            y2={viewportHeight}
            stroke={isMajorTick ? '#e5e7eb' : '#f3f4f6'}
            strokeWidth={isMajorTick ? 1 : 0.5}
            opacity={0.6}
          />
        );

        // Time labels (only major ticks)
        if (isMajorTick) {
          const label = tickTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: !isMobile // Use 24-hour on mobile for space
          });

          gridLines.push(
            <text
              key={`label-${hour}`}
              x={x}
              y={breakpoint === 'mobile' ? 15 : 20}
              textAnchor="middle"
              fontSize={breakpoint === 'mobile' ? '10px' : '12px'}
              fill="#6b7280"
              className="pointer-events-none select-none font-medium"
            >
              {label}
            </text>
          );
        }
      }
    }

    return gridLines;
  };

  return (
    <div className={`relative w-full ${Z_INDEX_CLASSES.TIMELINE_BASE}`}>
      {/* Touch instruction overlay for first-time mobile users */}
      {isMobile && (
        <div className="absolute top-2 left-2 right-2 bg-blue-50 border border-blue-200 rounded-md p-2 text-xs text-blue-800 z-10">
          💡 Swipe to scroll timeline, pinch to zoom
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height={viewportHeight}
        style={canvasStyles}
        className={`
          w-full border border-gray-200 rounded-lg bg-white
          ${Z_INDEX_CLASSES.TIMELINE_BASE}
        `}
        viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
      >
        {/* Time grid background */}
        <g className="time-grid">
          {renderTimeGrid()}
        </g>

        {/* Layer backgrounds */}
        {visibleLayers.map((layer, index) => {
          const y = index * responsiveLayerHeight;
          return (
            <rect
              key={layer.id}
              x={0}
              y={y}
              width={viewportWidth}
              height={responsiveLayerHeight}
              fill={index % 2 === 0 ? '#fafafa' : '#ffffff'}
              className="cursor-pointer"
              onClick={(e) => {
                if (!onAddItemClick) return;

                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect) return;

                const clickX = e.clientX - rect.left;
                const clickTime = new Date(
                  startTime.getTime() + ((clickX - scrollOffset) / pixelsPerHour) * 60 * 60 * 1000
                );

                onAddItemClick(clickTime.toISOString(), layer.id);
              }}
            />
          );
        })}

        {/* Layer labels */}
        {visibleLayers.map((layer, index) => {
          const y = index * responsiveLayerHeight;
          return (
            <text
              key={`label-${layer.id}`}
              x={10}
              y={y + responsiveLayerHeight / 2 + 4}
              fontSize={breakpoint === 'mobile' ? '12px' : '14px'}
              fill="#374151"
              className="pointer-events-none select-none font-semibold"
            >
              {layer.name}
            </text>
          );
        })}

        {/* Timeline items */}
        {visibleLayers.map((layer, layerIndex) => {
          const layerItems = visibleItems.filter(item => item.layer_id === layer.id);
          const y = layerIndex * responsiveLayerHeight;

          return layerItems.map(item => renderTimelineItem(item, layer, y));
        })}

        {/* NOW line */}
        {renderNowLine()}
      </svg>

      {/* Mobile-specific controls overlay */}
      {isMobile && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg">
            <span className="text-xs text-gray-600">
              {visibleItems.length} items
            </span>
          </div>

          {settings?.is_locked && (
            <div className="bg-red-500/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg">
              <span className="text-xs text-white font-medium">🔴 LIVE</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};