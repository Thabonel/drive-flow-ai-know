// Main hook for timeline state management

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  TimelineItem,
  TimelineSettings,
  ParkedItem,
  shouldBeLogjammed,
  shouldBeArchived,
  shouldBeAutoPark,
} from '@/lib/timelineUtils';

export function useTimeline() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<TimelineItem[]>([]);
  const [settings, setSettings] = useState<TimelineSettings | null>(null);
  const [parkedItems, setParkedItems] = useState<ParkedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTime, setNowTime] = useState(new Date());
  const [scrollOffset, setScrollOffset] = useState(0);

  const animationFrameRef = useRef<number>();
  const lastTickRef = useRef<number>(Date.now());

  // Fetch timeline items
  const fetchItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('timeline_items')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'parked')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching timeline items:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch timeline items',
        variant: 'destructive',
      });
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('timeline_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('timeline_settings')
          .insert({
            user_id: user.id,
            zoom_horizontal: 100,
            zoom_vertical: 80,
            is_locked: true,
            show_completed: true,
            auto_archive_hours: 24,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch timeline settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch parked items
  const fetchParkedItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('timeline_parked_items')
        .select('*')
        .eq('user_id', user.id)
        .order('parked_at', { ascending: false });

      if (error) throw error;
      setParkedItems(data || []);
    } catch (error) {
      console.error('Error fetching parked items:', error);
    }
  };

  // Add a new item
  const addItem = async (
    layerId: string,
    title: string,
    startTime: string,
    durationMinutes: number,
    color: string,
    options?: {
      team_id?: string | null;
      visibility?: 'personal' | 'team' | 'assigned';
      assigned_to?: string | null;
      assigned_by?: string | null;
      recurring_series_id?: string | null;
      occurrence_index?: number | null;
    }
  ) => {
    if (!user) return;

    try {
      console.log('Adding timeline item:', {
        user_id: user.id,
        layer_id: layerId,
        title,
        start_time: startTime,
        duration_minutes: durationMinutes,
        ...options,
      });

      const { data, error } = await supabase
        .from('timeline_items')
        .insert({
          user_id: user.id,
          layer_id: layerId,
          title,
          start_time: startTime,
          duration_minutes: durationMinutes,
          status: 'active',
          color,
          is_meeting: false,
          is_flexible: true,
          sync_status: 'local_only',
          sync_source: 'local',
          team_id: options?.team_id,
          visibility: options?.visibility || 'personal',
          assigned_to: options?.assigned_to,
          assigned_by: options?.assigned_by,
          recurring_series_id: options?.recurring_series_id,
          occurrence_index: options?.occurrence_index,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      // Use functional form to avoid stale closure issues
      setItems(prevItems => [...prevItems, data]);
      toast({
        title: 'Item added',
        description: `"${title}" has been added to the timeline`,
      });

      return data;
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add timeline item',
        variant: 'destructive',
      });
    }
  };

  // Update an item
  const updateItem = async (itemId: string, updates: Partial<TimelineItem>) => {
    try {
      const { error } = await supabase
        .from('timeline_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      // Use functional form to avoid stale closure issues
      setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, ...updates } : item));
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update timeline item',
        variant: 'destructive',
      });
    }
  };

  // Mark item as completed
  const completeItem = async (itemId: string) => {
    await updateItem(itemId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    toast({
      title: 'Item completed',
      description: 'Item marked as done',
    });
  };

  // Reschedule an item
  const rescheduleItem = async (itemId: string, newStartTime: string, newLayerId?: string) => {
    const updates: Partial<TimelineItem> = {
      start_time: newStartTime,
      status: 'active',
    };

    if (newLayerId) {
      updates.layer_id = newLayerId;
    }

    await updateItem(itemId, updates);

    toast({
      title: 'Item rescheduled',
      description: newLayerId ? 'Item has been moved to a new time and layer' : 'Item has been moved to a new time',
    });
  };

  // Park an item
  const parkItem = async (itemId: string) => {
    if (!user) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    try {
      // Add to parked items
      const { error: parkError } = await supabase
        .from('timeline_parked_items')
        .insert({
          user_id: user.id,
          title: item.title,
          duration_minutes: item.duration_minutes,
          original_layer_id: item.layer_id,
          color: item.color,
        });

      if (parkError) throw parkError;

      // Delete from timeline items
      const { error: deleteError } = await supabase
        .from('timeline_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      // Use functional form to avoid stale closure issues
      setItems(prevItems => prevItems.filter(i => i.id !== itemId));
      await fetchParkedItems();

      toast({
        title: 'Item parked',
        description: 'Item has been saved for later',
      });
    } catch (error) {
      console.error('Error parking item:', error);
      toast({
        title: 'Error',
        description: 'Failed to park item',
        variant: 'destructive',
      });
    }
  };

  // Restore a parked item
  const restoreParkedItem = async (
    parkedItemId: string,
    layerId: string,
    startTime: string
  ) => {
    if (!user) return;

    const parkedItem = parkedItems.find(p => p.id === parkedItemId);
    if (!parkedItem) return;

    try {
      // Add back to timeline
      await addItem(
        layerId,
        parkedItem.title,
        startTime,
        parkedItem.duration_minutes,
        parkedItem.color
      );

      // Delete from parked items
      const { error } = await supabase
        .from('timeline_parked_items')
        .delete()
        .eq('id', parkedItemId);

      if (error) throw error;

      // Use functional form to avoid stale closure issues
      setParkedItems(prevParkedItems => prevParkedItems.filter(p => p.id !== parkedItemId));
    } catch (error) {
      console.error('Error restoring parked item:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore parked item',
        variant: 'destructive',
      });
    }
  };

  // Delete an item
  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('timeline_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Use functional form to avoid stale closure issues
      setItems(prevItems => prevItems.filter(i => i.id !== itemId));
      toast({
        title: 'Item deleted',
        description: 'Timeline item has been removed',
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  // Delete this and all following recurring items
  const deleteRecurringThisAndFollowing = async (item: TimelineItem) => {
    if (!item.recurring_series_id || item.occurrence_index === null) {
      // Not a recurring item, just delete it
      await deleteItem(item.id);
      return;
    }

    try {
      const { error } = await supabase
        .from('timeline_items')
        .delete()
        .eq('recurring_series_id', item.recurring_series_id)
        .gte('occurrence_index', item.occurrence_index);

      if (error) throw error;

      // Use functional form to avoid stale closure issues
      setItems(prevItems =>
        prevItems.filter(i =>
          !(i.recurring_series_id === item.recurring_series_id &&
            (i.occurrence_index ?? 0) >= (item.occurrence_index ?? 0))
        )
      );

      toast({
        title: 'Recurring items deleted',
        description: 'This and all following occurrences have been removed',
      });
    } catch (error) {
      console.error('Error deleting recurring items:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete recurring items',
        variant: 'destructive',
      });
    }
  };

  // Update this and all following recurring items
  const updateRecurringThisAndFollowing = async (item: TimelineItem, updates: Partial<TimelineItem>) => {
    if (!item.recurring_series_id || item.occurrence_index === null) {
      // Not a recurring item, just update it normally
      await updateItem(item.id, updates);
      return;
    }

    try {
      // Update all items in the series from this occurrence onward
      const { error } = await supabase
        .from('timeline_items')
        .update(updates)
        .eq('recurring_series_id', item.recurring_series_id)
        .gte('occurrence_index', item.occurrence_index);

      if (error) throw error;

      // Use functional form to avoid stale closure issues
      setItems(prevItems =>
        prevItems.map(i =>
          i.recurring_series_id === item.recurring_series_id &&
          (i.occurrence_index ?? 0) >= (item.occurrence_index ?? 0)
            ? { ...i, ...updates }
            : i
        )
      );

      toast({
        title: 'Recurring items updated',
        description: 'This and all following occurrences have been updated',
      });
    } catch (error) {
      console.error('Error updating recurring items:', error);
      toast({
        title: 'Error',
        description: 'Failed to update recurring items',
        variant: 'destructive',
      });
    }
  };

  // Delete a parked item
  const deleteParkedItem = async (parkedItemId: string) => {
    try {
      const { error } = await supabase
        .from('timeline_parked_items')
        .delete()
        .eq('id', parkedItemId);

      if (error) throw error;

      // Use functional form to avoid stale closure issues
      setParkedItems(prevParkedItems => prevParkedItems.filter(p => p.id !== parkedItemId));
      toast({
        title: 'Parked item deleted',
        description: 'Parked item has been removed',
      });
    } catch (error) {
      console.error('Error deleting parked item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete parked item',
        variant: 'destructive',
      });
    }
  };

  // Update settings
  const updateSettings = async (updates: Partial<TimelineSettings>) => {
    if (!user || !settings) return;

    try {
      const { error } = await supabase
        .from('timeline_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    }
  };

  // Animation tick - runs in both locked and unlocked mode
  const tick = useCallback(() => {
    const now = Date.now();
    lastTickRef.current = now;

    // Always update NOW time (in both locked and unlocked mode)
    setNowTime(new Date());

    const currentTime = new Date();

    // Check for logjammed items and auto-park items
    setItems(prevItems => {
      const updatedItems: TimelineItem[] = [];
      const itemsToAutoPark: TimelineItem[] = [];

      prevItems.forEach(item => {
        // Check if item should be auto-parked (8+ hours overdue)
        if (shouldBeAutoPark(item, currentTime)) {
          itemsToAutoPark.push(item);
          return; // Don't add to updatedItems - will be removed
        }

        // Check if item should be marked as logjam
        if (shouldBeLogjammed(item, currentTime) && item.status === 'active') {
          // Update in database
          supabase
            .from('timeline_items')
            .update({ status: 'logjam' })
            .eq('id', item.id);

          updatedItems.push({ ...item, status: 'logjam' as const });
        } else {
          updatedItems.push(item);
        }
      });

      // Auto-park items that are 8+ hours overdue
      if (itemsToAutoPark.length > 0 && user) {
        itemsToAutoPark.forEach(async (item) => {
          try {
            // Add to parked items
            await supabase
              .from('timeline_parked_items')
              .insert({
                user_id: user.id,
                title: item.title,
                duration_minutes: item.duration_minutes,
                original_layer_id: item.layer_id,
                color: item.color,
              });

            // Delete from timeline items
            await supabase
              .from('timeline_items')
              .delete()
              .eq('id', item.id);

            console.log(`Auto-parked item: ${item.title} (${item.id})`);
          } catch (error) {
            console.error('Error auto-parking item:', error);
          }
        });

        // Show toast notification
        toast({
          title: 'Items auto-parked',
          description: `${itemsToAutoPark.length} item${itemsToAutoPark.length > 1 ? 's' : ''} moved to Parked Items (8+ hours overdue)`,
        });

        // Refetch parked items after auto-parking
        fetchParkedItems();
      }

      return updatedItems;
    });

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [user]);

  // Start/stop animation loop (always runs, but behavior changes based on locked state)
  useEffect(() => {
    lastTickRef.current = Date.now();
    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [tick]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchItems();
      fetchSettings();
      fetchParkedItems();
    }
  }, [user]);

  return {
    items,
    settings,
    parkedItems,
    loading,
    nowTime,
    scrollOffset,
    setScrollOffset,
    addItem,
    updateItem,
    completeItem,
    rescheduleItem,
    parkItem,
    restoreParkedItem,
    deleteItem,
    deleteRecurringThisAndFollowing,
    updateRecurringThisAndFollowing,
    deleteParkedItem,
    updateSettings,
    refetchItems: fetchItems,
    refetchParkedItems: fetchParkedItems,
  };
}
