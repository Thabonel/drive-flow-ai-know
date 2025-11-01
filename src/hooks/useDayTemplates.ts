import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TemplateBlock {
  start_time: string; // HH:MM format
  duration_minutes: number;
  title: string;
  type: 'work' | 'meeting' | 'break' | 'personal';
  color: string;
  is_flexible: boolean;
}

export interface DayTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  is_default: boolean;
  is_system: boolean;
  template_blocks: TemplateBlock[];
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useDayTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all templates (system + user's own)
  const fetchTemplates = async () => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('day_templates')
        .select('*')
        .order('is_system', { ascending: false }) // System templates first
        .order('usage_count', { ascending: false }); // Then by usage

      if (fetchError) throw fetchError;

      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, [user?.id]);

  // Create a new user template
  const createTemplate = async (
    name: string,
    description: string | null,
    templateBlocks: TemplateBlock[],
    isDefault: boolean = false
  ): Promise<DayTemplate | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);

      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase
          .from('day_templates')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }

      const { data, error: createError } = await supabase
        .from('day_templates')
        .insert({
          user_id: user.id,
          name,
          description,
          template_blocks: templateBlocks,
          is_default: isDefault,
          is_system: false,
        })
        .select()
        .single();

      if (createError) throw createError;

      if (data) {
        setTemplates((prev) => [data, ...prev]);
      }

      return data;
    } catch (err) {
      console.error('Error creating template:', err);
      setError(err instanceof Error ? err.message : 'Failed to create template');
      return null;
    }
  };

  // Update an existing user template
  const updateTemplate = async (
    templateId: string,
    updates: {
      name?: string;
      description?: string | null;
      template_blocks?: TemplateBlock[];
      is_default?: boolean;
    }
  ): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);

      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('day_templates')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true)
          .neq('id', templateId);
      }

      const { error: updateError } = await supabase
        .from('day_templates')
        .update(updates)
        .eq('id', templateId)
        .eq('user_id', user.id); // Ensure user owns the template

      if (updateError) throw updateError;

      // Update local state
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, ...updates } : t))
      );

      return true;
    } catch (err) {
      console.error('Error updating template:', err);
      setError(err instanceof Error ? err.message : 'Failed to update template');
      return false;
    }
  };

  // Delete a user template
  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('day_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user.id); // Ensure user owns the template

      if (deleteError) throw deleteError;

      // Update local state
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));

      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    }
  };

  // Increment usage count and update last_used_at
  const recordTemplateUsage = async (templateId: string): Promise<void> => {
    try {
      const { error: usageError } = await supabase
        .from('day_templates')
        .update({
          usage_count: supabase.raw('usage_count + 1') as any,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      if (usageError) throw usageError;

      // Update local state
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? {
                ...t,
                usage_count: t.usage_count + 1,
                last_used_at: new Date().toISOString(),
              }
            : t
        )
      );
    } catch (err) {
      console.error('Error recording template usage:', err);
      // Don't throw - usage tracking is not critical
    }
  };

  // Get system templates
  const getSystemTemplates = (): DayTemplate[] => {
    return templates.filter((t) => t.is_system);
  };

  // Get user templates
  const getUserTemplates = (): DayTemplate[] => {
    return templates.filter((t) => !t.is_system);
  };

  // Get default template (if any)
  const getDefaultTemplate = (): DayTemplate | null => {
    return templates.find((t) => !t.is_system && t.is_default) || null;
  };

  return {
    templates,
    systemTemplates: getSystemTemplates(),
    userTemplates: getUserTemplates(),
    defaultTemplate: getDefaultTemplate(),
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    recordTemplateUsage,
    refetch: fetchTemplates,
  };
};
