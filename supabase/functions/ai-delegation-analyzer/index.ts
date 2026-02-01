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
  description?: string;
  start_time: string;
  duration_minutes: number;
  attention_type?: string;
  priority?: number;
  is_non_negotiable?: boolean;
  layer_name?: string;
  user_id: string;
}

interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  expertise_areas?: string[];
  current_workload?: number; // 0-100 scale
  trust_history?: {
    completed_delegations: number;
    success_rate: number;
    avg_quality_rating: number;
  };
}

interface DelegationAnalysisRequest {
  timelineItem?: TimelineItem;
  allUserItems?: TimelineItem[];
  teamMembers?: TeamMember[];
  userRole: 'maker' | 'marker' | 'multiplier';
  analysisType: 'single_item' | 'weekly_scan' | 'is_this_my_job';
}

interface DelegationRecommendation {
  item_id: string;
  should_delegate: boolean;
  confidence_score: number; // 0-100
  reasons: string[];
  recommended_delegates: {
    team_member_id: string;
    name: string;
    trust_level: 'new' | 'experienced' | 'expert';
    fit_score: number; // 0-100
    reason: string;
    estimated_time_savings: number; // minutes
  }[];
  delegation_strategy: {
    handoff_method: 'work_alongside' | 'checkpoint_reviews' | 'provide_context_only';
    follow_up_schedule: string[];
    success_factors: string[];
    risk_mitigation: string[];
  };
  automation_alternative?: {
    possible: boolean;
    tools_suggested: string[];
    implementation_complexity: 'low' | 'medium' | 'high';
  };
}

interface WeeklyDelegationScan {
  total_items_analyzed: number;
  delegation_opportunities: number;
  time_savings_potential: number; // minutes
  recommendations: DelegationRecommendation[];
  recurring_patterns: {
    pattern: string;
    frequency: number;
    delegation_suggestion: string;
  }[];
  role_alignment_score: number; // How well current tasks align with user role
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
      model: CLAUDE_MODELS.FAST, // Use fast model for delegation analysis
      max_tokens: 3000,
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

async function getTeamMembersWithWorkload(supabase: any, userId: string): Promise<TeamMember[]> {
  // Get team members for this user
  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select(`
      user_id,
      team_id,
      users:user_id (
        id,
        email,
        user_settings (full_name)
      )
    `)
    .neq('user_id', userId); // Exclude current user

  if (!teamMemberships) return [];

  // Get current workload for team members (count of timeline items in next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const teamMembers: TeamMember[] = [];

  for (const membership of teamMemberships) {
    if (!membership.users) continue;

    const { count: workloadCount } = await supabase
      .from('timeline_items')
      .select('id', { count: 'exact' })
      .eq('user_id', membership.users.id)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', nextWeek.toISOString());

    // Get delegation history for trust level calculation
    const { data: delegationHistory } = await supabase
      .from('delegations')
      .select('status, created_at')
      .eq('delegate_id', membership.users.id)
      .eq('status', 'completed');

    const completedDelegations = delegationHistory?.length || 0;
    const successRate = completedDelegations > 0 ?
      (delegationHistory?.filter(d => d.status === 'completed').length / completedDelegations) * 100 :
      75; // Default to 75% for new team members

    teamMembers.push({
      id: membership.users.id,
      email: membership.users.email,
      full_name: membership.users.user_settings?.[0]?.full_name,
      current_workload: Math.min(100, (workloadCount || 0) * 10), // Rough workload calculation
      trust_history: {
        completed_delegations: completedDelegations,
        success_rate: successRate,
        avg_quality_rating: 4.0 // Default rating
      }
    });
  }

  return teamMembers;
}

function calculateRoleAlignment(items: TimelineItem[], userRole: string): number {
  const totalItems = items.length;
  if (totalItems === 0) return 50;

  let alignmentScore = 0;

  for (const item of items) {
    let itemScore = 50; // Base score

    switch (userRole) {
      case 'maker':
        // Makers should focus on creation, minimal meetings
        if (item.attention_type === 'create') itemScore = 90;
        else if (item.attention_type === 'connect') itemScore = 20;
        else if (item.attention_type === 'decide') itemScore = 40;
        else if (item.attention_type === 'review') itemScore = 60;
        break;

      case 'marker':
        // Markers should focus on decisions and reviews
        if (item.attention_type === 'decide') itemScore = 90;
        else if (item.attention_type === 'review') itemScore = 80;
        else if (item.attention_type === 'connect') itemScore = 60;
        else if (item.attention_type === 'create') itemScore = 30;
        break;

      case 'multiplier':
        // Multipliers should focus on connections and coordination
        if (item.attention_type === 'connect') itemScore = 90;
        else if (item.attention_type === 'decide') itemScore = 70;
        else if (item.attention_type === 'review') itemScore = 60;
        else if (item.attention_type === 'create') itemScore = 20;
        break;
    }

    alignmentScore += itemScore;
  }

  return Math.round(alignmentScore / totalItems);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('AI Delegation Analyzer function called');

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
      'ai-delegation-analyzer',
      RATE_LIMIT_PRESETS.AI_QUERY
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before analyzing more delegation opportunities.',
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

    const body: DelegationAnalysisRequest = await req.json();
    const { timelineItem, allUserItems, userRole, analysisType } = body;

    // Validate input
    if (!userRole || !['maker', 'marker', 'multiplier'].includes(userRole)) {
      throw new Error('Valid user role is required (maker, marker, or multiplier)');
    }

    if (!analysisType || !['single_item', 'weekly_scan', 'is_this_my_job'].includes(analysisType)) {
      throw new Error('Valid analysis type is required');
    }

    // Get team members with current workload
    const teamMembers = await getTeamMembersWithWorkload(supabase, user.id);
    console.log('Found', teamMembers.length, 'team members for delegation analysis');

    // Build the analysis based on type
    let analysisResult: any;

    if (analysisType === 'single_item' && timelineItem) {
      // Analyze single item for delegation
      const systemMessage = `You are an AI delegation advisor specializing in the 3-2-1 attention system. You help users determine when tasks should be delegated based on:

DELEGATION PRINCIPLES:
1. Role Alignment: Tasks outside primary role focus should be delegated
2. Skill Level: Tasks below user's seniority/expertise level are delegation candidates
3. Capacity: When overcommitted, delegate lower-priority or routine tasks
4. Development: Delegate to develop team members' skills
5. Efficiency: Delegate when others can do it faster/better

TRUST LEVELS:
- New: First-time delegation, requires "work alongside" approach
- Experienced: Proven track record, needs checkpoint reviews at 25%/75%
- Expert: High trust, only needs initial context and final review

ROLE-SPECIFIC DELEGATION PATTERNS:
- Maker: Delegate meetings, administrative tasks, routine reviews
- Marker: Delegate research, data gathering, initial analysis
- Multiplier: Delegate execution tasks, detailed work, operational items

Provide specific, actionable delegation recommendations.`;

      const prompt = `Analyze this task for delegation:

USER ROLE: ${userRole}
TASK: ${timelineItem.title}
DESCRIPTION: ${timelineItem.description || 'No description provided'}
DURATION: ${timelineItem.duration_minutes} minutes
ATTENTION TYPE: ${timelineItem.attention_type || 'untyped'}
PRIORITY: ${timelineItem.priority || 'unset'}

AVAILABLE TEAM MEMBERS:
${teamMembers.map(member =>
  `- ${member.full_name || member.email} (Workload: ${member.current_workload}%, Completed delegations: ${member.trust_history?.completed_delegations || 0}, Success rate: ${member.trust_history?.success_rate || 0}%)`
).join('\n')}

Should this task be delegated? Provide analysis in this JSON format:

{
  "should_delegate": true/false,
  "confidence_score": 85,
  "reasons": ["Specific reason 1", "Specific reason 2"],
  "recommended_delegates": [
    {
      "team_member_id": "member_id",
      "name": "Member Name",
      "trust_level": "experienced",
      "fit_score": 80,
      "reason": "Has relevant experience and light workload",
      "estimated_time_savings": 45
    }
  ],
  "delegation_strategy": {
    "handoff_method": "checkpoint_reviews",
    "follow_up_schedule": ["Day 2: Check initial progress", "Day 5: Review deliverables"],
    "success_factors": ["Clear requirements", "Regular check-ins"],
    "risk_mitigation": ["Backup timeline", "Quality checklist"]
  },
  "automation_alternative": {
    "possible": true,
    "tools_suggested": ["Zapier", "Custom script"],
    "implementation_complexity": "low"
  }
}`;

      const claudeResponse = await callClaude(prompt, systemMessage);

      try {
        analysisResult = {
          item_id: timelineItem.id,
          ...JSON.parse(claudeResponse)
        };
      } catch (parseError) {
        console.error('Failed to parse Claude response:', parseError);
        analysisResult = {
          item_id: timelineItem.id,
          should_delegate: false,
          confidence_score: 0,
          reasons: ['Analysis failed - please try again'],
          recommended_delegates: [],
          delegation_strategy: {
            handoff_method: 'provide_context_only',
            follow_up_schedule: [],
            success_factors: [],
            risk_mitigation: []
          }
        };
      }

    } else if (analysisType === 'weekly_scan' && allUserItems) {
      // Analyze all user items for delegation opportunities
      const roleAlignment = calculateRoleAlignment(allUserItems, userRole);

      const systemMessage = `You are an AI productivity consultant analyzing a weekly schedule for delegation opportunities. Focus on:

1. Tasks that don't align with the user's primary role
2. Recurring activities that could be systematized
3. Low-priority items during overcommitted periods
4. Tasks below the user's skill level
5. Opportunities for team development

Provide a comprehensive weekly delegation analysis.`;

      const prompt = `Analyze this weekly schedule for delegation opportunities:

USER ROLE: ${userRole}
TOTAL ITEMS: ${allUserItems.length}
ROLE ALIGNMENT SCORE: ${roleAlignment}/100

WEEKLY SCHEDULE:
${allUserItems.map(item =>
  `${item.start_time} | ${item.title} | ${item.attention_type || 'untyped'} | ${item.duration_minutes}min | Priority: ${item.priority || 'none'}`
).join('\n')}

TEAM CAPACITY:
${teamMembers.map(member =>
  `- ${member.full_name || member.email}: ${member.current_workload}% workload`
).join('\n')}

Provide delegation analysis in this JSON format:

{
  "total_items_analyzed": ${allUserItems.length},
  "delegation_opportunities": 5,
  "time_savings_potential": 240,
  "recommendations": [
    {
      "item_id": "item_id",
      "should_delegate": true,
      "confidence_score": 85,
      "reasons": ["Doesn't align with ${userRole} role", "Routine task"],
      "recommended_delegates": [...]
    }
  ],
  "recurring_patterns": [
    {
      "pattern": "Weekly status meetings",
      "frequency": 4,
      "delegation_suggestion": "Have team lead provide updates instead"
    }
  ],
  "role_alignment_score": ${roleAlignment}
}`;

      const claudeResponse = await callClaude(prompt, systemMessage);

      try {
        analysisResult = JSON.parse(claudeResponse);
      } catch (parseError) {
        console.error('Failed to parse weekly scan response:', parseError);
        analysisResult = {
          total_items_analyzed: allUserItems.length,
          delegation_opportunities: 0,
          time_savings_potential: 0,
          recommendations: [],
          recurring_patterns: [],
          role_alignment_score: roleAlignment
        };
      }

    } else if (analysisType === 'is_this_my_job') {
      // Quick "Is this my job?" analysis for real-time guidance
      if (!timelineItem) {
        throw new Error('Timeline item is required for "is this my job" analysis');
      }

      const systemMessage = `You are a rapid task triage advisor. Quickly determine if a task aligns with the user's role and responsibilities.

QUICK DECISION FRAMEWORK:
- Does this require my unique skills/authority?
- Is this strategic vs. operational?
- Could someone else do this effectively?
- Is this the best use of my time?

Provide fast, actionable guidance.`;

      const prompt = `Quick analysis: Should I do this task myself?

MY ROLE: ${userRole}
TASK: ${timelineItem.title}
DESCRIPTION: ${timelineItem.description || 'No description'}
DURATION: ${timelineItem.duration_minutes} minutes

Provide instant guidance in this JSON format:

{
  "is_my_job": true/false,
  "confidence": 90,
  "quick_reason": "One sentence explanation",
  "action": "do_yourself" | "delegate" | "decline" | "automate",
  "alternative_suggestion": "Specific alternative if not your job"
}`;

      const claudeResponse = await callClaude(prompt, systemMessage);

      try {
        analysisResult = JSON.parse(claudeResponse);
      } catch (parseError) {
        console.error('Failed to parse quick analysis response:', parseError);
        analysisResult = {
          is_my_job: true,
          confidence: 50,
          quick_reason: 'Analysis failed - please review manually',
          action: 'do_yourself',
          alternative_suggestion: 'Manual review required'
        };
      }
    }

    console.log('Delegation analysis completed:', analysisType);

    return new Response(
      JSON.stringify({
        analysis_type: analysisType,
        result: analysisResult,
        team_members_available: teamMembers.length,
        metadata: {
          user_role: userRole,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in AI Delegation Analyzer:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to analyze delegation opportunities'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});