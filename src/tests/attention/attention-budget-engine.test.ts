import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeAttentionBudget,
  checkNewEventViolations,
  type AttentionBudgetAnalysis,
  type AttentionWarning,
} from '@/lib/attentionBudgetEngine';
import {
  ATTENTION_TYPES,
  ROLE_MODES,
  type UserAttentionPreferences,
} from '@/lib/attentionTypes';
import { TimelineItem } from '@/lib/timelineUtils';

describe('AttentionBudgetEngine', () => {
  let mockPreferences: UserAttentionPreferences;
  let mockTimelineItems: TimelineItem[];
  let testDate: Date;

  beforeEach(() => {
    testDate = new Date('2024-01-15T08:00:00.000Z');

    mockPreferences = {
      current_role: ROLE_MODES.MAKER,
      peak_hours_start: '09:00',
      peak_hours_end: '12:00',
      attention_budgets: {
        [ATTENTION_TYPES.CREATE]: 240, // 4 hours
        [ATTENTION_TYPES.DECIDE]: 120, // 2 hours
        [ATTENTION_TYPES.CONNECT]: 180, // 3 hours
        [ATTENTION_TYPES.REVIEW]: 120, // 2 hours
        [ATTENTION_TYPES.RECOVER]: 60,  // 1 hour
      },
      context_switch_limit: 5,
    };

    mockTimelineItems = [
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
        start_time: '2024-01-15T11:00:00.000Z',
        duration_minutes: 30,
        attention_type: ATTENTION_TYPES.DECIDE,
        title: 'Team Decisions',
        user_id: 'test-user',
      },
      {
        id: '3',
        start_time: '2024-01-15T13:00:00.000Z',
        duration_minutes: 60,
        attention_type: ATTENTION_TYPES.CONNECT,
        title: 'Team Sync',
        user_id: 'test-user',
      },
    ] as TimelineItem[];
  });

  describe('Budget Calculation', () => {
    it('calculates daily budget usage correctly', () => {
      const analysis = analyzeAttentionBudget(mockTimelineItems, mockPreferences, testDate);

      expect(analysis.budgetViolations).toHaveLength(0);
      expect(analysis.overallScore).toBeGreaterThan(80);
    });

    it('detects budget violations correctly', () => {
      // Add items that exceed CREATE budget (240 minutes)
      const excessiveItems: TimelineItem[] = [
        ...mockTimelineItems,
        {
          id: '4',
          start_time: '2024-01-15T14:00:00.000Z',
          duration_minutes: 180, // This pushes CREATE to 300 minutes
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'More Deep Work',
          user_id: 'test-user',
        } as TimelineItem,
      ];

      const analysis = analyzeAttentionBudget(excessiveItems, mockPreferences, testDate);

      expect(analysis.budgetViolations).toHaveLength(1);
      expect(analysis.budgetViolations[0].attentionType).toBe(ATTENTION_TYPES.CREATE);
      expect(analysis.budgetViolations[0].severity).toBe('exceeded');
      expect(analysis.budgetViolations[0].usagePercentage).toBeGreaterThan(100);
    });

    it('handles empty schedules correctly', () => {
      const analysis = analyzeAttentionBudget([], mockPreferences, testDate);

      expect(analysis.budgetViolations).toHaveLength(0);
      expect(analysis.contextSwitchAnalysis.totalSwitches).toBe(0);
      expect(analysis.overallScore).toBe(100);
    });

    it('applies role-based budget adjustments', () => {
      const makerPrefs = { ...mockPreferences, current_role: ROLE_MODES.MAKER };
      const multiplierPrefs = { ...mockPreferences, current_role: ROLE_MODES.MULTIPLIER };

      const makerAnalysis = analyzeAttentionBudget(mockTimelineItems, makerPrefs, testDate);
      const multiplierAnalysis = analyzeAttentionBudget(mockTimelineItems, multiplierPrefs, testDate);

      // Maker should be more sensitive to context switches
      expect(makerAnalysis.contextSwitchAnalysis.budgetLimit).toBeLessThanOrEqual(
        multiplierAnalysis.contextSwitchAnalysis.budgetLimit
      );
    });
  });

  describe('Context Switch Detection', () => {
    it('detects context switches accurately', () => {
      const contextSwitchItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Task 1',
          user_id: 'test-user',
        },
        {
          id: '2',
          start_time: '2024-01-15T09:30:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.DECIDE,
          title: 'Task 2',
          user_id: 'test-user',
        },
        {
          id: '3',
          start_time: '2024-01-15T10:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.CONNECT,
          title: 'Task 3',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const analysis = analyzeAttentionBudget(contextSwitchItems, mockPreferences, testDate);

      expect(analysis.contextSwitchAnalysis.totalSwitches).toBe(2);
      expect(analysis.contextSwitchAnalysis.switchPoints).toHaveLength(2);
      expect(analysis.contextSwitchAnalysis.switchPoints[0].fromType).toBe(ATTENTION_TYPES.CREATE);
      expect(analysis.contextSwitchAnalysis.switchPoints[0].toType).toBe(ATTENTION_TYPES.DECIDE);
    });

    it('calculates context switch costs correctly', () => {
      const highCostSwitches: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Deep Work',
          user_id: 'test-user',
        },
        {
          id: '2',
          start_time: '2024-01-15T09:30:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.RECOVER,
          title: 'Break',
          user_id: 'test-user',
        },
        {
          id: '3',
          start_time: '2024-01-15T10:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.DECIDE,
          title: 'Decision Making',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const analysis = analyzeAttentionBudget(highCostSwitches, mockPreferences, testDate);

      expect(analysis.contextSwitchAnalysis.costScore).toBeGreaterThan(0);
      expect(analysis.contextSwitchAnalysis.severity).not.toBe('optimal');
    });
  });

  describe('Peak Hours Analysis', () => {
    it('analyzes peak hours usage correctly', () => {
      const peakHourItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:30:00.000Z', // Within peak hours
          duration_minutes: 120,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Peak Work',
          user_id: 'test-user',
        },
        {
          id: '2',
          start_time: '2024-01-15T14:00:00.000Z', // Outside peak hours
          duration_minutes: 60,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Off-Peak Work',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const analysis = analyzeAttentionBudget(peakHourItems, mockPreferences, testDate);

      expect(analysis.peakHoursAnalysis.highAttentionInPeakHours).toBeGreaterThan(50);
      expect(analysis.peakHoursAnalysis.misplacedItems).toHaveLength(1);
      expect(analysis.peakHoursAnalysis.misplacedItems[0].item.id).toBe('2');
    });

    it('calculates optimization score correctly', () => {
      const optimalItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T10:00:00.000Z', // Peak hours
          duration_minutes: 120,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Optimal Work',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const analysis = analyzeAttentionBudget(optimalItems, mockPreferences, testDate);

      expect(analysis.peakHoursAnalysis.optimizationScore).toBeGreaterThan(90);
    });
  });

  describe('Warning Generation', () => {
    it('generates appropriate warnings for budget violations', () => {
      const excessiveItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 300, // Exceeds CREATE budget
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Too Much Work',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const analysis = analyzeAttentionBudget(excessiveItems, mockPreferences, testDate);

      const budgetWarnings = analysis.warnings.filter(w => w.type === 'budget_limit');
      expect(budgetWarnings).toHaveLength(1);
      expect(budgetWarnings[0].level).toBe('critical');
      expect(budgetWarnings[0].title).toContain('CREATE Budget');
    });

    it('generates context switch warnings', () => {
      const switchyItems: TimelineItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        start_time: new Date(testDate.getTime() + i * 30 * 60 * 1000).toISOString(),
        duration_minutes: 25,
        attention_type: i % 2 === 0 ? ATTENTION_TYPES.CREATE : ATTENTION_TYPES.DECIDE,
        title: `Task ${i + 1}`,
        user_id: 'test-user',
      })) as TimelineItem[];

      const analysis = analyzeAttentionBudget(switchyItems, mockPreferences, testDate);

      const contextWarnings = analysis.warnings.filter(w => w.type === 'context_switch');
      expect(contextWarnings.length).toBeGreaterThan(0);
      expect(contextWarnings[0].suggestedActions).toBeDefined();
      expect(contextWarnings[0].suggestedActions![0].type).toBe('batch');
    });

    it('generates peak hours warnings', () => {
      const offPeakItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T14:00:00.000Z', // Outside peak hours
          duration_minutes: 180,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Misplaced Work',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const analysis = analyzeAttentionBudget(offPeakItems, mockPreferences, testDate);

      const peakWarnings = analysis.warnings.filter(w => w.type === 'peak_hours');
      expect(peakWarnings).toHaveLength(1);
      expect(peakWarnings[0].suggestedActions).toBeDefined();
      expect(peakWarnings[0].suggestedActions![0].type).toBe('reschedule');
    });

    it('generates decision fatigue warnings for Marker role', () => {
      const markerPrefs = { ...mockPreferences, current_role: ROLE_MODES.MARKER };
      const decisionHeavyItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 200, // 3+ hours of decisions
          attention_type: ATTENTION_TYPES.DECIDE,
          title: 'Many Decisions',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const analysis = analyzeAttentionBudget(decisionHeavyItems, markerPrefs, testDate);

      const fatigueWarnings = analysis.warnings.filter(w => w.type === 'decision_fatigue');
      expect(fatigueWarnings).toHaveLength(1);
      expect(fatigueWarnings[0].level).toBe('warning');
    });
  });

  describe('New Event Validation', () => {
    it('detects violations when adding new events', () => {
      const newEvent = {
        start_time: '2024-01-15T15:00:00.000Z',
        duration_minutes: 180, // Would push CREATE budget over limit
        attention_type: ATTENTION_TYPES.CREATE,
      };

      const violations = checkNewEventViolations(newEvent, mockTimelineItems, mockPreferences);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].level).toBe('critical');
    });

    it('allows valid new events', () => {
      const newEvent = {
        start_time: '2024-01-15T15:00:00.000Z',
        duration_minutes: 30, // Small addition, should be fine
        attention_type: ATTENTION_TYPES.REVIEW,
      };

      const violations = checkNewEventViolations(newEvent, mockTimelineItems, mockPreferences);

      expect(violations).toHaveLength(0);
    });
  });

  describe('Performance Testing', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset: TimelineItem[] = Array.from({ length: 500 }, (_, i) => ({
        id: `${i + 1}`,
        start_time: new Date(testDate.getTime() + i * 5 * 60 * 1000).toISOString(),
        duration_minutes: 15,
        attention_type: Object.values(ATTENTION_TYPES)[i % Object.values(ATTENTION_TYPES).length],
        title: `Task ${i + 1}`,
        user_id: 'test-user',
      })) as TimelineItem[];

      const startTime = performance.now();
      const analysis = analyzeAttentionBudget(largeDataset, mockPreferences, testDate);
      const endTime = performance.now();

      // Should complete within 500ms for 500 items
      expect(endTime - startTime).toBeLessThan(500);
      expect(analysis).toBeDefined();
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
    });

    it('calculates attention budget analysis within performance threshold', () => {
      const mediumDataset: TimelineItem[] = Array.from({ length: 200 }, (_, i) => ({
        id: `${i + 1}`,
        start_time: new Date(testDate.getTime() + i * 10 * 60 * 1000).toISOString(),
        duration_minutes: 30,
        attention_type: Object.values(ATTENTION_TYPES)[i % Object.values(ATTENTION_TYPES).length],
        title: `Event ${i + 1}`,
        user_id: 'test-user',
      })) as TimelineItem[];

      const startTime = performance.now();
      const analysis = analyzeAttentionBudget(mediumDataset, mockPreferences, testDate);
      const endTime = performance.now();

      // Target: < 300ms for 200 events
      expect(endTime - startTime).toBeLessThan(300);
      expect(analysis.budgetViolations).toBeDefined();
      expect(analysis.contextSwitchAnalysis).toBeDefined();
      expect(analysis.peakHoursAnalysis).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles items without attention types', () => {
      const mixedItems: TimelineItem[] = [
        ...mockTimelineItems,
        {
          id: '4',
          start_time: '2024-01-15T16:00:00.000Z',
          duration_minutes: 60,
          attention_type: undefined as any,
          title: 'No Attention Type',
          user_id: 'test-user',
        } as TimelineItem,
      ];

      const analysis = analyzeAttentionBudget(mixedItems, mockPreferences, testDate);

      expect(analysis).toBeDefined();
      expect(analysis.contextSwitchAnalysis.totalSwitches).toBe(2); // Should ignore undefined items
    });

    it('handles zero duration items', () => {
      const zeroItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 0,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Zero Duration',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const analysis = analyzeAttentionBudget(zeroItems, mockPreferences, testDate);

      expect(analysis.budgetViolations).toHaveLength(0);
      expect(analysis.overallScore).toBe(100);
    });

    it('handles missing preferences gracefully', () => {
      const minimalPrefs: Partial<UserAttentionPreferences> = {
        current_role: ROLE_MODES.MAKER,
      };

      const analysis = analyzeAttentionBudget(
        mockTimelineItems,
        minimalPrefs as UserAttentionPreferences,
        testDate
      );

      expect(analysis).toBeDefined();
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
    });
  });
});