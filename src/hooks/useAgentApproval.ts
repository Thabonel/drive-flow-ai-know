import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AgentAction {
  type: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  data: Record<string, any>;
}

export interface ApprovalResult {
  approved: boolean;
  dontAskAgain: boolean;
}

export function useAgentApproval(userId: string) {
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<AgentAction | null>(null);
  const [resolveApproval, setResolveApproval] = useState<((result: ApprovalResult) => void) | null>(null);
  const { toast } = useToast();

  // Check if action needs approval
  const needsApproval = useCallback(async (actionType: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('agent_approval_mode, agent_auto_approved_actions')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // If in auto mode, no approval needed
      if (data.agent_approval_mode === 'auto') {
        return false;
      }

      // Check if this action type is in the auto-approved list
      const autoApprovedActions = data.agent_auto_approved_actions || [];
      if (autoApprovedActions.includes(actionType)) {
        return false;
      }

      // Otherwise, approval is needed
      return true;
    } catch (error) {
      console.error('Error checking approval requirements:', error);
      // Default to requiring approval on error
      return true;
    }
  }, [userId]);

  // Request approval for an action
  const requestApproval = useCallback(async (action: AgentAction): Promise<ApprovalResult> => {
    // First check if approval is needed
    const required = await needsApproval(action.type);
    if (!required) {
      return { approved: true, dontAskAgain: false };
    }

    // Show approval modal and wait for user response
    return new Promise((resolve) => {
      setPendingAction(action);
      setResolveApproval(() => resolve);
      setIsApprovalModalOpen(true);
    });
  }, [needsApproval]);

  // Handle user approval decision
  const handleApprovalDecision = useCallback(async (approved: boolean, dontAskAgain: boolean) => {
    if (!pendingAction || !resolveApproval) return;

    // If user selected "don't ask again", add to auto-approved list
    if (dontAskAgain && approved) {
      try {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('agent_auto_approved_actions')
          .eq('user_id', userId)
          .single();

        const currentAutoApproved = settings?.agent_auto_approved_actions || [];
        const updatedAutoApproved = [...currentAutoApproved, pendingAction.type];

        await supabase
          .from('user_settings')
          .update({ agent_auto_approved_actions: updatedAutoApproved })
          .eq('user_id', userId);

        toast({
          title: 'Preference Saved',
          description: `Future "${pendingAction.title}" actions will be executed automatically.`,
        });
      } catch (error) {
        console.error('Error saving auto-approval preference:', error);
      }
    }

    // Resolve the promise with the result
    resolveApproval({ approved, dontAskAgain });

    // Reset state
    setIsApprovalModalOpen(false);
    setPendingAction(null);
    setResolveApproval(null);
  }, [pendingAction, resolveApproval, userId, toast]);

  // Cancel approval request
  const cancelApproval = useCallback(() => {
    if (resolveApproval) {
      resolveApproval({ approved: false, dontAskAgain: false });
    }
    setIsApprovalModalOpen(false);
    setPendingAction(null);
    setResolveApproval(null);
  }, [resolveApproval]);

  return {
    isApprovalModalOpen,
    pendingAction,
    requestApproval,
    handleApprovalDecision,
    cancelApproval,
    needsApproval,
  };
}
