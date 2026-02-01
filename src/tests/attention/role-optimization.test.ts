import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRoleBasedBehaviors,
  optimizeForRole,
  validateRoleRequirements,
  type RoleBehavior,
} from '@/lib/roleBasedBehaviors';
import {
  ROLE_MODES,
  ATTENTION_TYPES,
  type UserAttentionPreferences,
} from '@/lib/attentionTypes';
import { TimelineItem } from '@/lib/timelineUtils';

describe('RoleOptimization', () => {
  let testDate: Date;
  let baseItems: TimelineItem[];

  beforeEach(() => {
    testDate = new Date('2024-01-15T08:00:00.000Z');

    baseItems = [
      {
        id: '1',
        start_time: '2024-01-15T09:00:00.000Z',
        duration_minutes: 120,
        attention_type: ATTENTION_TYPES.CREATE,
        title: 'Deep Work',
        user_id: 'test-user',
      },
      {
        id: '2',
        start_time: '2024-01-15T11:00:00.000Z',
        duration_minutes: 60,
        attention_type: ATTENTION_TYPES.DECIDE,
        title: 'Team Decisions',
        user_id: 'test-user',
      },
      {
        id: '3',
        start_time: '2024-01-15T13:00:00.000Z',
        duration_minutes: 90,
        attention_type: ATTENTION_TYPES.CONNECT,
        title: 'Stakeholder Meeting',
        user_id: 'test-user',
      },
    ] as TimelineItem[];
  });

  describe('Maker Mode Optimization', () => {
    it('protects focus blocks correctly', () => {
      const makerBehavior = getRoleBasedBehaviors(ROLE_MODES.MAKER);

      expect(makerBehavior.focusProtection.enabled).toBe(true);
      expect(makerBehavior.focusProtection.minimumBlockDuration).toBeGreaterThan(90);
      expect(makerBehavior.contextSwitchTolerance).toBeLessThan(5);
    });

    it('prioritizes CREATE attention type', () => {
      const makerPrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MAKER,
        peak_hours_start: '09:00',
        peak_hours_end: '12:00',
        attention_budgets: {
          [ATTENTION_TYPES.CREATE]: 360, // 6 hours for makers
          [ATTENTION_TYPES.DECIDE]: 60,
          [ATTENTION_TYPES.CONNECT]: 120,
          [ATTENTION_TYPES.REVIEW]: 90,
          [ATTENTION_TYPES.RECOVER]: 60,
        },
      };

      const optimizedItems = optimizeForRole(baseItems, makerPrefs);

      // CREATE work should be scheduled during peak hours
      const createItems = optimizedItems.filter(item =>
        item.attention_type === ATTENTION_TYPES.CREATE
      );

      expect(createItems.length).toBeGreaterThan(0);

      createItems.forEach(item => {
        const itemHour = new Date(item.start_time).getHours();
        expect(itemHour).toBeGreaterThanOrEqual(9);
        expect(itemHour).toBeLessThan(12);
      });
    });

    it('minimizes context switches for focus protection', () => {
      const fragmentedItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Work 1',
          user_id: 'test-user',
        },
        {
          id: '2',
          start_time: '2024-01-15T09:30:00.000Z',
          duration_minutes: 15,
          attention_type: ATTENTION_TYPES.CONNECT,
          title: 'Quick Chat',
          user_id: 'test-user',
        },
        {
          id: '3',
          start_time: '2024-01-15T09:45:00.000Z',
          duration_minutes: 60,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Work 2',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const makerPrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MAKER,
        peak_hours_start: '09:00',
        peak_hours_end: '12:00',
      };

      const optimizedItems = optimizeForRole(fragmentedItems, makerPrefs);

      // Should batch CREATE work together
      const createItems = optimizedItems
        .filter(item => item.attention_type === ATTENTION_TYPES.CREATE)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      if (createItems.length >= 2) {
        const timeBetween = new Date(createItems[1].start_time).getTime() -
                           new Date(createItems[0].start_time).getTime() -
                           (createItems[0].duration_minutes * 60 * 1000);

        // Should be minimal gap between CREATE blocks
        expect(timeBetween).toBeLessThan(15 * 60 * 1000); // Less than 15 minutes
      }
    });

    it('validates Maker role requirements', () => {
      const validMakerItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 180, // 3-hour focus block
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Deep Focus',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const makerPrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MAKER,
        peak_hours_start: '09:00',
        peak_hours_end: '12:00',
      };

      const validation = validateRoleRequirements(validMakerItems, makerPrefs);

      expect(validation.isValid).toBe(true);
      expect(validation.focusBlockScore).toBeGreaterThan(80);
      expect(validation.violations).toHaveLength(0);
    });
  });

  describe('Marker Mode Optimization', () => {
    it('clusters decision-making activities', () => {
      const decisionItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.DECIDE,
          title: 'Decision 1',
          user_id: 'test-user',
        },
        {
          id: '2',
          start_time: '2024-01-15T11:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Work Task',
          user_id: 'test-user',
        },
        {
          id: '3',
          start_time: '2024-01-15T14:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.DECIDE,
          title: 'Decision 2',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const markerPrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MARKER,
        peak_hours_start: '09:00',
        peak_hours_end: '12:00',
      };

      const optimizedItems = optimizeForRole(decisionItems, markerPrefs);

      // Decision items should be clustered together
      const decisionTasks = optimizedItems
        .filter(item => item.attention_type === ATTENTION_TYPES.DECIDE)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      if (decisionTasks.length >= 2) {
        const timeBetween = new Date(decisionTasks[1].start_time).getTime() -
                           new Date(decisionTasks[0].start_time).getTime();

        // Should be clustered within 2 hours
        expect(timeBetween).toBeLessThan(2 * 60 * 60 * 1000);
      }
    });

    it('schedules review before decision-making', () => {
      const markerItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T10:00:00.000Z',
          duration_minutes: 60,
          attention_type: ATTENTION_TYPES.DECIDE,
          title: 'Important Decisions',
          user_id: 'test-user',
        },
        {
          id: '2',
          start_time: '2024-01-15T14:00:00.000Z',
          duration_minutes: 30,
          attention_type: ATTENTION_TYPES.REVIEW,
          title: 'Review Data',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const markerPrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MARKER,
        peak_hours_start: '09:00',
        peak_hours_end: '12:00',
      };

      const optimizedItems = optimizeForRole(markerItems, markerPrefs);

      // REVIEW should come before DECIDE
      const reviewTime = new Date(
        optimizedItems.find(item => item.attention_type === ATTENTION_TYPES.REVIEW)?.start_time || 0
      ).getTime();
      const decideTime = new Date(
        optimizedItems.find(item => item.attention_type === ATTENTION_TYPES.DECIDE)?.start_time || 0
      ).getTime();

      expect(reviewTime).toBeLessThan(decideTime);
    });

    it('validates decision batch limits', () => {
      const excessiveDecisions: TimelineItem[] = Array.from({ length: 8 }, (_, i) => ({
        id: `${i + 1}`,
        start_time: new Date(testDate.getTime() + i * 30 * 60 * 1000).toISOString(),
        duration_minutes: 20,
        attention_type: ATTENTION_TYPES.DECIDE,
        title: `Decision ${i + 1}`,
        user_id: 'test-user',
      })) as TimelineItem[];

      const markerPrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MARKER,
      };

      const validation = validateRoleRequirements(excessiveDecisions, markerPrefs);

      expect(validation.isValid).toBe(false);
      expect(validation.violations.some(v => v.includes('decision fatigue'))).toBe(true);
    });
  });

  describe('Multiplier Mode Optimization', () => {
    it('maximizes delegation opportunities', () => {
      const multiplierBehavior = getRoleBasedBehaviors(ROLE_MODES.MULTIPLIER);

      expect(multiplierBehavior.delegationFocus.enabled).toBe(true);
      expect(multiplierBehavior.delegationFocus.minimumDelegationTime).toBeGreaterThan(0);
    });

    it('prioritizes CONNECT activities', () => {
      const multiplierPrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MULTIPLIER,
        peak_hours_start: '09:00',
        peak_hours_end: '12:00',
        attention_budgets: {
          [ATTENTION_TYPES.CREATE]: 120, // Limited for multipliers
          [ATTENTION_TYPES.DECIDE]: 180,
          [ATTENTION_TYPES.CONNECT]: 240, // 4 hours for multipliers
          [ATTENTION_TYPES.REVIEW]: 120,
          [ATTENTION_TYPES.RECOVER]: 60,
        },
      };

      const optimizedItems = optimizeForRole(baseItems, multiplierPrefs);

      const connectItems = optimizedItems.filter(item =>
        item.attention_type === ATTENTION_TYPES.CONNECT
      );

      expect(connectItems.length).toBeGreaterThan(0);

      // CONNECT items should get priority time slots
      connectItems.forEach(item => {
        const itemHour = new Date(item.start_time).getHours();
        // Should be scheduled during active hours (not late in day)
        expect(itemHour).toBeLessThan(17);
      });
    });

    it('limits personal CREATE time', () => {
      const heavyCreateItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 180, // 3 hours - too much for Multiplier
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Deep Work',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const multiplierPrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MULTIPLIER,
      };

      const validation = validateRoleRequirements(heavyCreateItems, multiplierPrefs);

      expect(validation.isValid).toBe(false);
      expect(validation.violations.some(v => v.includes('CREATE time'))).toBe(true);
    });

    it('identifies delegation opportunities', () => {
      const delegatableItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          duration_minutes: 90, // Long enough to delegate
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Data Analysis',
          user_id: 'test-user',
        },
        {
          id: '2',
          start_time: '2024-01-15T11:00:00.000Z',
          duration_minutes: 45, // Below delegation threshold
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Quick Review',
          user_id: 'test-user',
        },
      ] as TimelineItem[];

      const multiplierPrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MULTIPLIER,
      };

      const optimizedItems = optimizeForRole(delegatableItems, multiplierPrefs);

      // Should identify delegation opportunities for items > 60 minutes
      expect(optimizedItems.some(item =>
        item.duration_minutes >= 60 &&
        item.metadata?.delegationSuggestion
      )).toBe(true);
    });
  });

  describe('Zone Context Adjustments', () => {
    it('applies wartime zone adjustments', () => {
      const wartimePrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MAKER,
        current_zone: 'wartime',
        peak_hours_start: '08:00',
        peak_hours_end: '11:00',
      };

      const behavior = getRoleBasedBehaviors(ROLE_MODES.MAKER, 'wartime');

      expect(behavior.contextSwitchTolerance).toBeLessThan(
        getRoleBasedBehaviors(ROLE_MODES.MAKER).contextSwitchTolerance
      );
      expect(behavior.focusProtection.minimumBlockDuration).toBeGreaterThan(
        getRoleBasedBehaviors(ROLE_MODES.MAKER).focusProtection.minimumBlockDuration
      );
    });

    it('applies peacetime zone adjustments', () => {
      const peacetimePrefs: UserAttentionPreferences = {
        current_role: ROLE_MODES.MAKER,
        current_zone: 'peacetime',
        peak_hours_start: '09:00',
        peak_hours_end: '12:00',
      };

      const behavior = getRoleBasedBehaviors(ROLE_MODES.MAKER, 'peacetime');

      expect(behavior.contextSwitchTolerance).toBeGreaterThan(
        getRoleBasedBehaviors(ROLE_MODES.MAKER).contextSwitchTolerance
      );
    });
  });

  describe('Performance with Large Datasets', () => {
    it('optimizes 500+ timeline items efficiently', () => {
      const largeDataset: TimelineItem[] = Array.from({ length: 500 }, (_, i) => ({
        id: `${i + 1}`,
        start_time: new Date(testDate.getTime() + i * 15 * 60 * 1000).toISOString(),
        duration_minutes: 30,
        attention_type: Object.values(ATTENTION_TYPES)[i % Object.values(ATTENTION_TYPES).length],
        title: `Task ${i + 1}`,
        user_id: 'test-user',
      })) as TimelineItem[];

      const preferences: UserAttentionPreferences = {
        current_role: ROLE_MODES.MAKER,
        peak_hours_start: '09:00',
        peak_hours_end: '12:00',
      };

      const startTime = performance.now();
      const optimizedItems = optimizeForRole(largeDataset, preferences);
      const endTime = performance.now();

      // Should complete within 1 second for 500 items
      expect(endTime - startTime).toBeLessThan(1000);
      expect(optimizedItems).toHaveLength(500);
    });

    it('validates role requirements for large datasets efficiently', () => {
      const largeDataset: TimelineItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        start_time: new Date(testDate.getTime() + i * 10 * 60 * 1000).toISOString(),
        duration_minutes: 15,
        attention_type: Object.values(ATTENTION_TYPES)[i % Object.values(ATTENTION_TYPES).length],
        title: `Event ${i + 1}`,
        user_id: 'test-user',
      })) as TimelineItem[];

      const preferences: UserAttentionPreferences = {
        current_role: ROLE_MODES.MULTIPLIER,
      };

      const startTime = performance.now();
      const validation = validateRoleRequirements(largeDataset, preferences);
      const endTime = performance.now();

      // Should complete within 500ms for 1000 items
      expect(endTime - startTime).toBeLessThan(500);
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty timeline gracefully', () => {
      const preferences: UserAttentionPreferences = {
        current_role: ROLE_MODES.MAKER,
      };

      const optimizedItems = optimizeForRole([], preferences);
      const validation = validateRoleRequirements([], preferences);

      expect(optimizedItems).toEqual([]);
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('handles unknown role gracefully', () => {
      const preferences: UserAttentionPreferences = {
        current_role: 'unknown' as any,
      };

      const behavior = getRoleBasedBehaviors('unknown' as any);

      // Should return default behavior
      expect(behavior).toBeDefined();
      expect(behavior.contextSwitchTolerance).toBeGreaterThan(0);
    });

    it('handles items with missing metadata', () => {
      const incompleteItems: TimelineItem[] = [
        {
          id: '1',
          start_time: '2024-01-15T09:00:00.000Z',
          attention_type: ATTENTION_TYPES.CREATE,
          title: 'Incomplete Item',
          user_id: 'test-user',
          // Missing duration_minutes
        } as TimelineItem,
      ];

      const preferences: UserAttentionPreferences = {
        current_role: ROLE_MODES.MAKER,
      };

      const optimizedItems = optimizeForRole(incompleteItems, preferences);

      expect(optimizedItems).toHaveLength(1);
      expect(optimizedItems[0].duration_minutes).toBeDefined();
    });
  });
});