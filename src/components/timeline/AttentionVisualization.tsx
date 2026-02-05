// Attention budget visualization overlay for timeline
import { useMemo } from 'react';
import { TimelineItem } from '@/lib/timelineUtils';
import { UserAttentionPreferences, ATTENTION_TYPE_DESCRIPTIONS } from '@/lib/attentionTypes';
import { analyzeAttentionBudget } from '@/lib/attentionBudgetEngine';

interface AttentionVisualizationProps {
  items: TimelineItem[];
  preferences: UserAttentionPreferences;
  currentDate: Date;
  pixelsPerHour: number;
  scrollOffset: number;
  nowLineX: number;
  viewportWidth: number;
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
  headerHeight
}: AttentionVisualizationProps) {

  const analysis = useMemo(() => {
    if (!preferences) return null;
    return analyzeAttentionBudget(items, preferences, currentDate);
  }, [items, preferences, currentDate]);

  const contextSwitchIndicators = useMemo(() => {
    if (!analysis) return [];

    return analysis.contextSwitchAnalysis.switchPoints.map((switchPoint) => {
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
        {/* Enhanced gradient for peak hours zone */}
        <linearGradient id="peak-hours-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.15" />
          <stop offset="50%" stopColor="rgb(34, 197, 94)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.03" />
        </linearGradient>

        {/* Animated gradient for peak hours */}
        <radialGradient id="peak-hours-radial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.2" />
          <stop offset="70%" stopColor="rgb(34, 197, 94)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
        </radialGradient>

        {/* Enhanced patterns for budget violations */}
        <pattern id="warning-pattern" patternUnits="userSpaceOnUse" width="12" height="12">
          <rect width="12" height="12" fill="rgba(245, 158, 11, 0.08)" />
          <path d="M0,12 L12,0" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="1.5" />
          <path d="M6,12 L12,6" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="1" />
          <path d="M0,6 L6,0" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="1" />
        </pattern>

        <pattern id="violation-pattern" patternUnits="userSpaceOnUse" width="10" height="10">
          <rect width="10" height="10" fill="rgba(239, 68, 68, 0.12)" />
          <path d="M0,10 L10,0" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="2" />
          <path d="M5,10 L10,5" stroke="rgba(239, 68, 68, 0.2)" strokeWidth="1" />
          <path d="M0,5 L5,0" stroke="rgba(239, 68, 68, 0.2)" strokeWidth="1" />
        </pattern>

        {/* Decision batching pattern */}
        <pattern id="decision-batch-pattern" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="rgba(147, 51, 234, 0.06)" />
          <circle cx="3" cy="3" r="1.5" fill="rgba(147, 51, 234, 0.2)" />
        </pattern>

        {/* Arrow markers for context switches */}
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="rgba(239, 68, 68, 0.6)" />
        </marker>

        {/* Glow filters */}
        <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Enhanced Peak Hours Zone */}
      {peakHoursZone && peakHoursZone.width > 0 && (
        <g className="peak-hours-zone">
          {/* Animated background gradient */}
          <rect
            x={peakHoursZone.startX}
            y={headerHeight}
            width={peakHoursZone.width}
            height={600}
            fill="url(#peak-hours-gradient)"
            className="opacity-50 peak-hours-background"
            style={{
              animation: 'peakHoursPulse 4s ease-in-out infinite',
            }}
          />

          {/* Left border accent */}
          <line
            x1={peakHoursZone.startX}
            y1={headerHeight}
            x2={peakHoursZone.startX}
            y2={headerHeight + 600}
            stroke="rgb(34, 197, 94)"
            strokeWidth="3"
            strokeDasharray="10,5"
            className="opacity-70"
          />

          {/* Right border accent */}
          <line
            x1={peakHoursZone.startX + peakHoursZone.width}
            y1={headerHeight}
            x2={peakHoursZone.startX + peakHoursZone.width}
            y2={headerHeight + 600}
            stroke="rgb(34, 197, 94)"
            strokeWidth="3"
            strokeDasharray="10,5"
            className="opacity-70"
          />

          {/* Enhanced peak hours label with background */}
          <rect
            x={peakHoursZone.startX + 5}
            y={headerHeight + 8}
            width={140}
            height={32}
            rx="6"
            fill="rgba(255, 255, 255, 0.9)"
            stroke="rgb(34, 197, 94)"
            strokeWidth="1"
            className="opacity-90 drop-shadow-sm"
          />

          <text
            x={peakHoursZone.startX + 10}
            y={headerHeight + 20}
            fontSize="10"
            fontWeight="600"
            fill="rgb(34, 197, 94)"
          >
            ⚡ Peak Attention Hours
          </text>

          <text
            x={peakHoursZone.startX + 10}
            y={headerHeight + 33}
            fontSize="8"
            fontWeight="500"
            fill="rgb(34, 197, 94)"
            className="opacity-80"
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

      {/* Enhanced Context Switch Indicators */}
      {contextSwitchIndicators.map((indicator, index) => {
        const switchColor = indicator.severity === 'high' ? 'rgb(239, 68, 68)' :
                           indicator.severity === 'medium' ? 'rgb(245, 158, 11)' : 'rgb(156, 163, 175)';

        return (
          <g key={index} className="context-switch-indicator">
            {/* Animated switch line with gradient */}
            <defs>
              <linearGradient id={`switch-gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={switchColor} stopOpacity="0.8" />
                <stop offset="50%" stopColor={switchColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={switchColor} stopOpacity="0.1" />
              </linearGradient>
            </defs>

            <line
              x1={indicator.x}
              y1={headerHeight}
              x2={indicator.x}
              y2={headerHeight + 600}
              stroke={`url(#switch-gradient-${index})`}
              strokeWidth={
                indicator.severity === 'high' ? 3 :
                indicator.severity === 'medium' ? 2 : 1.5
              }
              strokeDasharray={indicator.severity === 'high' ? '6,3' : indicator.severity === 'medium' ? '4,2' : '3,3'}
              className="context-switch-line"
              style={{
                animation: indicator.severity === 'high' ? 'contextSwitchPulse 2s ease-in-out infinite' : 'none'
              }}
            />

            {/* Enhanced switch cost indicator with glow */}
            <circle
              cx={indicator.x}
              cy={headerHeight + 15}
              r={Math.min(10, Math.max(4, indicator.cost + 2))}
              fill="rgba(255, 255, 255, 0.9)"
              stroke={switchColor}
              strokeWidth="2"
              className="drop-shadow-md"
            />

            <circle
              cx={indicator.x}
              cy={headerHeight + 15}
              r={Math.min(8, Math.max(3, indicator.cost))}
              fill={switchColor}
              className="opacity-80"
            />

            {/* Cost number in circle */}
            <text
              x={indicator.x}
              y={headerHeight + 15}
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="white"
            >
              {indicator.cost}
            </text>

            {/* Enhanced switch type labels with better positioning */}
            {indicator.severity !== 'low' && (
              <g>
                <rect
                  x={indicator.x + 12}
                  y={headerHeight + 5}
                  width={120}
                  height={20}
                  rx="4"
                  fill="rgba(255, 255, 255, 0.95)"
                  stroke={switchColor}
                  strokeWidth="1"
                  className="opacity-90 drop-shadow-sm"
                />
                <text
                  x={indicator.x + 16}
                  y={headerHeight + 12}
                  fontSize="8"
                  fontWeight="600"
                  fill={switchColor}
                >
                  {indicator.fromType} → {indicator.toType}
                </text>
                <text
                  x={indicator.x + 16}
                  y={headerHeight + 20}
                  fontSize="7"
                  fill="rgb(107, 114, 128)"
                >
                  Context Cost: {indicator.cost}/10 ({indicator.severity})
                </text>
              </g>
            )}

            {/* Visual connection lines to show transition flow */}
            {indicator.severity === 'high' && (
              <>
                <path
                  d={`M ${indicator.x - 20} ${headerHeight + 15} Q ${indicator.x - 10} ${headerHeight + 10} ${indicator.x} ${headerHeight + 15}`}
                  stroke={switchColor}
                  strokeWidth="2"
                  fill="none"
                  className="opacity-50"
                  markerEnd="url(#arrowhead)"
                />
                <path
                  d={`M ${indicator.x} ${headerHeight + 15} Q ${indicator.x + 10} ${headerHeight + 20} ${indicator.x + 20} ${headerHeight + 15}`}
                  stroke={switchColor}
                  strokeWidth="2"
                  fill="none"
                  className="opacity-50"
                  markerEnd="url(#arrowhead)"
                />
              </>
            )}
          </g>
        );
      })}

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

    </svg>
  );
}