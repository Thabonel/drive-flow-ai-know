import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  invited_by: string | null;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invitation_token: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

/**
 * Hook for managing team members and invitations
 */
export function useTeamMembers(teamId?: string) {
  const queryClient = useQueryClient();

  // Fetch team members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user:user_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching team members:', error);
        throw error;
      }

      return data as TeamMember[];
    },
    enabled: !!teamId,
  });

  // Fetch pending invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['team-invitations', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team invitations:', error);
        throw error;
      }

      return data as TeamInvitation[];
    },
    enabled: !!teamId,
  });

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'member' | 'viewer' }) => {
      if (!teamId) throw new Error('Team ID is required');

      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: { team_id: teamId, email, role },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations', teamId] });
      toast.success('Invitation sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  // Update member role mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'admin' | 'member' | 'viewer' }) => {
      const { data, error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      toast.success('Member role updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update member role');
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      toast.success('Member removed from team');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations', teamId] });
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });

  // Accept invitation mutation (for when user accepts via email link)
  const acceptInvitationMutation = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.functions.invoke('accept-team-invitation', {
        body: { token },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-memberships'] });
      toast.success('Successfully joined team');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to accept invitation');
    },
  });

  return {
    // Data
    members: members || [],
    invitations: invitations || [],
    memberCount: members?.length || 0,
    pendingInvitationCount: invitations?.length || 0,

    // Loading states
    isLoading: membersLoading || invitationsLoading,

    // Mutations
    inviteMember: inviteMemberMutation.mutate,
    updateMemberRole: updateMemberRoleMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    cancelInvitation: cancelInvitationMutation.mutate,
    acceptInvitation: acceptInvitationMutation.mutate,

    // Mutation states
    isInviting: inviteMemberMutation.isPending,
    isUpdatingRole: updateMemberRoleMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
    isCancelling: cancelInvitationMutation.isPending,
    isAccepting: acceptInvitationMutation.isPending,
  };
}
