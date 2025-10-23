// Hook for real-time synchronization with Supabase

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

interface TimelineSyncCallbacks {
  onItemsChange?: () => void;
  onLayersChange?: () => void;
  onSettingsChange?: () => void;
}

export function useTimelineSync(callbacks: TimelineSyncCallbacks) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channels: RealtimeChannel[] = [];

    // Subscribe to timeline_items changes
    if (callbacks.onItemsChange) {
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
          () => {
            callbacks.onItemsChange?.();
          }
        )
        .subscribe();

      channels.push(itemsChannel);
    }

    // Subscribe to timeline_layers changes
    if (callbacks.onLayersChange) {
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
          () => {
            callbacks.onLayersChange?.();
          }
        )
        .subscribe();

      channels.push(layersChannel);
    }

    // Subscribe to timeline_settings changes
    if (callbacks.onSettingsChange) {
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
          () => {
            callbacks.onSettingsChange?.();
          }
        )
        .subscribe();

      channels.push(settingsChannel);
    }

    // Cleanup subscriptions on unmount
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, callbacks.onItemsChange, callbacks.onLayersChange, callbacks.onSettingsChange]);
}
