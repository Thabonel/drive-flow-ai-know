import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface ReceivedEmail {
  id: string;
  from_email: string;
  from_name?: string;
  subject: string;
  body_text: string;
  body_html?: string;
  received_at: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'ignored';
  processed_at?: string;
  ai_extracted_tasks: any[];
  ai_summary?: string;
  ai_category?: string;
  ai_priority?: number;
  user_reviewed: boolean;
  ignored_reason?: string;
}

interface EmailTask {
  id: string;
  email_id: string;
  title: string;
  description?: string;
  estimated_duration_minutes?: number;
  ai_priority: number;
  ai_suggested_deadline?: string;
  ai_category?: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  user_edited_title?: string;
  user_edited_description?: string;
  user_edited_priority?: number;
  user_edited_deadline?: string;
  created_at: string;
}

interface SenderPattern {
  id: string;
  sender_email: string;
  total_emails_received: number;
  actionable_count: number;
  ignored_count: number;
  spam_count: number;
  auto_category?: string;
  auto_priority?: number;
  auto_ignore: boolean;
}

export function useAIEmailParser() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingEmails, setPendingEmails] = useState<ReceivedEmail[]>([]);
  const [pendingTasks, setPendingTasks] = useState<EmailTask[]>([]);
  const [senderPatterns, setSenderPatterns] = useState<SenderPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch pending emails
  const fetchPendingEmails = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('received_emails')
        .select('*')
        .eq('user_id', user.id)
        .eq('processing_status', 'completed')
        .eq('user_reviewed', false)
        .order('received_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setPendingEmails(data || []);
    } catch (err) {
      console.error('Error fetching pending emails:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch pending tasks
  const fetchPendingTasks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('email_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('ai_priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPendingTasks(data || []);
    } catch (err) {
      console.error('Error fetching pending tasks:', err);
    }
  }, [user]);

  // Fetch sender patterns
  const fetchSenderPatterns = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('email_sender_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('total_emails_received', { ascending: false });

      if (fetchError) throw fetchError;

      setSenderPatterns(data || []);
    } catch (err) {
      console.error('Error fetching sender patterns:', err);
    }
  }, [user]);

  // Approve a task (convert to timeline item)
  const approveTask = useCallback(async (taskId: string, timelineItemData?: any) => {
    if (!user) return;

    try {
      const task = pendingTasks.find(t => t.id === taskId);
      if (!task) return;

      // Create timeline item
      const { data: timelineItem, error: createError } = await supabase
        .from('timeline_items')
        .insert({
          user_id: user.id,
          title: task.user_edited_title || task.title,
          description: task.user_edited_description || task.description,
          type: 'task',
          start_time: new Date().toISOString(),
          end_time: task.user_edited_deadline || task.ai_suggested_deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            priority: task.user_edited_priority || task.ai_priority,
            estimatedDuration: task.estimated_duration_minutes ? `${task.estimated_duration_minutes} min` : undefined,
            category: task.ai_category,
            fromEmail: true,
            ...timelineItemData
          }
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update task status
      const { error: updateError } = await supabase
        .from('email_tasks')
        .update({
          status: 'converted',
          timeline_item_id: timelineItem.id,
          converted_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      toast({
        title: 'Task Approved',
        description: 'Task has been added to your timeline.',
      });

      // Refresh lists
      fetchPendingTasks();
    } catch (err) {
      console.error('Error approving task:', err);
      toast({
        title: 'Approval Failed',
        description: 'Failed to approve task. Please try again.',
        variant: 'destructive',
      });
    }
  }, [user, pendingTasks, toast, fetchPendingTasks]);

  // Reject a task
  const rejectTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('email_tasks')
        .update({ status: 'rejected' })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Task Rejected',
        description: 'Task has been removed.',
      });

      fetchPendingTasks();
    } catch (err) {
      console.error('Error rejecting task:', err);
      toast({
        title: 'Rejection Failed',
        description: 'Failed to reject task. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast, fetchPendingTasks]);

  // Update task details
  const updateTask = useCallback(async (taskId: string, updates: Partial<EmailTask>) => {
    try {
      const { error } = await supabase
        .from('email_tasks')
        .update({
          user_edited_title: updates.user_edited_title,
          user_edited_description: updates.user_edited_description,
          user_edited_priority: updates.user_edited_priority,
          user_edited_deadline: updates.user_edited_deadline
        })
        .eq('id', taskId);

      if (error) throw error;

      fetchPendingTasks();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  }, [fetchPendingTasks]);

  // Mark email as reviewed
  const markEmailReviewed = useCallback(async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('received_emails')
        .update({ user_reviewed: true })
        .eq('id', emailId);

      if (error) throw error;

      fetchPendingEmails();
    } catch (err) {
      console.error('Error marking email as reviewed:', err);
    }
  }, [fetchPendingEmails]);

  // Ignore email
  const ignoreEmail = useCallback(async (emailId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('received_emails')
        .update({
          processing_status: 'ignored',
          user_reviewed: true,
          ignored_reason: reason || 'Ignored by user'
        })
        .eq('id', emailId);

      if (error) throw error;

      toast({
        title: 'Email Ignored',
        description: 'Email has been marked as ignored.',
      });

      fetchPendingEmails();
    } catch (err) {
      console.error('Error ignoring email:', err);
    }
  }, [toast, fetchPendingEmails]);

  // Update sender pattern
  const updateSenderPattern = useCallback(async (
    senderEmail: string,
    updates: { auto_ignore?: boolean; auto_category?: string; auto_priority?: number }
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('email_sender_patterns')
        .update(updates)
        .eq('user_id', user.id)
        .eq('sender_email', senderEmail);

      if (error) throw error;

      toast({
        title: 'Sender Pattern Updated',
        description: 'Future emails from this sender will be handled accordingly.',
      });

      fetchSenderPatterns();
    } catch (err) {
      console.error('Error updating sender pattern:', err);
      toast({
        title: 'Update Failed',
        description: 'Failed to update sender pattern.',
        variant: 'destructive',
      });
    }
  }, [user, toast, fetchSenderPatterns]);

  // Approve all pending tasks
  const approveAllTasks = useCallback(async () => {
    if (!user) return;

    try {
      for (const task of pendingTasks) {
        await approveTask(task.id);
      }

      toast({
        title: 'All Tasks Approved',
        description: `${pendingTasks.length} tasks have been added to your timeline.`,
      });
    } catch (err) {
      console.error('Error approving all tasks:', err);
      toast({
        title: 'Bulk Approval Failed',
        description: 'Failed to approve all tasks. Please try individually.',
        variant: 'destructive',
      });
    }
  }, [user, pendingTasks, approveTask, toast]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchPendingEmails();
      fetchPendingTasks();
      fetchSenderPatterns();
    }
  }, [user, fetchPendingEmails, fetchPendingTasks, fetchSenderPatterns]);

  return {
    pendingEmails,
    pendingTasks,
    senderPatterns,
    loading,
    error,
    fetchPendingEmails,
    fetchPendingTasks,
    fetchSenderPatterns,
    approveTask,
    rejectTask,
    updateTask,
    markEmailReviewed,
    ignoreEmail,
    updateSenderPattern,
    approveAllTasks
  };
}
