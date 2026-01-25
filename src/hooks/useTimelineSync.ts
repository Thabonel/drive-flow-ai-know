// Hook for real-time synchronization with Supabase

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

interface TimelineItemPayload {
  id: string;
  title: string;
  start_time: string;
  [key: string]: unknown;
}

interface TimelineSyncCallbacks {
  onItemsChange?: () => void;
  onItemInsert?: (item: TimelineItemPayload) => void;
  onLayersChange?: () => void;
  onSettingsChange?: () => void;
  onParkedItemsChange?: () => void;
}

export function useTimelineSync(callbacks: TimelineSyncCallbacks) {
  const { user } = useAuth();

  // Store callbacks in refs so they're always current without triggering re-subscriptions
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Debounce timers to prevent rapid refetches
  const itemsDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const layersDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const settingsDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const parkedItemsDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const channels: RealtimeChannel[] = [];

    // Debounced callback wrapper
    const debounce = (
      callback: () => void,
      timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
      delay: number = 100
    ) => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          callback();
          timerRef.current = null;
        }, delay);
      };
    };

    // Subscribe to timeline_items changes
    if (callbacksRef.current.onItemsChange || callbacksRef.current.onItemInsert) {
      const itemsChannel = supabase
        .channel('timeline_items_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_items',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // For INSERT events, call onItemInsert with the new item data
            if (payload.eventType === 'INSERT' && payload.new && callbacksRef.current.onItemInsert) {
              callbacksRef.current.onItemInsert(payload.new as TimelineItemPayload);
            }
            // Always call onItemsChange for all events (debounced)
            debounce(() => callbacksRef.current.onItemsChange?.(), itemsDebounceTimer, 150)();
          }
        )
        .subscribe();

      channels.push(itemsChannel);
    }

    // Subscribe to timeline_layers changes
    if (callbacksRef.current.onLayersChange) {
      const layersChannel = supabase
        .channel('timeline_layers_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_layers',
            filter: `user_id=eq.${user.id}`,
          },
          debounce(() => callbacksRef.current.onLayersChange?.(), layersDebounceTimer, 150)
        )
        .subscribe();

      channels.push(layersChannel);
    }

    // Subscribe to timeline_settings changes
    if (callbacksRef.current.onSettingsChange) {
      const settingsChannel = supabase
        .channel('timeline_settings_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_settings',
            filter: `user_id=eq.${user.id}`,
          },
          debounce(() => callbacksRef.current.onSettingsChange?.(), settingsDebounceTimer, 150)
        )
        .subscribe();

      channels.push(settingsChannel);
    }

    // Subscribe to timeline_parked_items changes
    if (callbacksRef.current.onParkedItemsChange) {
      const parkedItemsChannel = supabase
        .channel('timeline_parked_items_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_parked_items',
            filter: `user_id=eq.${user.id}`,
          },
          debounce(() => callbacksRef.current.onParkedItemsChange?.(), parkedItemsDebounceTimer, 150)
        )
        .subscribe();

      channels.push(parkedItemsChannel);
    }

    // Cleanup subscriptions on unmount
    return () => {
      // Clear any pending debounce timers
      if (itemsDebounceTimer.current) clearTimeout(itemsDebounceTimer.current);
      if (layersDebounceTimer.current) clearTimeout(layersDebounceTimer.current);
      if (settingsDebounceTimer.current) clearTimeout(settingsDebounceTimer.current);
      if (parkedItemsDebounceTimer.current) clearTimeout(parkedItemsDebounceTimer.current);

      // Remove all channels
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user]); // Remove callback dependencies to prevent reconnection loops
}
