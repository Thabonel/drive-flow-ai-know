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

    // Extract analysis parameters from task data
    const taskData = subAgent.task_data;
    const analysisTitle = taskData.title || 'Data Analysis';
    const analysisDescription = taskData.description || '';

    // STEP 1: Gather relevant data based on analysis type
    // For now, we'll analyze task completion metrics as a default
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch user's tasks from last 30 days
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, created_at, updated_at, planned_start, planned_duration_minutes')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Fetch agent tasks for this session
    const { data: agentTasks } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('session_id', subAgent.session_id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch recent sub-agents to understand activity patterns
    const { data: recentSubAgents } = await supabase
      .from('sub_agents')
      .select('agent_type, status, duration_ms, created_at')
      .eq('session_id', subAgent.session_id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Calculate metrics
    const totalTasks = recentTasks?.length || 0;
    const completedTasks = recentTasks?.filter(t => t.status === 'completed').length || 0;
    const pendingTasks = recentTasks?.filter(t => t.status === 'pending').length || 0;
    const inProgressTasks = recentTasks?.filter(t => t.status === 'in_progress').length || 0;
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    const priorityBreakdown = {
      high: recentTasks?.filter(t => t.priority >= 8).length || 0,
      medium: recentTasks?.filter(t => t.priority >= 4 && t.priority < 8).length || 0,
      low: recentTasks?.filter(t => t.priority < 4).length || 0,
    };

    // STEP 2: Prepare analysis context
    const analysisContext = {
      analysis_request: analysisDescription,
      time_period: 'Last 30 days',
      task_metrics: {
        total_tasks: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        in_progress: inProgressTasks,
        completion_rate: `${completionRate}%`,
      },
      priority_breakdown: priorityBreakdown,
      agent_activity: {
        total_agent_tasks: agentTasks?.length || 0,
        sub_agents_spawned: recentSubAgents?.length || 0,
        agent_types_used: [...new Set(recentSubAgents?.map(a => a.agent_type) || [])],
      },
      recent_tasks: recentTasks?.slice(0, 10).map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        created: new Date(t.created_at).toLocaleDateString(),
      })) || [],
    };

    // STEP 3: Generate insights using Claude
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const analysisPrompt = `You are a data analyst providing insights for a personal productivity system.

ANALYSIS REQUEST: ${analysisTitle}
${analysisDescription ? `Details: ${analysisDescription}` : ''}

DATA SUMMARY (Last 30 days):

TASK COMPLETION METRICS:
- Total tasks: ${analysisContext.task_metrics.total_tasks}
- Completed: ${analysisContext.task_metrics.completed}
- In Progress: ${analysisContext.task_metrics.in_progress}
- Pending: ${analysisContext.task_metrics.pending}
- Completion Rate: ${analysisContext.task_metrics.completion_rate}

PRIORITY BREAKDOWN:
- High priority (8-10): ${analysisContext.priority_breakdown.high}
- Medium priority (4-7): ${analysisContext.priority_breakdown.medium}
- Low priority (0-3): ${analysisContext.priority_breakdown.low}

AGENT ACTIVITY:
- Agent tasks created: ${analysisContext.agent_activity.total_agent_tasks}
- Sub-agents spawned: ${analysisContext.agent_activity.sub_agents_spawned}
- Agent types used: ${analysisContext.agent_activity.agent_types_used.join(', ')}

RECENT TASKS (sample):
${analysisContext.recent_tasks.slice(0, 5).map(t => `- ${t.title} (${t.status}, Priority: ${t.priority})`).join('\n')}

Provide a concise analysis with:
1. Key findings and patterns
2. Productivity insights (what's working well, what needs improvement)
3. Actionable recommendations (2-3 specific suggestions)
4. Any concerning trends or bottlenecks

Format as markdown with clear sections. Be data-driven and specific.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODELS.FAST,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
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
    const analysisContent = data.content[0].text;

    console.log('Generated analysis:', analysisContent);

    // Track token usage
    const tokensUsed = extractTokensFromClaudeResponse(data);
    const tokenUpdate = await updateTokenUsage(subAgent.session_id, tokensUsed);

    if (tokenUpdate.budgetExceeded) {
      console.warn(`Token budget exceeded. Session paused. Tokens remaining: ${tokenUpdate.tokensRemaining}`);
    }

    // STEP 4: Store analysis in agent_memory
    await supabase
      .from('agent_memory')
      .insert({
        session_id: subAgent.session_id,
        user_id: user.id,
        memory_type: 'insight',
        content: {
          source: 'analysis_agent',
          analysis_title: analysisTitle,
          analysis_text: analysisContent,
          metrics: analysisContext.task_metrics,
          analysis_date: new Date().toISOString(),
          time_period: analysisContext.time_period,
        },
        importance: 4,
      });

    // STEP 5: Update sub-agent to completed
    await supabase
      .from('sub_agents')
      .update({
        status: 'completed',
        result_data: {
          analysis: analysisContent,
          metrics: analysisContext.task_metrics,
          tasks_analyzed: totalTasks,
        },
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      })
      .eq('id', sub_agent_id);

    // Update task status to completed
    if (taskData?.task_id) {
      await supabase
        .from('agent_tasks')
        .update({ status: 'completed' })
        .eq('id', taskData.task_id);
    }

    return new Response(
      JSON.stringify({
        message: 'Analysis completed successfully',
        analysis: analysisContent,
        metrics: analysisContext.task_metrics,
        tasks_analyzed: totalTasks,
        status: 'completed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analysis sub-agent:', error);
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
