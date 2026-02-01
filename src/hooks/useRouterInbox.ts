// Custom hook for Router Inbox functionality in Multiplier mode
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RouterInboxItem {
  id: string;
  user_id: string;
  request_from: string;
  request_content: string;
  request_type: 'meeting' | 'task' | 'question' | 'decision' | 'approval';
  priority: number;
  status: 'pending' | 'routed' | 'scheduled' | 'declined' | 'responded' | 'converted';
  routed_to?: string;
  routing_context?: string;
  estimated_effort_hours?: number;
  deadline?: string;
  tags: string[];
  response_template?: string;
  created_at: string;
  resolved_at?: string;
  updated_at: string;

  // Joined data
  routed_to_name?: string;
}

interface TriageUpdate {
  status: 'routed' | 'scheduled' | 'declined' | 'responded' | 'converted';
  routed_to?: string;
  routing_context?: string;
  estimated_effort_hours?: number;
  deadline?: string;
  resolved_at: string;
}

export function useRouterInbox() {
  const { user } = useAuth();
  const [inboxItems, setInboxItems] = useState<RouterInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch inbox items for current user
  const fetchInboxItems = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('router_inbox')
        .select(`
          *,
          routed_to_user:routed_to(
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const transformedItems: RouterInboxItem[] = data?.map(item => ({
        ...item,
        routed_to_name: item.routed_to_user?.raw_user_meta_data?.full_name ||
                       item.routed_to_user?.email ||
                       'Unknown User'
      })) || [];

      setInboxItems(transformedItems);
    } catch (err) {
      console.error('Failed to fetch inbox items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inbox items');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create new inbox item
  const createInboxItem = async (itemData: {
    request_from: string;
    request_content: string;
    request_type: 'meeting' | 'task' | 'question' | 'decision' | 'approval';
    priority?: number;
    estimated_effort_hours?: number;
    deadline?: string;
    tags?: string[];
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('router_inbox')
        .insert({
          user_id: user.id,
          priority: 3, // Default medium priority
          status: 'pending',
          tags: [],
          ...itemData
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh inbox items
      await fetchInboxItems();

      return data;
    } catch (err) {
      console.error('Failed to create inbox item:', err);
      throw err;
    }
  };

  // Update inbox item
  const updateInboxItem = async (
    itemId: string,
    updates: Partial<RouterInboxItem>
  ) => {
    try {
      const { error } = await supabase
        .from('router_inbox')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      // Refresh inbox items
      await fetchInboxItems();
    } catch (err) {
      console.error('Failed to update inbox item:', err);
      throw err;
    }
  };

  // Triage request with specific action
  const triageRequest = async (
    itemId: string,
    action: 'route' | 'schedule' | 'respond' | 'decline' | 'convert',
    actionData: {
      routed_to?: string;
      routing_context?: string;
      estimated_effort_hours?: number;
      deadline?: string;
      response_text?: string;
    }
  ) => {
    try {
      const updates: TriageUpdate = {
        status: action === 'route' ? 'routed' :
                action === 'schedule' ? 'scheduled' :
                action === 'respond' ? 'responded' :
                action === 'decline' ? 'declined' : 'converted',
        resolved_at: new Date().toISOString()
      };

      if (actionData.routed_to) updates.routed_to = actionData.routed_to;
      if (actionData.routing_context) updates.routing_context = actionData.routing_context;
      if (actionData.estimated_effort_hours) updates.estimated_effort_hours = actionData.estimated_effort_hours;
      if (actionData.deadline) updates.deadline = actionData.deadline;

      // If routing to team member, update their workload
      if (action === 'route' && actionData.routed_to && actionData.estimated_effort_hours) {
        // This would integrate with team workload tracking
        await updateTeamMemberWorkload(actionData.routed_to, actionData.estimated_effort_hours);
      }

      await updateInboxItem(itemId, updates);

      // Send notification to routed team member (placeholder)
      if (action === 'route' && actionData.routed_to) {
        await notifyTeamMember(actionData.routed_to, updates.routing_context || '');
      }

      return updates;
    } catch (err) {
      console.error('Failed to triage request:', err);
      throw err;
    }
  };

  // Helper function to update team member workload
  const updateTeamMemberWorkload = async (userId: string, hours: number) => {
    try {
      // Update team_workload_indicators table
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('team_workload_indicators')
        .upsert({
          member_user_id: userId,
          date: today,
          delegated_hours: hours
        }, {
          onConflict: 'member_user_id,date'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update workload:', err);
      // Don't throw - this is a non-critical update
    }
  };

  // Helper function to notify team member (placeholder for future implementation)
  const notifyTeamMember = async (userId: string, context: string) => {
    try {
      // This could integrate with notification system
      console.log(`Notifying user ${userId}: ${context}`);
      // Future: Send email, Slack message, or in-app notification
    } catch (err) {
      console.error('Failed to notify team member:', err);
      // Don't throw - this is a non-critical update
    }
  };

  // Delete inbox item
  const deleteInboxItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('router_inbox')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Refresh inbox items
      await fetchInboxItems();
    } catch (err) {
      console.error('Failed to delete inbox item:', err);
      throw err;
    }
  };

  // Get items by status
  const getItemsByStatus = useCallback((status: string) => {
    return inboxItems.filter(item => item.status === status);
  }, [inboxItems]);

  // Get items by priority
  const getItemsByPriority = useCallback((priority: number) => {
    return inboxItems.filter(item => item.priority === priority);
  }, [inboxItems]);

  // Get overdue items
  const getOverdueItems = useCallback(() => {
    const now = new Date();
    return inboxItems.filter(item =>
      item.deadline &&
      new Date(item.deadline) < now &&
      item.status === 'pending'
    );
  }, [inboxItems]);

  // Get items due today
  const getItemsDueToday = useCallback(() => {
    const today = new Date().toDateString();
    return inboxItems.filter(item =>
      item.deadline &&
      new Date(item.deadline).toDateString() === today &&
      item.status === 'pending'
    );
  }, [inboxItems]);

  // Bulk triage operations
  const bulkTriage = async (itemIds: string[], action: string, actionData: any) => {
    try {
      const promises = itemIds.map(id => triageRequest(id, action as any, actionData));
      await Promise.all(promises);

      toast.success(`Successfully ${action}d ${itemIds.length} requests`);
    } catch (err) {
      console.error('Failed to bulk triage:', err);
      toast.error('Some requests failed to process');
      throw err;
    }
  };

  // Auto-suggest routing targets based on request content and team workload
  const getSuggestedRoutingTargets = useCallback((item: RouterInboxItem, teamMembers: any[]) => {
    // Simple heuristic - in real implementation this could use AI/ML
    const availableMembers = teamMembers.filter(member => {
      // Filter out overloaded members (>90% workload)
      return !member.workload || member.workload < 90;
    });

    // Sort by workload (ascending) and return top 3
    return availableMembers
      .sort((a, b) => (a.workload || 0) - (b.workload || 0))
      .slice(0, 3)
      .map(member => ({
        user_id: member.user_id,
        name: member.name,
        workload: member.workload || 0,
        confidence: Math.max(0.5, 1 - (member.workload || 0) / 100),
        reasoning: `Low workload (${Math.round(member.workload || 0)}%)`
      }));
  }, []);

  // Initialize data
  useEffect(() => {
    if (user) {
      fetchInboxItems();
    }
  }, [user, fetchInboxItems]);

  return {
    inboxItems,
    loading,
    error,
    createInboxItem,
    updateInboxItem,
    triageRequest,
    deleteInboxItem,
    bulkTriage,
    getItemsByStatus,
    getItemsByPriority,
    getOverdueItems,
    getItemsDueToday,
    getSuggestedRoutingTargets,
    refreshInboxItems: fetchInboxItems
  };
}