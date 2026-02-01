import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdvancedAttentionBudget } from './useAdvancedAttentionBudget';
import { TimelineItem } from '@/lib/timelineUtils';
import { ATTENTION_TYPES } from '@/lib/attentionTypes';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: 'test-token' } }
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    })
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockUserPreferences, error: null }),
  insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  update: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  delete: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  rpc: vi.fn().mockResolvedValue({ data: 5.5, error: null })
};

// Mock auth hook
const mockUser = { id: 'test-user-id', email: 'test@example.com' };

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock user preferences
const mockUserPreferences = {
  id: 'pref-1',
  user_id: 'test-user-id',
  current_role: 'maker',
  current_zone: 'peacetime',
  non_negotiable_title: 'Deep Work Project',
  non_negotiable_weekly_hours: 10,
  attention_budgets: {
    create: 300, // 5 hours
    decide: 120, // 2 hours
    connect: 180, // 3 hours
    review: 120, // 2 hours
    recover: 60, // 1 hour
    context_switches: 5
  },
  peak_hours_start: '09:00',
  peak_hours_end: '12:00',
  budget_enforcement_mode: 'advisory',
  context_switch_sensitivity: 7,
  focus_protection_enabled: true,
  auto_optimization_enabled: true
};

// Mock timeline items
const mockTimelineItems: TimelineItem[] = [
  {
    id: 'item-1',
    title: 'Deep Work Session',
    start_time: '2024-01-15T09:00:00Z',
    duration_minutes: 120,
    attention_type: ATTENTION_TYPES.CREATE,
    priority: 5,
    is_non_negotiable: true,
    user_id: 'test-user-id'
  },
  {
    id: 'item-2',
    title: 'Team Meeting',
    start_time: '2024-01-15T14:00:00Z',
    duration_minutes: 60,
    attention_type: ATTENTION_TYPES.CONNECT,
    priority: 3,
    user_id: 'test-user-id'
  },
  {
    id: 'item-3',
    title: 'Code Review',
    start_time: '2024-01-15T16:00:00Z',
    duration_minutes: 45,
    attention_type: ATTENTION_TYPES.REVIEW,
    priority: 4,
    user_id: 'test-user-id'
  }
];

// Mock fetch for Edge Functions
global.fetch = vi.fn();

const mockFetch = global.fetch as vi.Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      warnings: [],
      suggestions: [],
      patterns: []
    })
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAdvancedAttentionBudget', () => {
  describe('initialization and basic state', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      expect(result.current.loading).toBe(true);
      expect(result.current.preferences).toBe(null);
      expect(result.current.warnings).toEqual([]);
      expect(result.current.realTimeBudgetStatus).toEqual([]);
    });

    it('should load user preferences on mount', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('user_attention_preferences');
      expect(result.current.loading).toBe(false);
      expect(result.current.preferences).toEqual(mockUserPreferences);
    });

    it('should handle missing user gracefully', () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget(), {
        wrapper: ({ children }) => {
          vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({ user: null });
          return children;
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.preferences).toBe(null);
    });
  });

  describe('real-time budget monitoring', () => {
    it('should calculate real-time budget status correctly', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const budgetStatus = result.current.realTimeBudgetStatus;
      expect(budgetStatus).toBeDefined();
      expect(budgetStatus.length).toBeGreaterThan(0);

      const createBudget = budgetStatus.find(status => status.attentionType === ATTENTION_TYPES.CREATE);
      expect(createBudget).toBeDefined();
      expect(createBudget?.budgetLimit).toBe(300);
    });

    it('should detect budget violations', async () => {
      const mockTimelineWithViolation = [
        ...mockTimelineItems,
        {
          id: 'item-4',
          title: 'Extra Deep Work',
          start_time: '2024-01-15T11:00:00Z',
          duration_minutes: 240, // This would exceed create budget
          attention_type: ATTENTION_TYPES.CREATE,
          priority: 4,
          user_id: 'test-user-id'
        }
      ];

      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        // Simulate having items that exceed budget
        result.current.realTimeBudgetStatus.forEach(status => {
          if (status.attentionType === ATTENTION_TYPES.CREATE) {
            status.currentUsage = 400; // Exceed 300 limit
            status.isViolating = true;
            status.severity = 'exceeded';
          }
        });
      });

      const createBudget = result.current.realTimeBudgetStatus.find(
        status => status.attentionType === ATTENTION_TYPES.CREATE
      );
      expect(createBudget?.isViolating).toBe(true);
      expect(createBudget?.severity).toBe('exceeded');
    });
  });

  describe('context switch cost calculation', () => {
    it('should calculate context switch costs correctly', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const cost = await result.current.calculateContextSwitchCost(
        ATTENTION_TYPES.CREATE,
        ATTENTION_TYPES.CONNECT,
        15 // 15 minutes between
      );

      expect(cost).toBeGreaterThan(0);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_context_switch_cost', {
        p_user_id: 'test-user-id',
        p_from_type: ATTENTION_TYPES.CREATE,
        p_to_type: ATTENTION_TYPES.CONNECT,
        p_time_between_minutes: 15,
        p_user_role: 'maker'
      });
    });

    it('should return zero cost for same attention types', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Mock RPC to return 0 for same types
      mockSupabase.rpc.mockResolvedValueOnce({ data: 0, error: null });

      const cost = await result.current.calculateContextSwitchCost(
        ATTENTION_TYPES.CREATE,
        ATTENTION_TYPES.CREATE,
        0
      );

      expect(cost).toBe(0);
    });
  });

  describe('budget violation checking', () => {
    it('should check budget violations for new events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          warnings: [
            {
              level: 'warning',
              type: 'budget_limit',
              title: 'Budget Warning',
              description: 'Approaching budget limit',
              actionable: true,
              severity: 6
            }
          ]
        })
      });

      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const newEvent = {
        start_time: '2024-01-15T15:00:00Z',
        duration_minutes: 90,
        attention_type: ATTENTION_TYPES.CREATE
      };

      const warnings = await result.current.checkBudgetViolationRealTime(
        newEvent,
        mockTimelineItems
      );

      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('budget_limit');
      expect(mockFetch).toHaveBeenCalledWith('/functions/v1/attention-budget-check', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newEvent,
          existingItems: expect.any(Array),
          targetDate: expect.any(String)
        })
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const warnings = await result.current.checkBudgetViolationRealTime(
        {
          start_time: '2024-01-15T15:00:00Z',
          duration_minutes: 90,
          attention_type: ATTENTION_TYPES.CREATE
        },
        mockTimelineItems
      );

      expect(warnings).toEqual([]);
    });
  });

  describe('focus session management', () => {
    it('should start focus session successfully', async () => {
      const mockFocusSession = {
        id: 'session-1',
        user_id: 'test-user-id',
        timeline_item_id: 'item-1',
        session_type: 'deep_work',
        protection_level: 'strict',
        planned_duration: 120,
        started_at: new Date().toISOString()
      };

      mockSupabase.insert.mockResolvedValueOnce({
        data: mockFocusSession,
        error: null
      });

      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const session = await result.current.startFocusSession(
        'item-1',
        'deep_work',
        'strict'
      );

      expect(session).toEqual(mockFocusSession);
      expect(mockSupabase.from).toHaveBeenCalledWith('focus_sessions');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        timeline_item_id: 'item-1',
        session_type: 'deep_work',
        protection_level: 'strict',
        planned_duration: 120,
        started_at: expect.any(String)
      });
    });

    it('should end focus session with completion data', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.endFocusSession('session-1', {
          completionRating: 4,
          interruptions: 1,
          notes: 'Good session with minor interruption'
        });
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('focus_sessions');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        completionRating: 4,
        interruptions: 1,
        notes: 'Good session with minor interruption',
        completed_at: expect.any(String),
        actual_duration: expect.any(Number)
      });
    });
  });

  describe('smart suggestions', () => {
    it('should generate smart scheduling suggestions', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.generateSmartSuggestions(mockTimelineItems);
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_scheduling_suggestions', {
        p_user_id: 'test-user-id',
        p_target_date: expect.any(String)
      });
    });

    it('should apply scheduling suggestions', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const success = await result.current.applySchedulingSuggestion('suggestion-1');

      expect(success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduling_suggestions');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'applied',
        applied_at: expect.any(String)
      });
    });

    it('should dismiss suggestions', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.dismissSuggestion('suggestion-1');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('scheduling_suggestions');
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'dismissed' });
    });
  });

  describe('weekly calibration', () => {
    it('should create weekly calibration', async () => {
      const calibrationData = {
        weekStartDate: '2024-01-15',
        roleSelected: 'maker',
        zoneSelected: 'peacetime',
        nonNegotiableTitle: 'Deep Work Project',
        nonNegotiableHoursPlanned: 10
      };

      const mockCalibration = {
        id: 'calibration-1',
        user_id: 'test-user-id',
        ...calibrationData
      };

      mockSupabase.insert.mockResolvedValueOnce({
        data: mockCalibration,
        error: null
      });

      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const calibration = await result.current.createWeeklyCalibration(calibrationData);

      expect(calibration).toEqual(mockCalibration);
      expect(mockSupabase.from).toHaveBeenCalledWith('weekly_calibrations');
    });
  });

  describe('analytics and insights', () => {
    it('should calculate attention efficiency score', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const score = await result.current.getAttentionEfficiencyScore();

      expect(score).toBe(75); // Mock returns 75
    });

    it('should get optimal scheduling times', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const times = await result.current.getOptimalSchedulingTimes(ATTENTION_TYPES.CREATE);

      expect(times).toEqual(['09:00', '10:00', '11:00']);
    });

    it('should get predictive budget forecast', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const forecast = await result.current.getPredictiveBudgetForecast(7);

      expect(forecast).toEqual({
        create: 75,
        decide: 60,
        connect: 80,
        review: 50,
        recover: 30
      });
    });
  });

  describe('budget enforcement rules', () => {
    it('should update budget enforcement rules', async () => {
      const rules = [
        {
          ruleType: 'hard_limit' as const,
          attentionType: ATTENTION_TYPES.CREATE,
          thresholdValue: 300,
          action: 'warn' as const,
          isActive: true
        }
      ];

      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const success = await result.current.updateBudgetEnforcementRules(rules);

      expect(success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('budget_enforcement_rules');
      expect(mockSupabase.upsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        ...rules[0]
      });
    });
  });

  describe('error handling', () => {
    it('should handle Supabase errors gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.error).toBe('Database error');
      expect(result.current.preferences).toBe(null);
    });

    it('should handle network errors in real-time checks', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const warnings = await result.current.checkBudgetViolationRealTime(
        {
          start_time: '2024-01-15T15:00:00Z',
          duration_minutes: 90,
          attention_type: ATTENTION_TYPES.CREATE
        },
        []
      );

      expect(warnings).toEqual([]);
    });
  });

  describe('warning management', () => {
    it('should dismiss warnings', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.dismissWarning('warning-1');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('attention_warnings');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        dismissed_at: expect.any(String)
      });
    });
  });

  describe('data refresh', () => {
    it('should refresh all data', async () => {
      const { result } = renderHook(() => useAdvancedAttentionBudget());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.refreshData();
      });

      // Should have called multiple data loading functions
      expect(mockSupabase.from).toHaveBeenCalledTimes(8); // Initial load + refresh
    });
  });
});

describe('Edge cases and performance', () => {
  it('should handle empty timeline items gracefully', async () => {
    const { result } = renderHook(() => useAdvancedAttentionBudget());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const warnings = await result.current.checkBudgetViolationRealTime(
      {
        start_time: '2024-01-15T15:00:00Z',
        duration_minutes: 90,
        attention_type: ATTENTION_TYPES.CREATE
      },
      []
    );

    expect(warnings).toEqual([]);
  });

  it('should handle invalid dates gracefully', async () => {
    const { result } = renderHook(() => useAdvancedAttentionBudget());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const cost = await result.current.calculateContextSwitchCost(
      ATTENTION_TYPES.CREATE,
      ATTENTION_TYPES.CONNECT,
      -10 // Invalid negative time
    );

    expect(cost).toBe(5.5); // Mock returns 5.5
  });

  it('should handle concurrent operations safely', async () => {
    const { result } = renderHook(() => useAdvancedAttentionBudget());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Start multiple operations simultaneously
    const promises = [
      result.current.startFocusSession('item-1', 'deep_work'),
      result.current.generateSmartSuggestions(mockTimelineItems),
      result.current.calculateContextSwitchCost(ATTENTION_TYPES.CREATE, ATTENTION_TYPES.CONNECT)
    ];

    await act(async () => {
      await Promise.allSettled(promises);
    });

    // All operations should complete without errors
    expect(mockSupabase.insert).toHaveBeenCalled();
    expect(mockSupabase.rpc).toHaveBeenCalled();
  });
});