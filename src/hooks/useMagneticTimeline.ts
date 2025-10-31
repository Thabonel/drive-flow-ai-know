// Hook for magnetic timeline state management

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  MagneticTimelineItem,
  applyMagneticReflow,
  moveItem,
  resizeItem,
  splitItemAt,
  insertItemAtPosition,
  createDefault24HourTimeline,
  validateFullCoverage,
  findGaps,
  itemsToBlocks,
} from '@/lib/magneticTimelineUtils';

export function useMagneticTimeline() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<MagneticTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFullCoverage, setHasFullCoverage] = useState(false);

  // Initialize default timeline in database
  const initializeDefaultTimeline = async (defaultItems: MagneticTimelineItem[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('magnetic_timeline_items')
        .insert(defaultItems);

      if (error) throw error;
    } catch (error) {
      console.error('Error initializing default timeline:', error);
    }
  };

  // Fetch magnetic timeline items
  const fetchItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('magnetic_timeline_items')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Initialize with default 24-hour timeline
        const defaultItems = createDefault24HourTimeline(user.id);
        await initializeDefaultTimeline(defaultItems);
        setItems(defaultItems);
        setHasFullCoverage(true);
      } else {
        setItems(data);
        setHasFullCoverage(validateFullCoverage(data));
      }
    } catch (error) {
      console.error('Error fetching magnetic timeline items:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch magnetic timeline',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a new item and trigger reflow
  const addItem = async (
    title: string,
    targetMinutes: number,
    durationMinutes: number,
    color: string,
    isLocked: boolean = false,
    isFlexible: boolean = true
  ) => {
    if (!user) return;

    try {
      const newItem: MagneticTimelineItem = {
        id: `temp_${Date.now()}`,
        user_id: user.id,
        title,
        start_time: new Date().toISOString(), // Will be set by insertItemAtPosition
        duration_minutes: durationMinutes,
        color,
        is_locked_time: isLocked,
        is_flexible: isFlexible,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Calculate new timeline with reflow
      const reflowedItems = insertItemAtPosition(items, newItem, targetMinutes);

      // Insert into database
      const { data, error } = await supabase
        .from('magnetic_timeline_items')
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;

      // Update all items that were affected by reflow
      await updateAllItems(reflowedItems);

      setItems(reflowedItems);
      setHasFullCoverage(validateFullCoverage(reflowedItems));

      toast({
        title: 'Item added',
        description: `"${title}" added to magnetic timeline`,
      });

      return data;
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to magnetic timeline',
        variant: 'destructive',
      });
    }
  };

  // Move an item and trigger reflow
  const moveItemTo = async (itemId: string, newStartMinutes: number) => {
    if (!user) return;

    try {
      const reflowedItems = moveItem(items, itemId, newStartMinutes);

      await updateAllItems(reflowedItems);

      setItems(reflowedItems);
      setHasFullCoverage(validateFullCoverage(reflowedItems));

      toast({
        title: 'Item moved',
        description: 'Timeline automatically reflowed',
      });
    } catch (error) {
      console.error('Error moving item:', error);
      toast({
        title: 'Error',
        description: 'Failed to move item',
        variant: 'destructive',
      });
    }
  };

  // Resize an item and trigger reflow
  const resizeItemTo = async (itemId: string, newDurationMinutes: number) => {
    if (!user) return;

    try {
      const reflowedItems = resizeItem(items, itemId, newDurationMinutes);

      await updateAllItems(reflowedItems);

      setItems(reflowedItems);
      setHasFullCoverage(validateFullCoverage(reflowedItems));

      toast({
        title: 'Item resized',
        description: 'Timeline automatically reflowed',
      });
    } catch (error) {
      console.error('Error resizing item:', error);
      toast({
        title: 'Error',
        description: 'Failed to resize item',
        variant: 'destructive',
      });
    }
  };

  // Split an item (blade tool)
  const splitItem = async (itemId: string, splitMinutes: number) => {
    if (!user) return;

    try {
      const splitItems = splitItemAt(items, itemId, splitMinutes);

      // Delete original item from database
      const { error: deleteError } = await supabase
        .from('magnetic_timeline_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      // Insert both new parts
      const newParts = splitItems.filter(item =>
        item.id.startsWith(`${itemId}_part`)
      );

      const { error: insertError } = await supabase
        .from('magnetic_timeline_items')
        .insert(newParts);

      if (insertError) throw insertError;

      setItems(splitItems);

      toast({
        title: 'Item split',
        description: 'Item has been split into two parts',
      });
    } catch (error) {
      console.error('Error splitting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to split item',
        variant: 'destructive',
      });
    }
  };

  // Delete an item and trigger reflow
  const deleteItem = async (itemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('magnetic_timeline_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      const remainingItems = items.filter(i => i.id !== itemId);
      const reflowedItems = applyMagneticReflow(remainingItems);

      await updateAllItems(reflowedItems);

      setItems(reflowedItems);
      setHasFullCoverage(validateFullCoverage(reflowedItems));

      toast({
        title: 'Item deleted',
        description: 'Timeline automatically reflowed',
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

  // Update item properties (title, color, locked, flexible)
  const updateItem = async (
    itemId: string,
    updates: Partial<Pick<MagneticTimelineItem, 'title' | 'color' | 'is_locked_time' | 'is_flexible'>>
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('magnetic_timeline_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      const updatedItems = items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );

      setItems(updatedItems);

      toast({
        title: 'Item updated',
        description: 'Changes saved',
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      });
    }
  };

  // Update all items in database (used after reflow)
  const updateAllItems = async (reflowedItems: MagneticTimelineItem[]) => {
    if (!user) return;

    try {
      // Update each item
      for (const item of reflowedItems) {
        await supabase
          .from('magnetic_timeline_items')
          .update({
            start_time: item.start_time,
            duration_minutes: item.duration_minutes,
            original_duration: item.original_duration,
          })
          .eq('id', item.id);
      }
    } catch (error) {
      console.error('Error updating items after reflow:', error);
    }
  };

  // Manual reflow (for fixing gaps/overlaps)
  const manualReflow = async () => {
    if (!user) return;

    try {
      const reflowedItems = applyMagneticReflow(items);
      await updateAllItems(reflowedItems);

      setItems(reflowedItems);
      setHasFullCoverage(validateFullCoverage(reflowedItems));

      const gaps = findGaps(itemsToBlocks(reflowedItems));

      toast({
        title: 'Timeline reflowed',
        description: gaps.length > 0
          ? `${gaps.length} gap(s) still remain`
          : 'Timeline is now gap-free',
      });
    } catch (error) {
      console.error('Error reflowing timeline:', error);
      toast({
        title: 'Error',
        description: 'Failed to reflow timeline',
        variant: 'destructive',
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    items,
    loading,
    hasFullCoverage,
    addItem,
    moveItemTo,
    resizeItemTo,
    splitItem,
    deleteItem,
    updateItem,
    manualReflow,
    refetch: fetchItems,
  };
}
