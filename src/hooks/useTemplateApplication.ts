import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { DayTemplate, TemplateBlock } from './useDayTemplates';
import { TimelineItem } from '@/lib/timelineUtils';
import { format, parse, startOfDay, isWithinInterval, endOfDay } from 'date-fns';

interface ApplyTemplateOptions {
  targetDate: Date;
  layerId?: string; // Optional: apply to specific layer
  clearExisting?: boolean; // Remove existing items for that day
  skipMeetings?: boolean; // Don't clear existing meetings
  adjustForConflicts?: boolean; // Automatically adjust times if conflicts exist
}

export const useTemplateApplication = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applying, setApplying] = useState(false);

  // Convert template time (HH:MM) to full ISO timestamp for target date
  const convertTemplateTimeToISO = (templateTime: string, targetDate: Date): string => {
    const [hours, minutes] = templateTime.split(':').map(Number);
    const result = new Date(targetDate);
    result.setHours(hours, minutes, 0, 0);
    return result.toISOString();
  };

  // Get existing items for a specific day
  const getExistingItemsForDay = async (targetDate: Date): Promise<TimelineItem[]> => {
    if (!user) return [];

    try {
      const dayStart = startOfDay(targetDate);
      const dayEnd = endOfDay(targetDate);

      const { data, error } = await supabase
        .from('timeline_items')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .neq('status', 'parked');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching existing items:', error);
      return [];
    }
  };

  // Clear existing items for the day
  const clearDayItems = async (
    targetDate: Date,
    skipMeetings: boolean = true
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const dayStart = startOfDay(targetDate);
      const dayEnd = endOfDay(targetDate);

      let query = supabase
        .from('timeline_items')
        .delete()
        .eq('user_id', user.id)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .neq('status', 'completed'); // Don't delete completed items

      // Optionally skip meetings
      if (skipMeetings) {
        query = query.neq('is_meeting', true);
      }

      const { error } = await query;

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing day items:', error);
      return false;
    }
  };

  // Apply template to timeline
  const applyTemplate = async (
    template: DayTemplate,
    options: ApplyTemplateOptions
  ): Promise<{ success: boolean; itemsCreated: number }> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return { success: false, itemsCreated: 0 };
    }

    setApplying(true);

    try {
      // Step 1: Get existing items if needed
      const existingItems = options.adjustForConflicts || options.clearExisting
        ? await getExistingItemsForDay(options.targetDate)
        : [];

      // Step 2: Clear day if requested
      if (options.clearExisting) {
        const cleared = await clearDayItems(options.targetDate, options.skipMeetings);
        if (!cleared) {
          throw new Error('Failed to clear existing items');
        }
      }

      // Step 3: Get default layer if not specified
      let targetLayerId = options.layerId;
      if (!targetLayerId) {
        const { data: layers, error: layersError } = await supabase
          .from('timeline_layers')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_visible', true)
          .order('sort_order', { ascending: true })
          .limit(1);

        if (layersError) throw layersError;

        if (!layers || layers.length === 0) {
          throw new Error('No visible layers found. Please create a layer first.');
        }

        targetLayerId = layers[0].id;
      }

      // Step 4: Create timeline items from template blocks
      const itemsToCreate = template.template_blocks.map((block) => ({
        user_id: user.id,
        layer_id: targetLayerId!,
        title: block.title,
        start_time: convertTemplateTimeToISO(block.start_time, options.targetDate),
        duration_minutes: block.duration_minutes,
        planned_duration_minutes: block.duration_minutes,
        color: block.color,
        status: 'active' as const,
        is_meeting: block.type === 'meeting',
        is_flexible: block.is_flexible,
      }));

      // Insert all items at once
      const { data: createdItems, error: insertError } = await supabase
        .from('timeline_items')
        .insert(itemsToCreate)
        .select();

      if (insertError) throw insertError;

      // Step 5: Record template usage
      await supabase
        .from('day_templates')
        .update({
          usage_count: (template.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', template.id);

      toast({
        title: 'Template applied',
        description: `Created ${createdItems?.length || 0} items from "${template.name}" for ${format(options.targetDate, 'MMMM d, yyyy')}`,
      });

      return {
        success: true,
        itemsCreated: createdItems?.length || 0,
      };
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply template',
        variant: 'destructive',
      });
      return { success: false, itemsCreated: 0 };
    } finally {
      setApplying(false);
    }
  };

  // Quick apply with defaults (merge with existing items)
  const quickApply = async (
    template: DayTemplate,
    targetDate: Date
  ): Promise<boolean> => {
    const result = await applyTemplate(template, {
      targetDate,
      clearExisting: false,
      skipMeetings: true,
      adjustForConflicts: false,
    });
    return result.success;
  };

  // Apply and clear (replace all items for the day)
  const applyAndClear = async (
    template: DayTemplate,
    targetDate: Date,
    skipMeetings: boolean = true
  ): Promise<boolean> => {
    const result = await applyTemplate(template, {
      targetDate,
      clearExisting: true,
      skipMeetings,
      adjustForConflicts: false,
    });
    return result.success;
  };

  return {
    applyTemplate,
    quickApply,
    applyAndClear,
    applying,
  };
};
