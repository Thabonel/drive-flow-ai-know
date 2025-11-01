import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import {
  streamChatCompletion,
  isOpenAIConfigured,
  ChatMessage,
} from '@/lib/ai/openai-client';
import {
  Meeting,
  TimeGap,
  UserPreferences,
  DailyPlanResponse,
  generateSystemPrompt,
  generateDailyPlanningPrompt,
  parseDailyPlanResponse,
  getDefaultPreferences,
} from '@/lib/ai/prompts/daily-planning';
import { startOfDay, endOfDay, parse, differenceInMinutes, format } from 'date-fns';

export enum PlanningStep {
  IDLE = 'idle',
  FETCHING_CALENDAR = 'fetching_calendar',
  ANALYZING_SCHEDULE = 'analyzing_schedule',
  GENERATING_PLAN = 'generating_plan',
  COMPLETE = 'complete',
  ERROR = 'error',
}

export const useAIDailyPlanning = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<PlanningStep>(PlanningStep.IDLE);
  const [streamingText, setStreamingText] = useState('');
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing calendar events for a specific day
  const fetchCalendarEvents = async (targetDate: Date): Promise<Meeting[]> => {
    if (!user) return [];

    try {
      const dayStart = startOfDay(targetDate);
      const dayEnd = endOfDay(targetDate);

      const { data, error: fetchError } = await supabase
        .from('timeline_items')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .neq('status', 'parked')
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      // Convert timeline items to meetings
      return (data || []).map(item => ({
        title: item.title,
        start_time: item.start_time,
        duration_minutes: item.duration_minutes,
        is_flexible: item.is_flexible || false,
      }));
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      return [];
    }
  };

  // Analyze schedule to find time gaps
  const analyzeSchedule = (
    meetings: Meeting[],
    preferences: UserPreferences
  ): TimeGap[] => {
    if (meetings.length === 0) {
      // No meetings - entire work day is available
      const workStart = preferences.work_start_time || '08:00';
      const workEnd = preferences.work_end_time || '17:00';

      return [
        {
          start_time: workStart,
          end_time: workEnd,
          duration_minutes: differenceInMinutes(
            parse(workEnd, 'HH:mm', new Date()),
            parse(workStart, 'HH:mm', new Date())
          ),
        },
      ];
    }

    const gaps: TimeGap[] = [];
    const workStart = parse(preferences.work_start_time || '08:00', 'HH:mm', new Date());
    const workEnd = parse(preferences.work_end_time || '17:00', 'HH:mm', new Date());

    // Sort meetings by start time
    const sortedMeetings = [...meetings].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Check gap before first meeting
    const firstMeetingStart = new Date(sortedMeetings[0].start_time);
    if (firstMeetingStart > workStart) {
      const duration = differenceInMinutes(firstMeetingStart, workStart);
      if (duration > 15) {
        // Only include gaps longer than 15 minutes
        gaps.push({
          start_time: format(workStart, 'HH:mm'),
          end_time: format(firstMeetingStart, 'HH:mm'),
          duration_minutes: duration,
        });
      }
    }

    // Check gaps between meetings
    for (let i = 0; i < sortedMeetings.length - 1; i++) {
      const currentMeeting = sortedMeetings[i];
      const nextMeeting = sortedMeetings[i + 1];

      const currentEnd = new Date(
        new Date(currentMeeting.start_time).getTime() +
          currentMeeting.duration_minutes * 60000
      );
      const nextStart = new Date(nextMeeting.start_time);

      const duration = differenceInMinutes(nextStart, currentEnd);
      if (duration > 15) {
        gaps.push({
          start_time: format(currentEnd, 'HH:mm'),
          end_time: format(nextStart, 'HH:mm'),
          duration_minutes: duration,
        });
      }
    }

    // Check gap after last meeting
    const lastMeeting = sortedMeetings[sortedMeetings.length - 1];
    const lastMeetingEnd = new Date(
      new Date(lastMeeting.start_time).getTime() +
        lastMeeting.duration_minutes * 60000
    );
    if (lastMeetingEnd < workEnd) {
      const duration = differenceInMinutes(workEnd, lastMeetingEnd);
      if (duration > 15) {
        gaps.push({
          start_time: format(lastMeetingEnd, 'HH:mm'),
          end_time: format(workEnd, 'HH:mm'),
          duration_minutes: duration,
        });
      }
    }

    return gaps;
  };

  // Generate optimal plan using AI
  const generateOptimalPlan = async (
    targetDate: Date,
    preferences?: Partial<UserPreferences>
  ): Promise<DailyPlanResponse | null> => {
    if (!isOpenAIConfigured()) {
      toast({
        title: 'OpenAI not configured',
        description: 'Please add your OpenAI API key to use AI planning features.',
        variant: 'destructive',
      });
      return null;
    }

    setStep(PlanningStep.FETCHING_CALENDAR);
    setStreamingText('');
    setError(null);
    setPlan(null);

    try {
      // Step 1: Fetch existing meetings
      const meetings = await fetchCalendarEvents(targetDate);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

      // Step 2: Analyze schedule
      setStep(PlanningStep.ANALYZING_SCHEDULE);
      const fullPreferences = { ...getDefaultPreferences(), ...preferences };
      const timeGaps = analyzeSchedule(meetings, fullPreferences);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

      // Step 3: Generate AI plan
      setStep(PlanningStep.GENERATING_PLAN);

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: generateSystemPrompt(),
        },
        {
          role: 'user',
          content: generateDailyPlanningPrompt(
            meetings,
            timeGaps,
            fullPreferences,
            targetDate
          ),
        },
      ];

      const response = await streamChatCompletion(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 4000,
        onToken: (token) => {
          setStreamingText((prev) => prev + token);
        },
      });

      // Parse response
      const parsedPlan = parseDailyPlanResponse(response);

      setStep(PlanningStep.COMPLETE);
      setPlan(parsedPlan);

      toast({
        title: 'AI plan generated',
        description: `Created ${parsedPlan.blocks.length} time blocks for your day`,
      });

      return parsedPlan;
    } catch (err) {
      console.error('Error generating plan:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate plan';
      setError(errorMessage);
      setStep(PlanningStep.ERROR);

      toast({
        title: 'Planning failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    }
  };

  // Reset state
  const reset = () => {
    setStep(PlanningStep.IDLE);
    setStreamingText('');
    setPlan(null);
    setError(null);
  };

  return {
    step,
    streamingText,
    plan,
    error,
    isConfigured: isOpenAIConfigured(),
    generateOptimalPlan,
    fetchCalendarEvents,
    analyzeSchedule,
    reset,
  };
};
