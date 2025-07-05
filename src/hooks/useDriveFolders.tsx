import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DriveFolder {
  id: string;
  folder_id: string;
  folder_name: string;
  folder_path: string | null;
  is_active: boolean | null;
  last_synced_at: string | null;
}

export function useDriveFolders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const folders = useQuery({
    queryKey: ['drive-folders', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_drive_folders')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as DriveFolder[];
    }
  });

  const addFolder = useMutation({
    mutationFn: async (payload: { folder_id: string; folder_name: string; folder_path: string | null }) => {
      const { data, error } = await supabase
        .from('google_drive_folders')
        .insert({
          user_id: user!.id,
          folder_id: payload.folder_id,
          folder_name: payload.folder_name,
          folder_path: payload.folder_path
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DriveFolder;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drive-folders', user?.id] })
  });

  const removeFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('google_drive_folders')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drive-folders', user?.id] })
  });

  const syncFolder = useMutation({
    mutationFn: async (folder_id: string) => {
      const { data, error } = await supabase.functions.invoke('google-drive-sync', {
        body: { folder_id, user_id: user!.id }
      });
      if (error) throw new Error(error.message);
      return data as { files_processed: number };
    }
  });

  return {
    folders,
    addFolder,
    removeFolder,
    syncFolder
  };
}

