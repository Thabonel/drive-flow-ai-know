// SVG-based decision batching visualization for timeline overlay
import React, { useMemo } from 'react';
import { TimelineItem } from '@/lib/timelineUtils';
import { ATTENTION_TYPES } from '@/lib/attentionTypes';
import { calculateItemX, calculateItemWidth } from '@/lib/timelineUtils';

interface DecisionBatchVisualizationProps {
  items: TimelineItem[];
  pixelsPerHour: number;
  scrollOffset: number;
  nowTime: Date;
  viewportWidth: number;
  headerHeight: number;
  layerHeight: number;
  showOptimizationSuggestions?: boolean;
}

interface DecisionBatch {
  items: TimelineItem[];
  startX: number;
  endX: number;
  efficiency: number;
  suggestedOptimization?: string;
}

export function DecisionBatchVisualization({
  items,
  pixelsPerHour,
  scrollOffset,
  nowTime,
  viewportWidth,
  headerHeight,
  layerHeight,
  showOptimizationSuggestions = true
}: DecisionBatchVisualizationProps) {

  const decisionBatches = useMemo(() => {
    // Find decision events for current day
    const currentDate = nowTime.toDateString();
    const decisionEvents = items.filter(item =>
      item.attention_type === ATTENTION_TYPES.DECIDE &&
      new Date(item.start_time).toDateString() === currentDate
    ).sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    if (decisionEvents.length < 2) return [];

    const batches: DecisionBatch[] = [];
    let currentBatch: TimelineItem[] = [decisionEvents[0]];

    for (let i = 1; i < decisionEvents.length; i++) {
      const prevEvent = decisionEvents[i - 1];
      const currentEvent = decisionEvents[i];

      const timeDiff = new Date(currentEvent.start_time).getTime() -
                      new Date(prevEvent.start_time).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Group decisions within 2 hours, or extend existing batch if gap is < 30 minutes
      const shouldGroup = hoursDiff <= 2 ||
                         (currentBatch.length > 1 && hoursDiff <= 0.5);

      if (shouldGroup) {
        currentBatch.push(currentEvent);
      } else {
        if (currentBatch.length > 1) {
          batches.push(createBatchData(currentBatch));
        }
        currentBatch = [currentEvent];
      }
    }

    // Add final batch
    if (currentBatch.length > 1) {
      batches.push(createBatchData(currentBatch));
    }

    return batches.filter(batch =>
      batch.endX >= -50 && batch.startX <= viewportWidth + 50
    );
  }, [items, pixelsPerHour, scrollOffset, nowTime, viewportWidth]);

  function createBatchData(batchItems: TimelineItem[]): DecisionBatch {
    const firstEvent = batchItems[0];
    const lastEvent = batchItems[batchItems.length - 1];

    const startX = calculateItemX(
      firstEvent.start_time,
      nowTime,
      viewportWidth,
      pixelsPerHour,
      scrollOffset
    ) - 8;

    const lastEndTime = new Date(lastEvent.start_time);
    lastEndTime.setMinutes(lastEndTime.getMinutes() + lastEvent.duration_minutes);

    const endX = calculateItemX(
      lastEndTime.toISOString(),
      nowTime,
      viewportWidth,
      pixelsPerHour,
      scrollOffset
    ) + calculateItemWidth(lastEvent.duration_minutes, pixelsPerHour) + 8;

    // Calculate batch efficiency score
    const totalDuration = batchItems.reduce((sum, item) => sum + item.duration_minutes, 0);
    const timeSpan = (new Date(lastEvent.start_time).getTime() -
                     new Date(firstEvent.start_time).getTime()) / (1000 * 60);
    const efficiency = Math.min(100, Math.round((totalDuration / (timeSpan + totalDuration)) * 100));

    // Generate optimization suggestion
    let suggestedOptimization = undefined;
    if (efficiency < 70 && batchItems.length > 2) {
      suggestedOptimization = `Consolidate ${batchItems.length} decisions into 1-2 focused sessions`;
    } else if (timeSpan > 180) { // > 3 hours span
      suggestedOptimization = 'Consider tighter time clustering for better focus';
    }

    return {
      items: batchItems,
      startX,
      endX,
      efficiency,
      suggestedOptimization
    };
  }

  if (decisionBatches.length === 0) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 3 }}>
      <defs>
        <pattern id="decision-batch-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
          <rect width="8" height="8" fill="rgba(147, 51, 234, 0.03)" />
          <circle cx="4" cy="4" r="1.5" fill="rgba(147, 51, 234, 0.15)" />
        </pattern>

        <filter id="batch-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <marker id="decision-arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="rgba(147, 51, 234, 0.5)" />
        </marker>

        {/* Batch grouping pattern with animation */}
        <pattern id="animated-batch-pattern" patternUnits="userSpaceOnUse" width="12" height="12">
          <rect width="12" height="12" fill="rgba(147, 51, 234, 0.05)" />
          <circle cx="6" cy="6" r="2" fill="rgba(147, 51, 234, 0.2)">
            <animate attributeName="r" values="2;3;2" dur="3s" repeatCount="indefinite" />
          </circle>
        </pattern>
      </defs>

      {decisionBatches.map((batch, batchIndex) => {
        const batchWidth = batch.endX - batch.startX;
        const efficiencyColor = batch.efficiency >= 80 ? '#22c55e' :
                               batch.efficiency >= 60 ? '#f59e0b' : '#ef4444';
        const baseY = headerHeight + 35;

        return (
          <g key={batchIndex} className="decision-batch-group">
            {/* Enhanced batch grouping background with animated pattern */}
            <rect
              x={batch.startX}
              y={baseY}
              width={batchWidth}
              height={40}
              rx="10"
              fill="url(#animated-batch-pattern)"
              stroke="rgba(147, 51, 234, 0.25)"
              strokeWidth="2"
              strokeDasharray="8,4"
              className="decision-batch-background"
            />

            {/* Efficiency indicator gradient bar */}
            <defs>
              <linearGradient id={`efficiency-gradient-${batchIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={efficiencyColor} stopOpacity="0.8" />
                <stop offset={`${batch.efficiency}%`} stopColor={efficiencyColor} stopOpacity="0.6" />
                <stop offset={`${batch.efficiency}%`} stopColor="rgba(156, 163, 175, 0.3)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgba(156, 163, 175, 0.2)" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            <rect
              x={batch.startX}
              y={baseY}
              width={batchWidth}
              height={6}
              rx="3"
              fill={`url(#efficiency-gradient-${batchIndex})`}
              className="batch-efficiency-strip"
            />

            {/* Batch header with enhanced styling */}
            <g className="batch-header">
              <rect
                x={batch.startX + 8}
                y={baseY + 10}
                width={Math.min(batchWidth - 16, 180)}
                height={22}
                rx="6"
                fill="rgba(255, 255, 255, 0.95)"
                stroke="rgba(147, 51, 234, 0.3)"
                strokeWidth="1.5"
                filter="url(#batch-glow)"
                className="drop-shadow-md"
              />

              {/* Batch icon and title */}
              <circle
                cx={batch.startX + 18}
                cy={baseY + 21}
                r="6"
                fill="rgb(147, 51, 234)"
                className="opacity-80"
              />
              <text
                x={batch.startX + 18}
                y={baseY + 21}
                dominantBaseline="middle"
                textAnchor="middle"
                fontSize="8"
                fontWeight="bold"
                fill="white"
              >
                🎯
              </text>

              <text
                x={batch.startX + 28}
                y={baseY + 18}
                fontSize="10"
                fontWeight="600"
                fill="rgb(147, 51, 234)"
              >
                Decision Batch ({batch.items.length})
              </text>

              <text
                x={batch.startX + 28}
                y={baseY + 28}
                fontSize="8"
                fill={efficiencyColor}
                fontWeight="500"
              >
                Efficiency: {batch.efficiency}% •
                {Math.round(batch.items.reduce((sum, item) => sum + item.duration_minutes, 0) / 60 * 10) / 10}h total
              </text>
            </g>

            {/* Connection lines to individual decision items with enhanced styling */}
            {batch.items.map((item, itemIndex) => {
              const itemX = calculateItemX(
                item.start_time,
                nowTime,
                viewportWidth,
                pixelsPerHour,
                scrollOffset
              );
              const itemWidth = calculateItemWidth(item.duration_minutes, pixelsPerHour);
              const connectionY = baseY + 75;

              return (
                <g key={itemIndex} className="batch-connection">
                  {/* Connection line with curve */}
                  <path
                    d={`M ${itemX + itemWidth / 2} ${connectionY} Q ${itemX + itemWidth / 2} ${baseY + 50} ${batch.startX + (batchWidth / 2)} ${baseY + 35}`}
                    stroke="rgba(147, 51, 234, 0.4)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="3,2"
                    className="batch-connection-line"
                  />

                  {/* Enhanced item connection point */}
                  <circle
                    cx={itemX + itemWidth / 2}
                    cy={connectionY}
                    r="5"
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgb(147, 51, 234)"
                    strokeWidth="2"
                    filter="url(#batch-glow)"
                  />

                  <circle
                    cx={itemX + itemWidth / 2}
                    cy={connectionY}
                    r="3"
                    fill="rgb(147, 51, 234)"
                  />

                  {/* Item index number */}
                  <text
                    x={itemX + itemWidth / 2}
                    y={connectionY}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="white"
                  >
                    {itemIndex + 1}
                  </text>

                  {/* Item time label */}
                  <text
                    x={itemX + itemWidth / 2}
                    y={connectionY + 15}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontSize="7"
                    fill="rgb(107, 114, 128)"
                    fontWeight="500"
                  >
                    {new Date(item.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </text>
                </g>
              );
            })}

            {/* Optimization suggestion with enhanced styling */}
            {showOptimizationSuggestions && batch.suggestedOptimization && (
              <g className="batch-optimization-tip">
                <rect
                  x={batch.startX + 8}
                  y={baseY + 35}
                  width={Math.min(batchWidth - 16, 220)}
                  height={16}
                  rx="4"
                  fill="rgba(245, 158, 11, 0.1)"
                  stroke="rgba(245, 158, 11, 0.4)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />

                <circle
                  cx={batch.startX + 16}
                  cy={baseY + 43}
                  r="3"
                  fill="rgb(245, 158, 11)"
                />

                <text
                  x={batch.startX + 16}
                  y={baseY + 43}
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fill="white"
                >
                  💡
                </text>

                <text
                  x={batch.startX + 24}
                  y={baseY + 43}
                  dominantBaseline="middle"
                  fontSize="8"
                  fill="rgb(245, 158, 11)"
                  fontWeight="500"
                >
                  {batch.suggestedOptimization.length > 30
                    ? batch.suggestedOptimization.substring(0, 30) + '...'
                    : batch.suggestedOptimization
                  }
                </text>
              </g>
            )}

            {/* Batch flow arrows between items */}
            {batch.items.length > 2 && (
              <g className="batch-flow-arrows">
                {batch.items.slice(0, -1).map((item, flowIndex) => {
                  const currentItemX = calculateItemX(
                    item.start_time, nowTime, viewportWidth, pixelsPerHour, scrollOffset
                  );
                  const nextItem = batch.items[flowIndex + 1];
                  const nextItemX = calculateItemX(
                    nextItem.start_time, nowTime, viewportWidth, pixelsPerHour, scrollOffset
                  );
                  const flowY = baseY + 75;

                  return (
                    <path
                      key={flowIndex}
                      d={`M ${currentItemX + 20} ${flowY} Q ${(currentItemX + nextItemX) / 2} ${flowY - 10} ${nextItemX - 5} ${flowY}`}
                      stroke="rgba(147, 51, 234, 0.5)"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#decision-arrow)"
                      className="batch-flow-line"
                      strokeDasharray="4,2"
                      style={{
                        animation: 'batchFlowAnimation 2s ease-in-out infinite'
                      }}
                    />
                  );
                })}
              </g>
            )}

            {/* Batch clustering quality indicator */}
            <g className="batch-quality-indicator">
              <circle
                cx={batch.startX + batchWidth - 15}
                cy={baseY + 15}
                r="8"
                fill={
                  batch.efficiency >= 80 ? '#22c55e' :
                  batch.efficiency >= 60 ? '#f59e0b' : '#ef4444'
                }
                className="opacity-90"
                filter="url(#batch-glow)"
              />
              <text
                x={batch.startX + batchWidth - 15}
                y={baseY + 15}
                dominantBaseline="middle"
                textAnchor="middle"
                fontSize="7"
                fontWeight="bold"
                fill="white"
              >
                {batch.efficiency >= 80 ? 'A+' :
                 batch.efficiency >= 60 ? 'B' : 'C'}
              </text>
            </g>
          </g>
        );
      })}

      {/* Animation styles */}
      <style>{`
        @keyframes batchFlowAnimation {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 12; }
        }

        @keyframes batchGroupPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        .decision-batch-background {
          animation: batchGroupPulse 4s ease-in-out infinite;
        }

        .batch-connection-line {
          transition: stroke-width 0.2s ease;
        }

        .batch-connection-line:hover {
          stroke-width: 3;
        }
      `}</style>
    </svg>
  );
}