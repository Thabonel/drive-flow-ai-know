// AI Goal Planning Hook
// Handles intelligent goal planning with natural language processing

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import type { TimelineGoal, TimelineItem } from '@/lib/timelineUtils';

export type Timeframe = 'week' | 'month' | 'quarter' | 'year';

export interface GoalAnalysis {
  goal: string;
  interpretedGoal: string;
  estimatedHours: number;
  suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  targetDate: string;
  rationale: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  weekNumber: number; // For visual timeline
  estimatedHours: number;
  dependencies: string[]; // IDs of other milestones that must complete first
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  milestoneId: string;
  dependencies: string[];
  category: string;
  priority: number; // 1-5
  flexibility: 'high' | 'medium' | 'low'; // How flexible the scheduling is
  cognitiveLoad: 'high' | 'medium' | 'low'; // For energy management
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  canSplit: boolean; // Whether task can be split across multiple sessions
}

export interface SchedulingConstraints {
  existingItems: TimelineItem[];
  workHoursStart: number; // Hour (0-23)
  workHoursEnd: number;
  maxWorkHoursPerDay: number;
  requiredBreakMinutes: number;
  preferredWorkDays: number[]; // 0-6 (Sunday-Saturday)
}

export interface ScheduledTask extends TaskItem {
  scheduledDate: string;
  scheduledTime: string;
  layerId: string;
}

export function useAIGoalPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);

  /**
   * Step 1: Analyze natural language goal and extract structured information
   */
  const analyzeGoal = useCallback(async (
    prompt: string,
    timeframe: Timeframe
  ): Promise<GoalAnalysis | null> => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to use goal planning',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);

    try {
      const analysisPrompt = `You are an expert goal planning assistant. Analyze the following goal and provide a structured breakdown.

User's Goal: "${prompt}"
Timeframe: ${timeframe}

Please analyze this goal and respond with a JSON object containing:
{
  "interpretedGoal": "A clear, concise restatement of the goal",
  "estimatedHours": number (total hours needed to achieve this goal),
  "suggestedPriority": "low" | "medium" | "high" | "critical",
  "category": "work" | "personal" | "health" | "learning" | "social",
  "targetDate": "ISO date string based on the timeframe",
  "rationale": "Brief explanation of your analysis"
}

Consider:
- The complexity and scope of the goal
- Typical time requirements for similar goals
- The specified timeframe
- Realistic expectations

Respond with ONLY valid JSON, no other text.`;

      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query: analysisPrompt,
          knowledge_base_id: null,
        },
      });

      if (error) throw error;

      // Parse AI response
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const goalAnalysis: GoalAnalysis = {
        goal: prompt,
        interpretedGoal: parsed.interpretedGoal,
        estimatedHours: parsed.estimatedHours,
        suggestedPriority: parsed.suggestedPriority,
        category: parsed.category,
        targetDate: parsed.targetDate,
        rationale: parsed.rationale,
      };

      setAnalysis(goalAnalysis);

      // Log AI session
      await supabase.from('timeline_ai_sessions').insert({
        user_id: user.id,
        session_type: 'plan',
        input_prompt: prompt,
        ai_response: data.response,
        success: true,
      });

      return goalAnalysis;
    } catch (error) {
      console.error('Goal analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze goal',
        variant: 'destructive',
      });

      // Log failed session
      if (user) {
        await supabase.from('timeline_ai_sessions').insert({
          user_id: user.id,
          session_type: 'plan',
          input_prompt: prompt,
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  /**
   * Step 2: Create milestones from goal analysis
   */
  const createMilestones = useCallback(async (
    goalAnalysis: GoalAnalysis,
    timeframe: Timeframe
  ): Promise<Milestone[]> => {
    if (!user) return [];

    setLoading(true);

    try {
      const milestonesPrompt = `You are creating a project plan with milestones.

Goal: ${goalAnalysis.interpretedGoal}
Timeframe: ${timeframe}
Total Estimated Hours: ${goalAnalysis.estimatedHours}
Target Date: ${goalAnalysis.targetDate}

Break this goal into 3-7 major milestones that represent distinct phases or achievements.

For each milestone, consider:
- Logical progression (each milestone builds on previous ones)
- Roughly equal time distribution (unless certain phases require more)
- Clear, measurable outcomes
- Dependencies between milestones

Respond with a JSON array of milestones:
[
  {
    "title": "Milestone name",
    "description": "What will be accomplished",
    "weekNumber": number (1-based week in the timeframe),
    "estimatedHours": number,
    "dependencies": [array of milestone titles this depends on]
  }
]

Respond with ONLY valid JSON, no other text.`;

      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query: milestonesPrompt,
          knowledge_base_id: null,
        },
      });

      if (error) throw error;

      const jsonMatch = data.response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid milestones response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const createdMilestones: Milestone[] = parsed.map((m: any, index: number) => ({
        id: `milestone-${index}`,
        title: m.title,
        description: m.description,
        weekNumber: m.weekNumber,
        estimatedHours: m.estimatedHours,
        dependencies: m.dependencies || [],
      }));

      setMilestones(createdMilestones);
      return createdMilestones;
    } catch (error) {
      console.error('Milestone creation error:', error);
      toast({
        title: 'Milestone creation failed',
        description: error instanceof Error ? error.message : 'Failed to create milestones',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  /**
   * Step 3: Generate specific tasks from milestones
   */
  const generateTasks = useCallback(async (
    milestones: Milestone[],
    goalCategory: string
  ): Promise<TaskItem[]> => {
    if (!user) return [];

    setLoading(true);

    try {
      const tasksPrompt = `You are breaking down milestones into actionable tasks.

Milestones:
${JSON.stringify(milestones, null, 2)}

Category: ${goalCategory}

For each milestone, create 3-8 specific, actionable tasks. Each task should be:
- Concrete and actionable
- 30-240 minutes in duration (no longer)
- Clearly defined with measurable output

Consider task properties:
- cognitiveLoad: "high" (deep focus), "medium" (moderate attention), "low" (routine)
- flexibility: "high" (can do anytime), "medium" (preferred time), "low" (must be specific time)
- preferredTimeOfDay: "morning" (high energy), "afternoon" (steady focus), "evening" (light work)
- canSplit: true (can break into sessions) or false (must complete in one go)

Respond with a JSON array:
[
  {
    "title": "Task name",
    "description": "What to do",
    "durationMinutes": number (30-240),
    "milestoneId": "milestone ID this belongs to",
    "dependencies": [array of task titles that must complete first],
    "category": "${goalCategory}",
    "priority": number (1-5, where 5 is highest),
    "flexibility": "high" | "medium" | "low",
    "cognitiveLoad": "high" | "medium" | "low",
    "preferredTimeOfDay": "morning" | "afternoon" | "evening",
    "canSplit": boolean
  }
]

Respond with ONLY valid JSON, no other text.`;

      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query: tasksPrompt,
          knowledge_base_id: null,
        },
      });

      if (error) throw error;

      const jsonMatch = data.response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid tasks response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const createdTasks: TaskItem[] = parsed.map((t: any, index: number) => ({
        id: `task-${index}`,
        title: t.title,
        description: t.description,
        durationMinutes: t.durationMinutes,
        milestoneId: t.milestoneId,
        dependencies: t.dependencies || [],
        category: t.category || goalCategory,
        priority: t.priority || 3,
        flexibility: t.flexibility || 'medium',
        cognitiveLoad: t.cognitiveLoad || 'medium',
        preferredTimeOfDay: t.preferredTimeOfDay,
        canSplit: t.canSplit !== false,
      }));

      setTasks(createdTasks);
      return createdTasks;
    } catch (error) {
      console.error('Task generation error:', error);
      toast({
        title: 'Task generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate tasks',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  /**
   * Step 4: Intelligent scheduling of tasks into timeline
   */
  const intelligentScheduling = useCallback(async (
    tasks: TaskItem[],
    constraints: SchedulingConstraints,
    meTimelineId: string
  ): Promise<ScheduledTask[]> => {
    if (!user) return [];

    setLoading(true);

    try {
      // Sort tasks by priority and dependencies
      const sortedTasks = topologicalSort(tasks);

      const scheduled: ScheduledTask[] = [];
      const startDate = new Date();

      // Energy levels by time of day
      const energyMap = {
        morning: { start: constraints.workHoursStart, end: constraints.workHoursStart + 4 },
        afternoon: { start: constraints.workHoursStart + 4, end: constraints.workHoursEnd - 2 },
        evening: { start: constraints.workHoursEnd - 2, end: constraints.workHoursEnd },
      };

      for (const task of sortedTasks) {
        // Check dependencies are scheduled
        const dependenciesMet = task.dependencies.every(depTitle =>
          scheduled.some(s => s.title === depTitle)
        );

        if (!dependenciesMet) {
          console.warn(`Skipping task ${task.title} - dependencies not met`);
          continue;
        }

        // Find next available slot respecting constraints
        const slot = findOptimalTimeSlot({
          task,
          startDate,
          constraints,
          existingScheduled: scheduled,
          energyMap,
        });

        if (slot) {
          scheduled.push({
            ...task,
            scheduledDate: slot.date,
            scheduledTime: slot.time,
            layerId: meTimelineId,
          });
        }
      }

      setScheduledTasks(scheduled);

      // Log scheduling session
      await supabase.from('timeline_ai_sessions').insert({
        user_id: user.id,
        session_type: 'plan',
        input_prompt: `Scheduled ${tasks.length} tasks`,
        ai_response: `Successfully scheduled ${scheduled.length} tasks`,
        items_created: scheduled.length,
        success: true,
      });

      return scheduled;
    } catch (error) {
      console.error('Scheduling error:', error);
      toast({
        title: 'Scheduling failed',
        description: error instanceof Error ? error.message : 'Failed to schedule tasks',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  /**
   * Save the complete goal plan to database
   */
  const saveGoalPlan = useCallback(async (
    analysis: GoalAnalysis,
    milestones: Milestone[],
    scheduledTasks: ScheduledTask[]
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      // Create goal record
      const { data: goal, error: goalError } = await supabase
        .from('timeline_goals')
        .insert({
          user_id: user.id,
          title: analysis.interpretedGoal,
          description: analysis.rationale,
          target_date: analysis.targetDate,
          priority: analysis.suggestedPriority,
          status: 'active',
          category: analysis.category,
          estimated_hours: analysis.estimatedHours,
        })
        .select()
        .single();

      if (goalError) throw goalError;

      // Create timeline items for each scheduled task
      const items = await Promise.all(
        scheduledTasks.map(async (task) => {
          const startDateTime = new Date(`${task.scheduledDate}T${task.scheduledTime}`);

          const { data: item, error } = await supabase
            .from('timeline_items')
            .insert({
              user_id: user.id,
              layer_id: task.layerId,
              title: task.title,
              start_time: startDateTime.toISOString(),
              duration_minutes: task.durationMinutes,
              status: 'active',
              color: getCategoryColor(task.category),
              is_locked_time: task.flexibility === 'low',
              is_flexible: task.flexibility === 'high',
            })
            .select()
            .single();

          if (error) throw error;

          // Link item to goal
          await supabase.from('timeline_goal_items').insert({
            goal_id: goal.id,
            item_id: item.id,
            contribution_hours: task.durationMinutes / 60,
          });

          return item;
        })
      );

      toast({
        title: 'Goal plan created!',
        description: `Created ${items.length} tasks for "${analysis.interpretedGoal}"`,
      });

      return goal.id;
    } catch (error) {
      console.error('Save goal plan error:', error);
      toast({
        title: 'Failed to save plan',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  return {
    loading,
    analysis,
    milestones,
    tasks,
    scheduledTasks,
    analyzeGoal,
    createMilestones,
    generateTasks,
    intelligentScheduling,
    saveGoalPlan,
  };
}

// Helper: Topological sort for task dependencies
function topologicalSort(tasks: TaskItem[]): TaskItem[] {
  const sorted: TaskItem[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(task: TaskItem) {
    if (visited.has(task.id)) return;
    if (visiting.has(task.id)) {
      console.warn('Circular dependency detected');
      return;
    }

    visiting.add(task.id);

    // Visit dependencies first
    task.dependencies.forEach(depTitle => {
      const depTask = tasks.find(t => t.title === depTitle);
      if (depTask) visit(depTask);
    });

    visiting.delete(task.id);
    visited.add(task.id);
    sorted.push(task);
  }

  tasks.forEach(visit);
  return sorted;
}

// Helper: Find optimal time slot for a task
function findOptimalTimeSlot(options: {
  task: TaskItem;
  startDate: Date;
  constraints: SchedulingConstraints;
  existingScheduled: ScheduledTask[];
  energyMap: Record<string, { start: number; end: number }>;
}): { date: string; time: string } | null {
  const { task, startDate, constraints, existingScheduled, energyMap } = options;

  // Determine preferred time range based on cognitive load
  let preferredHours: number[];
  if (task.cognitiveLoad === 'high') {
    // High cognitive load -> morning
    preferredHours = Array.from(
      { length: energyMap.morning.end - energyMap.morning.start },
      (_, i) => energyMap.morning.start + i
    );
  } else if (task.preferredTimeOfDay) {
    const range = energyMap[task.preferredTimeOfDay];
    preferredHours = Array.from({ length: range.end - range.start }, (_, i) => range.start + i);
  } else {
    // Any work hours
    preferredHours = Array.from(
      { length: constraints.workHoursEnd - constraints.workHoursStart },
      (_, i) => constraints.workHoursStart + i
    );
  }

  // Try to schedule in the next 30 days
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + dayOffset);

    // Skip non-work days if specified
    if (
      constraints.preferredWorkDays.length > 0 &&
      !constraints.preferredWorkDays.includes(currentDate.getDay())
    ) {
      continue;
    }

    const dateStr = currentDate.toISOString().split('T')[0];

    // Try each preferred hour
    for (const hour of preferredHours) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00:00`;
      const slotStart = new Date(`${dateStr}T${timeStr}`);
      const slotEnd = new Date(slotStart.getTime() + task.durationMinutes * 60 * 1000);

      // Check if slot is free
      const hasConflict = existingScheduled.some(scheduled => {
        const scheduledStart = new Date(`${scheduled.scheduledDate}T${scheduled.scheduledTime}`);
        const scheduledEnd = new Date(
          scheduledStart.getTime() + scheduled.durationMinutes * 60 * 1000
        );

        return (
          (slotStart >= scheduledStart && slotStart < scheduledEnd) ||
          (slotEnd > scheduledStart && slotEnd <= scheduledEnd) ||
          (slotStart <= scheduledStart && slotEnd >= scheduledEnd)
        );
      });

      if (!hasConflict) {
        return { date: dateStr, time: timeStr };
      }
    }
  }

  // No slot found
  console.warn(`Could not find slot for task: ${task.title}`);
  return null;
}

// Helper: Get color for category
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    work: '#3b82f6',
    personal: '#8b5cf6',
    health: '#dc2626',
    learning: '#059669',
    social: '#ec4899',
  };
  return colors[category] || '#64748b';
}
