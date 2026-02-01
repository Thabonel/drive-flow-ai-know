import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CLAUDE_MODELS } from '../_shared/models.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimitDb, getRateLimitHeaders, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TimelineItem {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  attention_type?: string;
  priority?: number;
  is_non_negotiable?: boolean;
  context_switch_cost?: number;
  layer_name?: string;
}

interface UserAttentionPreferences {
  current_role: 'maker' | 'marker' | 'multiplier';
  current_zone: 'wartime' | 'peacetime';
  non_negotiable_title?: string;
  non_negotiable_weekly_hours: number;
  attention_budgets: {
    decide: number;
    context_switches: number;
    meetings: number;
  };
  peak_hours_start: string;
  peak_hours_end: string;
}

interface OptimizationConstraints {
  fixed_meetings?: string[]; // Timeline item IDs that cannot be moved
  max_daily_hours?: number;
  min_break_between_blocks?: number;
  preserve_lunch_time?: boolean;
  respect_external_calendar?: boolean;
}

interface WeekOptimizationRequest {
  currentSchedule: TimelineItem[];
  preferences: UserAttentionPreferences;
  constraints: OptimizationConstraints;
  optimizationGoals: ('focus' | 'efficiency' | 'balance')[];
}

interface OptimizationChange {
  type: 'move' | 'cluster' | 'extend' | 'break' | 'delegate';
  item_id: string;
  old_time: string;
  new_time: string;
  reason: string;
  impact: string;
}

interface WeekOptimizationResult {
  originalSchedule: TimelineItem[];
  optimizedSchedule: TimelineItem[];
  changes: OptimizationChange[];
  improvements: {
    contextSwitchesReduced: number;
    focusBlocksExtended: number;
    attentionBudgetImproved: number;
    delegationOpportunities: number;
  };
  explanation: string;
  weeklyScore: {
    before: number;
    after: number;
  };
}

async function callClaude(prompt: string, systemMessage: string): Promise<string> {
  if (!anthropicApiKey) {
    throw new Error('Claude API key not available');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODELS.PRIMARY, // Use most capable model for complex optimization
      max_tokens: 4096,
      system: systemMessage,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: any) => block.type === 'text');
  return textBlock?.text || '';
}

function analyzeCurrentSchedule(schedule: TimelineItem[], preferences: UserAttentionPreferences) {
  // Calculate context switches
  let contextSwitches = 0;
  let focusBlockCount = 0;
  let attentionBudgetViolations = 0;
  const attentionTypeCounts: Record<string, number> = {};

  // Sort schedule by start time
  const sortedSchedule = [...schedule].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  for (let i = 0; i < sortedSchedule.length; i++) {
    const item = sortedSchedule[i];

    // Count attention types
    if (item.attention_type) {
      attentionTypeCounts[item.attention_type] = (attentionTypeCounts[item.attention_type] || 0) + 1;
    }

    // Count focus blocks (create type >= 90 minutes)
    if (item.attention_type === 'create' && item.duration_minutes >= 90) {
      focusBlockCount++;
    }

    // Count context switches
    if (i > 0 && item.attention_type !== sortedSchedule[i-1].attention_type) {
      contextSwitches++;
    }
  }

  // Check attention budget violations
  if (attentionTypeCounts['decide'] > preferences.attention_budgets.decide) {
    attentionBudgetViolations++;
  }

  const roleFitScore = calculateRoleFitScore(schedule, preferences);

  return {
    contextSwitches,
    focusBlockCount,
    attentionBudgetViolations,
    attentionTypeCounts,
    roleFitScore
  };
}

function calculateRoleFitScore(schedule: TimelineItem[], preferences: UserAttentionPreferences): number {
  const meetingCount = schedule.filter(item => item.attention_type === 'connect').length;
  const createCount = schedule.filter(item => item.attention_type === 'create').length;
  const decideCount = schedule.filter(item => item.attention_type === 'decide').length;
  const totalHours = schedule.reduce((sum, item) => sum + item.duration_minutes, 0) / 60;

  let score = 50; // Base score

  switch (preferences.current_role) {
    case 'maker':
      // Makers need protected deep work time, minimal meetings
      score += Math.max(0, 30 - (meetingCount * 2)); // Penalty for excessive meetings
      score += createCount * 5; // Bonus for creation time
      if (schedule.some(item => item.attention_type === 'create' && item.duration_minutes >= 120)) {
        score += 20; // Bonus for deep work blocks
      }
      break;

    case 'marker':
      // Markers need decision time, balanced meetings
      score += decideCount * 8; // Strong bonus for decision blocks
      score += Math.max(0, 20 - Math.abs(meetingCount - 3) * 3); // Optimal around 3 meetings
      break;

    case 'multiplier':
      // Multipliers need interaction time, quick connections
      score += meetingCount * 3; // Bonus for connections
      if (schedule.filter(item => item.attention_type === 'connect' && item.duration_minutes <= 30).length > 2) {
        score += 15; // Bonus for short, frequent connections
      }
      break;
  }

  // Zone adjustments
  if (preferences.current_zone === 'wartime') {
    const nonEssentialMeetings = meetingCount * 0.2; // Assume 20% could be non-essential
    score -= nonEssentialMeetings * 5;
  }

  return Math.min(100, Math.max(0, score));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('AI Week Optimizer function called');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimitDb(
      supabase,
      user.id,
      'ai-week-optimizer',
      RATE_LIMIT_PRESETS.AI_ANALYSIS // More generous limit for week optimization
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Week optimization requires significant processing time.',
          retryAfter: rateLimitResult.retryAfter
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...getRateLimitHeaders(rateLimitResult),
            'Content-Type': 'application/json'
          }
        }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body: WeekOptimizationRequest = await req.json();
    const { currentSchedule, preferences, constraints, optimizationGoals } = body;

    // Validate input
    if (!currentSchedule || !Array.isArray(currentSchedule)) {
      throw new Error('Current schedule is required and must be an array');
    }

    if (!preferences || !preferences.current_role) {
      throw new Error('User attention preferences are required');
    }

    console.log('Optimizing week with', currentSchedule.length, 'items for', preferences.current_role, 'role');

    // Analyze current schedule
    const currentAnalysis = analyzeCurrentSchedule(currentSchedule, preferences);
    console.log('Current analysis:', currentAnalysis);

    // Build comprehensive prompt for Claude
    const systemMessage = `You are an AI productivity consultant specializing in attention-based schedule optimization. You understand the 3-2-1 attention system:

ROLES:
- Maker: Needs 2+ hour focus blocks, minimal meetings (max 3/day), prioritizes creation time
- Marker: Needs decision clustering, 30-45 min decision windows, max 2 decide blocks/day
- Multiplier: Needs short frequent connections (15-30 min), routing time, delegation opportunities

ZONES:
- Wartime: High intensity execution, strict limits on optional meetings (max 20% of time)
- Peacetime: Growth and strategic planning, more learning/reflection time

ATTENTION TYPES:
- Create: Deep work requiring sustained focus (90+ min blocks preferred)
- Decide: Choice-making and evaluation (cluster together, limit to budget)
- Connect: Meetings and communication (vary length by role)
- Review: Assessment and feedback tasks
- Recover: Rest and reflection time (at least 1 block/day in peacetime)

OPTIMIZATION PRINCIPLES:
1. Cluster similar attention types to reduce context switching
2. Protect non-negotiable time in peak energy hours
3. Respect role-specific patterns and durations
4. Balance attention budget across the week
5. Suggest delegation opportunities for overcommitted periods
6. Optimize for the user's current zone (wartime/peacetime)

You will analyze the schedule and provide specific, actionable optimizations in JSON format.`;

    const prompt = `Analyze and optimize this weekly schedule:

CURRENT ROLE: ${preferences.current_role}
CURRENT ZONE: ${preferences.current_zone}
NON-NEGOTIABLE: ${preferences.non_negotiable_title || 'None specified'} (${preferences.non_negotiable_weekly_hours} hours/week)
PEAK HOURS: ${preferences.peak_hours_start} - ${preferences.peak_hours_end}
ATTENTION BUDGETS: ${JSON.stringify(preferences.attention_budgets)}
OPTIMIZATION GOALS: ${optimizationGoals.join(', ')}

CURRENT SCHEDULE:
${currentSchedule.map(item =>
  `${item.start_time} - ${item.end_time} | ${item.title} | ${item.attention_type || 'untyped'} | ${item.duration_minutes}min | Priority: ${item.priority || 'none'} | Non-negotiable: ${item.is_non_negotiable ? 'YES' : 'NO'}`
).join('\n')}

CONSTRAINTS:
${JSON.stringify(constraints)}

CURRENT ISSUES DETECTED:
- Context Switches: ${currentAnalysis.contextSwitches}
- Focus Blocks: ${currentAnalysis.focusBlockCount}
- Budget Violations: ${currentAnalysis.attentionBudgetViolations}
- Role Fit Score: ${currentAnalysis.roleFitScore}/100

Please provide optimization recommendations in this exact JSON format:

{
  "optimizedSchedule": [
    {
      "id": "item_id",
      "title": "Item Title",
      "start_time": "2025-02-03T09:00:00Z",
      "end_time": "2025-02-03T10:30:00Z",
      "duration_minutes": 90,
      "attention_type": "create",
      "priority": 4,
      "is_non_negotiable": false,
      "context_switch_cost": 0,
      "layer_name": "Deep Work"
    }
  ],
  "changes": [
    {
      "type": "move",
      "item_id": "item_id",
      "old_time": "original_time",
      "new_time": "new_time",
      "reason": "Clustering similar attention types to reduce context switching",
      "impact": "Reduces context switches by 2, improves focus"
    }
  ],
  "improvements": {
    "contextSwitchesReduced": 5,
    "focusBlocksExtended": 2,
    "attentionBudgetImproved": 1,
    "delegationOpportunities": 3
  },
  "explanation": "Detailed explanation of optimization strategy and benefits",
  "weeklyScore": {
    "before": ${currentAnalysis.roleFitScore},
    "after": 85
  }
}

Focus on practical improvements that can be implemented immediately. Prioritize:
1. Role-appropriate scheduling patterns
2. Attention budget compliance
3. Context switch reduction
4. Peak hours optimization for non-negotiable work
5. Delegation suggestions for overcommitted periods`;

    console.log('Calling Claude for schedule optimization...');
    const claudeResponse = await callClaude(prompt, systemMessage);

    let optimizationResult: WeekOptimizationResult;
    try {
      optimizationResult = JSON.parse(claudeResponse);

      // Ensure we have the original schedule in the response
      optimizationResult.originalSchedule = currentSchedule;

      // Validate the optimization result structure
      if (!optimizationResult.optimizedSchedule || !optimizationResult.changes || !optimizationResult.improvements) {
        throw new Error('Incomplete optimization result from Claude');
      }

    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      console.error('Claude response was:', claudeResponse);

      // Fallback response if JSON parsing fails
      optimizationResult = {
        originalSchedule: currentSchedule,
        optimizedSchedule: currentSchedule, // Keep original if optimization failed
        changes: [],
        improvements: {
          contextSwitchesReduced: 0,
          focusBlocksExtended: 0,
          attentionBudgetImproved: 0,
          delegationOpportunities: 0
        },
        explanation: "I analyzed your schedule but encountered a technical issue with the optimization. " +
                    "Here are some quick suggestions: " + claudeResponse.substring(0, 500) + "...",
        weeklyScore: {
          before: currentAnalysis.roleFitScore,
          after: currentAnalysis.roleFitScore
        }
      };
    }

    console.log('Week optimization completed with', optimizationResult.changes.length, 'suggested changes');

    return new Response(
      JSON.stringify({
        ...optimizationResult,
        metadata: {
          role: preferences.current_role,
          zone: preferences.current_zone,
          goals: optimizationGoals,
          itemsAnalyzed: currentSchedule.length,
          processingTime: Date.now()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in AI Week Optimizer:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to optimize weekly schedule'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});