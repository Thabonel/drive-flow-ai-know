import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import {
  createChatCompletion,
  isOpenAIConfigured,
  ChatMessage,
} from '@/lib/ai/openai-client';
import {
  TimeTrackingData,
  TimeIntelligenceResponse,
  generateTimeIntelligenceSystemPrompt,
  generateTimeIntelligencePrompt,
  parseTimeIntelligenceResponse,
  calculateAIEstimate,
} from '@/lib/ai/prompts/time-intelligence';

export const useAITimeIntelligence = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [trackingData, setTrackingData] = useState<TimeTrackingData[]>([]);
  const [insights, setInsights] = useState<TimeIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch time tracking data
  const fetchTrackingData = async (limit: number = 100) => {
    if (!user) {
      setTrackingData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('time_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setTrackingData(data || []);
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tracking data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Track task completion manually
  const trackTaskCompletion = async (
    taskId: string,
    actualDurationMinutes: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from('timeline_items')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Create tracking record
      const { error: insertError } = await supabase.from('time_tracking').insert({
        user_id: user.id,
        task_id: taskId,
        task_title: task.title,
        task_type: task.is_meeting ? 'meeting' : 'work',
        estimated_duration_minutes: task.planned_duration_minutes,
        actual_duration_minutes: actualDurationMinutes,
        completed_at: task.completed_at || new Date().toISOString(),
        day_of_week: new Date(task.completed_at || new Date()).getDay(),
        hour_of_day: new Date(task.completed_at || new Date()).getHours(),
      });

      if (insertError) throw insertError;

      await fetchTrackingData();
      return true;
    } catch (err) {
      console.error('Error tracking task completion:', err);
      toast({
        title: 'Error',
        description: 'Failed to track task completion',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Analyze patterns and generate insights using AI
  const analyzePatterns = async (
    focusArea?: 'estimation' | 'productivity' | 'all'
  ): Promise<TimeIntelligenceResponse | null> => {
    if (!isOpenAIConfigured()) {
      toast({
        title: 'OpenAI not configured',
        description: 'Please add your OpenAI API key to use AI insights.',
        variant: 'destructive',
      });
      return null;
    }

    if (trackingData.length === 0) {
      toast({
        title: 'No data yet',
        description: 'Complete some tasks to start getting AI insights!',
        variant: 'default',
      });
      return null;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: generateTimeIntelligenceSystemPrompt(),
        },
        {
          role: 'user',
          content: generateTimeIntelligencePrompt(trackingData, focusArea),
        },
      ];

      const response = await createChatCompletion(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000,
      });

      const parsedInsights = parseTimeIntelligenceResponse(response);

      setInsights(parsedInsights);

      toast({
        title: 'Analysis complete',
        description: `Generated ${parsedInsights.insights.length} insights from ${parsedInsights.total_tasks_analyzed} tasks`,
      });

      return parsedInsights;
    } catch (err) {
      console.error('Error analyzing patterns:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze patterns';
      setError(errorMessage);

      toast({
        title: 'Analysis failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  // Get AI-powered estimate for a new task
  const getAIEstimate = (
    taskTitle: string,
    taskType: string = 'work'
  ): {
    estimated_minutes: number;
    confidence: number;
    reasoning: string;
  } => {
    return calculateAIEstimate(taskTitle, taskType, trackingData);
  };

  // Get basic statistics without AI
  const getBasicStats = () => {
    if (trackingData.length === 0) {
      return {
        totalTasks: 0,
        avgAccuracy: 0,
        avgOverrun: 0,
        learningStatus: 'learning' as const,
      };
    }

    const tasksWithEstimates = trackingData.filter(
      (t) => t.estimated_duration_minutes !== null
    );

    const avgAccuracy =
      tasksWithEstimates.length > 0
        ? tasksWithEstimates.reduce((sum, t) => sum + (t.accuracy_percent || 0), 0) /
          tasksWithEstimates.length
        : 0;

    const avgOverrun =
      tasksWithEstimates.length > 0
        ? tasksWithEstimates.reduce((sum, t) => sum + t.overrun_minutes, 0) /
          tasksWithEstimates.length
        : 0;

    let learningStatus: 'learning' | 'confident' | 'expert' = 'learning';
    if (trackingData.length >= 50) {
      learningStatus = 'expert';
    } else if (trackingData.length >= 10) {
      learningStatus = 'confident';
    }

    return {
      totalTasks: trackingData.length,
      avgAccuracy: Number(avgAccuracy.toFixed(1)),
      avgOverrun: Number(avgOverrun.toFixed(1)),
      learningStatus,
    };
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchTrackingData();
    }
  }, [user?.id]);

  return {
    trackingData,
    insights,
    loading,
    analyzing,
    error,
    isConfigured: isOpenAIConfigured(),
    fetchTrackingData,
    trackTaskCompletion,
    analyzePatterns,
    getAIEstimate,
    getBasicStats,
  };
};
