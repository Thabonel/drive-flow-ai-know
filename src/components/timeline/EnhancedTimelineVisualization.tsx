// Enhanced Timeline Visualization that brings together all attention system enhancements
import React, { useMemo } from 'react';
import { TimelineItem } from '@/lib/timelineUtils';
import { UserAttentionPreferences } from '@/lib/attentionTypes';
import { useAttentionBudget } from '@/hooks/useAttentionBudget';
import { AttentionVisualization } from './AttentionVisualization';
import { DecisionBatchIndicator } from './DecisionBatchIndicator';

interface EnhancedTimelineVisualizationProps {
  items: TimelineItem[];
  currentDate: Date;
  pixelsPerHour: number;
  scrollOffset: number;
  nowTime: Date;
  viewportWidth: number;
  layerHeight: number;
  headerHeight: number;
  showEnhancedFeatures?: boolean;
}

interface VisualEnhancement {
  type: 'peak-hours' | 'context-switch' | 'decision-batch' | 'budget-violation' | 'focus-protection';
  severity: 'low' | 'medium' | 'high';
  x: number;
  y: number;
  width: number;
  height: number;
  message?: string;
  color: string;
  animation?: string;
}

export function EnhancedTimelineVisualization({
  items,
  currentDate,
  pixelsPerHour,
  scrollOffset,
  nowTime,
  viewportWidth,
  layerHeight,
  headerHeight,
  showEnhancedFeatures = true
}: EnhancedTimelineVisualizationProps) {
  const { preferences, analyzeDay } = useAttentionBudget();

  const analysis = useMemo(() => {
    if (!preferences || !showEnhancedFeatures) return null;
    return analyzeDay(items, currentDate);
  }, [preferences, items, currentDate, analyzeDay, showEnhancedFeatures]);

  const visualEnhancements = useMemo(() => {
    if (!analysis || !preferences) return [];

    const enhancements: VisualEnhancement[] = [];

    // Create visual enhancements for different attention insights

    // 1. Peak Hours Enhancement Zones
    if (preferences.peak_hours_start && preferences.peak_hours_end) {
      const [startHour, startMinute] = preferences.peak_hours_start.split(':').map(Number);
      const [endHour, endMinute] = preferences.peak_hours_end.split(':').map(Number);

      const startHours = startHour + startMinute / 60;
      const endHours = endHour + endMinute / 60;

      const startX = (startHours * pixelsPerHour) + scrollOffset;
      const endX = (endHours * pixelsPerHour) + scrollOffset;

      if (endX > 0 && startX < viewportWidth) {
        enhancements.push({
          type: 'peak-hours',
          severity: 'medium',
          x: Math.max(0, startX),
          y: headerHeight,
          width: Math.min(viewportWidth, endX) - Math.max(0, startX),
          height: 600,
          color: 'rgba(34, 197, 94, 0.08)',
          animation: 'peakHoursGlow 4s ease-in-out infinite'
        });
      }
    }

    // 2. Context Switch Warning Zones
    analysis.contextSwitchAnalysis.switchPoints.forEach((switchPoint, index) => {
      if (switchPoint.cost >= 6) { // High-cost context switches
        const switchTime = new Date(switchPoint.time);
        const hours = switchTime.getHours() + switchTime.getMinutes() / 60;
        const x = (hours * pixelsPerHour) + scrollOffset - 15;

        if (x > -30 && x < viewportWidth + 30) {
          enhancements.push({
            type: 'context-switch',
            severity: switchPoint.cost >= 8 ? 'high' : 'medium',
            x,
            y: headerHeight,
            width: 30,
            height: 600,
            message: `${switchPoint.fromType} → ${switchPoint.toType} (Cost: ${switchPoint.cost})`,
            color: switchPoint.cost >= 8 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.08)',
            animation: 'contextSwitchWarning 2s ease-in-out infinite'
          });
        }
      }
    });

    // 3. Budget Violation Overlays
    analysis.budgetViolations.forEach((violation, index) => {
      if (violation.severity === 'exceeded' || violation.severity === 'critical') {
        enhancements.push({
          type: 'budget-violation',
          severity: violation.severity === 'critical' ? 'high' : 'medium',
          x: 0,
          y: headerHeight + (index * 25),
          width: viewportWidth,
          height: 20,
          message: `${violation.attentionType} budget exceeded (${Math.round(violation.usagePercentage)}%)`,
          color: violation.severity === 'critical'
            ? 'rgba(239, 68, 68, 0.12)'
            : 'rgba(245, 158, 11, 0.08)',
          animation: violation.severity === 'critical'
            ? 'budgetViolationBlink 1.5s ease-in-out infinite'
            : 'budgetWarningPulse 2s ease-in-out infinite'
        });
      }
    });

    // 4. Focus Protection Zones (Create blocks > 90 minutes)
    items
      .filter(item =>
        item.attention_type === 'create' &&
        item.duration_minutes >= 90 &&
        new Date(item.start_time).toDateString() === currentDate.toDateString()
      )
      .forEach(item => {
        const itemTime = new Date(item.start_time);
        const hours = itemTime.getHours() + itemTime.getMinutes() / 60;
        const x = (hours * pixelsPerHour) + scrollOffset - 5;
        const width = ((item.duration_minutes / 60) * pixelsPerHour) + 10;

        if (x + width > 0 && x < viewportWidth) {
          enhancements.push({
            type: 'focus-protection',
            severity: 'low',
            x: Math.max(0, x),
            y: headerHeight - 5,
            width: Math.min(width, viewportWidth - Math.max(0, x)),
            height: layerHeight + 10,
            message: `Protected Focus Block (${Math.round(item.duration_minutes / 60 * 10) / 10}h)`,
            color: 'rgba(59, 130, 246, 0.08)',
            animation: 'focusProtectionGlow 3s ease-in-out infinite'
          });
        }
      });

    return enhancements;
  }, [analysis, preferences, items, currentDate, pixelsPerHour, scrollOffset, viewportWidth, headerHeight, layerHeight]);

  if (!showEnhancedFeatures || !preferences) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {/* Enhanced CSS Styles */}
      <style>{`
        @keyframes peakHoursGlow {
          0%, 100% { opacity: 0.6; box-shadow: inset 0 0 20px rgba(34, 197, 94, 0.1); }
          50% { opacity: 0.8; box-shadow: inset 0 0 30px rgba(34, 197, 94, 0.2); }
        }

        @keyframes contextSwitchWarning {
          0%, 100% { opacity: 0.7; transform: scaleX(1); }
          50% { opacity: 1; transform: scaleX(1.1); }
        }

        @keyframes budgetViolationBlink {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }

        @keyframes budgetWarningPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.9; }
        }

        @keyframes focusProtectionGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); opacity: 0.6; }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); opacity: 0.8; }
        }

        .enhancement-tooltip {
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 1000;
        }
      `}</style>

      {/* Core Attention Visualization */}
      <AttentionVisualization
        items={items}
        preferences={preferences}
        currentDate={currentDate}
        pixelsPerHour={pixelsPerHour}
        scrollOffset={scrollOffset}
        nowLineX={(nowTime.getHours() + nowTime.getMinutes() / 60) * pixelsPerHour}
        viewportWidth={viewportWidth}
        layerHeight={layerHeight}
        headerHeight={headerHeight}
      />

      {/* Enhanced Visual Overlays */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          {/* Enhanced gradients and filters */}
          <filter id="enhancement-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <radialGradient id="focus-protection-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.15)" />
            <stop offset="70%" stopColor="rgba(59, 130, 246, 0.08)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
          </radialGradient>

          <linearGradient id="context-switch-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(239, 68, 68, 0)" />
            <stop offset="50%" stopColor="rgba(239, 68, 68, 0.15)" />
            <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
          </linearGradient>
        </defs>

        {/* Render Visual Enhancements */}
        {visualEnhancements.map((enhancement, index) => (
          <g key={index} className={`enhancement-${enhancement.type}`}>
            {/* Enhancement background */}
            <rect
              x={enhancement.x}
              y={enhancement.y}
              width={enhancement.width}
              height={enhancement.height}
              fill={
                enhancement.type === 'focus-protection' ? 'url(#focus-protection-gradient)' :
                enhancement.type === 'context-switch' ? 'url(#context-switch-gradient)' :
                enhancement.color
              }
              filter={enhancement.severity === 'high' ? 'url(#enhancement-glow)' : undefined}
              style={{
                animation: enhancement.animation
              }}
              className={`enhancement-overlay enhancement-${enhancement.severity}`}
            />

            {/* Enhancement border for high severity items */}
            {enhancement.severity === 'high' && (
              <rect
                x={enhancement.x}
                y={enhancement.y}
                width={enhancement.width}
                height={enhancement.height}
                fill="none"
                stroke={
                  enhancement.type === 'budget-violation' ? '#ef4444' :
                  enhancement.type === 'context-switch' ? '#f59e0b' :
                  '#6b7280'
                }
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.7"
              />
            )}

            {/* Enhancement label for significant items */}
            {enhancement.message && enhancement.width > 100 && enhancement.severity !== 'low' && (
              <text
                x={enhancement.x + 8}
                y={enhancement.y + 15}
                fontSize="9"
                fontWeight="500"
                fill={
                  enhancement.type === 'budget-violation' ? '#dc2626' :
                  enhancement.type === 'context-switch' ? '#d97706' :
                  enhancement.type === 'peak-hours' ? '#059669' :
                  '#374151'
                }
                className="enhancement-label"
              >
                {enhancement.type === 'budget-violation' ? '⚠️' :
                 enhancement.type === 'context-switch' ? '🔄' :
                 enhancement.type === 'peak-hours' ? '⚡' :
                 enhancement.type === 'focus-protection' ? '🛡️' : ''}
                {' '}
                {enhancement.message.length > 40
                  ? enhancement.message.substring(0, 40) + '...'
                  : enhancement.message
                }
              </text>
            )}
          </g>
        ))}

        {/* Overall attention health indicator */}
        {analysis && (
          <g className="attention-health-indicator">
            <rect
              x={viewportWidth - 140}
              y={headerHeight + 5}
              width={130}
              height={60}
              rx="8"
              fill="rgba(255, 255, 255, 0.95)"
              stroke={
                analysis.overallScore >= 80 ? '#22c55e' :
                analysis.overallScore >= 60 ? '#f59e0b' : '#ef4444'
              }
              strokeWidth="2"
              filter="url(#enhancement-glow)"
              className="drop-shadow-lg"
            />

            <text
              x={viewportWidth - 75}
              y={headerHeight + 18}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#374151"
            >
              Attention Health
            </text>

            <text
              x={viewportWidth - 75}
              y={headerHeight + 35}
              textAnchor="middle"
              fontSize="20"
              fontWeight="bold"
              fill={
                analysis.overallScore >= 80 ? '#22c55e' :
                analysis.overallScore >= 60 ? '#f59e0b' : '#ef4444'
              }
            >
              {analysis.overallScore}
            </text>

            <text
              x={viewportWidth - 75}
              y={headerHeight + 48}
              textAnchor="middle"
              fontSize="8"
              fill="#6b7280"
            >
              {analysis.overallScore >= 80 ? 'Excellent' :
               analysis.overallScore >= 60 ? 'Good' : 'Needs Work'}
            </text>

            <text
              x={viewportWidth - 75}
              y={headerHeight + 58}
              textAnchor="middle"
              fontSize="7"
              fill="#9ca3af"
            >
              {analysis.contextSwitchAnalysis.totalSwitches} switches • {analysis.budgetViolations.length} violations
            </text>
          </g>
        )}
      </svg>

      {/* Decision Batch Visualization (rendered separately for better performance) */}
      {preferences.current_role === 'marker' && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <DecisionBatchIndicator
            items={items}
            currentDate={currentDate}
            pixelsPerHour={pixelsPerHour}
            scrollOffset={scrollOffset}
            nowTime={nowTime}
            viewportWidth={viewportWidth}
            headerHeight={headerHeight}
            layerHeight={layerHeight}
            showOptimizationSuggestions={true}
          />
        </div>
      )}
    </div>
  );
}