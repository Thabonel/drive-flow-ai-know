// Hook for role-based behavior analysis and suggestions
import { useState, useEffect, useCallback } from 'react';
import { useTimelineContext } from '@/contexts/TimelineContext';
import {
  analyzeRoleBehavior,
  getRoleDurationSuggestion,
  validateNewEventForRole,
  RoleBehaviorAnalysis,
  RoleBehaviorSuggestion
} from '@/lib/roleBasedBehaviors';
import { RoleMode, AttentionType } from '@/lib/attentionTypes';
import { TimelineItem } from '@/lib/timelineUtils';

interface UseRoleBehaviorReturn {
  // Analysis
  analysis: RoleBehaviorAnalysis | null;
  isAnalyzing: boolean;

  // Suggestions
  suggestions: RoleBehaviorSuggestion[];

  // Helper functions
  getDurationSuggestion: (attentionType: AttentionType, defaultDuration: number) => number;
  validateNewEvent: (newEvent: {
    start_time: string;
    duration_minutes: number;
    attention_type: AttentionType;
  }) => RoleBehaviorSuggestion[];

  // Actions
  refreshAnalysis: () => void;
  dismissSuggestion: (suggestionIndex: number) => void;
}

export function useRoleBehavior(
  targetDate?: Date,
  currentRole?: RoleMode
): UseRoleBehaviorReturn {
  const { items, attentionPreferences } = useTimelineContext();
  const [analysis, setAnalysis] = useState<RoleBehaviorAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Use provided role or fall back to context
  const activeRole = currentRole || attentionPreferences?.current_role;

  // Use provided date or default to today
  const analysisDate = targetDate || new Date();

  /**
   * Filter items for the target date
   */
  const getItemsForDate = useCallback((date: Date): TimelineItem[] => {
    const targetDateStr = date.toISOString().split('T')[0];

    return items.filter(item => {
      const itemDate = new Date(item.start_time).toISOString().split('T')[0];
      return itemDate === targetDateStr;
    });
  }, [items]);

  /**
   * Perform role-based analysis
   */
  const performAnalysis = useCallback(async () => {
    if (!activeRole) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);

    try {
      const dateItems = getItemsForDate(analysisDate);
      const result = analyzeRoleBehavior(activeRole, dateItems);

      // Filter out dismissed suggestions
      const activeSuggestions = result.suggestions.filter(suggestion => {
        const suggestionKey = `${suggestion.title}-${suggestion.description}`;
        return !dismissedSuggestions.has(suggestionKey);
      });

      setAnalysis({
        ...result,
        suggestions: activeSuggestions
      });
    } catch (error) {
      console.error('Error performing role behavior analysis:', error);
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeRole, analysisDate, getItemsForDate, dismissedSuggestions]);

  /**
   * Get duration suggestion based on current role
   */
  const getDurationSuggestion = useCallback((
    attentionType: AttentionType,
    defaultDuration: number
  ): number => {
    if (!activeRole) return defaultDuration;

    return getRoleDurationSuggestion(activeRole, attentionType, defaultDuration);
  }, [activeRole]);

  /**
   * Validate new event against role patterns
   */
  const validateNewEvent = useCallback((newEvent: {
    start_time: string;
    duration_minutes: number;
    attention_type: AttentionType;
  }): RoleBehaviorSuggestion[] => {
    if (!activeRole) return [];

    const dateItems = getItemsForDate(new Date(newEvent.start_time));
    return validateNewEventForRole(activeRole, newEvent, dateItems);
  }, [activeRole, getItemsForDate]);

  /**
   * Refresh the analysis
   */
  const refreshAnalysis = useCallback(() => {
    performAnalysis();
  }, [performAnalysis]);

  /**
   * Dismiss a suggestion
   */
  const dismissSuggestion = useCallback((suggestionIndex: number) => {
    if (!analysis || suggestionIndex >= analysis.suggestions.length) return;

    const suggestion = analysis.suggestions[suggestionIndex];
    const suggestionKey = `${suggestion.title}-${suggestion.description}`;

    setDismissedSuggestions(prev => new Set([...prev, suggestionKey]));

    // Update current analysis to remove the dismissed suggestion
    setAnalysis(prev => {
      if (!prev) return null;

      const updatedSuggestions = prev.suggestions.filter((_, index) => index !== suggestionIndex);

      return {
        ...prev,
        suggestions: updatedSuggestions
      };
    });
  }, [analysis]);

  // Run analysis when dependencies change
  useEffect(() => {
    performAnalysis();
  }, [performAnalysis]);

  // Reset dismissed suggestions when role changes
  useEffect(() => {
    setDismissedSuggestions(new Set());
  }, [activeRole]);

  return {
    analysis,
    isAnalyzing,
    suggestions: analysis?.suggestions || [],
    getDurationSuggestion,
    validateNewEvent,
    refreshAnalysis,
    dismissSuggestion
  };
}

/**
 * Hook for getting real-time suggestions for a specific event type
 */
export function useEventSuggestions(
  attentionType: AttentionType,
  startTime: string,
  duration: number,
  currentRole?: RoleMode
) {
  const { validateNewEvent, getDurationSuggestion } = useRoleBehavior(
    new Date(startTime),
    currentRole
  );

  const suggestions = validateNewEvent({
    start_time: startTime,
    duration_minutes: duration,
    attention_type: attentionType
  });

  const suggestedDuration = getDurationSuggestion(attentionType, duration);

  return {
    suggestions,
    suggestedDuration,
    hasDurationSuggestion: suggestedDuration !== duration
  };
}

/**
 * Hook for getting daily role compatibility score
 */
export function useDailyRoleScore(date?: Date, role?: RoleMode) {
  const { analysis } = useRoleBehavior(date, role);

  return {
    score: analysis?.roleCompatibilityScore || null,
    isLoading: analysis === null,
    level: analysis?.roleCompatibilityScore ?
      analysis.roleCompatibilityScore >= 80 ? 'excellent' :
      analysis.roleCompatibilityScore >= 60 ? 'good' :
      analysis.roleCompatibilityScore >= 40 ? 'fair' : 'poor'
      : null
  };
}