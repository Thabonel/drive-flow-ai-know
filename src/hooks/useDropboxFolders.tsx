import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DropboxFolder {
  id: string;
  folder_id: string;
  folder_name: string;
  folder_path: string | null;
  is_active: boolean | null;
  last_synced_at: string | null;
  files_count: number | null;
}

export function useDropboxFolders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const folders = useQuery({
    queryKey: ['dropbox-folders', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dropbox_folders')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as DropboxFolder[];
    }
  });

  const addFolder = useMutation({
    mutationFn: async (payload: { folder_id: string; folder_name: string; folder_path: string | null }) => {
      const { data, error } = await supabase
        .from('dropbox_folders')
        .insert({
          user_id: user!.id,
          folder_id: payload.folder_id,
          folder_name: payload.folder_name,
          folder_path: payload.folder_path
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DropboxFolder;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dropbox-folders', user?.id] })
  });

  const removeFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dropbox_folders')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dropbox-folders', user?.id] })
  });

  const syncFolder = useMutation({
    mutationFn: async (folder_id: string) => {
      const { data, error } = await supabase.functions.invoke('dropbox-sync', {
        body: { folder_id }
      });
      if (error) throw new Error(error.message);
      return data as { files_processed: number; total_files: number; errors?: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropbox-folders', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    }
  });

  const syncAllFolders = useMutation({
    mutationFn: async () => {
      const { data: allFolders, error } = await supabase
        .from('dropbox_folders')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw new Error(error.message);
      if (!allFolders || allFolders.length === 0) {
        throw new Error('No folders to sync');
      }

      const results = [];
      for (const folder of allFolders) {
        try {
          const { data, error } = await supabase.functions.invoke('dropbox-sync', {
            body: { folder_id: folder.id }
          });
          if (error) throw error;
          results.push({ folder: folder.folder_name, files: data?.files_processed || 0 });
        } catch (error: any) {
          console.error(`Error syncing folder ${folder.folder_name}:`, error);
          results.push({ folder: folder.folder_name, error: error.message });
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropbox-folders', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    }
  });

  return {
    folders,
    addFolder,
    removeFolder,
    syncFolder,
    syncAllFolders
  };
}
