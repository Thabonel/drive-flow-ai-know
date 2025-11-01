import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface DailyPlanningSettings {
  id: string;
  user_id: string;
  planning_time: string;
  duration_minutes: number;
  skip_weekends: boolean;
  review_yesterday: boolean;
  import_calendar: boolean;
  set_priorities: boolean;
  check_workload: boolean;
  enable_notifications: boolean;
  snooze_duration_minutes: number;
  quick_planning_enabled: boolean;
  shutdown_time: string | null;
  enable_shutdown_ritual: boolean;
}

export interface DailyPlanningSession {
  id: string;
  user_id: string;
  planning_date: string;
  started_at: string;
  completed_at: string | null;
  is_quick_planning: boolean;
  reviewed_yesterday: boolean;
  imported_calendar: boolean;
  set_priorities: boolean;
  checked_workload: boolean;
  committed_schedule: boolean;
  yesterday_completed_count: number;
  yesterday_total_count: number;
  priority_task_ids: string[];
  total_planned_minutes: number;
}

export interface DailyShutdownSession {
  id: string;
  user_id: string;
  shutdown_date: string;
  completed_at: string;
  tasks_completed: number;
  tasks_total: number;
  minutes_worked: number | null;
  moved_to_tomorrow: string[];
  wins: string[];
  challenges: string[];
}

export interface PlanningStreak {
  longest_streak: number;
  current_streak: number;
  total_streaks: number;
}

export const useDailyPlanning = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<DailyPlanningSettings | null>(null);
  const [todaySession, setTodaySession] = useState<DailyPlanningSession | null>(null);
  const [todayShutdown, setTodayShutdownSession] = useState<DailyShutdownSession | null>(null);
  const [streak, setStreak] = useState<PlanningStreak | null>(null);
  const [loading, setLoading] = useState(false);
  const [planningNeeded, setPlanningNeeded] = useState(false);
  const [shutdownNeeded, setShutdownNeeded] = useState(false);

  // Fetch user's planning settings
  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('daily_planning_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
      } else {
        // Create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('daily_planning_settings')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings);
      }
    } catch (err) {
      console.error('Error fetching planning settings:', err);
    }
  };

  // Fetch today's planning session
  const fetchTodaySession = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_planning_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('planning_date', today)
        .maybeSingle();

      if (error) throw error;
      setTodaySession(data);
    } catch (err) {
      console.error('Error fetching today session:', err);
    }
  };

  // Fetch today's shutdown session
  const fetchTodayShutdown = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_shutdown_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('shutdown_date', today)
        .maybeSingle();

      if (error) throw error;
      setTodayShutdownSession(data);
    } catch (err) {
      console.error('Error fetching shutdown session:', err);
    }
  };

  // Get current streak
  const fetchStreak = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_current_streak', {
        p_user_id: user.id,
      });

      if (error) throw error;

      // Also get longest streak from view
      const { data: streakData } = await supabase
        .from('planning_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setStreak({
        current_streak: data || 0,
        longest_streak: streakData?.longest_streak || 0,
        total_streaks: streakData?.total_streaks || 0,
      });
    } catch (err) {
      console.error('Error fetching streak:', err);
    }
  };

  // Check if planning is needed today
  const checkPlanningNeeded = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('planning_needed_today', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setPlanningNeeded(data === true);
    } catch (err) {
      console.error('Error checking planning needed:', err);
    }
  };

  // Check if shutdown is needed
  const checkShutdownNeeded = () => {
    if (!settings || !settings.enable_shutdown_ritual) {
      setShutdownNeeded(false);
      return;
    }

    const now = new Date();
    const shutdownTime = settings.shutdown_time;

    if (!shutdownTime) {
      setShutdownNeeded(false);
      return;
    }

    const [hours, minutes] = shutdownTime.split(':').map(Number);
    const shutdownDateTime = new Date();
    shutdownDateTime.setHours(hours, minutes, 0, 0);

    // If it's past shutdown time and no shutdown session today
    setShutdownNeeded(now >= shutdownDateTime && !todayShutdown);
  };

  // Update planning settings
  const updateSettings = async (updates: Partial<DailyPlanningSettings>): Promise<boolean> => {
    if (!user || !settings) return false;

    try {
      const { error } = await supabase
        .from('daily_planning_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchSettings();
      toast({
        title: 'Settings updated',
        description: 'Your daily planning preferences have been saved.',
      });
      return true;
    } catch (err) {
      console.error('Error updating settings:', err);
      toast({
        title: 'Error',
        description: 'Failed to update planning settings',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Start a planning session
  const startPlanningSession = async (isQuickPlanning: boolean = false): Promise<DailyPlanningSession | null> => {
    if (!user) return null;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_planning_sessions')
        .insert({
          user_id: user.id,
          planning_date: today,
          started_at: new Date().toISOString(),
          is_quick_planning: isQuickPlanning,
        })
        .select()
        .single();

      if (error) throw error;

      setTodaySession(data);
      return data;
    } catch (err) {
      console.error('Error starting planning session:', err);
      toast({
        title: 'Error',
        description: 'Failed to start planning session',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update planning session
  const updatePlanningSession = async (updates: Partial<DailyPlanningSession>): Promise<boolean> => {
    if (!user || !todaySession) return false;

    try {
      const { error } = await supabase
        .from('daily_planning_sessions')
        .update(updates)
        .eq('id', todaySession.id);

      if (error) throw error;

      await fetchTodaySession();
      return true;
    } catch (err) {
      console.error('Error updating planning session:', err);
      return false;
    }
  };

  // Complete planning session
  const completePlanningSession = async (
    priorityTaskIds: string[] = [],
    totalPlannedMinutes: number = 0
  ): Promise<boolean> => {
    if (!user || !todaySession) return false;

    try {
      const { error } = await supabase
        .from('daily_planning_sessions')
        .update({
          completed_at: new Date().toISOString(),
          committed_schedule: true,
          priority_task_ids: priorityTaskIds,
          total_planned_minutes: totalPlannedMinutes,
        })
        .eq('id', todaySession.id);

      if (error) throw error;

      await fetchTodaySession();
      await fetchStreak();
      await checkPlanningNeeded();

      toast({
        title: '🎉 Planning complete!',
        description: `You're ready to crush today! ${streak ? `${streak.current_streak + 1} day streak!` : ''}`,
      });

      return true;
    } catch (err) {
      console.error('Error completing planning session:', err);
      toast({
        title: 'Error',
        description: 'Failed to complete planning session',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Create shutdown session
  const createShutdownSession = async (
    stats: {
      tasksCompleted: number;
      tasksTotal: number;
      minutesWorked?: number;
      movedToTomorrow?: string[];
      wins?: string[];
      challenges?: string[];
    }
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('daily_shutdown_sessions')
        .insert({
          user_id: user.id,
          shutdown_date: today,
          completed_at: new Date().toISOString(),
          tasks_completed: stats.tasksCompleted,
          tasks_total: stats.tasksTotal,
          minutes_worked: stats.minutesWorked || null,
          moved_to_tomorrow: stats.movedToTomorrow || [],
          wins: stats.wins || [],
          challenges: stats.challenges || [],
        });

      if (error) throw error;

      await fetchTodayShutdown();

      toast({
        title: '✨ Day complete!',
        description: `${stats.tasksCompleted} tasks done. Great work today!`,
      });

      return true;
    } catch (err) {
      console.error('Error creating shutdown session:', err);
      toast({
        title: 'Error',
        description: 'Failed to save shutdown session',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Get yesterday's stats
  const getYesterdayStats = async (): Promise<{ completed: number; total: number }> => {
    if (!user) return { completed: 0, total: 0 };

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Get yesterday's shutdown session if exists
      const { data: shutdownData } = await supabase
        .from('daily_shutdown_sessions')
        .select('tasks_completed, tasks_total')
        .eq('user_id', user.id)
        .eq('shutdown_date', yesterdayStr)
        .maybeSingle();

      if (shutdownData) {
        return {
          completed: shutdownData.tasks_completed,
          total: shutdownData.tasks_total,
        };
      }

      // Fallback: count from timeline items
      const yesterdayStart = new Date(yesterday);
      yesterdayStart.setHours(0, 0, 0, 0);

      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      const { data: items } = await supabase
        .from('timeline_items')
        .select('status')
        .eq('user_id', user.id)
        .gte('start_time', yesterdayStart.toISOString())
        .lte('start_time', yesterdayEnd.toISOString());

      if (!items) return { completed: 0, total: 0 };

      return {
        completed: items.filter(item => item.status === 'completed').length,
        total: items.length,
      };
    } catch (err) {
      console.error('Error getting yesterday stats:', err);
      return { completed: 0, total: 0 };
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchSettings(),
        fetchTodaySession(),
        fetchTodayShutdown(),
        fetchStreak(),
        checkPlanningNeeded(),
      ]).finally(() => setLoading(false));
    }
  }, [user?.id]);

  // Check shutdown needed when settings or shutdown session changes
  useEffect(() => {
    checkShutdownNeeded();
  }, [settings, todayShutdown]);

  return {
    settings,
    todaySession,
    todayShutdown,
    streak,
    loading,
    planningNeeded,
    shutdownNeeded,
    updateSettings,
    startPlanningSession,
    updatePlanningSession,
    completePlanningSession,
    createShutdownSession,
    getYesterdayStats,
    refetch: () => {
      fetchSettings();
      fetchTodaySession();
      fetchTodayShutdown();
      fetchStreak();
      checkPlanningNeeded();
    },
  };
};
