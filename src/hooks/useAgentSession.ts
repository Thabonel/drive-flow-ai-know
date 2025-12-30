import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AgentSession {
  id: string;
  user_id: string;
  started_at: string;
  last_active_at: string;
  status: 'active' | 'paused' | 'completed';
  tokens_used: number;
  tokens_budget: number;
  tasks_completed: number;
  sub_agents_spawned: number;
  created_at: string;
  updated_at: string;
}

interface UseAgentSessionOptions {
  userId: string;
  enabled: boolean; // Whether agent mode is enabled
  tokensBudget?: number; // Daily token budget
}

export function useAgentSession({ userId, enabled, tokensBudget = 100000 }: UseAgentSessionOptions) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create or resume session when agent mode is enabled
  const createOrResumeSession = useCallback(async () => {
    if (!enabled || !userId) return;

    setLoading(true);
    setError(null);

    try {
      // Check for existing active session
      const { data: existingSession, error: fetchError } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSession) {
        // Resume existing session
        setSession(existingSession);
        toast({
          title: 'Agent Session Resumed',
          description: `Resuming session from ${new Date(existingSession.started_at).toLocaleTimeString()}`,
        });
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('agent_sessions')
          .insert({
            user_id: userId,
            status: 'active',
            tokens_budget: tokensBudget,
            tokens_used: 0,
            tasks_completed: 0,
            sub_agents_spawned: 0,
          })
          .select()
          .single();

        if (createError) throw createError;

        setSession(newSession);
        toast({
          title: 'Agent Session Started',
          description: 'Your AI assistant is now active',
        });

        // Log session start to agent memory
        await supabase
          .from('agent_memory')
          .insert({
            session_id: newSession.id,
            user_id: userId,
            memory_type: 'checkpoint',
            content: {
              event: 'session_started',
              timestamp: new Date().toISOString(),
            },
            importance: 4,
          });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      console.error('Error creating/resuming agent session:', err);
      toast({
        title: 'Session Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [enabled, userId, tokensBudget, toast]);

  // Update session heartbeat
  const updateHeartbeat = useCallback(async () => {
    if (!session) return;

    try {
      const { error: updateError } = await supabase
        .from('agent_sessions')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', session.id);

      if (updateError) {
        console.error('Error updating heartbeat:', updateError);
      }
    } catch (err) {
      console.error('Heartbeat update failed:', err);
    }
  }, [session]);

  // Pause session
  const pauseSession = useCallback(async () => {
    if (!session) return;

    try {
      const { error: pauseError } = await supabase
        .from('agent_sessions')
        .update({ status: 'paused' })
        .eq('id', session.id);

      if (pauseError) throw pauseError;

      // Log pause to agent memory
      await supabase
        .from('agent_memory')
        .insert({
          session_id: session.id,
          user_id: userId,
          memory_type: 'checkpoint',
          content: {
            event: 'session_paused',
            timestamp: new Date().toISOString(),
            tasks_completed: session.tasks_completed,
            tokens_used: session.tokens_used,
          },
          importance: 3,
        });

      setSession(null);
    } catch (err) {
      console.error('Error pausing session:', err);
    }
  }, [session, userId]);

  // Complete session
  const completeSession = useCallback(async () => {
    if (!session) return;

    try {
      const { error: completeError } = await supabase
        .from('agent_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);

      if (completeError) throw completeError;

      // Log completion to agent memory
      await supabase
        .from('agent_memory')
        .insert({
          session_id: session.id,
          user_id: userId,
          memory_type: 'checkpoint',
          content: {
            event: 'session_completed',
            timestamp: new Date().toISOString(),
            final_stats: {
              tasks_completed: session.tasks_completed,
              tokens_used: session.tokens_used,
              sub_agents_spawned: session.sub_agents_spawned,
              duration_seconds: Math.floor(
                (new Date().getTime() - new Date(session.started_at).getTime()) / 1000
              ),
            },
          },
          importance: 4,
        });

      toast({
        title: 'Agent Session Completed',
        description: `Completed ${session.tasks_completed} tasks`,
      });

      setSession(null);
    } catch (err) {
      console.error('Error completing session:', err);
    }
  }, [session, userId, toast]);

  // Initialize session when enabled
  useEffect(() => {
    if (enabled) {
      createOrResumeSession();
    } else if (session) {
      pauseSession();
    }
  }, [enabled]); // Only run when enabled changes

  // Set up heartbeat interval
  useEffect(() => {
    if (session && enabled) {
      // Update heartbeat every 30 seconds
      heartbeatIntervalRef.current = setInterval(() => {
        updateHeartbeat();
      }, 30000);

      // Cleanup interval on unmount or session change
      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      };
    }
  }, [session, enabled, updateHeartbeat]);

  // Pause session on unmount
  useEffect(() => {
    return () => {
      if (session) {
        // Pause session when component unmounts (browser close)
        pauseSession();
      }
    };
  }, [session]); // Only depend on session to avoid infinite loops

  return {
    session,
    loading,
    error,
    pauseSession,
    completeSession,
    updateHeartbeat,
  };
}
