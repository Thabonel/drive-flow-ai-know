// Main hook for timeline state management

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  TimelineItem,
  TimelineSettings,
  ParkedItem,
  TimelineLayer,
  shouldBeLogjammed,
  shouldBeArchived,
} from '@/lib/timelineUtils';
import {
  applyMagneticReflow,
  getMinutesFromMidnight,
  createTimestampFromMinutes,
  MagneticTimelineItem,
} from '@/lib/magneticTimelineUtils';

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

  // Helper: Check if a layer is magnetic
  const isLayerMagnetic = async (layerId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('timeline_layers')
        .select('timeline_type')
        .eq('id', layerId)
        .single();

      if (error) throw error;
      return data?.timeline_type === 'magnetic';
    } catch (error) {
      console.error('Error checking layer type:', error);
      return false;
    }
  };

  // Helper: Apply magnetic reflow to items on a specific layer and date
  const applyMagneticReflowToLayer = async (layerId: string, date: Date) => {
    if (!user) return;

    try {
      // Get all items on this layer for this date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: layerItems, error } = await supabase
        .from('timeline_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('layer_id', layerId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .neq('status', 'parked');

      if (error) throw error;

      if (!layerItems || layerItems.length === 0) return;

      // Convert to MagneticTimelineItem format
      const magneticItems: MagneticTimelineItem[] = layerItems.map(item => ({
        ...item,
        is_locked_time: item.is_locked_time || false,
        is_flexible: item.is_flexible !== undefined ? item.is_flexible : true,
      }));

      // Apply magnetic reflow
      const reflowedItems = applyMagneticReflow(magneticItems);

      // Update all items in database
      for (const item of reflowedItems) {
        await supabase
          .from('timeline_items')
          .update({
            start_time: item.start_time,
            duration_minutes: item.duration_minutes,
            original_duration: item.original_duration,
          })
          .eq('id', item.id);
      }

      // Update local state
      setItems(prevItems =>
        prevItems.map(prevItem => {
          const reflowedItem = reflowedItems.find(r => r.id === prevItem.id);
          if (reflowedItem) {
            return {
              ...prevItem,
              start_time: reflowedItem.start_time,
              duration_minutes: reflowedItem.duration_minutes,
              original_duration: reflowedItem.original_duration,
            };
          }
          return prevItem;
        })
      );
    } catch (error) {
      console.error('Error applying magnetic reflow:', error);
    }
  };

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

    // Validate inputs before attempting database operation
    if (durationMinutes <= 0) {
      toast({
        title: 'Invalid Duration',
        description: 'Duration must be greater than 0 minutes',
        variant: 'destructive',
      });
      return;
    }

    if (!layerId || !title.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please provide both a title and select a layer',
        variant: 'destructive',
      });
      return;
    }

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

      // Apply magnetic reflow if on magnetic layer
      const isMagnetic = await isLayerMagnetic(layerId);
      if (isMagnetic) {
        const itemDate = new Date(startTime);
        await applyMagneticReflowToLayer(layerId, itemDate);
      }

      return data;
    } catch (error: any) {
      console.error('Error adding item:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error,
      });

      // Provide helpful error messages based on error type
      let errorMessage = 'Failed to add timeline item';
      if (error?.code === '23503') {
        errorMessage = 'Selected layer no longer exists. Please refresh and select a valid layer.';
      } else if (error?.code === '23514') {
        errorMessage = 'Invalid data provided. Check duration is positive and status is valid.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Update an item
  const updateItem = async (itemId: string, updates: Partial<TimelineItem>) => {
    // Validate duration if being updated
    if (updates.duration_minutes !== undefined && updates.duration_minutes <= 0) {
      toast({
        title: 'Invalid Duration',
        description: 'Duration must be greater than 0 minutes',
        variant: 'destructive',
      });
      return;
    }

    // Remove readonly fields that shouldn't be updated
    const { id, user_id, created_at, ...allowedUpdates } = updates as any;

    try {
      const { error } = await supabase
        .from('timeline_items')
        .update(allowedUpdates)
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.map(item => item.id === itemId ? { ...item, ...allowedUpdates } : item));

      // Apply magnetic reflow if on magnetic layer and start_time or duration changed
      const item = items.find(i => i.id === itemId);
      if (item && (allowedUpdates.start_time || allowedUpdates.duration_minutes)) {
        const isMagnetic = await isLayerMagnetic(item.layer_id);
        if (isMagnetic) {
          const itemDate = new Date(allowedUpdates.start_time || item.start_time);
          await applyMagneticReflowToLayer(item.layer_id, itemDate);
        }
      }
    } catch (error: any) {
      console.error('Error updating item:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error,
      });

      // Provide helpful error messages based on error type
      let errorMessage = 'Failed to update timeline item';
      if (error?.code === '23503') {
        errorMessage = 'Referenced layer no longer exists. Please select a valid layer.';
      } else if (error?.code === '23514') {
        errorMessage = 'Invalid data provided. Check duration is positive and status is valid.';
      } else if (error?.code === '42501') {
        errorMessage = 'Permission denied. You can only update your own items.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
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
    // Get item info before deleting (for reflow)
    const item = items.find(i => i.id === itemId);
    const itemLayerId = item?.layer_id;
    const itemDate = item ? new Date(item.start_time) : null;

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

      // Apply magnetic reflow if on magnetic layer
      if (itemLayerId && itemDate) {
        const isMagnetic = await isLayerMagnetic(itemLayerId);
        if (isMagnetic) {
          await applyMagneticReflowToLayer(itemLayerId, itemDate);
        }
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
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

      setParkedItems(parkedItems.filter(p => p.id !== parkedItemId));
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

  // Split an item at a specific time (blade tool)
  const splitItem = async (itemId: string, splitMinutesFromMidnight: number) => {
    if (!user) return;

    const itemToSplit = items.find(i => i.id === itemId);
    if (!itemToSplit) {
      toast({
        title: 'Error',
        description: 'Item not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      const itemStartMinutes = getMinutesFromMidnight(itemToSplit.start_time);
      const itemEndMinutes = itemStartMinutes + itemToSplit.duration_minutes;

      // Validate split is within item bounds
      if (splitMinutesFromMidnight <= itemStartMinutes || splitMinutesFromMidnight >= itemEndMinutes) {
        toast({
          title: 'Invalid split position',
          description: 'Split must be within the item boundaries',
          variant: 'destructive',
        });
        return;
      }

      // Calculate durations for both parts
      const firstPartDuration = splitMinutesFromMidnight - itemStartMinutes;
      const secondPartDuration = itemEndMinutes - splitMinutesFromMidnight;

      const itemDate = new Date(itemToSplit.start_time);

      // Create two new items
      const firstPartData = {
        user_id: user.id,
        layer_id: itemToSplit.layer_id,
        title: `${itemToSplit.title} (1/2)`,
        start_time: itemToSplit.start_time,
        duration_minutes: firstPartDuration,
        color: itemToSplit.color,
        status: itemToSplit.status,
        is_locked_time: itemToSplit.is_locked_time,
        is_flexible: itemToSplit.is_flexible,
        template_id: null, // Split items lose template association
      };

      const secondPartData = {
        user_id: user.id,
        layer_id: itemToSplit.layer_id,
        title: `${itemToSplit.title} (2/2)`,
        start_time: createTimestampFromMinutes(splitMinutesFromMidnight, itemDate),
        duration_minutes: secondPartDuration,
        color: itemToSplit.color,
        status: itemToSplit.status,
        is_locked_time: itemToSplit.is_locked_time,
        is_flexible: itemToSplit.is_flexible,
        template_id: null, // Split items lose template association
      };

      // Delete original item
      await supabase
        .from('timeline_items')
        .delete()
        .eq('id', itemId);

      // Insert both parts
      const { data: newItems, error } = await supabase
        .from('timeline_items')
        .insert([firstPartData, secondPartData])
        .select();

      if (error) throw error;

      // Update local state
      setItems(prevItems => [
        ...prevItems.filter(i => i.id !== itemId),
        ...(newItems || []),
      ]);

      toast({
        title: 'Item split',
        description: 'Item has been split into two parts',
      });

      // Apply magnetic reflow if on magnetic layer
      const isMagnetic = await isLayerMagnetic(itemToSplit.layer_id);
      if (isMagnetic) {
        await applyMagneticReflowToLayer(itemToSplit.layer_id, itemDate);
      }

      return newItems;
    } catch (error) {
      console.error('Error splitting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to split item',
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
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    deleteParkedItem,
    splitItem,
    updateSettings,
    refetchItems: fetchItems,
    refetchParkedItems: fetchParkedItems,
  };
}
