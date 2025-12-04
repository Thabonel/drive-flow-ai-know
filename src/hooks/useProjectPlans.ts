/**
 * useProjectPlans Hook
 *
 * Manages project plans: create, parse, schedule, and apply to timeline.
 *
 * CRITICAL: Duration extraction uses REGEX only (planParser.ts).
 * AI is NEVER used to estimate durations.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useTimeline } from './useTimeline';
import { useLayers } from './useLayers';
import {
  parseMarkdownPlan,
  validatePlan,
  formatDuration,
  PlanTask,
  ParseResult,
} from '@/lib/planParser';
import {
  schedulePlan,
  groupByDay,
  toTimelineItems,
  SchedulingConfig,
  ScheduleResult,
  DaySchedule,
} from '@/lib/planScheduler';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectPlan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_content: string;
  source_type: 'markdown' | 'json' | 'natural';
  parsed_tasks: PlanTask[];
  target_start_date: string | null;
  working_hours_start: string;
  working_hours_end: string;
  max_minutes_per_day: number;
  skip_weekends: boolean;
  allow_task_splitting: boolean;
  total_tasks: number;
  total_duration_minutes: number;
  estimated_days: number | null;
  status: 'draft' | 'parsed' | 'scheduled' | 'applied' | 'in_progress' | 'completed' | 'archived';
  validation_errors: string[];
  parsed_at: string | null;
  scheduled_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanInput {
  title: string;
  description?: string;
  source_content: string;
  source_type?: 'markdown' | 'json' | 'natural';
}

export interface SchedulePlanInput {
  planId: string;
  startDate: Date;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  maxMinutesPerDay?: number;
  skipWeekends?: boolean;
  allowTaskSplitting?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useProjectPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addItem, refetchItems } = useTimeline();
  const { layers } = useLayers();

  // Local state for current scheduling preview
  const [schedulePreview, setSchedulePreview] = useState<{
    result: ScheduleResult;
    days: DaySchedule[];
  } | null>(null);

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Fetch all user's plans
  const {
    data: plans = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['project-plans', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('project_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectPlan[];
    },
    enabled: !!user,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // Create a new plan
  const createPlanMutation = useMutation({
    mutationFn: async (input: CreatePlanInput) => {
      if (!user) throw new Error('Not authenticated');

      // Parse the content using REGEX (not AI)
      const parseResult = parseMarkdownPlan(input.source_content);

      // Validate all tasks have durations
      const validation = validatePlan(parseResult.tasks);

      const { data, error } = await supabase
        .from('project_plans')
        .insert({
          user_id: user.id,
          title: input.title,
          description: input.description || null,
          source_content: input.source_content,
          source_type: input.source_type || 'markdown',
          parsed_tasks: parseResult.tasks,
          status: validation.isValid ? 'parsed' : 'draft',
          validation_errors: [
            ...parseResult.warnings.map(w => w.message),
            ...validation.errors,
          ],
          parsed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { plan: data as ProjectPlan, parseResult };
    },
    onSuccess: ({ plan, parseResult }) => {
      queryClient.invalidateQueries({ queryKey: ['project-plans', user?.id] });

      if (parseResult.warnings.length > 0) {
        toast({
          title: 'Plan Created with Warnings',
          description: `${parseResult.tasks.length} tasks parsed. ${parseResult.warnings.length} task(s) missing duration.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Plan Created',
          description: `${parseResult.tasks.length} tasks parsed. Total: ${formatDuration(parseResult.totalDurationMinutes)}`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error Creating Plan',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Re-parse a plan (if source content changed)
  const reparsePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const parseResult = parseMarkdownPlan(plan.source_content);
      const validation = validatePlan(parseResult.tasks);

      const { error } = await supabase
        .from('project_plans')
        .update({
          parsed_tasks: parseResult.tasks,
          status: validation.isValid ? 'parsed' : 'draft',
          validation_errors: [
            ...parseResult.warnings.map(w => w.message),
            ...validation.errors,
          ],
          parsed_at: new Date().toISOString(),
        })
        .eq('id', planId);

      if (error) throw error;
      return parseResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-plans', user?.id] });
    },
  });

  // Generate schedule preview (doesn't save yet)
  const generateSchedulePreview = useCallback(
    async (input: SchedulePlanInput): Promise<{
      result: ScheduleResult;
      days: DaySchedule[];
    } | null> => {
      const plan = plans.find(p => p.id === input.planId);
      if (!plan) {
        toast({
          title: 'Error',
          description: 'Plan not found',
          variant: 'destructive',
        });
        return null;
      }

      // Get existing timeline items for conflict detection
      const { data: existingItems } = await supabase
        .from('timeline_items')
        .select('id, start_time, duration_minutes, title, is_meeting')
        .eq('user_id', user?.id)
        .gte('start_time', input.startDate.toISOString())
        .neq('status', 'parked');

      const config: SchedulingConfig = {
        startDate: input.startDate,
        workingHoursStart: input.workingHoursStart || plan.working_hours_start,
        workingHoursEnd: input.workingHoursEnd || plan.working_hours_end,
        maxMinutesPerDay: input.maxMinutesPerDay || plan.max_minutes_per_day,
        skipWeekends: input.skipWeekends ?? plan.skip_weekends,
        allowTaskSplitting: input.allowTaskSplitting ?? plan.allow_task_splitting,
        existingItems: existingItems || [],
      };

      // Run the constraint solver (USES EXACT USER DURATIONS)
      const result = schedulePlan(plan.parsed_tasks, config);
      const days = groupByDay(result.scheduledBlocks);

      const preview = { result, days };
      setSchedulePreview(preview);

      // Update plan with scheduling preferences
      await supabase
        .from('project_plans')
        .update({
          target_start_date: input.startDate.toISOString().split('T')[0],
          working_hours_start: config.workingHoursStart,
          working_hours_end: config.workingHoursEnd,
          max_minutes_per_day: config.maxMinutesPerDay,
          skip_weekends: config.skipWeekends,
          allow_task_splitting: config.allowTaskSplitting,
          status: 'scheduled',
          scheduled_at: new Date().toISOString(),
        })
        .eq('id', input.planId);

      queryClient.invalidateQueries({ queryKey: ['project-plans', user?.id] });

      if (result.warnings.length > 0) {
        toast({
          title: 'Schedule Generated with Warnings',
          description: result.warnings[0],
          variant: 'default',
        });
      }

      return preview;
    },
    [plans, user, toast, queryClient]
  );

  // Apply scheduled plan to timeline
  const applyToTimelineMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error('Not authenticated');
      if (!schedulePreview) throw new Error('No schedule preview available');

      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      // Get default layer
      const defaultLayer = layers.find(l => l.is_visible) || layers[0];
      if (!defaultLayer) throw new Error('No timeline layer available');

      // Convert scheduled blocks to timeline items
      const timelineItems = toTimelineItems(
        schedulePreview.result.scheduledBlocks,
        planId,
        plan.parsed_tasks
      );

      // Insert all items
      const { data: createdItems, error } = await supabase
        .from('timeline_items')
        .insert(
          timelineItems.map(item => ({
            user_id: user.id,
            layer_id: defaultLayer.id,
            title: item.title,
            start_time: item.start_time,
            duration_minutes: item.duration_minutes,
            planned_duration_minutes: item.duration_minutes,
            color: item.color,
            is_flexible: item.is_flexible,
            status: 'active',
            plan_id: item.plan_id,
            plan_task_id: item.plan_task_id,
          }))
        )
        .select();

      if (error) throw error;

      // Update plan status
      await supabase
        .from('project_plans')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString(),
        })
        .eq('id', planId);

      return createdItems;
    },
    onSuccess: (createdItems) => {
      queryClient.invalidateQueries({ queryKey: ['project-plans', user?.id] });
      refetchItems();
      setSchedulePreview(null);

      toast({
        title: 'Plan Applied to Timeline',
        description: `${createdItems?.length || 0} items added to your timeline`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Applying Plan',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Delete a plan
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('project_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-plans', user?.id] });
      toast({
        title: 'Plan Deleted',
        description: 'The plan has been removed',
      });
    },
  });

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const clearSchedulePreview = useCallback(() => {
    setSchedulePreview(null);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    plans,
    isLoading,
    error,
    schedulePreview,

    // Actions
    createPlan: createPlanMutation.mutate,
    reparsePlan: reparsePlanMutation.mutate,
    generateSchedulePreview,
    applyToTimeline: applyToTimelineMutation.mutate,
    deletePlan: deletePlanMutation.mutate,
    clearSchedulePreview,

    // Status
    isCreating: createPlanMutation.isPending,
    isApplying: applyToTimelineMutation.isPending,
  };
}
