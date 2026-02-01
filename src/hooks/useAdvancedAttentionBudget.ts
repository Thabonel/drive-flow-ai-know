import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  AttentionType,
  ATTENTION_TYPES,
  UserAttentionPreferences
} from '@/lib/attentionTypes';
import { TimelineItem } from '@/lib/timelineUtils';

// Enhanced interfaces for advanced attention budget management
export interface AttentionWarning {
  id: string;
  level: 'info' | 'warning' | 'critical' | 'blocking';
  type: 'budget_limit' | 'context_switch' | 'focus_fragmentation' | 'peak_hours' | 'decision_fatigue';
  title: string;
  description: string;
  suggestion?: string;
  actionable: boolean;
  severity: number;
  affectedItems?: string[];
  suggestedActions?: SchedulingSuggestion[];
  dismissed?: boolean;
  created_at: string;
}

export interface SchedulingSuggestion {
  id: string;
  type: 'reschedule' | 'batch' | 'delegate' | 'optimize' | 'skip' | 'extend' | 'split';
  targetItemId?: string;
  suggestedTime?: string;
  suggestedDuration?: number;
  reasoning: string;
  confidenceScore: number;
  potentialBenefit: string;
  status: 'pending' | 'applied' | 'dismissed' | 'expired';
  expiresAt?: string;
}

export interface FocusSession {
  id: string;
  timelineItemId: string;
  sessionType: 'deep_work' | 'decision_batch' | 'review_session' | 'creative_flow';
  plannedDuration: number;
  actualDuration?: number;
  interruptions: number;
  completionRating?: number;
  focusQualityScore?: number;
  notes?: string;
  protectionLevel: 'minimal' | 'normal' | 'strict' | 'maximum';
  startedAt?: string;
  completedAt?: string;
}

export interface ContextSwitchEvent {
  id: string;
  fromItemId?: string;
  toItemId?: string;
  fromAttentionType: AttentionType;
  toAttentionType: AttentionType;
  switchTime: string;
  costScore: number;
  timeBetweenMinutes: number;
  cognitiveLoadBefore?: number;
  cognitiveLoadAfter?: number;
  roleMode: string;
  zoneMode: string;
}

export interface AttentionPattern {
  id: string;
  patternType: 'daily' | 'weekly' | 'monthly';
  patternData: Record<string, any>;
  effectivenessScore?: number;
  identifiedAt: string;
}

export interface BudgetEnforcementRule {
  id: string;
  ruleType: 'hard_limit' | 'warning_threshold' | 'auto_suggestion' | 'blocking';
  attentionType: AttentionType;
  thresholdValue: number;
  action: 'warn' | 'block' | 'suggest_alternative' | 'auto_reschedule';
  isActive: boolean;
}

export interface WeeklyCalibration {
  id: string;
  weekStartDate: string;
  roleSelected: string;
  zoneSelected: string;
  nonNegotiableTitle?: string;
  nonNegotiableHoursPlanned: number;
  nonNegotiableHoursActual: number;
  roleFitScore?: number;
  attentionBudgetPlanned: Record<string, any>;
  attentionBudgetActual: Record<string, any>;
  completionPercentage?: number;
  userSatisfaction?: number;
  lessonsLearned?: string;
  optimizationNotes?: string;
  completedAt?: string;
}

export interface RealTimeBudgetStatus {
  attentionType: AttentionType;
  currentUsage: number;
  budgetLimit: number;
  usagePercentage: number;
  projectedUsage?: number;
  isViolating: boolean;
  severity: 'normal' | 'approaching' | 'exceeded' | 'critical';
  remainingCapacity: number;
  timeToLimit?: number; // minutes until budget limit reached
}

export interface AdvancedAttentionBudgetHook {
  // Core state
  preferences: UserAttentionPreferences | null;
  loading: boolean;
  error: string | null;

  // Real-time budget monitoring
  realTimeBudgetStatus: RealTimeBudgetStatus[];
  warnings: AttentionWarning[];
  contextSwitchCost: number;
  focusSessions: FocusSession[];

  // Pattern analytics
  attentionPatterns: AttentionPattern[];
  weeklyCalibrations: WeeklyCalibration[];

  // Enforcement and suggestions
  enforcementRules: BudgetEnforcementRule[];
  schedulingSuggestions: SchedulingSuggestion[];

  // Advanced methods
  checkBudgetViolationRealTime: (
    newEvent: Partial<TimelineItem>,
    existingItems: TimelineItem[]
  ) => Promise<AttentionWarning[]>;

  calculateContextSwitchCost: (
    fromType: AttentionType,
    toType: AttentionType,
    timeBetweenMinutes?: number
  ) => Promise<number>;

  startFocusSession: (
    timelineItemId: string,
    sessionType: FocusSession['sessionType'],
    protectionLevel?: FocusSession['protectionLevel']
  ) => Promise<FocusSession>;

  endFocusSession: (
    sessionId: string,
    completionData: {
      completionRating: number;
      interruptions: number;
      notes?: string;
    }
  ) => Promise<void>;

  generateSmartSuggestions: (
    items: TimelineItem[],
    targetDate?: Date
  ) => Promise<SchedulingSuggestion[]>;

  applySchedulingSuggestion: (suggestionId: string) => Promise<boolean>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;

  createWeeklyCalibration: (
    calibrationData: Partial<WeeklyCalibration>
  ) => Promise<WeeklyCalibration>;

  updateBudgetEnforcementRules: (
    rules: Partial<BudgetEnforcementRule>[]
  ) => Promise<boolean>;

  // Analytics and insights
  getAttentionEfficiencyScore: (dateRange?: { start: Date; end: Date }) => Promise<number>;
  getOptimalSchedulingTimes: (attentionType: AttentionType) => Promise<string[]>;
  getPredictiveBudgetForecast: (lookaheadDays: number) => Promise<Record<string, number>>;

  // Maintenance
  refreshData: () => Promise<void>;
  dismissWarning: (warningId: string) => Promise<void>;
}

export function useAdvancedAttentionBudget(): AdvancedAttentionBudgetHook {
  const { user } = useAuth();

  // Core state
  const [preferences, setPreferences] = useState<UserAttentionPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Advanced state
  const [realTimeBudgetStatus, setRealTimeBudgetStatus] = useState<RealTimeBudgetStatus[]>([]);
  const [warnings, setWarnings] = useState<AttentionWarning[]>([]);
  const [contextSwitchCost, setContextSwitchCost] = useState(0);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [attentionPatterns, setAttentionPatterns] = useState<AttentionPattern[]>([]);
  const [weeklyCalibrations, setWeeklyCalibrations] = useState<WeeklyCalibration[]>([]);
  const [enforcementRules, setEnforcementRules] = useState<BudgetEnforcementRule[]>([]);
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingSuggestion[]>([]);

  // Real-time monitoring
  const budgetCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTime = useRef<Date>(new Date());

  // Load initial data
  useEffect(() => {
    if (!user) {
      resetState();
      setLoading(false);
      return;
    }

    loadAllData();
  }, [user]);

  // Set up real-time monitoring
  useEffect(() => {
    if (!user || !preferences) return;

    // Start real-time budget monitoring
    budgetCheckInterval.current = setInterval(() => {
      updateRealTimeBudgetStatus();
      checkForNewWarnings();
    }, 30000); // Check every 30 seconds

    return () => {
      if (budgetCheckInterval.current) {
        clearInterval(budgetCheckInterval.current);
      }
    };
  }, [user, preferences]);

  const resetState = () => {
    setPreferences(null);
    setRealTimeBudgetStatus([]);
    setWarnings([]);
    setContextSwitchCost(0);
    setFocusSessions([]);
    setAttentionPatterns([]);
    setWeeklyCalibrations([]);
    setEnforcementRules([]);
    setSchedulingSuggestions([]);
  };

  const loadAllData = async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);

      await Promise.all([
        loadPreferences(),
        loadWarnings(),
        loadFocusSessions(),
        loadAttentionPatterns(),
        loadWeeklyCalibrations(),
        loadEnforcementRules(),
        loadSchedulingSuggestions(),
      ]);

      await updateRealTimeBudgetStatus();

    } catch (err) {
      console.error('Error loading attention budget data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession();
    return {
      'Authorization': `Bearer ${session.data.session?.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  const loadPreferences = async () => {
    const { data, error: prefError } = await supabase
      .from('user_attention_preferences')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      throw prefError;
    }

    setPreferences(data);
  };

  const loadWarnings = async () => {
    const { data, error: warningsError } = await supabase
      .from('attention_warnings')
      .select('*')
      .eq('user_id', user?.id)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (warningsError) throw warningsError;
    setWarnings(data || []);
  };

  const loadFocusSessions = async () => {
    const { data, error: sessionsError } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user?.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (sessionsError) throw sessionsError;
    setFocusSessions(data || []);
  };

  const loadAttentionPatterns = async () => {
    const { data, error: patternsError } = await supabase
      .from('attention_patterns')
      .select('*')
      .eq('user_id', user?.id)
      .order('identified_at', { ascending: false })
      .limit(20);

    if (patternsError) throw patternsError;
    setAttentionPatterns(data || []);
  };

  const loadWeeklyCalibrations = async () => {
    const { data, error: calibrationsError } = await supabase
      .from('weekly_calibrations')
      .select('*')
      .eq('user_id', user?.id)
      .order('week_start_date', { ascending: false })
      .limit(12); // Last 3 months

    if (calibrationsError) throw calibrationsError;
    setWeeklyCalibrations(data || []);
  };

  const loadEnforcementRules = async () => {
    const { data, error: rulesError } = await supabase
      .from('budget_enforcement_rules')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true);

    if (rulesError) throw rulesError;
    setEnforcementRules(data || []);
  };

  const loadSchedulingSuggestions = async () => {
    const { data, error: suggestionsError } = await supabase
      .from('scheduling_suggestions')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (suggestionsError) throw suggestionsError;
    setSchedulingSuggestions(data || []);
  };

  const updateRealTimeBudgetStatus = async () => {
    if (!preferences || !user) return;

    try {
      // Get today's timeline items
      const today = new Date().toISOString().split('T')[0];
      const { data: todaysItems, error: itemsError } = await supabase
        .from('timeline_items')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`)
        .not('attention_type', 'is', null);

      if (itemsError) throw itemsError;

      // Calculate real-time budget status for each attention type
      const budgetStatusArray: RealTimeBudgetStatus[] = Object.values(ATTENTION_TYPES).map(attentionType => {
        const typeItems = (todaysItems || []).filter(item => item.attention_type === attentionType);
        const currentUsage = typeItems.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);

        const budgetLimit = preferences.attention_budgets?.[attentionType] || getDefaultBudgetLimit(attentionType);
        const usagePercentage = budgetLimit > 0 ? (currentUsage / budgetLimit) * 100 : 0;

        const severity = usagePercentage >= 120 ? 'critical' :
                        usagePercentage >= 100 ? 'exceeded' :
                        usagePercentage >= 80 ? 'approaching' : 'normal';

        return {
          attentionType,
          currentUsage,
          budgetLimit,
          usagePercentage,
          isViolating: usagePercentage >= 100,
          severity,
          remainingCapacity: Math.max(0, budgetLimit - currentUsage),
          timeToLimit: usagePercentage >= 100 ? 0 : undefined
        };
      });

      setRealTimeBudgetStatus(budgetStatusArray);

    } catch (err) {
      console.error('Error updating real-time budget status:', err);
    }
  };

  const checkForNewWarnings = async () => {
    if (!preferences || !user) return;

    try {
      // This would implement real-time warning detection
      // For now, we'll refresh warnings from the database
      await loadWarnings();
    } catch (err) {
      console.error('Error checking for new warnings:', err);
    }
  };

  // Real-time budget violation checking
  const checkBudgetViolationRealTime = useCallback(async (
    newEvent: Partial<TimelineItem>,
    existingItems: TimelineItem[]
  ): Promise<AttentionWarning[]> => {
    if (!preferences || !user) return [];

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/functions/v1/attention-budget-check', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          newEvent,
          existingItems: existingItems.map(item => ({
            id: item.id,
            attention_type: item.attention_type,
            duration_minutes: item.duration_minutes,
            start_time: item.start_time
          })),
          targetDate: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check budget violations');
      }

      const data = await response.json();
      return data.warnings || [];

    } catch (err) {
      console.error('Error checking budget violations:', err);
      return [];
    }
  }, [preferences, user]);

  // Context switch cost calculation
  const calculateContextSwitchCost = useCallback(async (
    fromType: AttentionType,
    toType: AttentionType,
    timeBetweenMinutes: number = 0
  ): Promise<number> => {
    if (!preferences || !user) return 0;

    try {
      const { data, error } = await supabase.rpc('calculate_context_switch_cost', {
        p_user_id: user.id,
        p_from_type: fromType,
        p_to_type: toType,
        p_time_between_minutes: timeBetweenMinutes,
        p_user_role: preferences.current_role
      });

      if (error) throw error;
      return data || 0;

    } catch (err) {
      console.error('Error calculating context switch cost:', err);
      return 0;
    }
  }, [preferences, user]);

  // Focus session management
  const startFocusSession = useCallback(async (
    timelineItemId: string,
    sessionType: FocusSession['sessionType'],
    protectionLevel: FocusSession['protectionLevel'] = 'normal'
  ): Promise<FocusSession> => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: user.id,
        timeline_item_id: timelineItemId,
        session_type: sessionType,
        protection_level: protectionLevel,
        planned_duration: 120, // Default 2 hours
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await loadFocusSessions();
    return data;
  }, [user]);

  const endFocusSession = useCallback(async (
    sessionId: string,
    completionData: {
      completionRating: number;
      interruptions: number;
      notes?: string;
    }
  ): Promise<void> => {
    const { error } = await supabase
      .from('focus_sessions')
      .update({
        ...completionData,
        completed_at: new Date().toISOString(),
        actual_duration: Math.floor(
          (new Date().getTime() - new Date().getTime()) / (1000 * 60)
        ) // This would calculate actual duration
      })
      .eq('id', sessionId);

    if (error) throw error;
    await loadFocusSessions();
  }, []);

  // Smart scheduling suggestions
  const generateSmartSuggestions = useCallback(async (
    items: TimelineItem[],
    targetDate: Date = new Date()
  ): Promise<SchedulingSuggestion[]> => {
    if (!user) return [];

    try {
      const { error } = await supabase.rpc('generate_scheduling_suggestions', {
        p_user_id: user.id,
        p_target_date: targetDate.toISOString().split('T')[0]
      });

      if (error) throw error;

      await loadSchedulingSuggestions();
      return schedulingSuggestions;

    } catch (err) {
      console.error('Error generating smart suggestions:', err);
      return [];
    }
  }, [user, schedulingSuggestions]);

  const applySchedulingSuggestion = useCallback(async (suggestionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('scheduling_suggestions')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (error) throw error;

      await loadSchedulingSuggestions();
      return true;

    } catch (err) {
      console.error('Error applying scheduling suggestion:', err);
      return false;
    }
  }, []);

  const dismissSuggestion = useCallback(async (suggestionId: string): Promise<void> => {
    const { error } = await supabase
      .from('scheduling_suggestions')
      .update({ status: 'dismissed' })
      .eq('id', suggestionId);

    if (error) throw error;
    await loadSchedulingSuggestions();
  }, []);

  // Weekly calibration management
  const createWeeklyCalibration = useCallback(async (
    calibrationData: Partial<WeeklyCalibration>
  ): Promise<WeeklyCalibration> => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('weekly_calibrations')
      .insert({
        user_id: user.id,
        ...calibrationData
      })
      .select()
      .single();

    if (error) throw error;

    await loadWeeklyCalibrations();
    return data;
  }, [user]);

  // Budget enforcement rules
  const updateBudgetEnforcementRules = useCallback(async (
    rules: Partial<BudgetEnforcementRule>[]
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Update existing rules or insert new ones
      for (const rule of rules) {
        const { error } = await supabase
          .from('budget_enforcement_rules')
          .upsert({
            user_id: user.id,
            ...rule
          });

        if (error) throw error;
      }

      await loadEnforcementRules();
      return true;

    } catch (err) {
      console.error('Error updating enforcement rules:', err);
      return false;
    }
  }, [user]);

  // Analytics and insights
  const getAttentionEfficiencyScore = useCallback(async (
    dateRange?: { start: Date; end: Date }
  ): Promise<number> => {
    if (!user) return 0;

    try {
      // This would implement efficiency score calculation
      // For now, return a placeholder
      return 75;
    } catch (err) {
      console.error('Error calculating attention efficiency score:', err);
      return 0;
    }
  }, [user]);

  const getOptimalSchedulingTimes = useCallback(async (
    attentionType: AttentionType
  ): Promise<string[]> => {
    if (!user) return [];

    try {
      // This would analyze historical data to suggest optimal times
      // For now, return default peak hours
      return ['09:00', '10:00', '11:00'];
    } catch (err) {
      console.error('Error getting optimal scheduling times:', err);
      return [];
    }
  }, [user]);

  const getPredictiveBudgetForecast = useCallback(async (
    lookaheadDays: number
  ): Promise<Record<string, number>> => {
    if (!user) return {};

    try {
      // This would implement predictive budget forecasting
      // For now, return placeholder data
      return {
        create: 75,
        decide: 60,
        connect: 80,
        review: 50,
        recover: 30
      };
    } catch (err) {
      console.error('Error generating budget forecast:', err);
      return {};
    }
  }, [user]);

  // Utility methods
  const refreshData = useCallback(async (): Promise<void> => {
    await loadAllData();
  }, []);

  const dismissWarning = useCallback(async (warningId: string): Promise<void> => {
    const { error } = await supabase
      .from('attention_warnings')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', warningId);

    if (error) throw error;
    await loadWarnings();
  }, []);

  // Helper function for default budget limits
  const getDefaultBudgetLimit = (attentionType: AttentionType): number => {
    const defaults = {
      [ATTENTION_TYPES.CREATE]: 240, // 4 hours
      [ATTENTION_TYPES.DECIDE]: 120, // 2 hours
      [ATTENTION_TYPES.CONNECT]: 180, // 3 hours
      [ATTENTION_TYPES.REVIEW]: 120, // 2 hours
      [ATTENTION_TYPES.RECOVER]: 60   // 1 hour
    };
    return defaults[attentionType] || 120;
  };

  return {
    // Core state
    preferences,
    loading,
    error,

    // Real-time monitoring
    realTimeBudgetStatus,
    warnings,
    contextSwitchCost,
    focusSessions,

    // Analytics
    attentionPatterns,
    weeklyCalibrations,

    // Configuration
    enforcementRules,
    schedulingSuggestions,

    // Methods
    checkBudgetViolationRealTime,
    calculateContextSwitchCost,
    startFocusSession,
    endFocusSession,
    generateSmartSuggestions,
    applySchedulingSuggestion,
    dismissSuggestion,
    createWeeklyCalibration,
    updateBudgetEnforcementRules,
    getAttentionEfficiencyScore,
    getOptimalSchedulingTimes,
    getPredictiveBudgetForecast,
    refreshData,
    dismissWarning
  };
}