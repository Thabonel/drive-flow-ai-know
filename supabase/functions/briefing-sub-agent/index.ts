import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { updateTokenUsage, extractTokensFromClaudeResponse } from '../_shared/token-tracking.ts';
import { CLAUDE_MODELS } from '../_shared/models.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { sub_agent_id } = await req.json();

    if (!sub_agent_id) {
      return new Response(
        JSON.stringify({ error: 'sub_agent_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get sub-agent details
    const { data: subAgent, error: agentError } = await supabase
      .from('sub_agents')
      .select('*')
      .eq('id', sub_agent_id)
      .single();

    if (agentError || !subAgent) {
      throw new Error('Sub-agent not found');
    }

    // Update sub-agent status to active
    await supabase
      .from('sub_agents')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', sub_agent_id);

    const startTime = Date.now();

    // STEP 1: Fetch upcoming calendar events from agent memory
    const { data: calendarMemory } = await supabase
      .from('agent_memory')
      .select('content')
      .eq('session_id', subAgent.session_id)
      .eq('memory_type', 'briefing')
      .eq('user_id', user.id)
      .contains('content', { source: 'calendar_agent' })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const upcomingEvents = calendarMemory?.content?.events || [];

    // STEP 2: Fetch pending tasks
    const { data: pendingTasks } = await supabase
      .from('tasks')
      .select('title, description, planned_start, priority')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .limit(10);

    // STEP 3: Fetch recent agent tasks
    const { data: agentTasks } = await supabase
      .from('agent_tasks')
      .select('original_input, structured_output, status')
      .eq('session_id', subAgent.session_id)
      .eq('user_id', user.id)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5);

    // STEP 4: Prepare context for Claude
    const briefingContext = {
      today: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      upcoming_meetings: upcomingEvents.slice(0, 5).map((event: any) => ({
        summary: event.summary,
        start: event.start,
        location: event.location,
        attendees: event.attendees?.map((a: any) => a.email).join(', '),
      })),
      pending_tasks: (pendingTasks || []).map(task => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
      })),
      active_agent_tasks: (agentTasks || []).map(task => ({
        input: task.original_input,
        status: task.status,
      })),
    };

    // STEP 5: Generate briefing using Claude
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const briefingPrompt = `You are a Personal Chief of Staff generating a daily briefing.

Today is ${briefingContext.today}.

UPCOMING MEETINGS (next 7 days):
${briefingContext.upcoming_meetings.length > 0
  ? briefingContext.upcoming_meetings.map(m => `- ${m.summary} at ${m.start}${m.location ? ` (${m.location})` : ''}${m.attendees ? ` with ${m.attendees}` : ''}`).join('\n')
  : '- No upcoming meetings'}

PENDING TASKS:
${briefingContext.pending_tasks.length > 0
  ? briefingContext.pending_tasks.map(t => `- ${t.title} (Priority: ${t.priority})`).join('\n')
  : '- No pending tasks'}

ACTIVE AGENT TASKS:
${briefingContext.active_agent_tasks.length > 0
  ? briefingContext.active_agent_tasks.map(t => `- ${t.input} (${t.status})`).join('\n')
  : '- No active agent tasks'}

Generate a concise daily briefing (3-5 bullet points) summarizing:
1. Key meetings/events today
2. High-priority tasks that need attention
3. Important deadlines or follow-ups
4. Any potential scheduling conflicts

Format as markdown bullet list. Be specific with times and names. Keep each bullet point to 1-2 sentences max.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODELS.FAST,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: briefingPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    const briefingContent = data.content[0].text;

    console.log('Generated briefing:', briefingContent);

    // Track token usage
    const tokensUsed = extractTokensFromClaudeResponse(data);
    const tokenUpdate = await updateTokenUsage(subAgent.session_id, tokensUsed);

    if (tokenUpdate.budgetExceeded) {
      console.warn(`Token budget exceeded. Session paused. Tokens remaining: ${tokenUpdate.tokensRemaining}`);
    }

    // STEP 6: Store briefing in agent_memory
    await supabase
      .from('agent_memory')
      .insert({
        session_id: subAgent.session_id,
        user_id: user.id,
        memory_type: 'briefing',
        content: {
          source: 'briefing_agent',
          briefing_text: briefingContent,
          briefing_date: new Date().toISOString(),
          meetings_count: briefingContext.upcoming_meetings.length,
          tasks_count: briefingContext.pending_tasks.length,
          generated_at: new Date().toISOString(),
        },
        importance: 5,
      });

    // STEP 7: Update sub-agent to completed
    await supabase
      .from('sub_agents')
      .update({
        status: 'completed',
        result_data: {
          briefing: briefingContent,
          meetings_count: briefingContext.upcoming_meetings.length,
          tasks_count: briefingContext.pending_tasks.length,
        },
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      })
      .eq('id', sub_agent_id);

    // Update task status to completed
    if (subAgent.task_data?.task_id) {
      await supabase
        .from('agent_tasks')
        .update({ status: 'completed' })
        .eq('id', subAgent.task_data.task_id);
    }

    return new Response(
      JSON.stringify({
        message: 'Briefing generated successfully',
        briefing: briefingContent,
        meetings_count: briefingContext.upcoming_meetings.length,
        tasks_count: briefingContext.pending_tasks.length,
        status: 'completed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in briefing sub-agent:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
