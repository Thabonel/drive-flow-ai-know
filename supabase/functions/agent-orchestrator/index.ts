import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentTask {
  id: string;
  session_id: string;
  user_id: string;
  original_input: string;
  structured_output: {
    title: string;
    description: string;
    agent_type: 'calendar' | 'briefing' | 'analysis';
    priority: number;
    estimated_duration: number;
  };
  status: string;
}

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

    // Get active session for user
    const { data: sessionData, error: sessionError } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!sessionData) {
      return new Response(
        JSON.stringify({ error: 'No active session found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch pending tasks for this session
    const { data: pendingTasks, error: tasksError } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('session_id', sessionData.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (tasksError) throw tasksError;

    if (!pendingTasks || pendingTasks.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No pending tasks to orchestrate',
          sub_agents_created: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const createdAgents = [];

    // Create sub-agent for each pending task
    for (const task of pendingTasks as AgentTask[]) {
      const agentType = task.structured_output.agent_type;

      // Create sub-agent
      const { data: subAgent, error: agentError } = await supabase
        .from('sub_agents')
        .insert({
          session_id: task.session_id,
          user_id: task.user_id,
          agent_type: agentType,
          status: 'pending',
          task_data: {
            task_id: task.id,
            title: task.structured_output.title,
            description: task.structured_output.description,
            priority: task.structured_output.priority,
            estimated_duration: task.structured_output.estimated_duration,
          },
        })
        .select()
        .single();

      if (agentError) {
        console.error('Error creating sub-agent:', agentError);
        continue;
      }

      // Update task status to "assigned"
      const { error: updateError } = await supabase
        .from('agent_tasks')
        .update({
          status: 'assigned',
          assigned_agent_id: subAgent.id,
        })
        .eq('id', task.id);

      if (updateError) {
        console.error('Error updating task status:', updateError);
      }

      createdAgents.push(subAgent);

      // Log sub-agent creation to agent memory
      await supabase
        .from('agent_memory')
        .insert({
          session_id: task.session_id,
          user_id: task.user_id,
          memory_type: 'action_log',
          content: {
            action: 'sub_agent_spawned',
            agent_id: subAgent.id,
            agent_type: agentType,
            task_title: task.structured_output.title,
            timestamp: new Date().toISOString(),
          },
          importance: 3,
        });
    }

    // Update session metrics
    const { error: sessionUpdateError } = await supabase
      .from('agent_sessions')
      .update({
        sub_agents_spawned: sessionData.sub_agents_spawned + createdAgents.length,
      })
      .eq('id', sessionData.id);

    if (sessionUpdateError) {
      console.error('Error updating session metrics:', sessionUpdateError);
    }

    return new Response(
      JSON.stringify({
        message: 'Sub-agents created successfully',
        sub_agents_created: createdAgents.length,
        agents: createdAgents.map(agent => ({
          id: agent.id,
          type: agent.agent_type,
          status: agent.status,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in agent-orchestrator function:', error);
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
