import { useState, useCallback } from 'react';
import { useSupabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TimelineItem {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  attention_type?: string;
  priority?: number;
  is_non_negotiable?: boolean;
  context_switch_cost?: number;
  layer_name?: string;
  user_id: string;
}

interface OptimizationChange {
  type: 'move' | 'cluster' | 'extend' | 'break' | 'delegate';
  item_id: string;
  old_time: string;
  new_time: string;
  reason: string;
  impact: string;
}

interface DelegationRecommendation {
  item_id: string;
  should_delegate: boolean;
  confidence_score: number;
  reasons: string[];
  recommended_delegates: any[];
  delegation_strategy: any;
}

interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  estimated_duration: number;
  attention_type: string;
  context: string;
}

export const useAIOptimization = () => {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Week Optimization
  const optimizeWeek = useCallback(async (
    currentSchedule: TimelineItem[],
    userRole: 'maker' | 'marker' | 'multiplier',
    userZone: 'wartime' | 'peacetime'
  ) => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      // Get user preferences
      const { data: preferencesData } = await supabase.functions.invoke('attention-preferences');
      const preferences = preferencesData?.preferences || {
        current_role: userRole,
        current_zone: userZone,
        non_negotiable_weekly_hours: 5,
        attention_budgets: {
          decide: 2,
          context_switches: 3,
          meetings: 4
        },
        peak_hours_start: '09:00',
        peak_hours_end: '12:00'
      };

      const { data, error } = await supabase.functions.invoke('ai-week-optimizer', {
        body: {
          currentSchedule,
          preferences: {
            ...preferences,
            current_role: userRole,
            current_zone: userZone
          },
          constraints: {
            max_daily_hours: 10,
            min_break_between_blocks: 15,
            preserve_lunch_time: true,
            respect_external_calendar: true
          },
          optimizationGoals: ['focus', 'efficiency', 'balance']
        }
      });

      if (error) throw new Error(error.message);
      return data;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to optimize week';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // Apply optimization changes to timeline
  const applyOptimizations = useCallback(async (
    changes: OptimizationChange[]
  ) => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      const results = [];

      for (const change of changes) {
        const { data, error } = await supabase
          .from('timeline_items')
          .update({
            start_time: change.new_time,
            end_time: new Date(new Date(change.new_time).getTime() +
              (new Date(change.old_time).getTime() - new Date(change.old_time).getTime())).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', change.item_id)
          .eq('user_id', user.id)
          .select();

        if (error) {
          console.error(`Failed to update item ${change.item_id}:`, error);
        } else {
          results.push(data);
        }
      }

      return results;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to apply optimizations';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // Delegation Analysis
  const analyzeDelegation = useCallback(async (
    timelineItems: TimelineItem[],
    userRole: 'maker' | 'marker' | 'multiplier',
    analysisType: 'single_item' | 'weekly_scan' | 'is_this_my_job',
    singleItem?: TimelineItem
  ) => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-delegation-analyzer', {
        body: {
          timelineItem: singleItem,
          allUserItems: timelineItems,
          userRole,
          analysisType
        }
      });

      if (error) throw new Error(error.message);
      return data.result;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to analyze delegation';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // Create delegation
  const createDelegation = useCallback(async (
    timelineItemId: string,
    delegateUserId: string,
    trustLevel: 'new' | 'experienced' | 'expert',
    handoffMethod: string,
    followUpSchedule: string[]
  ) => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('delegations')
        .insert({
          delegator_id: user.id,
          delegate_id: delegateUserId,
          timeline_item_id: timelineItemId,
          trust_level: trustLevel,
          status: 'pending',
          follow_up_scheduled_at: followUpSchedule.length > 0 ?
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null // Tomorrow as default
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Update timeline item to mark as delegated
      await supabase
        .from('timeline_items')
        .update({
          notes: `Delegated to ${delegateUserId} (${trustLevel} trust level)`,
          updated_at: new Date().toISOString()
        })
        .eq('id', timelineItemId)
        .eq('user_id', user.id);

      return data;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create delegation';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // Meeting Processing
  const processMeeting = useCallback(async (
    meetingTitle: string,
    meetingDate: string,
    meetingNotes: string,
    attendees: string[],
    processingType: 'action_items' | 'summary' | 'follow_up_scheduling' | 'full_analysis'
  ) => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-meeting-processor', {
        body: {
          meeting_title: meetingTitle,
          meeting_date: meetingDate,
          attendees,
          meeting_notes,
          processing_type: processingType
        }
      });

      if (error) throw new Error(error.message);
      return data;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process meeting';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // Schedule action items from meeting
  const scheduleActionItems = useCallback(async (
    actionItems: ActionItem[]
  ) => {
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      const results = [];

      for (const item of actionItems) {
        // Calculate start time based on priority
        let startTime = new Date();
        switch (item.priority) {
          case 'high':
            startTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
            break;
          case 'medium':
            startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
            break;
          case 'low':
            startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next week
            break;
        }

        if (item.due_date) {
          const dueDate = new Date(item.due_date);
          if (startTime > dueDate) {
            startTime = new Date(dueDate.getTime() - item.estimated_duration * 60 * 1000);
          }
        }

        const endTime = new Date(startTime.getTime() + item.estimated_duration * 60 * 1000);

        const { data, error } = await supabase
          .from('timeline_items')
          .insert({
            user_id: user.id,
            title: item.text,
            description: item.context,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: item.estimated_duration,
            attention_type: item.attention_type,
            priority: item.priority === 'high' ? 5 : item.priority === 'medium' ? 3 : 1,
            layer_name: 'Meeting Follow-ups',
            notes: `Action item from meeting. Assignee: ${item.assignee}`
          })
          .select()
          .single();

        if (error) {
          console.error(`Failed to schedule item "${item.text}":`, error);
        } else {
          results.push(data);
        }
      }

      return results;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to schedule action items';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  return {
    optimizeWeek,
    applyOptimizations,
    analyzeDelegation,
    createDelegation,
    processMeeting,
    scheduleActionItems,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};