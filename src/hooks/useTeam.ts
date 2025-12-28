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

  // Fetch ALL user's team memberships (not just primary)
  const { data: allTeamMemberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ['all-team-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select('*, teams(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true });

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

  // Get active team ID from user_settings
  const { data: activeTeamData } = useQuery({
    queryKey: ['active-team-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_settings')
        .select('active_team_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching active team ID:', error);
        return null;
      }

      return data?.active_team_id;
    },
    enabled: !!user?.id,
    retry: 1,
    retryDelay: 1000,
  });

  const activeTeamId = activeTeamData;

  // Find active team membership based on active_team_id
  // Fallback to first team if no active team set
  const activeTeamMembership = allTeamMemberships?.find(
    (m: any) => m.teams?.id === activeTeamId
  ) || allTeamMemberships?.[0];

  const primaryTeam = activeTeamMembership?.teams as Team | undefined;
  const primaryMembership = activeTeamMembership;

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
      queryClient.invalidateQueries({ queryKey: ['all-team-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['team-details'] });
      queryClient.invalidateQueries({ queryKey: ['active-team-id'] });
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
      queryClient.invalidateQueries({ queryKey: ['all-team-memberships'] });
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
      queryClient.invalidateQueries({ queryKey: ['all-team-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['team-details'] });
      toast.success('Team deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete team');
    },
  });

  // Set active team mutation
  const setActiveTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({ active_team_id: teamId })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-team-id'] });
      queryClient.invalidateQueries({ queryKey: ['team-details'] });
      queryClient.invalidateQueries({ queryKey: ['all-team-memberships'] });
      toast.success('Switched team successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to switch team');
    },
  });

  return {
    // Active team context
    team: teamDetails || primaryTeam,
    membership: primaryMembership,
    hasTeam: !!primaryTeam,

    // Multi-team support
    allTeams: allTeamMemberships?.map((m: any) => m.teams as Team).filter(Boolean) || [],
    activeTeamId,
    setActiveTeam: setActiveTeamMutation.mutate,

    // Role checks (for active team)
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
