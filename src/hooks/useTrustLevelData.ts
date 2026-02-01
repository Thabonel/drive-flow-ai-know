// Custom hook for trust level management data
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrustLevel } from '@/lib/attentionTypes';

interface TrustLevelHistory {
  id: string;
  team_member_id: string;
  member_name: string;
  current_trust_level: TrustLevel;
  suggested_trust_level?: TrustLevel;
  success_rate: number;
  completed_delegations: number;
  average_rating: number;
  avg_completion_time_hours: number;
  skills: string[];
  performance_trend: 'improving' | 'stable' | 'declining';
  last_delegation_date?: string;
  progression_recommendations: string[];
  trust_level_changes: {
    date: string;
    from_level: TrustLevel;
    to_level: TrustLevel;
    reason: string;
  }[];
}

interface TrustLevelSuggestion {
  member_id: string;
  member_name: string;
  current_level: TrustLevel;
  suggested_level: TrustLevel;
  confidence: number;
  reasons: string[];
  supporting_data: {
    success_rate: number;
    avg_rating: number;
    completion_time_improvement: number;
    consistency_score: number;
  };
}

export function useTrustLevelData(teamId?: string) {
  const { user } = useAuth();
  const [trustLevelData, setTrustLevelData] = useState<TrustLevelHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch trust level data for team members
  const fetchTrustLevelData = useCallback(async () => {
    if (!teamId || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Get team members with their delegation history
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          role,
          user:users(
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('team_id', teamId);

      if (membersError) throw membersError;

      // For each team member, get their trust level data
      const trustLevelPromises = teamMembers?.map(async (member) => {
        // Get delegation statistics
        const { data: delegationStats } = await supabase
          .rpc('calculate_delegation_success_rate', {
            p_user_id: user.id, // Delegator (current user)
            p_start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            p_end_date: new Date().toISOString().split('T')[0]
          });

        // Get recent delegations to this member
        const { data: recentDelegations } = await supabase
          .from('delegations')
          .select('*')
          .eq('delegator_id', user.id)
          .eq('delegate_id', member.user_id)
          .order('created_at', { ascending: false })
          .limit(10);

        // Calculate performance metrics
        const completedDelegations = recentDelegations?.filter(d => d.status === 'completed') || [];
        const successRate = recentDelegations && recentDelegations.length > 0
          ? (completedDelegations.length / recentDelegations.length) * 100
          : 0;

        const averageRating = completedDelegations.length > 0
          ? completedDelegations.reduce((sum, d) => sum + (d.success_rating || 0), 0) / completedDelegations.length
          : 0;

        const avgCompletionTime = completedDelegations.length > 0
          ? completedDelegations.reduce((sum, d) => {
              if (d.completed_at && d.created_at) {
                const hours = (new Date(d.completed_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60);
                return sum + hours;
              }
              return sum;
            }, 0) / completedDelegations.length
          : 0;

        // Determine performance trend
        const recentSuccessRate = recentDelegations?.slice(0, 3)
          .filter(d => d.status === 'completed').length / Math.min(3, recentDelegations?.length || 1) * 100 || 0;
        const olderSuccessRate = recentDelegations?.slice(3, 6)
          .filter(d => d.status === 'completed').length / Math.min(3, (recentDelegations?.slice(3, 6).length || 1)) * 100 || 0;

        let performanceTrend: 'improving' | 'stable' | 'declining' = 'stable';
        if (recentSuccessRate > olderSuccessRate + 10) performanceTrend = 'improving';
        else if (recentSuccessRate < olderSuccessRate - 10) performanceTrend = 'declining';

        // Get current trust level from most recent delegation
        const currentTrustLevel: TrustLevel = recentDelegations?.[0]?.trust_level || 'new';

        // Generate progression recommendations
        const recommendations = generateProgressionRecommendations(
          currentTrustLevel,
          successRate,
          averageRating,
          performanceTrend,
          completedDelegations.length
        );

        // Get suggested trust level
        const suggestedTrustLevel = getSuggestedTrustLevel(
          currentTrustLevel,
          successRate,
          averageRating,
          completedDelegations.length,
          performanceTrend
        );

        return {
          id: member.user_id,
          team_member_id: member.user_id,
          member_name: member.user?.raw_user_meta_data?.full_name || member.user?.email || 'Unknown User',
          current_trust_level: currentTrustLevel,
          suggested_trust_level: suggestedTrustLevel !== currentTrustLevel ? suggestedTrustLevel : undefined,
          success_rate: successRate,
          completed_delegations: completedDelegations.length,
          average_rating: averageRating,
          avg_completion_time_hours: avgCompletionTime,
          skills: [], // Would come from team workload or profile
          performance_trend: performanceTrend,
          last_delegation_date: recentDelegations?.[0]?.created_at,
          progression_recommendations: recommendations,
          trust_level_changes: [] // Would track historical changes
        } as TrustLevelHistory;
      }) || [];

      const trustLevelResults = await Promise.all(trustLevelPromises);
      setTrustLevelData(trustLevelResults);

    } catch (err) {
      console.error('Failed to fetch trust level data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trust level data');
    } finally {
      setLoading(false);
    }
  }, [teamId, user]);

  // Generate progression recommendations
  const generateProgressionRecommendations = (
    currentLevel: TrustLevel,
    successRate: number,
    avgRating: number,
    trend: string,
    completedCount: number
  ): string[] => {
    const recommendations: string[] = [];

    if (successRate < 80) {
      recommendations.push('Improve task completion rate through better planning and communication');
    }

    if (avgRating < 4.0) {
      recommendations.push('Focus on quality improvements and attention to detail');
    }

    if (currentLevel === 'new' && completedCount >= 3 && successRate > 85) {
      recommendations.push('Ready for promotion to Experienced level');
    }

    if (currentLevel === 'experienced' && completedCount >= 5 && successRate > 90 && avgRating > 4.2) {
      recommendations.push('Consider promotion to Expert level for complex tasks');
    }

    if (trend === 'declining') {
      recommendations.push('Schedule additional support sessions to address recent challenges');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current excellent performance');
    }

    return recommendations;
  };

  // Get suggested trust level based on performance
  const getSuggestedTrustLevel = (
    currentLevel: TrustLevel,
    successRate: number,
    avgRating: number,
    completedCount: number,
    trend: string
  ): TrustLevel => {
    // Criteria for promotion
    const canPromoteToExperienced = currentLevel === 'new' &&
      completedCount >= 3 &&
      successRate >= 85 &&
      avgRating >= 3.5;

    const canPromoteToExpert = currentLevel === 'experienced' &&
      completedCount >= 5 &&
      successRate >= 90 &&
      avgRating >= 4.0 &&
      trend !== 'declining';

    // Criteria for demotion
    const shouldDemoteToExperienced = currentLevel === 'expert' &&
      (successRate < 75 || trend === 'declining');

    const shouldDemoteToNew = currentLevel === 'experienced' &&
      (successRate < 65 || avgRating < 3.0);

    if (canPromoteToExpert) return 'expert';
    if (canPromoteToExperienced) return 'experienced';
    if (shouldDemoteToExperienced) return 'experienced';
    if (shouldDemoteToNew) return 'new';

    return currentLevel;
  };

  // Update trust level for a team member
  const updateTrustLevel = async (
    memberId: string,
    newLevel: TrustLevel,
    reason: string
  ) => {
    try {
      // Update most recent delegations to this member
      const { error } = await supabase
        .from('delegations')
        .update({ trust_level: newLevel })
        .eq('delegator_id', user.id)
        .eq('delegate_id', memberId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      if (error) throw error;

      // Record the trust level change (would need a trust_level_changes table)
      // For now, we'll just refresh the data

      await fetchTrustLevelData();
    } catch (err) {
      console.error('Failed to update trust level:', err);
      throw err;
    }
  };

  // Get trust level suggestions
  const getTrustLevelSuggestions = async (): Promise<TrustLevelSuggestion[]> => {
    const suggestions: TrustLevelSuggestion[] = [];

    trustLevelData.forEach(member => {
      if (member.suggested_trust_level && member.suggested_trust_level !== member.current_trust_level) {
        // Calculate confidence based on performance metrics
        const confidence = calculateSuggestionConfidence(
          member.success_rate,
          member.average_rating,
          member.completed_delegations,
          member.performance_trend
        );

        // Generate reasons for the suggestion
        const reasons = generateSuggestionReasons(
          member.current_trust_level,
          member.suggested_trust_level,
          member.success_rate,
          member.average_rating,
          member.performance_trend
        );

        suggestions.push({
          member_id: member.team_member_id,
          member_name: member.member_name,
          current_level: member.current_trust_level,
          suggested_level: member.suggested_trust_level,
          confidence,
          reasons,
          supporting_data: {
            success_rate: member.success_rate,
            avg_rating: member.average_rating,
            completion_time_improvement: 0, // Would calculate from historical data
            consistency_score: member.performance_trend === 'stable' ? 85 :
                              member.performance_trend === 'improving' ? 95 : 65
          }
        });
      }
    });

    return suggestions;
  };

  const calculateSuggestionConfidence = (
    successRate: number,
    avgRating: number,
    completedCount: number,
    trend: string
  ): number => {
    let confidence = 50; // Base confidence

    // Success rate impact
    if (successRate > 90) confidence += 20;
    else if (successRate > 80) confidence += 10;
    else if (successRate < 70) confidence -= 10;

    // Rating impact
    if (avgRating > 4.2) confidence += 15;
    else if (avgRating > 3.8) confidence += 5;
    else if (avgRating < 3.5) confidence -= 10;

    // Experience impact
    if (completedCount > 10) confidence += 10;
    else if (completedCount < 3) confidence -= 15;

    // Trend impact
    if (trend === 'improving') confidence += 15;
    else if (trend === 'declining') confidence -= 20;

    return Math.max(10, Math.min(95, confidence));
  };

  const generateSuggestionReasons = (
    currentLevel: TrustLevel,
    suggestedLevel: TrustLevel,
    successRate: number,
    avgRating: number,
    trend: string
  ): string[] => {
    const reasons: string[] = [];

    if (suggestedLevel > currentLevel) {
      // Promotion reasons
      if (successRate > 85) reasons.push(`High success rate (${successRate.toFixed(0)}%)`);
      if (avgRating > 4.0) reasons.push(`Excellent quality ratings (${avgRating.toFixed(1)}/5)`);
      if (trend === 'improving') reasons.push('Consistently improving performance');
      reasons.push('Demonstrates readiness for increased responsibility');
    } else {
      // Demotion reasons
      if (successRate < 75) reasons.push(`Low success rate (${successRate.toFixed(0)}%)`);
      if (avgRating < 3.5) reasons.push(`Below average quality (${avgRating.toFixed(1)}/5)`);
      if (trend === 'declining') reasons.push('Recent performance decline');
      reasons.push('Would benefit from additional support and guidance');
    }

    return reasons;
  };

  // Initialize data
  useEffect(() => {
    if (teamId && user) {
      fetchTrustLevelData();
    }
  }, [teamId, user, fetchTrustLevelData]);

  return {
    trustLevelData,
    loading,
    error,
    updateTrustLevel,
    getTrustLevelSuggestions,
    refreshTrustLevelData: fetchTrustLevelData
  };
}