// Custom hook for delegation workflow management
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrustLevel } from '@/lib/attentionTypes';
import { toast } from 'sonner';

interface Delegation {
  id: string;
  delegator_id: string;
  delegate_id?: string;
  timeline_item_id: string;
  title: string;
  description?: string;
  trust_level: TrustLevel;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  estimated_hours?: number;
  actual_hours?: number;
  success_rating?: number;
  follow_up_events: string[];
  requirements?: string;
  completion_percentage: number;
  blocked_reason?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;

  // Joined data
  delegate_name?: string;
  next_follow_up?: string;
}

interface DelegationAnalytics {
  total_delegations: number;
  completed_delegations: number;
  success_rate: number;
  average_rating: number;
  trust_level_breakdown: {
    new: number;
    experienced: number;
    expert: number;
  };
  avg_completion_time_hours: number;
}

export function useDelegations() {
  const { user } = useAuth();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [analytics, setAnalytics] = useState<DelegationAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch delegations for current user
  const fetchDelegations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch delegations where user is delegator or delegate
      const { data, error: fetchError } = await supabase
        .from('delegations')
        .select(`
          *,
          delegate:delegate_id(
            id,
            email,
            raw_user_meta_data
          ),
          timeline_item:timeline_items(
            id,
            title,
            description
          )
        `)
        .or(`delegator_id.eq.${user.id},delegate_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data to include delegate names and next follow-ups
      const transformedDelegations: Delegation[] = data?.map(delegation => {
        const delegateName = delegation.delegate?.raw_user_meta_data?.full_name ||
                           delegation.delegate?.email ||
                           'Unknown User';

        return {
          ...delegation,
          delegate_name: delegateName,
          title: delegation.timeline_item?.title || delegation.title,
          description: delegation.timeline_item?.description || delegation.description
        };
      }) || [];

      setDelegations(transformedDelegations);
    } catch (err) {
      console.error('Failed to fetch delegations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch delegations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch analytics for delegations
  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      // Use the database function to calculate analytics
      const { data, error: analyticsError } = await supabase
        .rpc('calculate_delegation_success_rate', {
          p_user_id: user.id
        });

      if (analyticsError) throw analyticsError;

      if (data && data.length > 0) {
        const result = data[0];
        setAnalytics({
          total_delegations: result.total_delegations || 0,
          completed_delegations: result.completed_delegations || 0,
          success_rate: result.success_rate || 0,
          average_rating: result.average_rating || 0,
          trust_level_breakdown: result.trust_level_breakdown || {
            new: 0,
            experienced: 0,
            expert: 0
          },
          avg_completion_time_hours: result.avg_completion_time_hours || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [user]);

  // Create new delegation
  const createDelegation = async (delegationData: {
    timeline_item_id: string;
    delegate_id: string;
    trust_level: TrustLevel;
    title: string;
    description?: string;
    estimated_hours?: number;
    requirements?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('delegations')
        .insert({
          delegator_id: user.id,
          ...delegationData,
          status: 'pending',
          completion_percentage: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Create automatic follow-ups based on trust level
      await supabase.rpc('create_delegation_follow_ups', {
        p_delegation_id: data.id
      });

      // Refresh delegations list
      await fetchDelegations();

      return data;
    } catch (err) {
      console.error('Failed to create delegation:', err);
      throw err;
    }
  };

  // Update delegation
  const updateDelegation = async (
    delegationId: string,
    updates: Partial<Delegation>
  ) => {
    try {
      const { error } = await supabase
        .from('delegations')
        .update(updates)
        .eq('id', delegationId);

      if (error) throw error;

      // Refresh delegations list
      await fetchDelegations();
      await fetchAnalytics();
    } catch (err) {
      console.error('Failed to update delegation:', err);
      throw err;
    }
  };

  // Delete delegation
  const deleteDelegation = async (delegationId: string) => {
    try {
      const { error } = await supabase
        .from('delegations')
        .delete()
        .eq('id', delegationId);

      if (error) throw error;

      // Refresh delegations list
      await fetchDelegations();
      await fetchAnalytics();
    } catch (err) {
      console.error('Failed to delete delegation:', err);
      throw err;
    }
  };

  // Get delegations by status
  const getDelegationsByStatus = useCallback((status: string) => {
    return delegations.filter(delegation => delegation.status === status);
  }, [delegations]);

  // Get delegations by trust level
  const getDelegationsByTrustLevel = useCallback((trustLevel: TrustLevel) => {
    return delegations.filter(delegation => delegation.trust_level === trustLevel);
  }, [delegations]);

  // Calculate success rate for specific trust level
  const getSuccessRateByTrustLevel = useCallback((trustLevel: TrustLevel) => {
    const levelDelegations = getDelegationsByTrustLevel(trustLevel);
    const completed = levelDelegations.filter(d => d.status === 'completed');

    if (levelDelegations.length === 0) return 0;
    return (completed.length / levelDelegations.length) * 100;
  }, [getDelegationsByTrustLevel]);

  // Initialize data
  useEffect(() => {
    if (user) {
      fetchDelegations();
      fetchAnalytics();
    }
  }, [user, fetchDelegations, fetchAnalytics]);

  return {
    delegations,
    analytics,
    loading,
    error,
    createDelegation,
    updateDelegation,
    deleteDelegation,
    getDelegationsByStatus,
    getDelegationsByTrustLevel,
    getSuccessRateByTrustLevel,
    refreshDelegations: fetchDelegations,
    refreshAnalytics: fetchAnalytics
  };
}