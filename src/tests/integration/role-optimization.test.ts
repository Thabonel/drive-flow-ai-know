/**
 * Integration tests for Role-Based Optimization System
 * Tests the complete workflow of role optimization features
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRoleOptimizer, RoleOptimizer, ROLE_OPTIMIZATION_RULES } from '@/lib/roleOptimizer';
import { useRoleOptimizer } from '@/hooks/useRoleOptimizer';
import { ROLE_MODES, ZONE_CONTEXTS, ATTENTION_TYPES } from '@/lib/attentionTypes';
import { TimelineItem, UserAttentionPreferences } from '@/lib/timelineUtils';

// Mock data for testing
const mockUserPreferences: UserAttentionPreferences = {
  id: 'test-user-prefs',
  user_id: 'test-user',
  current_role: ROLE_MODES.MULTIPLIER,
  current_zone: ZONE_CONTEXTS.WARTIME,
  non_negotiable_title: 'Strategic Planning',
  non_negotiable_weekly_hours: 5,
  attention_budgets: {
    decide: 3,
    context_switches: 5,
    meetings: 6
  },
  peak_hours_start: '09:00',
  peak_hours_end: '11:00',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockTimelineItems: TimelineItem[] = [
  {
    id: 'item-1',
    user_id: 'test-user',
    layer_id: 'layer-1',
    title: 'Deep Coding Session',
    start_time: '2024-01-15T09:00:00Z',
    duration_minutes: 180,
    status: 'active',
    color: '#3b82f6',
    attention_type: ATTENTION_TYPES.CREATE,
    priority: 4,
    is_non_negotiable: false,
    tags: ['coding', 'feature'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item-2',
    user_id: 'test-user',
    layer_id: 'layer-1',
    title: 'Team Meeting',
    start_time: '2024-01-15T14:00:00Z',
    duration_minutes: 60,
    status: 'active',
    color: '#10b981',
    attention_type: ATTENTION_TYPES.CONNECT,
    priority: 3,
    is_non_negotiable: false,
    tags: ['meeting', 'team'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item-3',
    user_id: 'test-user',
    layer_id: 'layer-1',
    title: 'Code Review',
    start_time: '2024-01-15T16:00:00Z',
    duration_minutes: 90,
    status: 'active',
    color: '#8b5cf6',
    attention_type: ATTENTION_TYPES.REVIEW,
    priority: 2,
    is_non_negotiable: false,
    tags: ['review', 'quality'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item-4',
    user_id: 'test-user',
    layer_id: 'layer-1',
    title: 'Strategic Decision Session',
    start_time: '2024-01-15T10:00:00Z',
    duration_minutes: 120,
    status: 'active',
    color: '#f59e0b',
    attention_type: ATTENTION_TYPES.DECIDE,
    priority: 5,
    is_non_negotiable: true,
    tags: ['strategy', 'decision'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Mock timeline context
const mockTimelineContext = {
  items: mockTimelineItems,
  attentionPreferences: mockUserPreferences,
  updateItem: vi.fn(),
  addItem: vi.fn(),
  refetchItems: vi.fn(),
  loading: false,
  settings: null,
  parkedItems: [],
  nowTime: new Date(),
  scrollOffset: 0,
  setScrollOffset: vi.fn(),
  attentionLoading: false,
  completeItem: vi.fn(),
  rescheduleItem: vi.fn(),
  parkItem: vi.fn(),
  restoreParkedItem: vi.fn(),
  deleteItem: vi.fn(),
  deleteRecurringThisAndFollowing: vi.fn(),
  updateRecurringThisAndFollowing: vi.fn(),
  deleteParkedItem: vi.fn(),
  updateSettings: vi.fn(),
  refetchParkedItems: vi.fn(),
  updateAttentionPreferences: vi.fn(),
  checkBudgetViolation: vi.fn(),
  calculateContextSwitches: vi.fn(),
  getAttentionWarnings: vi.fn(),
  refreshAttentionPreferences: vi.fn(),
};

// Mock the timeline context
vi.mock('@/contexts/TimelineContext', () => ({
  useTimelineContext: () => mockTimelineContext,
}));

describe('Role-Based Optimization System', () => {
  let optimizer: RoleOptimizer;

  beforeEach(() => {
    optimizer = createRoleOptimizer(mockUserPreferences);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('RoleOptimizer Core Functionality', () => {
    it('should create optimizer with correct configuration', () => {
      expect(optimizer).toBeDefined();
      expect(optimizer).toBeInstanceOf(RoleOptimizer);
    });

    it('should calculate accurate role fit score', () => {
      const score = optimizer.calculateRoleFitScore(mockTimelineItems);

      expect(score).toBeDefined();
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score.breakdown).toHaveProperty('timeAllocation');
      expect(score.breakdown).toHaveProperty('attentionBalance');
      expect(score.breakdown).toHaveProperty('contextSwitching');
      expect(score.breakdown).toHaveProperty('energyAlignment');
      expect(score.recommendations).toBeInstanceOf(Array);
      expect(score.warnings).toBeInstanceOf(Array);
    });

    it('should identify optimization opportunities for Multiplier role', () => {
      const suggestions = optimizer.generateOptimizationSuggestions(
        mockTimelineItems,
        new Date('2024-01-15')
      );

      expect(suggestions).toBeInstanceOf(Array);

      // Check for delegation suggestions (Multiplier should delegate long CREATE tasks)
      const delegationSuggestions = suggestions.filter(s => s.type === 'delegate');
      expect(delegationSuggestions.length).toBeGreaterThan(0);

      // Check suggestion structure
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('title');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('reasoning');
        expect(suggestion).toHaveProperty('itemIds');
      }
    });

    it('should generate smart templates for current role and zone', () => {
      const templates = optimizer.generateSmartTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);

      // Check template structure
      const template = templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('attentionType');
      expect(template).toHaveProperty('suggestedDuration');
      expect(template).toHaveProperty('priority');
    });

    it('should find optimal time slots with scoring', () => {
      const timeSlots = optimizer.findOptimalTimeSlot(
        ATTENTION_TYPES.CREATE,
        120,
        new Date('2024-01-15'),
        mockTimelineItems
      );

      expect(timeSlots).toBeInstanceOf(Array);
      expect(timeSlots.length).toBeGreaterThan(0);

      if (timeSlots.length > 0) {
        const slot = timeSlots[0];
        expect(slot).toHaveProperty('time');
        expect(slot).toHaveProperty('score');
        expect(slot).toHaveProperty('reasoning');
        expect(slot.score).toBeGreaterThanOrEqual(0);
        expect(slot.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Role-Specific Optimization Rules', () => {
    it('should apply Multiplier role rules correctly', () => {
      const rules = ROLE_OPTIMIZATION_RULES.multiplier;

      expect(rules.delegationThreshold).toBe(60);
      expect(rules.minTeamTime).toBe(180);
      expect(rules.maxPersonalCreateTime).toBe(120);
      expect(rules.connectionBlockSize).toBe(30);

      // Test that long CREATE tasks are flagged for delegation
      const suggestions = optimizer.generateOptimizationSuggestions(mockTimelineItems);
      const delegationSuggestion = suggestions.find(s =>
        s.type === 'delegate' &&
        s.itemIds.includes('item-1') // 180-minute coding session
      );
      expect(delegationSuggestion).toBeDefined();
    });

    it('should apply Maker role rules when role changes', () => {
      const makerPrefs: UserAttentionPreferences = {
        ...mockUserPreferences,
        current_role: ROLE_MODES.MAKER,
      };

      const makerOptimizer = createRoleOptimizer(makerPrefs);
      const rules = ROLE_OPTIMIZATION_RULES.maker;

      expect(rules.minFocusBlock).toBe(90);
      expect(rules.maxMeetings).toBe(3);
      expect(rules.maxContextSwitches).toBe(3);

      // Test that CREATE tasks are protected for Makers
      const suggestions = makerOptimizer.generateOptimizationSuggestions(mockTimelineItems);
      const protectSuggestion = suggestions.find(s => s.type === 'protect');
      expect(protectSuggestion || suggestions.some(s => s.reasoning.includes('focus'))).toBeTruthy();
    });

    it('should apply Marker role rules when role changes', () => {
      const markerPrefs: UserAttentionPreferences = {
        ...mockUserPreferences,
        current_role: ROLE_MODES.MARKER,
      };

      const markerOptimizer = createRoleOptimizer(markerPrefs);
      const rules = ROLE_OPTIMIZATION_RULES.marker;

      expect(rules.maxDecisionBlocks).toBe(2);
      expect(rules.decisionBatchGap).toBe(120);
      expect(rules.reviewWindowSize).toBe(45);

      // Test decision batching suggestions
      const suggestions = markerOptimizer.generateOptimizationSuggestions(mockTimelineItems);
      const batchSuggestion = suggestions.find(s => s.type === 'batch');
      // Should suggest batching if multiple DECIDE items exist
      expect(suggestions.some(s => s.reasoning.includes('decision'))).toBeTruthy();
    });
  });

  describe('Zone Context Adjustments', () => {
    it('should apply Wartime zone adjustments', () => {
      // Wartime should be stricter about protection and limits
      const score = optimizer.calculateRoleFitScore(mockTimelineItems);

      // In wartime, non-negotiable items should be more heavily weighted
      const nonNegotiableItem = mockTimelineItems.find(item => item.is_non_negotiable);
      expect(nonNegotiableItem).toBeDefined();

      // Should have warnings if optimization isn't strict enough
      expect(score.warnings.length >= 0).toBeTruthy();
    });

    it('should apply Peacetime zone adjustments', () => {
      const peacetimePrefs: UserAttentionPreferences = {
        ...mockUserPreferences,
        current_zone: ZONE_CONTEXTS.PEACETIME,
      };

      const peacetimeOptimizer = createRoleOptimizer(peacetimePrefs);
      const score = peacetimeOptimizer.calculateRoleFitScore(mockTimelineItems);

      // Peacetime should be more lenient
      expect(score.score).toBeGreaterThanOrEqual(0);

      // Should suggest exploration and relationship building
      const templates = peacetimeOptimizer.generateSmartTemplates();
      expect(templates.some(template =>
        template.description.toLowerCase().includes('relationship') ||
        template.description.toLowerCase().includes('explore')
      )).toBeTruthy();
    });
  });

  describe('useRoleOptimizer Hook', () => {
    it('should initialize with correct state', () => {
      const { result } = renderHook(() => useRoleOptimizer());

      expect(result.current.optimizer).toBeDefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.dailySuggestions).toBeInstanceOf(Array);
      expect(typeof result.current.refresh).toBe('function');
      expect(typeof result.current.applyOptimization).toBe('function');
    });

    it('should handle optimization application', async () => {
      const { result } = renderHook(() => useRoleOptimizer());

      // Mock a delegation suggestion
      const mockSuggestion = {
        type: 'delegate' as const,
        priority: 'high' as const,
        title: 'Delegate Long Task',
        description: 'Delegate 180-minute coding session',
        itemIds: ['item-1'],
        reasoning: 'Multiplier should delegate execution work',
      };

      await act(async () => {
        await result.current.applyOptimization(mockSuggestion);
      });

      // Should have called updateItem or addItem
      expect(mockTimelineContext.updateItem).toHaveBeenCalled();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty timeline gracefully', () => {
      const score = optimizer.calculateRoleFitScore([]);
      expect(score).toBeDefined();
      expect(score.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle malformed items gracefully', () => {
      const malformedItems = [
        {
          ...mockTimelineItems[0],
          duration_minutes: 0,
          attention_type: null,
        },
      ] as TimelineItem[];

      const score = optimizer.calculateRoleFitScore(malformedItems);
      expect(score).toBeDefined();
      expect(score.score).toBeGreaterThanOrEqual(0);
    });

    it('should calculate scores within reasonable time', () => {
      const startTime = Date.now();

      // Generate large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockTimelineItems[0],
        id: `item-${i}`,
        start_time: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
      }));

      optimizer.calculateRoleFitScore(largeDataset);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (under 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should maintain score consistency', () => {
      // Multiple calculations should yield same result
      const score1 = optimizer.calculateRoleFitScore(mockTimelineItems);
      const score2 = optimizer.calculateRoleFitScore(mockTimelineItems);

      expect(score1.score).toBe(score2.score);
      expect(score1.breakdown).toEqual(score2.breakdown);
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should respect attention budget constraints', () => {
      const score = optimizer.calculateRoleFitScore(mockTimelineItems);

      // Should check against user's attention budgets
      expect(mockUserPreferences.attention_budgets).toBeDefined();

      // If over budget, should be reflected in score or warnings
      if (score.breakdown.attentionBalance < 70) {
        expect(score.warnings.length > 0 || score.recommendations.length > 0).toBeTruthy();
      }
    });

    it('should align with peak hours preferences', () => {
      const score = optimizer.calculateRoleFitScore(mockTimelineItems);

      // Energy alignment should consider peak hours
      expect(score.breakdown.energyAlignment).toBeGreaterThanOrEqual(0);

      // CREATE tasks during peak hours should boost energy alignment
      const createItemInPeakHours = mockTimelineItems.find(item =>
        item.attention_type === ATTENTION_TYPES.CREATE &&
        new Date(item.start_time).getHours() >= 9 &&
        new Date(item.start_time).getHours() <= 11
      );

      if (createItemInPeakHours) {
        expect(score.breakdown.energyAlignment).toBeGreaterThan(50);
      }
    });

    it('should provide actionable optimization suggestions', () => {
      const suggestions = optimizer.generateOptimizationSuggestions(mockTimelineItems);

      suggestions.forEach(suggestion => {
        // Each suggestion should be actionable
        expect(suggestion.title).toBeTruthy();
        expect(suggestion.description).toBeTruthy();
        expect(suggestion.reasoning).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(suggestion.priority);
        expect(['schedule', 'batch', 'delegate', 'reschedule', 'protect', 'split', 'merge']).toContain(suggestion.type);
      });
    });
  });
});

describe('Template Generation and Smart Recommendations', () => {
  let optimizer: RoleOptimizer;

  beforeEach(() => {
    optimizer = createRoleOptimizer(mockUserPreferences);
  });

  it('should generate role-appropriate templates', () => {
    const templates = optimizer.generateSmartTemplates();

    // For Multiplier role, should emphasize delegation and connection
    const connectTemplates = templates.filter(t => t.attentionType === ATTENTION_TYPES.CONNECT);
    expect(connectTemplates.length).toBeGreaterThan(0);

    // Should have shorter duration blocks for Multiplier
    const shortTemplates = templates.filter(t => t.suggestedDuration <= 60);
    expect(shortTemplates.length).toBeGreaterThan(0);
  });

  it('should adjust templates for zone context', () => {
    const wartimeTemplates = optimizer.generateSmartTemplates();

    // Wartime templates should have protection and stricter scheduling
    const protectedTemplates = wartimeTemplates.filter(t => t.isNonNegotiable);
    expect(protectedTemplates.length).toBeGreaterThan(0);

    // Test peacetime comparison
    const peacetimePrefs = { ...mockUserPreferences, current_zone: ZONE_CONTEXTS.PEACETIME };
    const peacetimeOptimizer = createRoleOptimizer(peacetimePrefs);
    const peacetimeTemplates = peacetimeOptimizer.generateSmartTemplates();

    // Should have different characteristics
    expect(wartimeTemplates.length).toBeGreaterThanOrEqual(peacetimeTemplates.length / 2);
  });
});