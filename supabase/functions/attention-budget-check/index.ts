import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewEventRequest {
  newEvent: {
    attention_type: string;
    duration_minutes: number;
    start_time: string;
  };
  existingItems: Array<{
    id: string;
    attention_type: string;
    duration_minutes: number;
    start_time: string;
  }>;
  targetDate: string;
}

interface AttentionWarning {
  level: 'info' | 'warning' | 'critical' | 'blocking';
  type: 'budget_limit' | 'context_switch' | 'focus_fragmentation' | 'peak_hours' | 'decision_fatigue';
  title: string;
  description: string;
  suggestion?: string;
  actionable: boolean;
  severity: number;
  affectedItems?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const requestData: NewEventRequest = await req.json();
    const { newEvent, existingItems, targetDate } = requestData;

    // Get user's attention preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_attention_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefsError || !preferences) {
      throw new Error('No attention preferences found');
    }

    // Analyze budget violations
    const warnings: AttentionWarning[] = [];
    const budgets = preferences.attention_budgets as Record<string, number>;

    // Check attention type budget violation
    const attentionType = newEvent.attention_type;
    const budgetLimit = budgets[attentionType] || getDefaultBudgetLimit(attentionType, preferences.current_role);

    // Calculate current usage for this attention type
    const currentUsage = existingItems
      .filter(item =>
        item.attention_type === attentionType &&
        item.start_time.startsWith(targetDate)
      )
      .reduce((sum, item) => sum + item.duration_minutes, 0);

    const projectedUsage = currentUsage + newEvent.duration_minutes;
    const usagePercentage = (projectedUsage / budgetLimit) * 100;

    // Generate budget warnings
    if (usagePercentage >= 120) {
      warnings.push({
        level: 'blocking',
        type: 'budget_limit',
        title: `${attentionType} Budget Severely Exceeded`,
        description: `Adding this task would use ${Math.round(usagePercentage)}% of daily ${attentionType} budget (${Math.round(projectedUsage / 60 * 10) / 10}h of ${Math.round(budgetLimit / 60 * 10) / 10}h limit)`,
        suggestion: 'Consider rescheduling to another day or delegating this task',
        actionable: true,
        severity: 10
      });
    } else if (usagePercentage >= 100) {
      warnings.push({
        level: 'critical',
        type: 'budget_limit',
        title: `${attentionType} Budget Exceeded`,
        description: `Adding this task would exceed daily ${attentionType} budget by ${Math.round(projectedUsage - budgetLimit)}m`,
        suggestion: 'Consider shortening duration or moving to a different day',
        actionable: true,
        severity: 8
      });
    } else if (usagePercentage >= 85) {
      warnings.push({
        level: 'warning',
        type: 'budget_limit',
        title: `${attentionType} Budget Nearly Full`,
        description: `This task will use ${Math.round(usagePercentage)}% of daily ${attentionType} budget`,
        suggestion: 'Monitor remaining capacity for unexpected tasks',
        actionable: true,
        severity: 6
      });
    }

    // Check context switching analysis
    const contextSwitchWarnings = analyzeContextSwitching(newEvent, existingItems, preferences);
    warnings.push(...contextSwitchWarnings);

    // Check focus fragmentation
    const fragmentationWarnings = analyzeFocusFragmentation(newEvent, existingItems, preferences);
    warnings.push(...fragmentationWarnings);

    // Check peak hours optimization
    const peakHoursWarnings = analyzePeakHoursOptimization(newEvent, preferences);
    warnings.push(...peakHoursWarnings);

    // Check decision fatigue for Marker role
    const decisionFatigueWarnings = analyzeDecisionFatigue(newEvent, existingItems, preferences);
    warnings.push(...decisionFatigueWarnings);

    // Sort warnings by severity
    warnings.sort((a, b) => b.severity - a.severity);

    // Store warnings in database for tracking
    if (warnings.length > 0) {
      const { error: warningsError } = await supabase
        .from('attention_warnings')
        .insert(
          warnings.map(warning => ({
            user_id: user.id,
            warning_type: warning.type,
            severity: warning.level,
            title: warning.title,
            description: warning.description,
            suggestion: warning.suggestion,
            actionable: warning.actionable,
            severity_score: warning.severity,
            affected_items: warning.affectedItems || []
          }))
        );

      if (warningsError) {
        console.error('Error storing warnings:', warningsError);
      }
    }

    return new Response(
      JSON.stringify({
        warnings,
        budgetStatus: {
          attentionType,
          currentUsage,
          projectedUsage,
          budgetLimit,
          usagePercentage,
          isViolating: usagePercentage > 100
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in attention budget check:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function getDefaultBudgetLimit(attentionType: string, role?: string): number {
  const defaults: Record<string, number> = {
    create: 240, // 4 hours
    decide: 120, // 2 hours
    connect: 180, // 3 hours
    review: 120, // 2 hours
    recover: 60   // 1 hour
  };

  // Role-specific adjustments
  if (role === 'maker' && attentionType === 'create') {
    return 360; // 6 hours for Makers
  }

  if (role === 'multiplier' && attentionType === 'connect') {
    return 240; // 4 hours for Multipliers
  }

  return defaults[attentionType] || 120;
}

function analyzeContextSwitching(
  newEvent: NewEventRequest['newEvent'],
  existingItems: NewEventRequest['existingItems'],
  preferences: any
): AttentionWarning[] {
  const warnings: AttentionWarning[] = [];
  const newEventTime = new Date(newEvent.start_time);

  // Find items immediately before and after the new event
  const sortedItems = [...existingItems]
    .filter(item => item.start_time.startsWith(newEvent.start_time.split('T')[0]))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Check item immediately before
  const itemBefore = sortedItems
    .reverse()
    .find(item => new Date(item.start_time).getTime() < newEventTime.getTime());

  if (itemBefore && itemBefore.attention_type !== newEvent.attention_type) {
    const itemBeforeEnd = new Date(itemBefore.start_time);
    itemBeforeEnd.setMinutes(itemBeforeEnd.getMinutes() + itemBefore.duration_minutes);

    const gapBefore = (newEventTime.getTime() - itemBeforeEnd.getTime()) / (1000 * 60);
    const switchCost = calculateContextSwitchCost(itemBefore.attention_type, newEvent.attention_type, gapBefore);

    if (switchCost >= 7) {
      warnings.push({
        level: 'critical',
        type: 'context_switch',
        title: 'High Context Switch Cost',
        description: `Switching from ${itemBefore.attention_type} to ${newEvent.attention_type} has high cognitive cost (${switchCost.toFixed(1)}/10)`,
        suggestion: gapBefore < 15 ? 'Add buffer time between tasks' : 'Consider grouping similar attention types together',
        actionable: true,
        severity: Math.round(switchCost),
        affectedItems: [itemBefore.id]
      });
    }
  }

  // Check item immediately after
  const itemAfter = sortedItems
    .find(item => new Date(item.start_time).getTime() > newEventTime.getTime());

  if (itemAfter && itemAfter.attention_type !== newEvent.attention_type) {
    const newEventEnd = new Date(newEvent.start_time);
    newEventEnd.setMinutes(newEventEnd.getMinutes() + newEvent.duration_minutes);

    const gapAfter = (new Date(itemAfter.start_time).getTime() - newEventEnd.getTime()) / (1000 * 60);
    const switchCost = calculateContextSwitchCost(newEvent.attention_type, itemAfter.attention_type, gapAfter);

    if (switchCost >= 7) {
      warnings.push({
        level: 'critical',
        type: 'context_switch',
        title: 'High Context Switch Cost',
        description: `Switching from ${newEvent.attention_type} to ${itemAfter.attention_type} has high cognitive cost (${switchCost.toFixed(1)}/10)`,
        suggestion: gapAfter < 15 ? 'Add buffer time between tasks' : 'Consider rescheduling to group similar work',
        actionable: true,
        severity: Math.round(switchCost),
        affectedItems: [itemAfter.id]
      });
    }
  }

  return warnings;
}

function analyzeFocusFragmentation(
  newEvent: NewEventRequest['newEvent'],
  existingItems: NewEventRequest['existingItems'],
  preferences: any
): AttentionWarning[] {
  const warnings: AttentionWarning[] = [];

  // Check if this creates fragmentation for Create work
  if (newEvent.attention_type === 'create' && newEvent.duration_minutes < 90) {
    warnings.push({
      level: 'warning',
      type: 'focus_fragmentation',
      title: 'Short Focus Block',
      description: `${newEvent.duration_minutes}m Create block is shorter than optimal 90+ minutes`,
      suggestion: 'Consider extending duration or combining with adjacent time',
      actionable: true,
      severity: 5
    });
  }

  // Check if placing this event fragments existing Create blocks
  const createBlocks = existingItems.filter(item =>
    item.attention_type === 'create' &&
    item.duration_minutes >= 90 &&
    item.start_time.startsWith(newEvent.start_time.split('T')[0])
  );

  const newEventTime = new Date(newEvent.start_time);
  const newEventEnd = new Date(newEventTime.getTime() + newEvent.duration_minutes * 60000);

  createBlocks.forEach(block => {
    const blockStart = new Date(block.start_time);
    const blockEnd = new Date(blockStart.getTime() + block.duration_minutes * 60000);

    // Check if new event is placed too close to a focus block
    const distanceBefore = (blockStart.getTime() - newEventEnd.getTime()) / (1000 * 60);
    const distanceAfter = (newEventTime.getTime() - blockEnd.getTime()) / (1000 * 60);

    if ((distanceBefore > 0 && distanceBefore < 30) || (distanceAfter > 0 && distanceAfter < 30)) {
      warnings.push({
        level: 'warning',
        type: 'focus_fragmentation',
        title: 'Focus Block Interference',
        description: `This event is placed ${Math.min(Math.abs(distanceBefore), Math.abs(distanceAfter)).toFixed(0)}m from a focus block`,
        suggestion: 'Add 30m buffer or reschedule to avoid fragmenting focus time',
        actionable: true,
        severity: 6,
        affectedItems: [block.id]
      });
    }
  });

  return warnings;
}

function analyzePeakHoursOptimization(
  newEvent: NewEventRequest['newEvent'],
  preferences: any
): AttentionWarning[] {
  const warnings: AttentionWarning[] = [];

  if (!preferences.peak_hours_start || !preferences.peak_hours_end) {
    return warnings;
  }

  const eventHour = new Date(newEvent.start_time).getHours();
  const peakStart = parseInt(preferences.peak_hours_start.split(':')[0]);
  const peakEnd = parseInt(preferences.peak_hours_end.split(':')[0]);

  const isHighAttentionTask = ['create', 'decide'].includes(newEvent.attention_type);
  const isInPeakHours = eventHour >= peakStart && eventHour < peakEnd;

  if (isHighAttentionTask && !isInPeakHours) {
    warnings.push({
      level: 'info',
      type: 'peak_hours',
      title: 'Peak Hours Optimization',
      description: `${newEvent.attention_type} work scheduled outside peak hours (${preferences.peak_hours_start}-${preferences.peak_hours_end})`,
      suggestion: `Consider moving to peak hours for 25-40% better performance`,
      actionable: true,
      severity: 4
    });
  } else if (!isHighAttentionTask && isInPeakHours) {
    warnings.push({
      level: 'info',
      type: 'peak_hours',
      title: 'Peak Hours Opportunity',
      description: `Peak hours could be better utilized with Create or Decide work`,
      suggestion: `Consider using peak hours for high-attention tasks`,
      actionable: true,
      severity: 3
    });
  }

  return warnings;
}

function analyzeDecisionFatigue(
  newEvent: NewEventRequest['newEvent'],
  existingItems: NewEventRequest['existingItems'],
  preferences: any
): AttentionWarning[] {
  const warnings: AttentionWarning[] = [];

  if (preferences.current_role !== 'marker' || newEvent.attention_type !== 'decide') {
    return warnings;
  }

  // Count existing decision work for the day
  const existingDecisionWork = existingItems
    .filter(item =>
      item.attention_type === 'decide' &&
      item.start_time.startsWith(newEvent.start_time.split('T')[0])
    )
    .reduce((sum, item) => sum + item.duration_minutes, 0);

  const totalDecisionWork = existingDecisionWork + newEvent.duration_minutes;

  if (totalDecisionWork > 180) { // More than 3 hours of decision work
    warnings.push({
      level: 'warning',
      type: 'decision_fatigue',
      title: 'Decision Fatigue Risk',
      description: `${Math.round(totalDecisionWork / 60 * 10) / 10}h of decision work scheduled for the day`,
      suggestion: 'Consider batching decisions or delegating some choices to avoid decision fatigue',
      actionable: true,
      severity: 7
    });
  }

  return warnings;
}

function calculateContextSwitchCost(
  fromType: string,
  toType: string,
  timeBetweenMinutes: number = 0
): number {
  if (fromType === toType) return 0;

  // Base cost matrix
  const costMatrix: Record<string, number> = {
    'create-connect': 8,
    'connect-create': 7,
    'decide-create': 6,
    'create-decide': 5,
    'review-create': 4,
    'create-review': 3,
    'decide-connect': 4,
    'connect-decide': 5,
    'review-decide': 3,
    'decide-review': 4,
    'connect-review': 2,
    'review-connect': 3
  };

  const key = `${fromType}-${toType}`;
  let baseCost = costMatrix[key] || 2;

  // Time penalty - closer switches are more expensive
  let timePenalty = 1;
  if (timeBetweenMinutes < 15) {
    timePenalty = 1.5;
  } else if (timeBetweenMinutes < 30) {
    timePenalty = 1.2;
  } else if (timeBetweenMinutes >= 60) {
    timePenalty = 0.8; // Bonus for sufficient break
  }

  return Math.min(10, baseCost * timePenalty);
}