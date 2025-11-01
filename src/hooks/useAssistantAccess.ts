import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface AssistantPermissions {
  view_calendar: boolean;
  edit_calendar: boolean;
  suggest_changes: boolean;
  attach_documents: boolean;
  apply_templates: boolean;
  bulk_schedule: boolean;
  view_documents: boolean;
}

export interface AssistantRelationship {
  id: string;
  executive_id: string;
  assistant_id: string | null;
  assistant_email: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  permissions: AssistantPermissions;
  invitation_token: string | null;
  invitation_expires_at: string | null;
  invited_at: string;
  accepted_at: string | null;
  suspended_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssistantActivity {
  id: string;
  relationship_id: string;
  assistant_id: string;
  executive_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  changes: any;
  description: string;
  created_at: string;
}

export interface AssistantSuggestion {
  id: string;
  relationship_id: string;
  assistant_id: string;
  executive_id: string;
  suggestion_type: string;
  proposed_data: any;
  target_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  notes: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_ASSISTANT_PERMISSIONS: AssistantPermissions = {
  view_calendar: true,
  edit_calendar: false,
  suggest_changes: true,
  attach_documents: true,
  apply_templates: false,
  bulk_schedule: false,
  view_documents: true,
};

export const FULL_ASSISTANT_PERMISSIONS: AssistantPermissions = {
  view_calendar: true,
  edit_calendar: true,
  suggest_changes: true,
  attach_documents: true,
  apply_templates: true,
  bulk_schedule: true,
  view_documents: true,
};

export const useAssistantAccess = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [myAssistants, setMyAssistants] = useState<AssistantRelationship[]>([]);
  const [myExecutives, setMyExecutives] = useState<AssistantRelationship[]>([]);
  const [recentActivity, setRecentActivity] = useState<AssistantActivity[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<AssistantSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch relationships where I'm the executive
  const fetchMyAssistants = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assistant_relationships')
        .select('*')
        .eq('executive_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyAssistants(data || []);
    } catch (error) {
      console.error('Error fetching assistants:', error);
    }
  };

  // Fetch relationships where I'm the assistant
  const fetchMyExecutives = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assistant_relationships')
        .select('*')
        .eq('assistant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyExecutives(data || []);
    } catch (error) {
      console.error('Error fetching executives:', error);
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assistant_activity_log')
        .select('*')
        .or(`executive_id.eq.${user.id},assistant_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  // Fetch pending suggestions
  const fetchPendingSuggestions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assistant_suggestions')
        .select('*')
        .eq('executive_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  // Invite an assistant
  const inviteAssistant = async (
    assistantEmail: string,
    permissions: Partial<AssistantPermissions> = {}
  ): Promise<AssistantRelationship | null> => {
    if (!user) return null;

    setLoading(true);
    try {
      // Generate invitation token
      const { data: tokenData } = await supabase.rpc('generate_invitation_token');
      const invitationToken = tokenData;

      // Calculate expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const finalPermissions = { ...DEFAULT_ASSISTANT_PERMISSIONS, ...permissions };

      const { data, error } = await supabase
        .from('assistant_relationships')
        .insert({
          executive_id: user.id,
          assistant_email: assistantEmail.toLowerCase(),
          invitation_token: invitationToken,
          invitation_expires_at: expiresAt.toISOString(),
          invited_by: user.id,
          permissions: finalPermissions,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already invited this assistant');
        }
        throw error;
      }

      // TODO: Send invitation email via Edge Function
      // await sendInvitationEmail(assistantEmail, invitationToken);

      await fetchMyAssistants();

      toast({
        title: 'Invitation sent!',
        description: `An invitation has been sent to ${assistantEmail}`,
      });

      return data;
    } catch (error) {
      console.error('Error inviting assistant:', error);
      toast({
        title: 'Failed to send invitation',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Accept an invitation
  const acceptInvitation = async (invitationToken: string): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('accept_assistant_invitation', {
        p_invitation_token: invitationToken,
      });

      if (error) throw error;

      await fetchMyExecutives();

      toast({
        title: 'Invitation accepted!',
        description: 'You can now manage this executive\'s calendar',
      });

      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Failed to accept invitation',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update permissions
  const updatePermissions = async (
    relationshipId: string,
    permissions: Partial<AssistantPermissions>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('assistant_relationships')
        .update({ permissions })
        .eq('id', relationshipId)
        .eq('executive_id', user.id);

      if (error) throw error;

      await fetchMyAssistants();

      toast({
        title: 'Permissions updated',
        description: 'Assistant permissions have been updated',
      });

      return true;
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Failed to update permissions',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Revoke access
  const revokeAccess = async (relationshipId: string, reason?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('assistant_relationships')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revocation_reason: reason || null,
        })
        .eq('id', relationshipId)
        .eq('executive_id', user.id);

      if (error) throw error;

      await fetchMyAssistants();

      toast({
        title: 'Access revoked',
        description: 'Assistant access has been revoked',
      });

      return true;
    } catch (error) {
      console.error('Error revoking access:', error);
      toast({
        title: 'Failed to revoke access',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Suspend/resume access
  const toggleSuspend = async (relationshipId: string, suspend: boolean): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('assistant_relationships')
        .update({
          status: suspend ? 'suspended' : 'active',
          suspended_at: suspend ? new Date().toISOString() : null,
        })
        .eq('id', relationshipId)
        .eq('executive_id', user.id);

      if (error) throw error;

      await fetchMyAssistants();

      toast({
        title: suspend ? 'Access suspended' : 'Access resumed',
        description: suspend
          ? 'Assistant access has been temporarily suspended'
          : 'Assistant access has been resumed',
      });

      return true;
    } catch (error) {
      console.error('Error toggling suspend:', error);
      toast({
        title: 'Failed to update access',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Log activity
  const logActivity = async (
    relationshipId: string,
    actionType: string,
    description: string,
    targetType?: string,
    targetId?: string,
    changes?: any
  ): Promise<void> => {
    try {
      await supabase.rpc('log_assistant_activity', {
        p_relationship_id: relationshipId,
        p_action_type: actionType,
        p_description: description,
        p_target_type: targetType || null,
        p_target_id: targetId || null,
        p_changes: changes || null,
      });

      await fetchRecentActivity();
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Create suggestion
  const createSuggestion = async (
    relationshipId: string,
    executiveId: string,
    suggestionType: string,
    proposedData: any,
    reason?: string
  ): Promise<AssistantSuggestion | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('assistant_suggestions')
        .insert({
          relationship_id: relationshipId,
          assistant_id: user.id,
          executive_id: executiveId,
          suggestion_type: suggestionType,
          proposed_data: proposedData,
          reason: reason || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Suggestion sent',
        description: 'Your suggestion has been sent to the executive for approval',
      });

      return data;
    } catch (error) {
      console.error('Error creating suggestion:', error);
      toast({
        title: 'Failed to create suggestion',
        description: 'Please try again',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Review suggestion (approve/reject)
  const reviewSuggestion = async (
    suggestionId: string,
    approved: boolean,
    reviewNotes?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('assistant_suggestions')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', suggestionId)
        .eq('executive_id', user.id);

      if (error) throw error;

      await fetchPendingSuggestions();

      toast({
        title: approved ? 'Suggestion approved' : 'Suggestion rejected',
        description: approved
          ? 'The changes have been applied to your calendar'
          : 'The suggestion has been rejected',
      });

      return true;
    } catch (error) {
      console.error('Error reviewing suggestion:', error);
      toast({
        title: 'Failed to review suggestion',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Check if user has specific permission
  const hasPermission = (relationship: AssistantRelationship, permission: keyof AssistantPermissions): boolean => {
    return relationship.status === 'active' && relationship.permissions[permission] === true;
  };

  // Get active relationship for executive (if acting as assistant)
  const getActiveExecutiveRelationship = (executiveId: string): AssistantRelationship | undefined => {
    return myExecutives.find(
      (rel) => rel.executive_id === executiveId && rel.status === 'active'
    );
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchMyAssistants();
      fetchMyExecutives();
      fetchRecentActivity();
      fetchPendingSuggestions();
    }
  }, [user?.id]);

  return {
    // Data
    myAssistants,
    myExecutives,
    recentActivity,
    pendingSuggestions,
    loading,

    // Actions
    inviteAssistant,
    acceptInvitation,
    updatePermissions,
    revokeAccess,
    toggleSuspend,
    logActivity,
    createSuggestion,
    reviewSuggestion,

    // Helpers
    hasPermission,
    getActiveExecutiveRelationship,

    // Refresh
    refresh: () => {
      fetchMyAssistants();
      fetchMyExecutives();
      fetchRecentActivity();
      fetchPendingSuggestions();
    },
  };
};
