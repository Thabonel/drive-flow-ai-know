// Custom hook for team workload management
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TeamMember {
  user_id: string;
  name: string;
  workload_percentage: number;
  available_hours: number;
  current_focus_area?: string;
  skills: string[];
}

interface WorkloadIndicator {
  id: string;
  team_id: string;
  member_user_id: string;
  date: string;
  scheduled_hours: number;
  delegated_hours: number;
  availability_hours: number;
  workload_percentage: number;
  skills: Record<string, any>;
  current_focus_area?: string;
  created_at: string;
}

export function useTeamWorkload(teamId?: string) {
  const { user } = useAuth();
  const [teamWorkload, setTeamWorkload] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch team workload data
  const fetchTeamWorkload = useCallback(async () => {
    if (!teamId || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Use the database function to get team workload summary
      const { data, error: fetchError } = await supabase
        .rpc('get_team_workload_summary', {
          p_team_id: teamId,
          p_date: new Date().toISOString().split('T')[0]
        });

      if (fetchError) throw fetchError;

      const transformedData: TeamMember[] = data?.map((member: any) => ({
        user_id: member.member_user_id,
        name: member.member_name,
        workload_percentage: member.workload_percentage || 0,
        available_hours: member.available_hours || 0,
        current_focus_area: member.current_focus_area,
        skills: Array.isArray(member.skills) ? member.skills :
                Object.keys(member.skills || {})
      })) || [];

      setTeamWorkload(transformedData);
    } catch (err) {
      console.error('Failed to fetch team workload:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team workload');
    } finally {
      setLoading(false);
    }
  }, [teamId, user]);

  // Update workload for a team member
  const updateWorkload = async (
    memberId: string,
    updates: {
      scheduled_hours?: number;
      delegated_hours?: number;
      availability_hours?: number;
      skills?: Record<string, any>;
      current_focus_area?: string;
    }
  ) => {
    if (!teamId) throw new Error('Team ID required');

    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('team_workload_indicators')
        .upsert({
          team_id: teamId,
          member_user_id: memberId,
          date: today,
          ...updates
        }, {
          onConflict: 'team_id,member_user_id,date'
        });

      if (error) throw error;

      // Refresh workload data
      await fetchTeamWorkload();
    } catch (err) {
      console.error('Failed to update workload:', err);
      throw err;
    }
  };

  // Add scheduled hours for a team member
  const addScheduledHours = async (memberId: string, hours: number) => {
    try {
      const currentMember = teamWorkload.find(m => m.user_id === memberId);
      const currentScheduled = currentMember ?
        (8 - currentMember.available_hours - (currentMember as any).delegated_hours || 0) : 0;

      await updateWorkload(memberId, {
        scheduled_hours: currentScheduled + hours
      });
    } catch (err) {
      console.error('Failed to add scheduled hours:', err);
      throw err;
    }
  };

  // Add delegated hours for a team member
  const addDelegatedHours = async (memberId: string, hours: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get current delegated hours
      const { data: current } = await supabase
        .from('team_workload_indicators')
        .select('delegated_hours')
        .eq('team_id', teamId)
        .eq('member_user_id', memberId)
        .eq('date', today)
        .single();

      const currentDelegated = current?.delegated_hours || 0;

      await updateWorkload(memberId, {
        delegated_hours: currentDelegated + hours
      });
    } catch (err) {
      console.error('Failed to add delegated hours:', err);
      throw err;
    }
  };

  // Update skills for a team member
  const updateSkills = async (memberId: string, skills: string[]) => {
    try {
      const skillsObject = skills.reduce((acc, skill) => {
        acc[skill] = true;
        return acc;
      }, {} as Record<string, boolean>);

      await updateWorkload(memberId, {
        skills: skillsObject
      });
    } catch (err) {
      console.error('Failed to update skills:', err);
      throw err;
    }
  };

  // Get available team members (under specified workload threshold)
  const getAvailableMembers = useCallback((maxWorkloadPercentage = 80) => {
    return teamWorkload.filter(member =>
      member.workload_percentage < maxWorkloadPercentage
    );
  }, [teamWorkload]);

  // Get overloaded team members (over specified threshold)
  const getOverloadedMembers = useCallback((threshold = 90) => {
    return teamWorkload.filter(member =>
      member.workload_percentage > threshold
    );
  }, [teamWorkload]);

  // Get members with specific skills
  const getMembersWithSkills = useCallback((requiredSkills: string[]) => {
    return teamWorkload.filter(member =>
      requiredSkills.some(skill =>
        member.skills.includes(skill)
      )
    );
  }, [teamWorkload]);

  // Calculate team average workload
  const getTeamAverageWorkload = useCallback(() => {
    if (teamWorkload.length === 0) return 0;

    const total = teamWorkload.reduce((sum, member) =>
      sum + member.workload_percentage, 0
    );

    return Math.round(total / teamWorkload.length);
  }, [teamWorkload]);

  // Get workload distribution
  const getWorkloadDistribution = useCallback(() => {
    const distribution = {
      available: 0,    // < 50%
      moderate: 0,     // 50-80%
      busy: 0,         // 80-95%
      overloaded: 0    // > 95%
    };

    teamWorkload.forEach(member => {
      const workload = member.workload_percentage;
      if (workload < 50) distribution.available++;
      else if (workload < 80) distribution.moderate++;
      else if (workload < 95) distribution.busy++;
      else distribution.overloaded++;
    });

    return distribution;
  }, [teamWorkload]);

  // Suggest optimal delegation target
  const suggestDelegationTarget = useCallback((
    requiredSkills: string[] = [],
    estimatedHours = 1
  ) => {
    let candidates = getAvailableMembers(85); // Members under 85% workload

    // Filter by skills if specified
    if (requiredSkills.length > 0) {
      candidates = candidates.filter(member =>
        requiredSkills.some(skill => member.skills.includes(skill))
      );
    }

    // Filter by available hours
    candidates = candidates.filter(member =>
      member.available_hours >= estimatedHours
    );

    // Sort by workload (ascending) - least loaded first
    candidates.sort((a, b) => a.workload_percentage - b.workload_percentage);

    return candidates[0] || null;
  }, [getAvailableMembers, teamWorkload]);

  // Initialize data
  useEffect(() => {
    if (teamId && user) {
      fetchTeamWorkload();
    }
  }, [teamId, user, fetchTeamWorkload]);

  // Set up real-time subscription for workload changes
  useEffect(() => {
    if (!teamId || !user) return;

    const subscription = supabase
      .channel(`team_workload_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_workload_indicators',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          // Refresh data when workload indicators change
          fetchTeamWorkload();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [teamId, user, fetchTeamWorkload]);

  return {
    teamWorkload,
    loading,
    error,
    updateWorkload,
    addScheduledHours,
    addDelegatedHours,
    updateSkills,
    getAvailableMembers,
    getOverloadedMembers,
    getMembersWithSkills,
    getTeamAverageWorkload,
    getWorkloadDistribution,
    suggestDelegationTarget,
    refreshWorkload: fetchTeamWorkload
  };
}