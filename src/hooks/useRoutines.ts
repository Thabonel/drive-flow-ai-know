import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { format, parse, startOfDay, endOfDay, getDay } from 'date-fns';

export type RoutineType =
  | 'lunch'
  | 'exercise'
  | 'commute'
  | 'break'
  | 'personal'
  | 'morning_routine'
  | 'evening_routine';

export interface RoutineItem {
  id: string;
  user_id: string;
  title: string;
  type: RoutineType;
  default_time: string; // HH:MM
  duration_minutes: number;
  days_of_week: number[]; // 0=Sunday, 6=Saturday
  is_flexible: boolean;
  auto_add: boolean;
  color: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

export const useRoutines = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all routines for the user
  const fetchRoutines = async () => {
    if (!user) {
      setRoutines([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('routine_items')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false }); // Higher priority first

      if (fetchError) throw fetchError;

      setRoutines(data || []);
    } catch (err) {
      console.error('Error fetching routines:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch routines';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create default routines for a new user
  const createDefaultRoutines = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('create_default_routines_for_user', {
        target_user_id: user.id,
      });

      if (error) throw error;

      if (data > 0) {
        toast({
          title: 'Default routines created',
          description: `Added ${data} helpful routines to get you started`,
        });
        await fetchRoutines();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error creating default routines:', err);
      toast({
        title: 'Error',
        description: 'Failed to create default routines',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Create a new routine
  const createRoutine = async (
    routine: Omit<RoutineItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<RoutineItem | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('routine_items')
        .insert({
          user_id: user.id,
          ...routine,
        })
        .select()
        .single();

      if (error) throw error;

      setRoutines((prev) => [...prev, data]);
      toast({
        title: 'Routine created',
        description: `"${routine.title}" has been added`,
      });

      return data;
    } catch (err) {
      console.error('Error creating routine:', err);
      toast({
        title: 'Error',
        description: 'Failed to create routine',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update a routine
  const updateRoutine = async (
    routineId: string,
    updates: Partial<Omit<RoutineItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('routine_items')
        .update(updates)
        .eq('id', routineId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setRoutines((prev) =>
        prev.map((r) => (r.id === routineId ? { ...r, ...updates } : r))
      );

      return true;
    } catch (err) {
      console.error('Error updating routine:', err);
      toast({
        title: 'Error',
        description: 'Failed to update routine',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Delete a routine
  const deleteRoutine = async (routineId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('routine_items')
        .delete()
        .eq('id', routineId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
      toast({
        title: 'Routine deleted',
        description: 'Routine has been removed',
      });

      return true;
    } catch (err) {
      console.error('Error deleting routine:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete routine',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Toggle auto_add for a routine
  const toggleAutoAdd = async (routineId: string): Promise<boolean> => {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return false;

    return await updateRoutine(routineId, { auto_add: !routine.auto_add });
  };

  // Get routines for a specific day
  const getRoutinesForDay = (targetDate: Date): RoutineItem[] => {
    const dayOfWeek = getDay(targetDate); // 0=Sunday, 6=Saturday

    return routines.filter((routine) => {
      // Check if this routine is scheduled for this day
      return routine.auto_add && routine.days_of_week.includes(dayOfWeek);
    });
  };

  // Check if a routine already exists on the timeline for a specific day
  const checkIfRoutineExists = async (
    routineId: string,
    targetDate: Date
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const dayStart = startOfDay(targetDate);
      const dayEnd = endOfDay(targetDate);

      const { data, error } = await supabase
        .from('timeline_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('routine_id', routineId)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .limit(1);

      if (error) throw error;

      return (data?.length || 0) > 0;
    } catch (err) {
      console.error('Error checking routine existence:', err);
      return false;
    }
  };

  // Auto-populate routines for a specific day
  const populateRoutinesForDay = async (
    targetDate: Date,
    layerId?: string
  ): Promise<number> => {
    if (!user) return 0;

    const routinesToAdd = getRoutinesForDay(targetDate);
    let addedCount = 0;

    // Get default layer if not provided
    let targetLayerId = layerId;
    if (!targetLayerId) {
      const { data: layers } = await supabase
        .from('timeline_layers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })
        .limit(1);

      if (!layers || layers.length === 0) {
        console.warn('No visible layers found');
        return 0;
      }

      targetLayerId = layers[0].id;
    }

    for (const routine of routinesToAdd) {
      // Check if already exists
      const exists = await checkIfRoutineExists(routine.id, targetDate);
      if (exists) continue;

      // Create timeline item from routine
      const startTime = parse(routine.default_time, 'HH:mm', targetDate);

      try {
        const { error } = await supabase
          .from('timeline_items')
          .insert({
            user_id: user.id,
            layer_id: targetLayerId,
            title: routine.title,
            start_time: startTime.toISOString(),
            duration_minutes: routine.duration_minutes,
            planned_duration_minutes: routine.duration_minutes,
            color: routine.color,
            status: 'active',
            is_flexible: routine.is_flexible,
            routine_id: routine.id, // Link to routine
          });

        if (error) throw error;
        addedCount++;
      } catch (err) {
        console.error(`Error adding routine "${routine.title}":`, err);
      }
    }

    if (addedCount > 0) {
      toast({
        title: 'Routines added',
        description: `Added ${addedCount} routine${addedCount > 1 ? 's' : ''} to your timeline`,
      });
    }

    return addedCount;
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchRoutines();
    }
  }, [user?.id]);

  return {
    routines,
    loading,
    error,
    fetchRoutines,
    createDefaultRoutines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    toggleAutoAdd,
    getRoutinesForDay,
    populateRoutinesForDay,
  };
};
