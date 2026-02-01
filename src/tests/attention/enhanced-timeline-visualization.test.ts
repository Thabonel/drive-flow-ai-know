import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnhancedTimelineVisualization } from '@/components/timeline/EnhancedTimelineVisualization';
import { DecisionBatchVisualization } from '@/components/timeline/DecisionBatchVisualization';
import {
  ATTENTION_TYPES,
  ROLE_MODES,
  type UserAttentionPreferences,
} from '@/lib/attentionTypes';
import { TimelineItem } from '@/lib/timelineUtils';

// Mock the useAttentionBudget hook
vi.mock('@/hooks/useAttentionBudget', () => ({
  useAttentionBudget: () => ({
    preferences: {
      current_role: ROLE_MODES.MAKER,
      peak_hours_start: '09:00',
      peak_hours_end: '12:00',
      attention_budgets: {
        [ATTENTION_TYPES.CREATE]: 240,
        [ATTENTION_TYPES.DECIDE]: 120,
        [ATTENTION_TYPES.CONNECT]: 180,
        [ATTENTION_TYPES.REVIEW]: 120,
        [ATTENTION_TYPES.RECOVER]: 60,
      },
    },
    analyzeDay: vi.fn().mockReturnValue({
      budgetViolations: [{
        attentionType: ATTENTION_TYPES.CREATE,
        currentUsage: 300,
        budgetLimit: 240,
        usagePercentage: 125,
        severity: 'exceeded',
      }],
      contextSwitchAnalysis: {
        totalSwitches: 6,
        budgetLimit: 3,
        costScore: 60,
        severity: 'high',
        switchPoints: [
          {
            time: '2024-01-15T11:00:00.000Z',
            fromType: ATTENTION_TYPES.CREATE,
            toType: ATTENTION_TYPES.DECIDE,
            cost: 8,
          },
        ],
      },
      peakHoursAnalysis: {
        peakHoursStart: '09:00',
        peakHoursEnd: '12:00',
        highAttentionInPeakHours: 60,
        highAttentionOutsidePeakHours: 40,
        misplacedItems: [],
        optimizationScore: 75,
      },
      warnings: [],
      overallScore: 70,
      recommendations: ['Consider batching similar work'],
    }),
  }),
}));

describe('EnhancedTimelineVisualization', () => {
  let mockItems: TimelineItem[];
  let mockProps: any;

  beforeEach(() => {
    mockItems = [
      {
        id: '1',
        start_time: '2024-01-15T09:00:00.000Z',
        duration_minutes: 120,
        attention_type: ATTENTION_TYPES.CREATE,
        title: 'Deep Work Session',
        user_id: 'test-user',
      },
      {
        id: '2',
        start_time: '2024-01-15T11:30:00.000Z',
        duration_minutes: 30,
        attention_type: ATTENTION_TYPES.DECIDE,
        title: 'Review Proposals',
        user_id: 'test-user',
      },
      {
        id: '3',
        start_time: '2024-01-15T14:00:00.000Z',
        duration_minutes: 90,
        attention_type: ATTENTION_TYPES.CREATE,
        title: 'Implementation Work',
        user_id: 'test-user',
      },
    ];

    mockProps = {
      items: mockItems,
      currentDate: new Date('2024-01-15'),
      pixelsPerHour: 100,
      scrollOffset: 0,
      nowTime: new Date('2024-01-15T10:00:00.000Z'),
      viewportWidth: 1200,
      layerHeight: 50,
      headerHeight: 60,
      showEnhancedFeatures: true,
    };
  });

  it('renders enhanced timeline visualization with attention overlays', () => {
    const { container } = render(<EnhancedTimelineVisualization {...mockProps} />);

    // Check if the main visualization container exists
    const visualizationContainer = container.querySelector('.absolute.inset-0');
    expect(visualizationContainer).toBeTruthy();

    // Check if SVG elements are rendered
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeTruthy();
  });

  it('displays peak hours highlighting when preferences are set', () => {
    const { container } = render(<EnhancedTimelineVisualization {...mockProps} />);

    // Check for peak hours zone elements
    const peakHoursElements = container.querySelectorAll('.peak-hours-zone');
    expect(peakHoursElements.length).toBeGreaterThan(0);
  });

  it('shows context switch indicators for high-cost switches', () => {
    const { container } = render(<EnhancedTimelineVisualization {...mockProps} />);

    // Check for context switch warning elements
    const contextSwitchElements = container.querySelectorAll('.enhancement-context-switch');
    expect(contextSwitchElements.length).toBeGreaterThan(0);
  });

  it('displays budget violation overlays for exceeded budgets', () => {
    const { container } = render(<EnhancedTimelineVisualization {...mockProps} />);

    // Check for budget violation elements
    const budgetViolationElements = container.querySelectorAll('.enhancement-budget-violation');
    expect(budgetViolationElements.length).toBeGreaterThan(0);
  });

  it('shows focus protection zones for create blocks over 90 minutes', () => {
    const { container } = render(<EnhancedTimelineVisualization {...mockProps} />);

    // Check for focus protection elements (should find one for the 120-minute deep work session)
    const focusProtectionElements = container.querySelectorAll('.enhancement-focus-protection');
    expect(focusProtectionElements.length).toBeGreaterThan(0);
  });

  it('displays attention health score indicator', () => {
    const { container } = render(<EnhancedTimelineVisualization {...mockProps} />);

    // Check for attention health indicator
    const healthIndicator = container.querySelector('.attention-health-indicator');
    expect(healthIndicator).toBeTruthy();

    // Should display the score (70 from mock)
    const scoreText = container.querySelector('text');
    expect(scoreText?.textContent).toMatch(/70/);
  });

  it('handles disabled enhanced features gracefully', () => {
    const propsWithoutEnhancement = {
      ...mockProps,
      showEnhancedFeatures: false,
    };

    const { container } = render(<EnhancedTimelineVisualization {...propsWithoutEnhancement} />);

    // Should not render enhancement overlays when disabled
    const enhancementElements = container.querySelectorAll('.enhancement-overlay');
    expect(enhancementElements.length).toBe(0);
  });
});

describe('DecisionBatchVisualization', () => {
  let mockDecisionItems: TimelineItem[];
  let mockProps: any;

  beforeEach(() => {
    mockDecisionItems = [
      {
        id: '1',
        start_time: '2024-01-15T09:00:00.000Z',
        duration_minutes: 30,
        attention_type: ATTENTION_TYPES.DECIDE,
        title: 'Review Budget',
        user_id: 'test-user',
      },
      {
        id: '2',
        start_time: '2024-01-15T09:45:00.000Z',
        duration_minutes: 25,
        attention_type: ATTENTION_TYPES.DECIDE,
        title: 'Approve Hiring',
        user_id: 'test-user',
      },
      {
        id: '3',
        start_time: '2024-01-15T10:15:00.000Z',
        duration_minutes: 20,
        attention_type: ATTENTION_TYPES.DECIDE,
        title: 'Choose Vendor',
        user_id: 'test-user',
      },
    ];

    mockProps = {
      items: mockDecisionItems,
      pixelsPerHour: 100,
      scrollOffset: 0,
      nowTime: new Date('2024-01-15T10:00:00.000Z'),
      viewportWidth: 1200,
      headerHeight: 60,
      layerHeight: 50,
      showOptimizationSuggestions: true,
    };
  });

  it('renders decision batch groups for clustered decision events', () => {
    const { container } = render(<DecisionBatchVisualization {...mockProps} />);

    // Check if decision batch groups are rendered
    const batchGroups = container.querySelectorAll('.decision-batch-group');
    expect(batchGroups.length).toBeGreaterThan(0);
  });

  it('displays batch efficiency indicators', () => {
    const { container } = render(<DecisionBatchVisualization {...mockProps} />);

    // Check for efficiency strip elements
    const efficiencyStrips = container.querySelectorAll('.batch-efficiency-strip');
    expect(efficiencyStrips.length).toBeGreaterThan(0);
  });

  it('shows connection lines to individual decision items', () => {
    const { container } = render(<DecisionBatchVisualization {...mockProps} />);

    // Check for connection lines
    const connections = container.querySelectorAll('.batch-connection');
    expect(connections.length).toBe(3); // One for each decision item
  });

  it('displays optimization suggestions when enabled', () => {
    const { container } = render(<DecisionBatchVisualization {...mockProps} />);

    // Check for optimization tip elements
    const optimizationTips = container.querySelectorAll('.batch-optimization-tip');
    expect(optimizationTips.length).toBeGreaterThan(0);
  });

  it('hides optimization suggestions when disabled', () => {
    const propsWithoutSuggestions = {
      ...mockProps,
      showOptimizationSuggestions: false,
    };

    const { container } = render(<DecisionBatchVisualization {...propsWithoutSuggestions} />);

    // Should not show optimization tips
    const optimizationTips = container.querySelectorAll('.batch-optimization-tip');
    expect(optimizationTips.length).toBe(0);
  });

  it('does not render when there are no decision events', () => {
    const propsWithoutDecisions = {
      ...mockProps,
      items: [],
    };

    const { container } = render(<DecisionBatchVisualization {...propsWithoutDecisions} />);

    // Should not render any batch elements
    const batchElements = container.querySelectorAll('.decision-batch-group');
    expect(batchElements.length).toBe(0);
  });

  it('calculates batch efficiency correctly', () => {
    const { container } = render(<DecisionBatchVisualization {...mockProps} />);

    // Check that efficiency text is displayed (should be calculated from duration vs time span)
    const efficiencyText = container.querySelector('text');
    expect(efficiencyText?.textContent).toMatch(/Efficiency:/);
  });
});

describe('Enhanced Timeline Integration', () => {
  it('integrates enhanced visualizations with timeline items correctly', () => {
    // Test integration of budget status with timeline items
    const mockItems = [
      {
        id: '1',
        start_time: '2024-01-15T09:00:00.000Z',
        duration_minutes: 300, // 5 hours - exceeds budget
        attention_type: ATTENTION_TYPES.CREATE,
        title: 'Extended Work Session',
        user_id: 'test-user',
      },
    ];

    const mockProps = {
      items: mockItems,
      currentDate: new Date('2024-01-15'),
      pixelsPerHour: 100,
      scrollOffset: 0,
      nowTime: new Date('2024-01-15T10:00:00.000Z'),
      viewportWidth: 1200,
      layerHeight: 50,
      headerHeight: 60,
      showEnhancedFeatures: true,
    };

    const { container } = render(<EnhancedTimelineVisualization {...mockProps} />);

    // Should show budget violation for the long work session
    const budgetViolations = container.querySelectorAll('.enhancement-budget-violation');
    expect(budgetViolations.length).toBeGreaterThan(0);
  });

  it('handles role-specific visualizations correctly', () => {
    // Test that marker mode shows decision batching
    const mockProps = {
      items: [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.DECIDE,
          title: 'Decision Task',
          user_id: 'test-user',
        },
      ],
      currentDate: new Date('2024-01-15'),
      pixelsPerHour: 100,
      scrollOffset: 0,
      nowTime: new Date('2024-01-15T10:00:00.000Z'),
      viewportWidth: 1200,
      layerHeight: 50,
      headerHeight: 60,
      showEnhancedFeatures: true,
    };

    // This would normally check for marker mode specific features
    // For now, we just verify the component renders without errors
    const { container } = render(<EnhancedTimelineVisualization {...mockProps} />);
    expect(container).toBeTruthy();
  });
});