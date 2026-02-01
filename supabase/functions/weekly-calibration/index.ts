import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface WeeklyCalibrationRequest {
  action: 'start' | 'save_step' | 'complete' | 'get_current' | 'get_score';
  week_start_date?: string;
  step_number?: number;
  step_data?: any;
  role_selected?: string;
  zone_selected?: string;
  non_negotiable?: string;
  weekly_hours_planned?: number;
}

interface RoleFitScore {
  score: number;
  breakdown: {
    role_alignment: number;
    attention_distribution: number;
    focus_protection: number;
    delegation_opportunities: number;
  };
  recommendations: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: WeeklyCalibrationRequest = await req.json();

    switch (body.action) {
      case 'start':
        return await startCalibration(supabase, user.id, body.week_start_date || getCurrentWeekStart());

      case 'save_step':
        return await saveCalibrationStep(supabase, user.id, body);

      case 'complete':
        return await completeCalibration(supabase, user.id, body);

      case 'get_current':
        return await getCurrentCalibration(supabase, user.id, body.week_start_date || getCurrentWeekStart());

      case 'get_score':
        return await calculateRoleFitScore(supabase, user.id, body.week_start_date || getCurrentWeekStart());

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Weekly calibration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

async function startCalibration(supabase: any, userId: string, weekStartDate: string) {
  try {
    // Check if calibration already exists for this week
    const { data: existing } = await supabase
      .from('weekly_calibrations')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ calibration: existing }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new calibration
    const { data, error } = await supabase
      .from('weekly_calibrations')
      .insert({
        user_id: userId,
        week_start_date: weekStartDate,
        role_selected: 'maker', // Default, will be updated in steps
        zone_selected: 'peacetime',
        role_fit_score: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ calibration: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Failed to start calibration: ${error.message}`);
  }
}

async function saveCalibrationStep(supabase: any, userId: string, body: WeeklyCalibrationRequest) {
  try {
    const weekStartDate = body.week_start_date || getCurrentWeekStart();

    // Get current calibration
    const { data: calibration } = await supabase
      .from('weekly_calibrations')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .single();

    if (!calibration) {
      throw new Error('No calibration found for this week');
    }

    // Save the step
    const { error: stepError } = await supabase
      .from('calibration_steps')
      .upsert({
        calibration_id: calibration.id,
        step_number: body.step_number,
        step_name: getStepName(body.step_number!),
        step_data: body.step_data,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'calibration_id,step_number'
      });

    if (stepError) throw stepError;

    // Update calibration with step-specific data
    const updates: any = {};

    if (body.step_number === 1 && body.role_selected) {
      updates.role_selected = body.role_selected;
    }
    if (body.step_number === 2 && body.zone_selected) {
      updates.zone_selected = body.zone_selected;
    }
    if (body.step_number === 3) {
      updates.non_negotiable = body.step_data?.non_negotiable;
      updates.weekly_hours_planned = body.step_data?.weekly_hours;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('weekly_calibrations')
        .update(updates)
        .eq('id', calibration.id);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, step_saved: body.step_number }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Failed to save step: ${error.message}`);
  }
}

async function completeCalibration(supabase: any, userId: string, body: WeeklyCalibrationRequest) {
  try {
    const weekStartDate = body.week_start_date || getCurrentWeekStart();

    // Calculate role fit score
    const roleFitScore = await calculateRoleFitScoreInternal(supabase, userId, weekStartDate, body.role_selected!, body.zone_selected!);

    // Mark calibration as complete
    const { data, error } = await supabase
      .from('weekly_calibrations')
      .update({
        role_fit_score: roleFitScore.score,
        attention_budget_planned: body.step_data?.attention_budget || {},
        calibration_completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .select()
      .single();

    if (error) throw error;

    // Save role fit metrics
    for (const [metric, value] of Object.entries(roleFitScore.breakdown)) {
      await supabase
        .from('role_fit_metrics')
        .insert({
          calibration_id: data.id,
          metric_name: metric,
          metric_value: value,
          explanation: getMetricExplanation(metric, value),
        });
    }

    return new Response(
      JSON.stringify({
        calibration: data,
        role_fit_score: roleFitScore,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Failed to complete calibration: ${error.message}`);
  }
}

async function getCurrentCalibration(supabase: any, userId: string, weekStartDate: string) {
  try {
    const { data, error } = await supabase
      .from('weekly_calibrations')
      .select(`
        *,
        calibration_steps (
          step_number,
          step_name,
          step_data,
          completed_at
        ),
        role_fit_metrics (
          metric_name,
          metric_value,
          explanation
        )
      `)
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return new Response(
      JSON.stringify({ calibration: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Failed to get calibration: ${error.message}`);
  }
}

async function calculateRoleFitScore(supabase: any, userId: string, weekStartDate: string) {
  try {
    // Get current calibration
    const { data: calibration } = await supabase
      .from('weekly_calibrations')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .single();

    if (!calibration) {
      throw new Error('No calibration found for this week');
    }

    const score = await calculateRoleFitScoreInternal(
      supabase,
      userId,
      weekStartDate,
      calibration.role_selected,
      calibration.zone_selected
    );

    return new Response(
      JSON.stringify({ role_fit_score: score }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Failed to calculate role fit score: ${error.message}`);
  }
}

async function calculateRoleFitScoreInternal(
  supabase: any,
  userId: string,
  weekStartDate: string,
  roleMode: string,
  zoneContext: string
): Promise<RoleFitScore> {
  // Get timeline items for the week
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  const { data: items } = await supabase
    .from('timeline_items')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', weekStartDate)
    .lt('start_time', weekEndDate.toISOString().split('T')[0]);

  if (!items || items.length === 0) {
    return {
      score: 50,
      breakdown: {
        role_alignment: 50,
        attention_distribution: 50,
        focus_protection: 50,
        delegation_opportunities: 50,
      },
      recommendations: ['No scheduled activities found for this week'],
    };
  }

  // Calculate role-specific scores
  const breakdown = calculateRoleMetrics(items, roleMode, zoneContext);
  const score = Math.round(
    (breakdown.role_alignment +
     breakdown.attention_distribution +
     breakdown.focus_protection +
     breakdown.delegation_opportunities) / 4
  );

  const recommendations = generateRecommendations(breakdown, roleMode, zoneContext);

  return {
    score,
    breakdown,
    recommendations,
  };
}

function calculateRoleMetrics(items: any[], roleMode: string, zoneContext: string) {
  const totalHours = items.reduce((sum, item) => sum + (item.duration_minutes / 60), 0);

  // Count by attention type
  const attentionCounts = {
    create: 0,
    decide: 0,
    connect: 0,
    review: 0,
    recover: 0,
  };

  items.forEach(item => {
    if (item.attention_type && attentionCounts.hasOwnProperty(item.attention_type)) {
      attentionCounts[item.attention_type] += item.duration_minutes / 60;
    }
  });

  // Role alignment scoring
  let roleAlignment = 50;
  if (roleMode === 'maker') {
    const createPercentage = (attentionCounts.create / totalHours) * 100;
    roleAlignment = Math.min(95, Math.max(10, createPercentage * 2));
  } else if (roleMode === 'marker') {
    const decidePercentage = (attentionCounts.decide / totalHours) * 100;
    roleAlignment = Math.min(95, Math.max(10, decidePercentage * 3));
  } else if (roleMode === 'multiplier') {
    const connectPercentage = (attentionCounts.connect / totalHours) * 100;
    roleAlignment = Math.min(95, Math.max(10, connectPercentage * 2.5));
  }

  // Attention distribution scoring
  const distribution = Object.values(attentionCounts).filter(v => v > 0).length;
  const attentionDistribution = Math.min(95, distribution * 20);

  // Focus protection scoring (based on CREATE block sizes)
  const createBlocks = items.filter(item => item.attention_type === 'create');
  const longFocusBlocks = createBlocks.filter(item => item.duration_minutes >= 120);
  const focusProtection = createBlocks.length > 0
    ? Math.min(95, (longFocusBlocks.length / createBlocks.length) * 100)
    : 70;

  // Delegation opportunities (tasks over 60 minutes that could be delegated)
  const longTasks = items.filter(item => item.duration_minutes >= 60);
  const delegationOpportunities = totalHours > 0
    ? Math.min(95, 100 - ((longTasks.length / items.length) * 60))
    : 80;

  return {
    role_alignment: Math.round(roleAlignment),
    attention_distribution: Math.round(attentionDistribution),
    focus_protection: Math.round(focusProtection),
    delegation_opportunities: Math.round(delegationOpportunities),
  };
}

function generateRecommendations(breakdown: any, roleMode: string, zoneContext: string): string[] {
  const recommendations: string[] = [];

  if (breakdown.role_alignment < 60) {
    if (roleMode === 'maker') {
      recommendations.push('Increase CREATE time blocks for better maker productivity');
    } else if (roleMode === 'marker') {
      recommendations.push('Schedule more DECIDE blocks for effective decision-making');
    } else {
      recommendations.push('Add more CONNECT time for multiplier effectiveness');
    }
  }

  if (breakdown.focus_protection < 70) {
    recommendations.push('Protect longer focus blocks (2+ hours) for deep work');
  }

  if (breakdown.delegation_opportunities < 60) {
    recommendations.push('Consider delegating tasks longer than 1 hour');
  }

  if (breakdown.attention_distribution < 40) {
    recommendations.push('Balance different attention types throughout the week');
  }

  if (recommendations.length === 0) {
    recommendations.push('Great week structure! Your schedule aligns well with your role.');
  }

  return recommendations;
}

function getStepName(stepNumber: number): string {
  const steps = {
    1: 'Role Selection',
    2: 'Zone Assessment',
    3: 'Non-Negotiable Definition',
    4: 'Constraint Input',
    5: 'Template Generation',
    6: 'Manual Adjustment',
    7: 'Commitment Confirmation',
  };
  return steps[stepNumber] || `Step ${stepNumber}`;
}

function getMetricExplanation(metric: string, value: number): string {
  const explanations = {
    role_alignment: `Role alignment score: ${value}% based on attention type distribution`,
    attention_distribution: `Attention diversity: ${value}% based on variety of activities`,
    focus_protection: `Focus protection: ${value}% based on deep work block sizes`,
    delegation_opportunities: `Delegation potential: ${value}% based on task complexity`,
  };
  return explanations[metric] || `${metric}: ${value}%`;
}