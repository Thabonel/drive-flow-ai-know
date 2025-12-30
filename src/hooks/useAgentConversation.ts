import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AgentMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sequence_number: number;
  metadata: {
    tasks_created?: string[];
    sub_agents_spawned?: string[];
    tokens_used?: number;
    execution_time_ms?: number;
    translation_duration_ms?: number;
  };
  timestamp: string;
}

export interface AgentConversation {
  id: string;
  user_id: string;
  session_id: string;
  title: string;
  status: 'active' | 'archived';
  message_count: number;
  task_count: number;
  sub_agents_spawned: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

interface UseAgentConversationOptions {
  sessionId: string | undefined;
  userId: string;
}

export function useAgentConversation({ sessionId, userId }: UseAgentConversationOptions) {
  const [conversation, setConversation] = useState<AgentConversation | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load or create conversation for session
  const loadOrCreateConversation = useCallback(async () => {
    if (!sessionId || !userId) {
      setLoading(false);
      return;
    }

    try {
      // Check for existing active conversation for this session
      const { data: existingConv, error: fetchError } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingConv) {
        setConversation(existingConv);
        await loadMessages(existingConv.id);
      } else {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('agent_conversations')
          .insert({
            user_id: userId,
            session_id: sessionId,
            title: 'New Agent Conversation',
            status: 'active',
          })
          .select()
          .single();

        if (createError) throw createError;

        setConversation(newConv);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading/creating conversation:', error);
      toast({
        title: 'Conversation Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId, userId, toast]);

  // Load messages for conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('agent_conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sequence_number', { ascending: true });

      if (error) throw error;

      setMessages(data as AgentMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Add message (optimistic UI)
  const addMessage = useCallback((message: AgentMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Update conversation metrics
  const updateMetrics = useCallback(async (updates: {
    message_count?: number;
    task_count?: number;
    sub_agents_spawned?: number;
    tokens_used?: number;
  }) => {
    if (!conversation) return;

    try {
      const { error } = await supabase
        .from('agent_conversations')
        .update(updates)
        .eq('id', conversation.id);

      if (error) throw error;

      // Update local state
      setConversation(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating conversation metrics:', error);
    }
  }, [conversation]);

  // Auto-generate conversation title from first command
  const updateTitle = useCallback(async (command: string) => {
    if (!conversation || conversation.title !== 'New Agent Conversation') return;

    const title = command.slice(0, 50) + (command.length > 50 ? '...' : '');

    try {
      const { error } = await supabase
        .from('agent_conversations')
        .update({ title })
        .eq('id', conversation.id);

      if (error) throw error;

      setConversation(prev => prev ? { ...prev, title } : null);
    } catch (error) {
      console.error('Error updating title:', error);
    }
  }, [conversation]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`agent_messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_conversation_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          console.log('New agent message:', payload.new);
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as AgentMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation]);

  // Load conversation on mount
  useEffect(() => {
    loadOrCreateConversation();
  }, [loadOrCreateConversation]);

  return {
    conversation,
    messages,
    loading,
    addMessage,
    updateMetrics,
    updateTitle,
  };
}
