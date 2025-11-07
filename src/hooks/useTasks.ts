import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number; // Every N days/weeks/months
  daysOfWeek?: number[]; // For weekly: 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number; // For monthly: 1-31
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  planned_duration_minutes: number;
  priority: number;
  color: string;
  tags: string[];
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_end_date: string | null;
  parent_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Track intentionally deleted tasks to prevent race conditions with real-time subscription
  const intentionallyDeletedTaskIds = useRef<Set<string>>(new Set());

  // Fetch tasks
  const fetchTasks = async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Skip refetch if this is an intentional deletion (from drag-and-drop)
          if (payload.eventType === 'DELETE' && payload.old?.id) {
            if (intentionallyDeletedTaskIds.current.has(payload.old.id)) {
              console.log('Skipping refetch for intentionally deleted task:', payload.old.id);
              return;
            }
          }
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Add task
  const addTask = async (
    title: string,
    plannedDurationMinutes: number = 30,
    options?: {
      description?: string;
      priority?: number;
      color?: string;
      tags?: string[];
      isRecurring?: boolean;
      recurrencePattern?: RecurrencePattern;
      recurrenceEndDate?: string;
    }
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title,
          planned_duration_minutes: plannedDurationMinutes,
          description: options?.description,
          priority: options?.priority ?? 0,
          color: options?.color ?? '#3b82f6',
          tags: options?.tags ?? [],
          is_recurring: options?.isRecurring ?? false,
          recurrence_pattern: options?.recurrencePattern ?? null,
          recurrence_end_date: options?.recurrenceEndDate ?? null,
          parent_task_id: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding task:', error);
        throw new Error(error.message || 'Failed to add task');
      }

      if (!data) {
        throw new Error('No data returned from task creation');
      }

      setTasks((prev) => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  // Update task
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  // Delete task
  const deleteTask = async (taskId: string, markAsIntentional: boolean = false) => {
    try {
      // If this is an intentional deletion (e.g., from drag-and-drop),
      // mark it to prevent race condition with real-time subscription
      if (markAsIntentional) {
        intentionallyDeletedTaskIds.current.add(taskId);
        console.log('Marking task as intentionally deleted:', taskId);

        // Clear the tracking after 2 seconds to prevent memory leaks
        setTimeout(() => {
          intentionallyDeletedTaskIds.current.delete(taskId);
          console.log('Cleared intentional deletion tracking for task:', taskId);
        }, 2000);
      }

      // Optimistically update UI immediately
      setTasks((prev) => prev.filter((task) => task.id !== taskId));

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting task:', error);
      // On error, refetch to restore correct state
      if (markAsIntentional) {
        intentionallyDeletedTaskIds.current.delete(taskId);
      }
      fetchTasks();
      throw error;
    }
  };

  // Reorder tasks (update priority)
  const reorderTasks = async (taskId: string, newPriority: number) => {
    await updateTask(taskId, { priority: newPriority });
  };

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    refetch: fetchTasks,
  };
};
