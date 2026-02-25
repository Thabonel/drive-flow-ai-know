/**
 * Background Tasks Context
 *
 * Manages AI tasks that run in the background and persist across page navigation.
 * Shows notifications when tasks complete so users can return to view results.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export interface MatchedDocument {
  id: string;
  title: string;
  file_type?: string;
  category?: string;
}

export interface BackgroundTask {
  id: string;
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: string;
  result?: string;
  matchedDocuments?: MatchedDocument[];
  error?: string;
  startedAt: string;
  completedAt?: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  conversationContext?: Array<{ role: string; content: string }>;
  useDocuments?: boolean;
}

interface BackgroundTasksContextType {
  tasks: BackgroundTask[];
  activeTaskCount: number;
  submitTask: (params: {
    query: string;
    knowledgeBaseId?: string;
    knowledgeBaseName?: string;
    conversationContext?: Array<{ role: string; content: string }>;
    useDocuments?: boolean;
  }) => string;
  getTask: (id: string) => BackgroundTask | undefined;
  clearTask: (id: string) => void;
  clearCompletedTasks: () => void;
}

const BackgroundTasksContext = createContext<BackgroundTasksContextType | null>(null);

export function BackgroundTasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Count active (running) tasks
  const activeTaskCount = tasks.filter(t => t.status === 'running' || t.status === 'pending').length;

  // Generate unique task ID
  const generateTaskId = () => `task-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Update task in state
  const updateTask = useCallback((id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
  }, []);

  // Execute the AI query
  const executeTask = useCallback(async (task: BackgroundTask) => {
    const abortController = new AbortController();
    abortControllersRef.current.set(task.id, abortController);

    try {
      updateTask(task.id, { status: 'running', progress: 'Connecting to AI...' });

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (!authToken) {
        throw new Error('No authentication token available');
      }

      updateTask(task.id, { progress: 'Processing your request...' });

      // Diagnostic logging for document access debugging
      console.log('🔍 BackgroundTasks using documents:', task.useDocuments ?? true);

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/ai-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            query: task.query,
            knowledge_base_id: task.knowledgeBaseId,
            use_documents: task.useDocuments ?? true,
            conversationContext: task.conversationContext || [],
          }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Request failed');
      }

      const data = await response.json();

      updateTask(task.id, {
        status: 'completed',
        result: data.response || 'No response generated',
        matchedDocuments: data.matched_documents || [],
        completedAt: new Date().toISOString(),
        progress: undefined,
      });

      // Show completion notification
      toast({
        title: 'AI Task Complete',
        description: (
          <div className="flex flex-col gap-2">
            <span className="text-sm truncate max-w-[250px]">"{task.query.substring(0, 50)}..."</span>
            <button
              onClick={() => navigate('/')}
              className="text-primary underline text-sm text-left"
            >
              View results
            </button>
          </div>
        ),
        duration: 10000, // Show for 10 seconds
      });

    } catch (error) {
      // Check if aborted
      if (error instanceof Error && error.name === 'AbortError') {
        updateTask(task.id, {
          status: 'failed',
          error: 'Task was cancelled',
          completedAt: new Date().toISOString(),
        });
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateTask(task.id, {
        status: 'failed',
        error: errorMessage,
        completedAt: new Date().toISOString(),
      });

      toast({
        title: 'AI Task Failed',
        description: `"${task.query.substring(0, 30)}..." - ${errorMessage}`,
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      abortControllersRef.current.delete(task.id);
    }
  }, [updateTask, toast, navigate]);

  // Submit a new task
  const submitTask = useCallback((params: {
    query: string;
    knowledgeBaseId?: string;
    knowledgeBaseName?: string;
    conversationContext?: Array<{ role: string; content: string }>;
    useDocuments?: boolean;
  }): string => {
    const taskId = generateTaskId();

    const newTask: BackgroundTask = {
      id: taskId,
      query: params.query,
      status: 'pending',
      startedAt: new Date().toISOString(),
      knowledgeBaseId: params.knowledgeBaseId,
      knowledgeBaseName: params.knowledgeBaseName,
      conversationContext: params.conversationContext,
      useDocuments: params.useDocuments,
    };

    setTasks(prev => [newTask, ...prev]);

    // Start execution asynchronously
    setTimeout(() => executeTask(newTask), 0);

    toast({
      title: 'Task Started',
      description: 'Your AI task is running in the background. You can navigate away.',
    });

    return taskId;
  }, [executeTask, toast]);

  // Get a specific task
  const getTask = useCallback((id: string) => {
    return tasks.find(t => t.id === id);
  }, [tasks]);

  // Clear a task
  const clearTask = useCallback((id: string) => {
    // Abort if still running
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
    }
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // Clear all completed tasks
  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status === 'running' || t.status === 'pending'));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort all running tasks on provider unmount (app close)
      abortControllersRef.current.forEach(controller => controller.abort());
    };
  }, []);

  return (
    <BackgroundTasksContext.Provider
      value={{
        tasks,
        activeTaskCount,
        submitTask,
        getTask,
        clearTask,
        clearCompletedTasks,
      }}
    >
      {children}
    </BackgroundTasksContext.Provider>
  );
}

export function useBackgroundTasks() {
  const context = useContext(BackgroundTasksContext);
  if (!context) {
    throw new Error('useBackgroundTasks must be used within BackgroundTasksProvider');
  }
  return context;
}
