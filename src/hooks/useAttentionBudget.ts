import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  AttentionType,
  ATTENTION_TYPES,
  calculateContextSwitchCost,
  UserAttentionPreferences
} from '@/lib/attentionTypes';
import { TimelineItem } from '@/lib/timelineUtils';
import {
  analyzeAttentionBudget,
  checkNewEventViolations,
  AttentionBudgetAnalysis,
  AttentionWarning
} from '@/lib/attentionBudgetEngine';

interface AttentionBudgetStatus {
  attention_type: AttentionType;
  items_count: number;
  budget_limit: number;
  usage_percentage: number;
  is_over_budget: boolean;
  total_duration_minutes: number;
}

interface DailyAttentionUsage {
  date: string;
  budget_status: AttentionBudgetStatus[];
  context_switches: {
    total: number;
    budget: number;
    is_over_budget: boolean;
  };
  total_cognitive_load: number;
}

interface AttentionBudgetHook {
  preferences: UserAttentionPreferences | null;
  dailyUsage: DailyAttentionUsage | null;
  loading: boolean;
  error: string | null;

  // Enhanced analysis methods
  analyzeDay: (items: TimelineItem[], date?: Date) => AttentionBudgetAnalysis | null;
  checkNewEventWarnings: (newEvent: {
    start_time: string;
    duration_minutes: number;
    attention_type: AttentionType;
  }, existingItems: TimelineItem[]) => AttentionWarning[];

  // Legacy methods (maintained for backwards compatibility)
  refreshUsage: (date?: string) => Promise<void>;
  checkBudgetViolation: (items: TimelineItem[], date?: Date) => AttentionBudgetStatus[];
  calculateContextSwitches: (items: TimelineItem[], date?: Date) => number;
  getAttentionWarnings: (items: TimelineItem[], date?: Date) => string[];
  updatePreferences: (updates: Partial<UserAttentionPreferences>) => Promise<boolean>;
}

export function useAttentionBudget(): AttentionBudgetHook {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserAttentionPreferences | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyAttentionUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user preferences
  useEffect(() => {
    if (!user) {
      setPreferences(null);
      setDailyUsage(null);
      setLoading(false);
      return;
    }

    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    try {
      setError(null);
      const response = await fetch('/functions/v1/attention-preferences', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      } else {
        throw new Error('Failed to load attention preferences');
      }
    } catch (err) {
      console.error('Error loading attention preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const refreshUsage = async (date?: string) => {
    if (!user || !preferences) return;

    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      setError(null);
      const response = await fetch(`/functions/v1/attention-budget?date=${targetDate}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDailyUsage({
          date: targetDate,
          ...data
        });
      } else {
        throw new Error('Failed to load attention budget usage');
      }
    } catch (err) {
      console.error('Error loading attention usage:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const updatePreferences = async (updates: Partial<UserAttentionPreferences>): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);
      const response = await fetch('/functions/v1/attention-preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        return true;
      } else {
        throw new Error('Failed to update attention preferences');
      }
    } catch (err) {
      console.error('Error updating attention preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // Check budget violations for a set of timeline items
  const checkBudgetViolation = useMemo(() => {
    return (items: TimelineItem[], date: Date = new Date()): AttentionBudgetStatus[] => {
      if (!preferences) return [];

      const targetDate = date.toISOString().split('T')[0];

      // Filter items for the target date
      const dayItems = items.filter(item => {
        const itemDate = new Date(item.start_time).toISOString().split('T')[0];
        return itemDate === targetDate && item.attention_type;
      });

      // Calculate usage by attention type
      const usageByType = new Map<AttentionType, { count: number; duration: number }>();

      Object.values(ATTENTION_TYPES).forEach(type => {
        const typeItems = dayItems.filter(item => item.attention_type === type);
        usageByType.set(type, {
          count: typeItems.length,
          duration: typeItems.reduce((sum, item) => sum + item.duration_minutes, 0)
        });
      });

      // Generate budget status for each attention type
      const budgetStatuses: AttentionBudgetStatus[] = [];

      Object.values(ATTENTION_TYPES).forEach(type => {
        const usage = usageByType.get(type) || { count: 0, duration: 0 };
        const budgetLimit = preferences.attention_budgets[type as keyof typeof preferences.attention_budgets] || 5;
        const usagePercentage = Math.round((usage.count / budgetLimit) * 100);

        budgetStatuses.push({
          attention_type: type,
          items_count: usage.count,
          budget_limit: budgetLimit,
          usage_percentage: usagePercentage,
          is_over_budget: usage.count > budgetLimit,
          total_duration_minutes: usage.duration
        });
      });

      return budgetStatuses;
    };
  }, [preferences]);

  // Calculate context switches for timeline items
  const calculateContextSwitches = useMemo(() => {
    return (items: TimelineItem[], date: Date = new Date()): number => {
      if (!preferences) return 0;

      const targetDate = date.toISOString().split('T')[0];

      // Filter and sort items for the target date
      const dayItems = items
        .filter(item => {
          const itemDate = new Date(item.start_time).toISOString().split('T')[0];
          return itemDate === targetDate && item.attention_type;
        })
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      let totalContextSwitches = 0;

      for (let i = 1; i < dayItems.length; i++) {
        const prevItem = dayItems[i - 1];
        const currentItem = dayItems[i];

        if (prevItem.attention_type && currentItem.attention_type) {
          const switchCost = calculateContextSwitchCost(
            prevItem.attention_type,
            currentItem.attention_type,
            preferences.current_role
          );
          totalContextSwitches += switchCost;
        }
      }

      return totalContextSwitches;
    };
  }, [preferences]);

  // Get attention warnings for timeline items
  const getAttentionWarnings = useMemo(() => {
    return (items: TimelineItem[], date: Date = new Date()): string[] => {
      if (!preferences) return [];

      const warnings: string[] = [];
      const budgetStatus = checkBudgetViolation(items, date);
      const contextSwitches = calculateContextSwitches(items, date);

      // Check budget violations
      const overBudgetTypes = budgetStatus.filter(status => status.is_over_budget);
      if (overBudgetTypes.length > 0) {
        warnings.push(
          `Over budget for ${overBudgetTypes.map(t => t.attention_type).join(', ')} activities`
        );
      }

      // Check approaching budget limits (80%+)
      const nearLimitTypes = budgetStatus.filter(
        status => !status.is_over_budget && status.usage_percentage >= 80
      );
      if (nearLimitTypes.length > 0) {
        warnings.push(
          `Approaching budget limit for ${nearLimitTypes.map(t => t.attention_type).join(', ')}`
        );
      }

      // Check excessive context switching
      const contextSwitchBudget = preferences.attention_budgets.context_switches || 3;
      if (contextSwitches > contextSwitchBudget) {
        warnings.push(`High context switching detected (${contextSwitches} vs ${contextSwitchBudget} budget)`);
      }

      return warnings;
    };
  }, [preferences, checkBudgetViolation, calculateContextSwitches]);

  // Enhanced analysis using the new attention budget engine
  const analyzeDay = useCallback((items: TimelineItem[], date?: Date): AttentionBudgetAnalysis | null => {
    if (!preferences) return null;

    return analyzeAttentionBudget(items, preferences, date);
  }, [preferences]);

  // Real-time warnings for new events
  const checkNewEventWarnings = useCallback((
    newEvent: { start_time: string; duration_minutes: number; attention_type: AttentionType },
    existingItems: TimelineItem[]
  ): AttentionWarning[] => {
    if (!preferences) return [];

    return checkNewEventViolations(newEvent, existingItems, preferences);
  }, [preferences]);

  return {
    preferences,
    dailyUsage,
    loading,
    error,
    // Enhanced methods
    analyzeDay,
    checkNewEventWarnings,
    // Legacy methods
    refreshUsage,
    checkBudgetViolation,
    calculateContextSwitches,
    getAttentionWarnings,
    updatePreferences,
  };
}