// Custom hook for follow-up automation system
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TrustLevel } from '@/lib/attentionTypes';

interface FollowUpEvent {
  id: string;
  delegation_id: string;
  delegation_title: string;
  delegate_name: string;
  follow_up_type: 'work_alongside' | 'review_steps' | 'unblock_context' | 'completion_review';
  scheduled_at: string;
  completed_at?: string;
  notes?: string;
  next_follow_up_at?: string;
  trust_level: TrustLevel;
  status: 'scheduled' | 'completed' | 'overdue' | 'skipped';
}

interface AutomationRule {
  id: string;
  trust_level: TrustLevel;
  follow_up_type: string;
  timing_hours: number;
  is_active: boolean;
  custom_message?: string;
  conditions: {
    delegation_type?: string[];
    estimated_hours_min?: number;
    estimated_hours_max?: number;
    priority_level?: number;
  };
}

export function useFollowUpAutomation() {
  const { user } = useAuth();
  const [followUpEvents, setFollowUpEvents] = useState<FollowUpEvent[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch follow-up events
  const fetchFollowUpEvents = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('delegation_follow_ups')
        .select(`
          *,
          delegation:delegations(
            id,
            title,
            delegate_id,
            trust_level,
            delegate:delegate_id(
              id,
              email,
              raw_user_meta_data
            )
          )
        `)
        .order('scheduled_at', { ascending: true });

      if (fetchError) throw fetchError;

      const transformedEvents: FollowUpEvent[] = data?.map(event => {
        const delegation = event.delegation;
        const delegateName = delegation?.delegate?.raw_user_meta_data?.full_name ||
                           delegation?.delegate?.email ||
                           'Unknown User';

        // Determine status based on completion and timing
        let status: 'scheduled' | 'completed' | 'overdue' | 'skipped' = 'scheduled';
        if (event.completed_at) {
          status = 'completed';
        } else if (new Date(event.scheduled_at) < new Date()) {
          status = 'overdue';
        }

        return {
          id: event.id,
          delegation_id: event.delegation_id,
          delegation_title: delegation?.title || 'Unknown Task',
          delegate_name: delegateName,
          follow_up_type: event.follow_up_type,
          scheduled_at: event.scheduled_at,
          completed_at: event.completed_at,
          notes: event.notes,
          next_follow_up_at: event.next_follow_up_at,
          trust_level: delegation?.trust_level || 'new',
          status
        };
      }) || [];

      setFollowUpEvents(transformedEvents);
    } catch (err) {
      console.error('Failed to fetch follow-up events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch follow-up events');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch automation rules
  const fetchAutomationRules = useCallback(async () => {
    // For now, we'll use default rules. In a real implementation,
    // these would be stored in the database per user
    const defaultRules: AutomationRule[] = [
      {
        id: '1',
        trust_level: 'new',
        follow_up_type: 'work_alongside',
        timing_hours: 2,
        is_active: true,
        conditions: {}
      },
      {
        id: '2',
        trust_level: 'new',
        follow_up_type: 'review_steps',
        timing_hours: 24,
        is_active: true,
        conditions: {}
      },
      {
        id: '3',
        trust_level: 'experienced',
        follow_up_type: 'review_steps',
        timing_hours: 24,
        is_active: true,
        conditions: {}
      },
      {
        id: '4',
        trust_level: 'experienced',
        follow_up_type: 'unblock_context',
        timing_hours: 72,
        is_active: true,
        conditions: {}
      },
      {
        id: '5',
        trust_level: 'expert',
        follow_up_type: 'unblock_context',
        timing_hours: 72,
        is_active: true,
        conditions: {}
      }
    ];

    setAutomationRules(defaultRules);
  }, []);

  // Complete a follow-up event
  const completeFollowUp = async (
    eventId: string,
    notes: string,
    scheduleNext = false
  ) => {
    try {
      const updates: any = {
        completed_at: new Date().toISOString(),
        notes
      };

      // If scheduling next follow-up, calculate timing
      if (scheduleNext) {
        const event = followUpEvents.find(e => e.id === eventId);
        if (event) {
          const nextTiming = getNextFollowUpTiming(event.trust_level, event.follow_up_type);
          if (nextTiming > 0) {
            const nextDate = new Date();
            nextDate.setHours(nextDate.getHours() + nextTiming);
            updates.next_follow_up_at = nextDate.toISOString();
          }
        }
      }

      const { error } = await supabase
        .from('delegation_follow_ups')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;

      // If scheduling next follow-up, create new event
      if (scheduleNext && updates.next_follow_up_at) {
        const event = followUpEvents.find(e => e.id === eventId);
        if (event) {
          await scheduleFollowUp(
            event.delegation_id,
            getNextFollowUpType(event.follow_up_type),
            updates.next_follow_up_at
          );
        }
      }

      await fetchFollowUpEvents();
    } catch (err) {
      console.error('Failed to complete follow-up:', err);
      throw err;
    }
  };

  // Schedule a new follow-up event
  const scheduleFollowUp = async (
    delegationId: string,
    followUpType: string,
    scheduledAt: string
  ) => {
    try {
      const { error } = await supabase
        .from('delegation_follow_ups')
        .insert({
          delegation_id: delegationId,
          follow_up_type: followUpType,
          scheduled_at: scheduledAt
        });

      if (error) throw error;

      await fetchFollowUpEvents();
    } catch (err) {
      console.error('Failed to schedule follow-up:', err);
      throw err;
    }
  };

  // Update automation rule
  const updateAutomationRule = async (
    ruleId: string,
    updates: Partial<AutomationRule>
  ) => {
    try {
      // Update local state (in real implementation, would update database)
      setAutomationRules(rules =>
        rules.map(rule =>
          rule.id === ruleId ? { ...rule, ...updates } : rule
        )
      );
    } catch (err) {
      console.error('Failed to update automation rule:', err);
      throw err;
    }
  };

  // Get next follow-up timing based on trust level and current type
  const getNextFollowUpTiming = (trustLevel: TrustLevel, currentType: string): number => {
    const timingMap = {
      new: {
        work_alongside: 24, // Next: daily check-in
        review_steps: 24,   // Next: another review
        unblock_context: 8, // Next: close support
        completion_review: 0 // No next follow-up
      },
      experienced: {
        work_alongside: 48, // Next: less frequent check
        review_steps: 72,   // Next: milestone check
        unblock_context: 48, // Next: support available
        completion_review: 0
      },
      expert: {
        work_alongside: 0,   // Shouldn't happen for expert
        review_steps: 168,   // Weekly check
        unblock_context: 168, // Weekly availability
        completion_review: 0
      }
    };

    return timingMap[trustLevel]?.[currentType as keyof typeof timingMap.new] || 0;
  };

  // Get next follow-up type in sequence
  const getNextFollowUpType = (currentType: string): string => {
    const sequences = {
      work_alongside: 'review_steps',
      review_steps: 'unblock_context',
      unblock_context: 'completion_review',
      completion_review: 'completion_review' // Stay at completion
    };

    return sequences[currentType as keyof typeof sequences] || 'review_steps';
  };

  // Skip a follow-up event
  const skipFollowUp = async (eventId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('delegation_follow_ups')
        .update({
          completed_at: new Date().toISOString(),
          notes: `Skipped: ${reason}`
        })
        .eq('id', eventId);

      if (error) throw error;

      await fetchFollowUpEvents();
    } catch (err) {
      console.error('Failed to skip follow-up:', err);
      throw err;
    }
  };

  // Reschedule a follow-up event
  const rescheduleFollowUp = async (eventId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('delegation_follow_ups')
        .update({ scheduled_at: newDate })
        .eq('id', eventId);

      if (error) throw error;

      await fetchFollowUpEvents();
    } catch (err) {
      console.error('Failed to reschedule follow-up:', err);
      throw err;
    }
  };

  // Get follow-up events for a specific delegation
  const getFollowUpsForDelegation = useCallback((delegationId: string) => {
    return followUpEvents.filter(event => event.delegation_id === delegationId);
  }, [followUpEvents]);

  // Get overdue follow-ups
  const getOverdueFollowUps = useCallback(() => {
    const now = new Date();
    return followUpEvents.filter(event =>
      event.status === 'scheduled' && new Date(event.scheduled_at) < now
    );
  }, [followUpEvents]);

  // Get today's follow-ups
  const getTodaysFollowUps = useCallback(() => {
    const today = new Date().toDateString();
    return followUpEvents.filter(event =>
      event.status === 'scheduled' &&
      new Date(event.scheduled_at).toDateString() === today
    );
  }, [followUpEvents]);

  // Create follow-ups for a new delegation based on automation rules
  const createAutomatedFollowUps = async (delegationId: string, trustLevel: TrustLevel) => {
    try {
      const relevantRules = automationRules.filter(rule =>
        rule.trust_level === trustLevel && rule.is_active
      );

      const now = new Date();

      for (const rule of relevantRules) {
        const scheduledAt = new Date(now.getTime() + rule.timing_hours * 60 * 60 * 1000);

        await scheduleFollowUp(
          delegationId,
          rule.follow_up_type,
          scheduledAt.toISOString()
        );
      }
    } catch (err) {
      console.error('Failed to create automated follow-ups:', err);
      throw err;
    }
  };

  // Initialize data
  useEffect(() => {
    if (user) {
      fetchFollowUpEvents();
      fetchAutomationRules();
    }
  }, [user, fetchFollowUpEvents, fetchAutomationRules]);

  // Set up real-time subscription for follow-up events
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`follow_ups_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delegation_follow_ups'
        },
        () => {
          fetchFollowUpEvents();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchFollowUpEvents]);

  return {
    followUpEvents,
    automationRules,
    loading,
    error,
    completeFollowUp,
    scheduleFollowUp,
    updateAutomationRule,
    skipFollowUp,
    rescheduleFollowUp,
    getFollowUpsForDelegation,
    getOverdueFollowUps,
    getTodaysFollowUps,
    createAutomatedFollowUps,
    refreshFollowUpEvents: fetchFollowUpEvents
  };
}