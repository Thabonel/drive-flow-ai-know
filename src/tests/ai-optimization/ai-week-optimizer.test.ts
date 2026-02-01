import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for testing Edge Function calls
global.fetch = vi.fn();

describe('AI Week Optimizer Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTimelineItems = [
    {
      id: '1',
      title: 'Deep Work Session',
      start_time: '2025-02-03T09:00:00Z',
      end_time: '2025-02-03T11:00:00Z',
      duration_minutes: 120,
      attention_type: 'create',
      priority: 4,
      is_non_negotiable: true
    },
    {
      id: '2',
      title: 'Team Meeting',
      start_time: '2025-02-03T11:30:00Z',
      end_time: '2025-02-03T12:00:00Z',
      duration_minutes: 30,
      attention_type: 'connect',
      priority: 3,
      is_non_negotiable: false
    },
    {
      id: '3',
      title: 'Quick Decision',
      start_time: '2025-02-03T14:00:00Z',
      end_time: '2025-02-03T14:30:00Z',
      duration_minutes: 30,
      attention_type: 'decide',
      priority: 2,
      is_non_negotiable: false
    }
  ];

  const mockPreferences = {
    current_role: 'maker' as const,
    current_zone: 'peacetime' as const,
    non_negotiable_title: 'Product Development',
    non_negotiable_weekly_hours: 10,
    attention_budgets: {
      decide: 2,
      context_switches: 3,
      meetings: 4
    },
    peak_hours_start: '09:00',
    peak_hours_end: '12:00'
  };

  const mockConstraints = {
    max_daily_hours: 8,
    min_break_between_blocks: 15,
    preserve_lunch_time: true,
    respect_external_calendar: true
  };

  it('should return optimization suggestions for maker role', async () => {
    const mockResponse = {
      originalSchedule: mockTimelineItems,
      optimizedSchedule: [
        // Optimized version with clustered attention types
        ...mockTimelineItems
      ],
      changes: [
        {
          type: 'cluster',
          item_id: '2',
          old_time: '2025-02-03T11:30:00Z',
          new_time: '2025-02-03T13:00:00Z',
          reason: 'Clustering meetings to protect focus time',
          impact: 'Reduces context switches by 1, extends deep work block'
        }
      ],
      improvements: {
        contextSwitchesReduced: 2,
        focusBlocksExtended: 1,
        attentionBudgetImproved: 1,
        delegationOpportunities: 0
      },
      explanation: 'Optimized for maker role by protecting deep work time and clustering interruptions',
      weeklyScore: {
        before: 65,
        after: 85
      }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const requestBody = {
      currentSchedule: mockTimelineItems,
      preferences: mockPreferences,
      constraints: mockConstraints,
      optimizationGoals: ['focus', 'efficiency']
    };

    const response = await fetch('/api/ai-week-optimizer', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    expect(response.ok).toBe(true);
    expect(result.changes).toHaveLength(1);
    expect(result.improvements.contextSwitchesReduced).toBe(2);
    expect(result.weeklyScore.after).toBeGreaterThan(result.weeklyScore.before);
  });

  it('should optimize differently for marker role', async () => {
    const markerPreferences = {
      ...mockPreferences,
      current_role: 'marker' as const
    };

    const mockResponse = {
      originalSchedule: mockTimelineItems,
      optimizedSchedule: mockTimelineItems,
      changes: [
        {
          type: 'cluster',
          item_id: '3',
          old_time: '2025-02-03T14:00:00Z',
          new_time: '2025-02-03T11:00:00Z',
          reason: 'Clustering decision-making tasks for marker role',
          impact: 'Creates dedicated decision window, improves focus'
        }
      ],
      improvements: {
        contextSwitchesReduced: 1,
        focusBlocksExtended: 0,
        attentionBudgetImproved: 2,
        delegationOpportunities: 1
      },
      explanation: 'Optimized for marker role by clustering decision tasks',
      weeklyScore: {
        before: 70,
        after: 82
      }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const response = await fetch('/api/ai-week-optimizer', {
      method: 'POST',
      body: JSON.stringify({
        currentSchedule: mockTimelineItems,
        preferences: markerPreferences,
        constraints: mockConstraints,
        optimizationGoals: ['efficiency', 'balance']
      })
    });

    const result = await response.json();

    expect(result.improvements.attentionBudgetImproved).toBe(2);
    expect(result.changes[0].reason).toContain('decision');
  });

  it('should handle wartime vs peacetime optimization differently', async () => {
    const wartimePreferences = {
      ...mockPreferences,
      current_zone: 'wartime' as const
    };

    const mockResponse = {
      originalSchedule: mockTimelineItems,
      optimizedSchedule: mockTimelineItems,
      changes: [
        {
          type: 'delegate',
          item_id: '2',
          old_time: '2025-02-03T11:30:00Z',
          new_time: 'delegated',
          reason: 'Wartime mode - delegating non-essential meeting',
          impact: 'Saves 30 minutes for high-priority execution work'
        }
      ],
      improvements: {
        contextSwitchesReduced: 1,
        focusBlocksExtended: 1,
        attentionBudgetImproved: 0,
        delegationOpportunities: 2
      },
      explanation: 'Wartime optimization focuses on execution and delegation',
      weeklyScore: {
        before: 60,
        after: 88
      }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const response = await fetch('/api/ai-week-optimizer', {
      method: 'POST',
      body: JSON.stringify({
        currentSchedule: mockTimelineItems,
        preferences: wartimePreferences,
        constraints: mockConstraints,
        optimizationGoals: ['focus', 'efficiency']
      })
    });

    const result = await response.json();

    expect(result.improvements.delegationOpportunities).toBe(2);
    expect(result.changes[0].reason).toContain('Wartime');
  });

  it('should preserve non-negotiable items', async () => {
    const mockResponse = {
      originalSchedule: mockTimelineItems,
      optimizedSchedule: mockTimelineItems,
      changes: [
        {
          type: 'move',
          item_id: '2',
          old_time: '2025-02-03T11:30:00Z',
          new_time: '2025-02-03T13:00:00Z',
          reason: 'Moving meeting to protect non-negotiable deep work',
          impact: 'Preserves focused work time'
        }
      ],
      improvements: {
        contextSwitchesReduced: 1,
        focusBlocksExtended: 1,
        attentionBudgetImproved: 0,
        delegationOpportunities: 0
      },
      explanation: 'Non-negotiable items protected during optimization',
      weeklyScore: {
        before: 70,
        after: 85
      }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const response = await fetch('/api/ai-week-optimizer', {
      method: 'POST',
      body: JSON.stringify({
        currentSchedule: mockTimelineItems,
        preferences: mockPreferences,
        constraints: {
          ...mockConstraints,
          fixed_meetings: ['1'] // Non-negotiable item should not be moved
        },
        optimizationGoals: ['focus']
      })
    });

    const result = await response.json();

    // Non-negotiable item (id: '1') should not appear in changes
    expect(result.changes.find((c: any) => c.item_id === '1')).toBeUndefined();
    expect(result.changes[0].reason).toContain('non-negotiable');
  });

  it('should handle empty schedule gracefully', async () => {
    const mockResponse = {
      originalSchedule: [],
      optimizedSchedule: [],
      changes: [],
      improvements: {
        contextSwitchesReduced: 0,
        focusBlocksExtended: 0,
        attentionBudgetImproved: 0,
        delegationOpportunities: 0
      },
      explanation: 'No items to optimize in current schedule',
      weeklyScore: {
        before: 50,
        after: 50
      }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const response = await fetch('/api/ai-week-optimizer', {
      method: 'POST',
      body: JSON.stringify({
        currentSchedule: [],
        preferences: mockPreferences,
        constraints: mockConstraints,
        optimizationGoals: ['focus']
      })
    });

    const result = await response.json();

    expect(result.changes).toHaveLength(0);
    expect(result.weeklyScore.before).toBe(result.weeklyScore.after);
  });

  it('should handle optimization errors gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: 'Internal server error',
        message: 'AI optimization failed'
      })
    });

    const response = await fetch('/api/ai-week-optimizer', {
      method: 'POST',
      body: JSON.stringify({
        currentSchedule: mockTimelineItems,
        preferences: mockPreferences,
        constraints: mockConstraints,
        optimizationGoals: ['focus']
      })
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);

    const result = await response.json();
    expect(result.error).toBe('Internal server error');
  });
});