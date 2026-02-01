import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for testing Edge Function calls
global.fetch = vi.fn();

describe('AI Delegation Analyzer Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTimelineItem = {
    id: '1',
    title: 'Write weekly status report',
    description: 'Compile team updates and metrics',
    start_time: '2025-02-03T14:00:00Z',
    duration_minutes: 60,
    attention_type: 'review',
    priority: 2,
    is_non_negotiable: false,
    user_id: 'user-123'
  };

  const mockTeamMembers = [
    {
      id: 'team-1',
      email: 'sarah@company.com',
      full_name: 'Sarah Johnson',
      current_workload: 60,
      trust_history: {
        completed_delegations: 5,
        success_rate: 90,
        avg_quality_rating: 4.2
      }
    },
    {
      id: 'team-2',
      email: 'mike@company.com',
      full_name: 'Mike Chen',
      current_workload: 40,
      trust_history: {
        completed_delegations: 2,
        success_rate: 100,
        avg_quality_rating: 4.5
      }
    }
  ];

  describe('Single Item Analysis', () => {
    it('should recommend delegation for routine tasks', async () => {
      const mockResponse = {
        analysis_type: 'single_item',
        result: {
          item_id: '1',
          should_delegate: true,
          confidence_score: 85,
          reasons: [
            'Routine administrative task below senior level',
            'Could be completed by team member for skill development',
            'Frees up time for higher-value strategic work'
          ],
          recommended_delegates: [
            {
              team_member_id: 'team-2',
              name: 'Mike Chen',
              trust_level: 'experienced',
              fit_score: 88,
              reason: 'Has light workload and strong track record with reports',
              estimated_time_savings: 45
            },
            {
              team_member_id: 'team-1',
              name: 'Sarah Johnson',
              trust_level: 'expert',
              fit_score: 75,
              reason: 'Highly experienced but currently busy',
              estimated_time_savings: 50
            }
          ],
          delegation_strategy: {
            handoff_method: 'checkpoint_reviews',
            follow_up_schedule: [
              'Day 2: Check initial draft',
              'Day 4: Review final version'
            ],
            success_factors: [
              'Provide template and examples',
              'Clear deadline communication',
              'Access to necessary data sources'
            ],
            risk_mitigation: [
              'Initial quality review',
              'Backup plan if delayed',
              'Style guide provision'
            ]
          },
          automation_alternative: {
            possible: true,
            tools_suggested: ['Automated reporting dashboard', 'Template system'],
            implementation_complexity: 'medium'
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/ai-delegation-analyzer', {
        method: 'POST',
        body: JSON.stringify({
          timelineItem: mockTimelineItem,
          userRole: 'marker',
          analysisType: 'single_item'
        })
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.result.should_delegate).toBe(true);
      expect(result.result.confidence_score).toBe(85);
      expect(result.result.recommended_delegates).toHaveLength(2);
      expect(result.result.automation_alternative.possible).toBe(true);
    });

    it('should recommend keeping strategic tasks', async () => {
      const strategicTask = {
        ...mockTimelineItem,
        title: 'Quarterly strategy review',
        description: 'Analyze market position and set Q2 priorities',
        attention_type: 'decide',
        priority: 5,
        is_non_negotiable: true
      };

      const mockResponse = {
        analysis_type: 'single_item',
        result: {
          item_id: '1',
          should_delegate: false,
          confidence_score: 92,
          reasons: [
            'Requires senior-level strategic thinking',
            'Marked as non-negotiable priority',
            'Involves confidential business decisions'
          ],
          recommended_delegates: [],
          delegation_strategy: {
            handoff_method: 'provide_context_only',
            follow_up_schedule: [],
            success_factors: [],
            risk_mitigation: []
          },
          automation_alternative: {
            possible: false,
            tools_suggested: [],
            implementation_complexity: 'high'
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/ai-delegation-analyzer', {
        method: 'POST',
        body: JSON.stringify({
          timelineItem: strategicTask,
          userRole: 'marker',
          analysisType: 'single_item'
        })
      });

      const result = await response.json();

      expect(result.result.should_delegate).toBe(false);
      expect(result.result.confidence_score).toBeGreaterThan(90);
      expect(result.result.reasons[0]).toContain('strategic');
    });
  });

  describe('Weekly Scan Analysis', () => {
    const mockWeeklySchedule = [
      mockTimelineItem,
      {
        id: '2',
        title: 'Data entry task',
        duration_minutes: 30,
        attention_type: 'review',
        priority: 1
      },
      {
        id: '3',
        title: 'Client presentation prep',
        duration_minutes: 120,
        attention_type: 'create',
        priority: 4
      }
    ];

    it('should identify multiple delegation opportunities', async () => {
      const mockResponse = {
        analysis_type: 'weekly_scan',
        result: {
          total_items_analyzed: 3,
          delegation_opportunities: 2,
          time_savings_potential: 90, // minutes
          recommendations: [
            {
              item_id: '1',
              should_delegate: true,
              confidence_score: 85,
              reasons: ['Routine administrative work']
            },
            {
              item_id: '2',
              should_delegate: true,
              confidence_score: 95,
              reasons: ['Simple data entry, below skill level']
            }
          ],
          recurring_patterns: [
            {
              pattern: 'Weekly status reports',
              frequency: 4,
              delegation_suggestion: 'Create template and delegate to team lead'
            }
          ],
          role_alignment_score: 65
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/ai-delegation-analyzer', {
        method: 'POST',
        body: JSON.stringify({
          allUserItems: mockWeeklySchedule,
          userRole: 'multiplier',
          analysisType: 'weekly_scan'
        })
      });

      const result = await response.json();

      expect(result.result.delegation_opportunities).toBe(2);
      expect(result.result.time_savings_potential).toBe(90);
      expect(result.result.recommendations).toHaveLength(2);
      expect(result.result.recurring_patterns).toHaveLength(1);
    });

    it('should show different patterns for different roles', async () => {
      const makerResponse = {
        analysis_type: 'weekly_scan',
        result: {
          total_items_analyzed: 3,
          delegation_opportunities: 1,
          time_savings_potential: 60,
          recommendations: [
            {
              item_id: '1',
              should_delegate: true,
              confidence_score: 80,
              reasons: ['Interrupts deep work flow for maker role']
            }
          ],
          recurring_patterns: [],
          role_alignment_score: 45 // Low for maker with too many meetings
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => makerResponse
      });

      const response = await fetch('/api/ai-delegation-analyzer', {
        method: 'POST',
        body: JSON.stringify({
          allUserItems: mockWeeklySchedule,
          userRole: 'maker',
          analysisType: 'weekly_scan'
        })
      });

      const result = await response.json();

      expect(result.result.role_alignment_score).toBeLessThan(50);
      expect(result.result.recommendations[0].reasons[0]).toContain('maker');
    });
  });

  describe('Quick Job Check', () => {
    it('should provide instant triage guidance', async () => {
      const mockResponse = {
        analysis_type: 'is_this_my_job',
        result: {
          is_my_job: false,
          confidence: 88,
          quick_reason: 'Routine task that could be delegated for team development',
          action: 'delegate',
          alternative_suggestion: 'Delegate to Mike Chen with template and one checkpoint'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/ai-delegation-analyzer', {
        method: 'POST',
        body: JSON.stringify({
          timelineItem: mockTimelineItem,
          userRole: 'marker',
          analysisType: 'is_this_my_job'
        })
      });

      const result = await response.json();

      expect(result.result.is_my_job).toBe(false);
      expect(result.result.action).toBe('delegate');
      expect(result.result.confidence).toBeGreaterThan(80);
      expect(result.result.alternative_suggestion).toContain('Mike Chen');
    });

    it('should recommend keeping high-level tasks', async () => {
      const executiveTask = {
        ...mockTimelineItem,
        title: 'Board presentation review',
        priority: 5
      };

      const mockResponse = {
        analysis_type: 'is_this_my_job',
        result: {
          is_my_job: true,
          confidence: 95,
          quick_reason: 'Executive-level task requiring your direct involvement',
          action: 'do_yourself',
          alternative_suggestion: 'Consider delegating the research prep only'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/ai-delegation-analyzer', {
        method: 'POST',
        body: JSON.stringify({
          timelineItem: executiveTask,
          userRole: 'marker',
          analysisType: 'is_this_my_job'
        })
      });

      const result = await response.json();

      expect(result.result.is_my_job).toBe(true);
      expect(result.result.action).toBe('do_yourself');
      expect(result.result.confidence).toBeGreaterThan(90);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error',
          message: 'AI analysis failed'
        })
      });

      const response = await fetch('/api/ai-delegation-analyzer', {
        method: 'POST',
        body: JSON.stringify({
          timelineItem: mockTimelineItem,
          userRole: 'marker',
          analysisType: 'single_item'
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should validate required parameters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Bad request',
          message: 'Valid user role is required'
        })
      });

      const response = await fetch('/api/ai-delegation-analyzer', {
        method: 'POST',
        body: JSON.stringify({
          timelineItem: mockTimelineItem,
          analysisType: 'single_item'
          // Missing userRole
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });
});