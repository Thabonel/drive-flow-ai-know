// Hook for managing routine templates and daily pattern instantiation

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface RoutineTemplate {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  duration_minutes: number;
  default_start_time: string | null;
  color: string;
  icon: string | null;
  is_locked_time: boolean | null;
  is_flexible: boolean | null;
  is_system_default: boolean | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Default routine templates
const DEFAULT_ROUTINES = [
  {
    category: 'rest' as const,
    name: 'Sleep',
    duration_minutes: 480, // 8 hours
    default_start_time: '00:00:00',
    color: '#6366f1', // Indigo
    icon: '🌙',
    is_locked_time: false,
    is_flexible: false,
    is_system_default: true,
    description: 'Your nightly sleep routine',
  },
  {
    category: 'personal' as const,
    name: 'Morning Routine',
    duration_minutes: 60, // 1 hour
    default_start_time: '08:00:00',
    color: '#f59e0b', // Amber
    icon: '☀️',
    is_locked_time: false,
    is_flexible: true,
    is_system_default: true,
    description: 'Getting ready for the day',
  },
  {
    category: 'work' as const,
    name: 'Daily Routine',
    duration_minutes: 480, // 8 hours
    default_start_time: '09:00:00',
    color: '#3b82f6', // Blue
    icon: '💼',
    is_locked_time: false,
    is_flexible: true,
    is_system_default: true,
    description: 'Main activities of the day',
  },
  {
    category: 'personal' as const,
    name: 'Evening Routine',
    duration_minutes: 420, // 7 hours
    default_start_time: '17:00:00',
    color: '#10b981', // Green
    icon: '🌆',
    is_locked_time: false,
    is_flexible: true,
    is_system_default: true,
    description: 'Winding down and relaxation',
  },
];

export function useRoutineTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [routineTemplates, setRoutineTemplates] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch routine templates
  const fetchRoutineTemplates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('timeline_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_system_default', true)
        .order('default_start_time', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Initialize with default routines
        await initializeDefaultRoutines();
      } else {
        setRoutineTemplates(data as RoutineTemplate[]);
      }
    } catch (error) {
      console.error('Error fetching routine templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch routine templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize default routine templates for new user
  const initializeDefaultRoutines = async () => {
    if (!user) return;

    try {
      const templatesWithUser = DEFAULT_ROUTINES.map(template => ({
        ...template,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('timeline_templates')
        .insert(templatesWithUser)
        .select();

      if (error) throw error;

      setRoutineTemplates(data as RoutineTemplate[]);
    } catch (error) {
      console.error('Error initializing routine templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize routine templates',
        variant: 'destructive',
      });
    }
  };

  // Update routine template duration
  const updateRoutineTemplateDuration = async (templateId: string, newDuration: number) => {
    try {
      const { error } = await supabase
        .from('timeline_templates')
        .update({ duration_minutes: newDuration })
        .eq('id', templateId);

      if (error) throw error;

      setRoutineTemplates(templates =>
        templates.map(t => (t.id === templateId ? { ...t, duration_minutes: newDuration } : t))
      );

      return true;
    } catch (error) {
      console.error('Error updating routine template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update routine template',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Get template by name
  const getTemplateByName = (name: string): RoutineTemplate | undefined => {
    return routineTemplates.find(t => t.name === name);
  };

  // Check if a date has routine items instantiated
  const hasRoutineItemsForDate = async (date: Date, layerId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('timeline_items')
        .select('id, template_id')
        .eq('user_id', user.id)
        .eq('layer_id', layerId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .not('template_id', 'is', null);

      if (error) throw error;

      // Check if we have items for all 4 routine categories
      const templateIds = new Set((data || []).map(item => item.template_id));
      return templateIds.size >= 4;
    } catch (error) {
      console.error('Error checking routine items:', error);
      return false;
    }
  };

  // Instantiate routine templates as timeline items for a specific date
  const instantiateRoutinesForDate = async (date: Date, layerId: string) => {
    if (!user || routineTemplates.length === 0) return;

    try {
      const items = routineTemplates.map(template => {
        const itemDate = new Date(date);
        const [hours, minutes] = (template.default_start_time || '00:00:00').split(':');
        itemDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        return {
          user_id: user.id,
          layer_id: layerId,
          title: template.name,
          start_time: itemDate.toISOString(),
          duration_minutes: template.duration_minutes,
          color: template.color,
          status: 'active',
          template_id: template.id,
          is_locked_time: template.is_locked_time || false,
          is_flexible: template.is_flexible || true,
        };
      });

      const { data, error } = await supabase
        .from('timeline_items')
        .insert(items)
        .select();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error instantiating routines:', error);
      toast({
        title: 'Error',
        description: 'Failed to create routine items',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchRoutineTemplates();
  }, [user]);

  return {
    routineTemplates,
    loading,
    updateRoutineTemplateDuration,
    getTemplateByName,
    hasRoutineItemsForDate,
    instantiateRoutinesForDate,
    refetch: fetchRoutineTemplates,
  };
}
