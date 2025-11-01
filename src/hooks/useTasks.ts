import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  planned_duration_minutes: number;
  priority: number;
  color: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Add task
  const addTask = async (
    title: string,
    plannedDurationMinutes: number = 30,
    options?: {
      description?: string;
      priority?: number;
      color?: string;
      tags?: string[];
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
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTasks((prev) => [data, ...prev]);
      }
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
  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
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
