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
} from '@/lib/timelineUtils';
import {
  DEFAULT_PIXELS_PER_HOUR,
  DEFAULT_LAYER_HEIGHT,
  AUTO_SCROLL_SPEED,
} from '@/lib/timelineConstants';

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
    color: string
  ) => {
    if (!user) return;

    try {
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
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, data]);
      toast({
        title: 'Item added',
        description: `"${title}" has been added to the timeline`,
      });

      return data;
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add timeline item',
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

      setItems(items.map(item => item.id === itemId ? { ...item, ...updates } : item));
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
  const rescheduleItem = async (itemId: string, newStartTime: string) => {
    await updateItem(itemId, {
      start_time: newStartTime,
      status: 'active',
    });

    toast({
      title: 'Item rescheduled',
      description: 'Item has been moved to a new time',
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

      setItems(items.filter(i => i.id !== itemId));
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

      setParkedItems(parkedItems.filter(p => p.id !== parkedItemId));
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

      setItems(items.filter(i => i.id !== itemId));
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

  // Auto-scroll in locked mode
  const tick = useCallback(() => {
    if (!settings?.is_locked) return;

    const now = Date.now();
    const deltaTime = (now - lastTickRef.current) / 1000; // seconds
    lastTickRef.current = now;

    // Update NOW time
    setNowTime(new Date());

    // Auto-scroll left (simulating time passing)
    setScrollOffset(prev => prev - AUTO_SCROLL_SPEED * deltaTime);

    // Check for logjammed items
    setItems(prevItems =>
      prevItems.map(item => {
        if (shouldBeLogjammed(item, new Date()) && item.status === 'active') {
          // Update in database
          supabase
            .from('timeline_items')
            .update({ status: 'logjam' })
            .eq('id', item.id);

          return { ...item, status: 'logjam' as const };
        }
        return item;
      })
    );

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [settings?.is_locked]);

  // Start/stop animation loop
  useEffect(() => {
    if (settings?.is_locked) {
      lastTickRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [settings?.is_locked, tick]);

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
    updateSettings,
    refetchItems: fetchItems,
    refetchParkedItems: fetchParkedItems,
  };
}
