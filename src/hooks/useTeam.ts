import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Team {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  subscription_id: string | null;
  max_members: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  user?: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
}

/**
 * Hook for managing team data and operations
 */
export function useTeam() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's team memberships
  const { data: teamMemberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ['team-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select('*, teams(*)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching team memberships:', error);
        // Return empty array instead of throwing to prevent infinite loading
        return [];
      }

      return data;
    },
    enabled: !!user?.id,
    initialData: [],
    // Add error handling
    retry: 1,
    retryDelay: 1000,
  });

  // Get the user's primary team (first one they're a member of)
  const primaryTeam = teamMemberships?.[0]?.teams as Team | undefined;
  const primaryMembership = teamMemberships?.[0];

  // Fetch detailed team data if user has a team
  const { data: teamDetails, isLoading: teamLoading } = useQuery({
    queryKey: ['team-details', primaryTeam?.id],
    queryFn: async () => {
      if (!primaryTeam?.id) return null;

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', primaryTeam.id)
        .single();

      if (error) {
        console.error('Error fetching team details:', error);
        // Return null instead of throwing to prevent infinite loading
        return null;
      }

      return data as Team;
    },
    enabled: !!primaryTeam?.id,
    initialData: undefined,
    // Add error handling
    retry: 1,
    retryDelay: 1000,
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await supabase.functions.invoke('create-team', {
        body: { name, slug },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['team-details'] });
      toast.success('Team created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create team');
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: string; updates: Partial<Team> }) => {
      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-details'] });
      queryClient.invalidateQueries({ queryKey: ['team-memberships'] });
      toast.success('Team updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update team');
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['team-details'] });
      toast.success('Team deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete team');
    },
  });

  return {
    // Team data
    team: teamDetails || primaryTeam,
    membership: primaryMembership,
    hasTeam: !!primaryTeam,
    isOwner: primaryMembership?.role === 'owner',
    isAdmin: primaryMembership?.role === 'admin' || primaryMembership?.role === 'owner',
    role: primaryMembership?.role,

    // Loading states
    // Only show teamLoading if the query is actually enabled (user has a team)
    isLoading: membershipsLoading || (!!primaryTeam?.id && teamLoading),

    // Mutations
    createTeam: createTeamMutation.mutate,
    updateTeam: updateTeamMutation.mutate,
    deleteTeam: deleteTeamMutation.mutate,

    // Mutation states
    isCreating: createTeamMutation.isPending,
    isUpdating: updateTeamMutation.isPending,
    isDeleting: deleteTeamMutation.isPending,
  };
}
