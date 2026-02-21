import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export type ModelPreference = 'anthropic' | 'openrouter' | 'ollama';

interface UserSettingsData {
  model_preference: ModelPreference;
  theme: string | null;
}

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [offlineMode, setOfflineModeState] = useState(
    localStorage.getItem('offline-mode') === 'true'
  );

  const settings = useQuery({
    queryKey: ['user-settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('model_preference, theme')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return {
        model_preference: (data?.model_preference as ModelPreference) || 'anthropic',
        theme: (data?.theme as string) || null,
      } as UserSettingsData;
    }
  });

  const setOfflineMode = (val: boolean) => {
    localStorage.setItem('offline-mode', String(val));
    setOfflineModeState(val);
  };

  const updatePreference = useMutation({
    mutationFn: async (preference: ModelPreference) => {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: user!.id, model_preference: preference },
          { onConflict: 'user_id' }
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] });
    }
  });

  const updateTheme = useMutation({
    mutationFn: async (theme: string) => {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: user!.id, theme },
          { onConflict: 'user_id' }
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] });
    }
  });

  return {
    modelPreference: settings.data?.model_preference,
    setModelPreference: updatePreference.mutate,
    themePreference: settings.data?.theme ?? null,
    setThemePreference: updateTheme.mutate,
    isLoaded: !settings.isLoading && settings.isFetched,
    offlineMode,
    setOfflineMode,
  };
}
