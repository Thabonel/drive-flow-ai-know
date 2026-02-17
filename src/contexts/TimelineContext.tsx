// Timeline Context - Provides shared state for all timeline components
// This fixes the issue where multiple useTimeline() calls create isolated state instances

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  TimelineItem,
  TimelineSettings,
  ParkedItem,
  shouldBeLogjammed,
  shouldBeAutoPark,
} from '@/lib/timelineUtils';
import {
  AttentionType,
  RoleMode,
  ZoneContext,
  UserAttentionPreferences,
  calculateContextSwitchCost,
  getRoleDefaults,
  ROLE_MODES,
  ZONE_CONTEXTS,
} from '@/lib/attentionTypes';

interface AttentionBudgetStatus {
  attention_type: AttentionType;
  items_count: number;
  budget_limit: number;
  usage_percentage: number;
  is_over_budget: boolean;
  total_duration_minutes: number;
}

interface TimelineContextValue {
  items: TimelineItem[];
  settings: TimelineSettings | null;
  parkedItems: ParkedItem[];
  loading: boolean;
  nowTime: Date;
  scrollOffset: number;
  setScrollOffset: (offset: number) => void;

  // Attention System State
  attentionPreferences: UserAttentionPreferences | null;
  attentionLoading: boolean;

  // Enhanced addItem method with attention support
  addItem: (
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
      // Attention fields
      attention_type?: AttentionType | null;
      priority?: number;
      is_non_negotiable?: boolean;
      notes?: string;
      tags?: string[];
    }
  ) => Promise<TimelineItem | undefined>;

  updateItem: (itemId: string, updates: Partial<TimelineItem>) => Promise<boolean>;
  completeItem: (itemId: string) => Promise<void>;
  rescheduleItem: (itemId: string, newStartTime: string, newLayerId?: string) => Promise<void>;
  parkItem: (itemId: string) => Promise<void>;
  restoreParkedItem: (parkedItemId: string, layerId: string, startTime: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  deleteRecurringThisAndFollowing: (item: TimelineItem) => Promise<void>;
  updateRecurringThisAndFollowing: (item: TimelineItem, updates: Partial<TimelineItem>) => Promise<void>;
  deleteParkedItem: (parkedItemId: string) => Promise<void>;
  updateSettings: (updates: Partial<TimelineSettings>) => Promise<void>;
  refetchItems: () => Promise<void>;
  refetchParkedItems: () => Promise<void>;

  // Attention System Methods
  updateAttentionPreferences: (updates: Partial<UserAttentionPreferences>) => Promise<boolean>;
  checkBudgetViolation: (items: TimelineItem[], date?: Date) => AttentionBudgetStatus[];
  calculateContextSwitches: (items: TimelineItem[], date?: Date) => number;
  getAttentionWarnings: (items: TimelineItem[], date?: Date) => string[];
  refreshAttentionPreferences: () => Promise<void>;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

export function TimelineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<TimelineItem[]>([]);
  const [settings, setSettings] = useState<TimelineSettings | null>(null);
  const [parkedItems, setParkedItems] = useState<ParkedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTime, setNowTime] = useState(new Date());
  const [scrollOffset, setScrollOffset] = useState(0);

  // Attention System State
  const [attentionPreferences, setAttentionPreferences] = useState<UserAttentionPreferences | null>(null);
  const [attentionLoading, setAttentionLoading] = useState(true);

  const animationFrameRef = useRef<number>();
  const lastTickRef = useRef<number>(Date.now());
  const autoParkingInProgressRef = useRef<Set<string>>(new Set());

  // Fetch timeline items
  const fetchItems = useCallback(async () => {
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
  }, [user, toast]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!user) {
      console.warn('Cannot fetch settings: no user');
      return;
    }

    console.log('Fetching settings for user:', user.id);

    try {
      const { data, error } = await supabase
        .from('timeline_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Fetch settings response:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase error fetching settings:', error);
        throw error;
      }

      if (!data) {
        console.log('No settings found, creating default settings');
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

        if (insertError) {
          console.error('Error inserting default settings:', insertError);
          throw insertError;
        }
        console.log('Default settings created:', newSettings);
        setSettings(newSettings);
      } else {
        console.log('Settings loaded:', data);
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch timeline settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Fetch parked items
  const fetchParkedItems = useCallback(async () => {
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
  }, [user]);

  // Fetch attention preferences
  const fetchAttentionPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/functions/v1/attention-preferences', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttentionPreferences(data.preferences);
      } else if (response.status === 404) {
        // No preferences yet - create defaults based on first-time user
        const defaults = getRoleDefaults(ROLE_MODES.MAKER);
        const defaultPreferences: Partial<UserAttentionPreferences> = {
          current_role: ROLE_MODES.MAKER,
          current_zone: ZONE_CONTEXTS.PEACETIME,
          non_negotiable_weekly_hours: 5,
          attention_budgets: defaults.attentionBudgets,
          peak_hours_start: defaults.peakHoursStart,
          peak_hours_end: defaults.peakHoursEnd,
        };

        await updateAttentionPreferences(defaultPreferences);
      } else {
        throw new Error('Failed to load attention preferences');
      }
    } catch (error) {
      console.error('Error fetching attention preferences:', error);
    } finally {
      setAttentionLoading(false);
    }
  }, [user]);

  // Update attention preferences
  const updateAttentionPreferences = useCallback(async (updates: Partial<UserAttentionPreferences>): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch('/functions/v1/attention-preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        setAttentionPreferences(data.preferences);
        return true;
      } else {
        throw new Error('Failed to update attention preferences');
      }
    } catch (error) {
      console.error('Error updating attention preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update attention preferences',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  // Check budget violations for timeline items
  const checkBudgetViolation = useCallback((items: TimelineItem[], date: Date = new Date()): AttentionBudgetStatus[] => {
    if (!attentionPreferences) return [];

    const targetDate = date.toISOString().split('T')[0];

    // Filter items for the target date
    const dayItems = items.filter(item => {
      const itemDate = new Date(item.start_time).toISOString().split('T')[0];
      return itemDate === targetDate && item.attention_type;
    });

    // Calculate usage by attention type
    const usageByType = new Map<AttentionType, { count: number; duration: number }>();

    // Initialize all attention types
    Object.values(['create', 'decide', 'connect', 'review', 'recover'] as AttentionType[]).forEach(type => {
      const typeItems = dayItems.filter(item => item.attention_type === type);
      usageByType.set(type, {
        count: typeItems.length,
        duration: typeItems.reduce((sum, item) => sum + item.duration_minutes, 0)
      });
    });

    // Generate budget status for each attention type
    const budgetStatuses: AttentionBudgetStatus[] = [];

    Object.values(['create', 'decide', 'connect', 'review', 'recover'] as AttentionType[]).forEach(type => {
      const usage = usageByType.get(type) || { count: 0, duration: 0 };
      let budgetLimit = 5; // default

      // Get budget limit from preferences
      if (type === 'decide') {
        budgetLimit = attentionPreferences.attention_budgets.decide || 2;
      } else if (type === 'connect') {
        budgetLimit = attentionPreferences.attention_budgets.meetings || 4;
      }

      const usagePercentage = Math.round((usage.count / budgetLimit) * 100);

      budgetStatuses.push({
        attention_type: type,
        items_count: usage.count,
        budget_limit: budgetLimit,
        usage_percentage: usagePercentage,
        is_over_budget: usage.count > budgetLimit,
        total_duration_minutes: usage.duration
      });
    });

    return budgetStatuses;
  }, [attentionPreferences]);

  // Calculate context switches for timeline items
  const calculateContextSwitches = useCallback((items: TimelineItem[], date: Date = new Date()): number => {
    if (!attentionPreferences) return 0;

    const targetDate = date.toISOString().split('T')[0];

    // Filter and sort items for the target date
    const dayItems = items
      .filter(item => {
        const itemDate = new Date(item.start_time).toISOString().split('T')[0];
        return itemDate === targetDate && item.attention_type;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    let totalContextSwitches = 0;

    for (let i = 1; i < dayItems.length; i++) {
      const prevItem = dayItems[i - 1];
      const currentItem = dayItems[i];

      if (prevItem.attention_type && currentItem.attention_type) {
        const switchCost = calculateContextSwitchCost(
          prevItem.attention_type,
          currentItem.attention_type,
          attentionPreferences.current_role
        );
        totalContextSwitches += switchCost;
      }
    }

    return totalContextSwitches;
  }, [attentionPreferences]);

  // Get attention warnings for timeline items
  const getAttentionWarnings = useCallback((items: TimelineItem[], date: Date = new Date()): string[] => {
    if (!attentionPreferences) return [];

    const warnings: string[] = [];
    const budgetStatus = checkBudgetViolation(items, date);
    const contextSwitches = calculateContextSwitches(items, date);

    // Check budget violations
    const overBudgetTypes = budgetStatus.filter(status => status.is_over_budget);
    if (overBudgetTypes.length > 0) {
      warnings.push(
        `Over budget for ${overBudgetTypes.map(t => t.attention_type).join(', ')} activities`
      );
    }

    // Check approaching budget limits (80%+)
    const nearLimitTypes = budgetStatus.filter(
      status => !status.is_over_budget && status.usage_percentage >= 80
    );
    if (nearLimitTypes.length > 0) {
      warnings.push(
        `Approaching budget limit for ${nearLimitTypes.map(t => t.attention_type).join(', ')}`
      );
    }

    // Check excessive context switching
    const contextSwitchBudget = attentionPreferences.attention_budgets.context_switches || 3;
    if (contextSwitches > contextSwitchBudget) {
      warnings.push(`High context switching detected (${contextSwitches} vs ${contextSwitchBudget} budget)`);
    }

    return warnings;
  }, [attentionPreferences, checkBudgetViolation, calculateContextSwitches]);

  // Refresh attention preferences
  const refreshAttentionPreferences = useCallback(async () => {
    await fetchAttentionPreferences();
  }, [fetchAttentionPreferences]);

  // Add a new item
  const addItem = useCallback(async (
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
      // Attention fields
      attention_type?: AttentionType | null;
      priority?: number;
      is_non_negotiable?: boolean;
      notes?: string;
      tags?: string[];
    }
  ): Promise<TimelineItem | undefined> => {
    if (!user) return;

    try {
      // Build the base insert object with required fields
      const insertData: Record<string, unknown> = {
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
        visibility: options?.visibility || 'personal',
      };

      // Only add optional fields if they have actual values (not undefined)
      if (options?.team_id !== undefined) insertData.team_id = options.team_id;
      if (options?.assigned_to !== undefined) insertData.assigned_to = options.assigned_to;
      if (options?.assigned_by !== undefined) insertData.assigned_by = options.assigned_by;
      if (options?.recurring_series_id !== undefined) insertData.recurring_series_id = options.recurring_series_id;
      if (options?.occurrence_index !== undefined) insertData.occurrence_index = options.occurrence_index;

      // Add attention fields
      if (options?.attention_type !== undefined) insertData.attention_type = options.attention_type;
      if (options?.priority !== undefined) insertData.priority = options.priority;
      if (options?.is_non_negotiable !== undefined) insertData.is_non_negotiable = options.is_non_negotiable;
      if (options?.notes !== undefined) insertData.notes = options.notes;
      if (options?.tags !== undefined) insertData.tags = options.tags;

      const { data, error } = await supabase
        .from('timeline_items')
        .insert(insertData)
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

      // Update shared state - this will be reflected in ALL components
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
  }, [user, toast]);

  // Update an item - returns true if successful, false otherwise
  const updateItem = useCallback(async (itemId: string, updates: Partial<TimelineItem>): Promise<boolean> => {
    try {
      // Include user_id for RLS and use .select() to verify update succeeded
      // Use maybeSingle() so null result doesn't throw (item may have been auto-parked)
      const { data, error } = await supabase
        .from('timeline_items')
        .update(updates)
        .eq('id', itemId)
        .eq('user_id', user?.id || '')
        .select()
        .maybeSingle();

      // Handle "no rows found" errors (404, PGRST116) - item was auto-parked
      if (error) {
        const isNotFoundError = error.code === 'PGRST116' ||
                                error.code === '404' ||
                                (error as any).status === 404 ||
                                error.message?.includes('not found');

        if (isNotFoundError) {
          // Item was auto-parked or deleted - handle gracefully
          setItems(prevItems => prevItems.filter(item => item.id !== itemId));
          toast({
            title: 'Item no longer available',
            description: 'This item was moved to Parked Items',
          });
          await fetchParkedItems();
          return false;
        }

        // Real error - throw it
        throw error;
      }

      // Item was auto-parked or deleted while user had the menu open
      if (!data) {
        setItems(prevItems => prevItems.filter(item => item.id !== itemId));
        toast({
          title: 'Item no longer available',
          description: 'This item was moved to Parked Items',
        });
        await fetchParkedItems();
        return false; // Indicate update didn't happen (item was gone)
      }

      // Use returned data to ensure consistency
      setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, ...data } : item));
      return true; // Success
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update timeline item',
        variant: 'destructive',
      });
      // Refetch to ensure UI is in sync
      await fetchItems();
      return false; // Failed
    }
  }, [user, toast, fetchItems, fetchParkedItems]);

  // Mark item as completed
  const completeItem = useCallback(async (itemId: string) => {
    const success = await updateItem(itemId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    // Only show success toast if update actually happened
    if (success) {
      toast({
        title: 'Item completed',
        description: 'Item marked as done',
      });
    }
  }, [updateItem, toast]);

  // Reschedule an item
  const rescheduleItem = useCallback(async (itemId: string, newStartTime: string, newLayerId?: string) => {
    const updates: Partial<TimelineItem> = {
      start_time: newStartTime,
      status: 'active',
    };

    if (newLayerId) {
      updates.layer_id = newLayerId;
    }

    const success = await updateItem(itemId, updates);

    if (success) {
      toast({
        title: 'Item rescheduled',
        description: newLayerId ? 'Item has been moved to a new time and layer' : 'Item has been moved to a new time',
      });
    }
  }, [updateItem, toast]);

  // Park an item
  const parkItem = useCallback(async (itemId: string) => {
    if (!user) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Prevent double-parking if auto-park is already processing this item
    if (autoParkingInProgressRef.current.has(itemId)) {
      toast({
        title: 'Already parking',
        description: 'This item is already being parked',
      });
      return;
    }

    // Mark as being processed
    autoParkingInProgressRef.current.add(itemId);

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

      if (parkError) {
        console.error('Error inserting parked item:', parkError);
        throw parkError;
      }

      // Delete from timeline items
      const { data, error: deleteError } = await supabase
        .from('timeline_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)
        .select();

      if (deleteError) {
        console.error('Error deleting timeline item:', deleteError);
        throw deleteError;
      }

      // Verify deletion succeeded
      if (!data || data.length === 0) {
        throw new Error('Item not found or you do not have permission to delete it');
      }

      // Refetch to ensure UI is in sync
      await fetchItems();
      await fetchParkedItems();

      toast({
        title: 'Item parked',
        description: 'Item has been saved for later',
      });
    } catch (error) {
      console.error('Error parking item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to park item';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Refetch to ensure UI is in sync
      await fetchItems();
      await fetchParkedItems();
    } finally {
      // Always remove from tracking set
      autoParkingInProgressRef.current.delete(itemId);
    }
  }, [user, items, fetchItems, fetchParkedItems, toast]);

  // Restore a parked item
  const restoreParkedItem = useCallback(async (
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

      setParkedItems(prevParkedItems => prevParkedItems.filter(p => p.id !== parkedItemId));
    } catch (error) {
      console.error('Error restoring parked item:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore parked item',
        variant: 'destructive',
      });
    }
  }, [user, parkedItems, addItem, toast]);

  // Delete an item
  const deleteItem = useCallback(async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('timeline_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user?.id || '')
        .select();

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Check if any rows were actually deleted
      if (!data || data.length === 0) {
        throw new Error('Item not found or you do not have permission to delete it');
      }

      // Refetch items to ensure consistency
      await fetchItems();

      toast({
        title: 'Item deleted',
        description: 'Timeline item has been removed',
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete item';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Refetch to ensure UI is in sync with database
      await fetchItems();
    }
  }, [user, fetchItems, toast]);

  // Delete this and all following recurring items
  const deleteRecurringThisAndFollowing = useCallback(async (item: TimelineItem) => {
    if (!item.recurring_series_id || item.occurrence_index === null) {
      // Not a recurring item, just delete it
      await deleteItem(item.id);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('timeline_items')
        .delete()
        .eq('recurring_series_id', item.recurring_series_id)
        .eq('user_id', user?.id || '')
        .gte('occurrence_index', item.occurrence_index)
        .select();

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Check if any rows were actually deleted
      if (!data || data.length === 0) {
        throw new Error('Items not found or you do not have permission to delete them');
      }

      // Refetch items to ensure consistency
      await fetchItems();

      toast({
        title: 'Recurring items deleted',
        description: `${data.length} occurrence${data.length > 1 ? 's' : ''} removed`,
      });
    } catch (error) {
      console.error('Error deleting recurring items:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete recurring items';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Refetch to ensure UI is in sync with database
      await fetchItems();
    }
  }, [user, deleteItem, fetchItems, toast]);

  // Update this and all following recurring items
  const updateRecurringThisAndFollowing = useCallback(async (item: TimelineItem, updates: Partial<TimelineItem>) => {
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
  }, [updateItem, toast]);

  // Delete a parked item
  const deleteParkedItem = useCallback(async (parkedItemId: string) => {
    try {
      const { data, error } = await supabase
        .from('timeline_parked_items')
        .delete()
        .eq('id', parkedItemId)
        .eq('user_id', user?.id || '')
        .select();

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Check if any rows were actually deleted
      if (!data || data.length === 0) {
        throw new Error('Item not found or you do not have permission to delete it');
      }

      // Refetch parked items to ensure consistency
      await fetchParkedItems();

      toast({
        title: 'Parked item deleted',
        description: 'Parked item has been removed',
      });
    } catch (error) {
      console.error('Error deleting parked item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete parked item';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Refetch to ensure UI is in sync with database
      await fetchParkedItems();
    }
  }, [user, fetchParkedItems, toast]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<TimelineSettings>) => {
    if (!user || !settings) {
      console.warn('Cannot update settings: missing user or settings', { user: !!user, settings: !!settings });
      return;
    }

    console.log('Updating settings:', { updates, userId: user.id, currentSettings: settings });

    try {
      const { error, data } = await supabase
        .from('timeline_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select(); // Add select to see what was updated

      if (error) {
        console.error('Supabase error updating settings:', error);
        throw error;
      }

      console.log('Settings updated successfully:', data);
      setSettings({ ...settings, ...updates });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: `Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  }, [user, settings, toast]);

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
        // Skip if already being processed to prevent duplicates
        if (shouldBeAutoPark(item, currentTime) && !autoParkingInProgressRef.current.has(item.id)) {
          itemsToAutoPark.push(item);
          return; // Don't add to updatedItems - will be removed
        }

        // Check if item should be marked as logjam
        if (shouldBeLogjammed(item, currentTime) && item.status === 'active') {
          // Update in database
          supabase
            .from('timeline_items')
            .update({ status: 'logjam' })
            .eq('id', item.id)
            .eq('user_id', user?.id || '');

          updatedItems.push({ ...item, status: 'logjam' as const });
        } else {
          updatedItems.push(item);
        }
      });

      // Auto-park items that are 8+ hours overdue
      if (itemsToAutoPark.length > 0 && user) {
        // Process auto-parking asynchronously with proper tracking
        (async () => {
          let successCount = 0;

          for (const item of itemsToAutoPark) {
            // Mark as being processed
            autoParkingInProgressRef.current.add(item.id);

            try {
              // Add to parked items
              const { error: insertError } = await supabase
                .from('timeline_parked_items')
                .insert({
                  user_id: user.id,
                  title: item.title,
                  duration_minutes: item.duration_minutes,
                  original_layer_id: item.layer_id,
                  color: item.color,
                });

              if (insertError) {
                console.error('Error inserting parked item:', insertError);
                throw insertError;
              }

              // Delete from timeline items
              const { data, error: deleteError } = await supabase
                .from('timeline_items')
                .delete()
                .eq('id', item.id)
                .eq('user_id', user.id)
                .select();

              if (deleteError) {
                console.error('Error deleting timeline item:', deleteError);
                throw deleteError;
              }

              if (data && data.length > 0) {
                successCount++;
                console.log(`Auto-parked item: ${item.title} (${item.id})`);
              }
            } catch (error) {
              console.error('Error auto-parking item:', error);
            } finally {
              // Always remove from tracking set
              autoParkingInProgressRef.current.delete(item.id);
            }
          }

          // Only show toast and refetch if items were actually parked
          if (successCount > 0) {
            toast({
              title: 'Items auto-parked',
              description: `${successCount} item${successCount > 1 ? 's' : ''} moved to Parked Items (8+ hours overdue)`,
            });

            // Refetch items and parked items to ensure UI is in sync
            fetchItems();
            fetchParkedItems();
          }
        })();
      }

      return updatedItems;
    });

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [user, toast, fetchItems, fetchParkedItems]);

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
      fetchAttentionPreferences();
    }
  }, [user, fetchItems, fetchSettings, fetchParkedItems, fetchAttentionPreferences]);

  const value: TimelineContextValue = {
    items,
    settings,
    parkedItems,
    loading,
    nowTime,
    scrollOffset,
    setScrollOffset,

    // Attention System State
    attentionPreferences,
    attentionLoading,

    // Timeline Item Methods
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

    // Attention System Methods
    updateAttentionPreferences,
    checkBudgetViolation,
    calculateContextSwitches,
    getAttentionWarnings,
    refreshAttentionPreferences,
  };

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimelineContext() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimelineContext must be used within a TimelineProvider');
  }
  return context;
}
