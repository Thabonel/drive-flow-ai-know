// Attention budget visualization overlay for timeline
import { useMemo } from 'react';
import { TimelineItem } from '@/lib/timelineUtils';
import { UserAttentionPreferences, ATTENTION_TYPE_DESCRIPTIONS } from '@/lib/attentionTypes';
import { analyzeAttentionBudget, AttentionBudgetAnalysis } from '@/lib/attentionBudgetEngine';

interface AttentionVisualizationProps {
  items: TimelineItem[];
  preferences: UserAttentionPreferences;
  currentDate: Date;
  pixelsPerHour: number;
  scrollOffset: number;
  nowLineX: number;
  viewportWidth: number;
  layerHeight: number;
  headerHeight: number;
}

interface ContextSwitchIndicator {
  x: number;
  fromType: string;
  toType: string;
  cost: number;
  severity: 'low' | 'medium' | 'high';
}

interface BudgetZone {
  attentionType: string;
  startX: number;
  endX: number;
  y: number;
  height: number;
  status: 'within' | 'warning' | 'over';
  usage: number;
  limit: number;
}

export function AttentionVisualization({
  items,
  preferences,
  currentDate,
  pixelsPerHour,
  scrollOffset,
  nowLineX,
  viewportWidth,
  layerHeight,
  headerHeight
}: AttentionVisualizationProps) {

  const analysis = useMemo(() => {
    if (!preferences) return null;
    return analyzeAttentionBudget(items, preferences, currentDate);
  }, [items, preferences, currentDate]);

  const contextSwitchIndicators = useMemo(() => {
    if (!analysis) return [];

    return analysis.contextSwitchAnalysis.switchPoints.map((switchPoint, index) => {
      const switchTime = new Date(switchPoint.time);
      const hoursFromStart = (switchTime.getTime() - currentDate.setHours(0, 0, 0, 0)) / (1000 * 60 * 60);
      const x = nowLineX + (hoursFromStart * pixelsPerHour) + scrollOffset;

      // Determine severity based on cost
      const severity = switchPoint.cost >= 8 ? 'high' :
                     switchPoint.cost >= 5 ? 'medium' : 'low';

      return {
        x,
        fromType: switchPoint.fromType,
        toType: switchPoint.toType,
        cost: switchPoint.cost,
        severity
      } as ContextSwitchIndicator;
    }).filter(indicator => indicator.x >= -50 && indicator.x <= viewportWidth + 50); // Only visible indicators
  }, [analysis, currentDate, nowLineX, pixelsPerHour, scrollOffset, viewportWidth]);

  const peakHoursZone = useMemo(() => {
    if (!preferences?.peak_hours_start || !preferences?.peak_hours_end) return null;

    const [startHour, startMinute] = preferences.peak_hours_start.split(':').map(Number);
    const [endHour, endMinute] = preferences.peak_hours_end.split(':').map(Number);

    const startHours = startHour + startMinute / 60;
    const endHours = endHour + endMinute / 60;

    const startX = nowLineX + (startHours * pixelsPerHour) + scrollOffset;
    const endX = nowLineX + (endHours * pixelsPerHour) + scrollOffset;

    return {
      startX: Math.max(0, startX),
      endX: Math.min(viewportWidth, endX),
      width: Math.min(viewportWidth, endX) - Math.max(0, startX)
    };
  }, [preferences, nowLineX, pixelsPerHour, scrollOffset, viewportWidth]);

  const budgetViolationZones = useMemo(() => {
    if (!analysis?.budgetViolations.length) return [];

    // Create visual zones for budget violations
    return analysis.budgetViolations.map((violation, index) => {
      const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[violation.attentionType];
      const yOffset = headerHeight + (index * 25); // Stack violations vertically

      return {
        attentionType: violation.attentionType,
        startX: 0,
        endX: viewportWidth,
        y: yOffset,
        height: 20,
        status: violation.severity === 'critical' ? 'over' :
                violation.severity === 'exceeded' ? 'over' : 'warning',
        usage: violation.currentUsage,
        limit: violation.budgetLimit,
        color: attentionDesc.color
      } as BudgetZone & { color: string };
    });
  }, [analysis?.budgetViolations, viewportWidth, headerHeight]);

  if (!analysis) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <defs>
        {/* Gradient for peak hours zone */}
        <linearGradient id="peak-hours-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
        </linearGradient>

        {/* Pattern for budget violation zones */}
        <pattern id="warning-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
          <rect width="8" height="8" fill="rgba(245, 158, 11, 0.1)" />
          <path d="M0,8 L8,0" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="1" />
        </pattern>

        <pattern id="violation-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
          <rect width="8" height="8" fill="rgba(239, 68, 68, 0.1)" />
          <path d="M0,8 L8,0" stroke="rgba(239, 68, 68, 0.2)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Peak Hours Zone */}
      {peakHoursZone && peakHoursZone.width > 0 && (
        <g className="peak-hours-zone">
          <rect
            x={peakHoursZone.startX}
            y={headerHeight}
            width={peakHoursZone.width}
            height={600} // Cover entire timeline height
            fill="url(#peak-hours-gradient)"
            className="opacity-60"
          />

          {/* Peak hours label */}
          <text
            x={peakHoursZone.startX + 5}
            y={headerHeight + 20}
            fontSize="10"
            fontWeight="500"
            fill="rgb(34, 197, 94)"
            className="opacity-80"
          >
            Peak Attention Hours
          </text>

          <text
            x={peakHoursZone.startX + 5}
            y={headerHeight + 35}
            fontSize="8"
            fill="rgb(34, 197, 94)"
            className="opacity-60"
          >
            {preferences.peak_hours_start} - {preferences.peak_hours_end}
          </text>
        </g>
      )}

      {/* Budget Violation Zones */}
      {budgetViolationZones.map((zone, index) => (
        <g key={index} className="budget-violation-zone">
          <rect
            x={zone.startX}
            y={zone.y}
            width={zone.endX - zone.startX}
            height={zone.height}
            fill={zone.status === 'over' ? 'url(#violation-pattern)' : 'url(#warning-pattern)'}
            className="opacity-70"
          />

          {/* Budget status label */}
          <text
            x={10}
            y={zone.y + 12}
            fontSize="9"
            fontWeight="500"
            fill={zone.status === 'over' ? 'rgb(239, 68, 68)' : 'rgb(245, 158, 11)'}
          >
            {zone.attentionType} budget: {Math.round(zone.usage / 60 * 10) / 10}h / {Math.round(zone.limit / 60 * 10) / 10}h
          </text>
        </g>
      ))}

      {/* Context Switch Indicators */}
      {contextSwitchIndicators.map((indicator, index) => (
        <g key={index} className="context-switch-indicator">
          {/* Switch line */}
          <line
            x1={indicator.x}
            y1={headerHeight}
            x2={indicator.x}
            y2={headerHeight + 600}
            stroke={
              indicator.severity === 'high' ? 'rgb(239, 68, 68)' :
              indicator.severity === 'medium' ? 'rgb(245, 158, 11)' : 'rgb(156, 163, 175)'
            }
            strokeWidth={
              indicator.severity === 'high' ? 2 :
              indicator.severity === 'medium' ? 1.5 : 1
            }
            strokeDasharray={indicator.severity === 'high' ? '4,2' : '2,2'}
            className="opacity-60"
          />

          {/* Switch cost indicator */}
          <circle
            cx={indicator.x}
            cy={headerHeight + 10}
            r={Math.min(8, Math.max(3, indicator.cost))}
            fill={
              indicator.severity === 'high' ? 'rgb(239, 68, 68)' :
              indicator.severity === 'medium' ? 'rgb(245, 158, 11)' : 'rgb(156, 163, 175)'
            }
            className="opacity-80"
          />

          {/* Switch type labels (only for high severity) */}
          {indicator.severity === 'high' && (
            <>
              <text
                x={indicator.x + 10}
                y={headerHeight + 8}
                fontSize="8"
                fontWeight="500"
                fill="rgb(75, 85, 99)"
                className="opacity-80"
              >
                {indicator.fromType} → {indicator.toType}
              </text>
              <text
                x={indicator.x + 10}
                y={headerHeight + 18}
                fontSize="7"
                fill="rgb(107, 114, 128)"
                className="opacity-70"
              >
                Cost: {indicator.cost}/10
              </text>
            </>
          )}
        </g>
      ))}

      {/* Attention Score Summary */}
      {analysis.overallScore !== undefined && (
        <g className="attention-score-summary">
          <rect
            x={viewportWidth - 120}
            y={headerHeight + 10}
            width={110}
            height={50}
            rx="6"
            fill="rgba(255, 255, 255, 0.9)"
            stroke="rgba(156, 163, 175, 0.3)"
            strokeWidth="1"
            className="drop-shadow-sm"
          />

          <text
            x={viewportWidth - 115}
            y={headerHeight + 25}
            fontSize="10"
            fontWeight="600"
            fill="rgb(75, 85, 99)"
          >
            Attention Score
          </text>

          <text
            x={viewportWidth - 115}
            y={headerHeight + 40}
            fontSize="16"
            fontWeight="bold"
            fill={
              analysis.overallScore >= 80 ? 'rgb(34, 197, 94)' :
              analysis.overallScore >= 60 ? 'rgb(245, 158, 11)' : 'rgb(239, 68, 68)'
            }
          >
            {analysis.overallScore}/100
          </text>

          <text
            x={viewportWidth - 115}
            y={headerHeight + 52}
            fontSize="7"
            fill="rgb(107, 114, 128)"
          >
            {
              analysis.overallScore >= 80 ? 'Optimized' :
              analysis.overallScore >= 60 ? 'Good' : 'Needs work'
            }
          </text>
        </g>
      )}

      {/* Legend */}
      <g className="attention-legend">
        <rect
          x={10}
          y={viewportWidth > 800 ? headerHeight + 10 : headerHeight + 70}
          width={200}
          height={contextSwitchIndicators.length > 0 ? 80 : 60}
          rx="6"
          fill="rgba(255, 255, 255, 0.95)"
          stroke="rgba(156, 163, 175, 0.3)"
          strokeWidth="1"
          className="drop-shadow-sm"
        />

        <text
          x={15}
          y={viewportWidth > 800 ? headerHeight + 25 : headerHeight + 85}
          fontSize="10"
          fontWeight="600"
          fill="rgb(75, 85, 99)"
        >
          Attention Insights
        </text>

        {/* Peak hours legend */}
        <rect
          x={15}
          y={viewportWidth > 800 ? headerHeight + 30 : headerHeight + 90}
          width={12}
          height={8}
          fill="url(#peak-hours-gradient)"
        />
        <text
          x={32}
          y={viewportWidth > 800 ? headerHeight + 37 : headerHeight + 97}
          fontSize="8"
          fill="rgb(75, 85, 99)"
        >
          Peak attention hours
        </text>

        {/* Context switches legend */}
        {contextSwitchIndicators.length > 0 && (
          <>
            <line
              x1={15}
              y1={viewportWidth > 800 ? headerHeight + 45 : headerHeight + 105}
              x2={27}
              y2={viewportWidth > 800 ? headerHeight + 45 : headerHeight + 105}
              stroke="rgb(239, 68, 68)"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
            <text
              x={32}
              y={viewportWidth > 800 ? headerHeight + 48 : headerHeight + 108}
              fontSize="8"
              fill="rgb(75, 85, 99)"
            >
              Context switches
            </text>
          </>
        )}

        {/* Budget violations legend */}
        {budgetViolationZones.length > 0 && (
          <>
            <rect
              x={15}
              y={viewportWidth > 800 ? headerHeight + 55 : headerHeight + 115}
              width={12}
              height={8}
              fill="url(#warning-pattern)"
            />
            <text
              x={32}
              y={viewportWidth > 800 ? headerHeight + 62 : headerHeight + 122}
              fontSize="8"
              fill="rgb(75, 85, 99)"
            >
              Budget warnings
            </text>
          </>
        )}
      </g>
    </svg>
  );
}