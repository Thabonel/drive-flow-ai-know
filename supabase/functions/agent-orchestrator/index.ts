import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map agent types to their Edge Function names
const AGENT_FUNCTION_MAP: Record<string, string> = {
  calendar: 'calendar-sub-agent',
  briefing: 'briefing-sub-agent',
  analysis: 'analysis-sub-agent',
};

/**
 * Invoke a sub-agent Edge Function
 */
async function invokeSubAgent(
  agentType: string,
  subAgentId: string,
  authToken: string,
  action?: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const functionName = AGENT_FUNCTION_MAP[agentType];
  if (!functionName) {
    return { success: false, error: `Unknown agent type: ${agentType}` };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

  try {
    console.log(`Invoking ${functionName} for sub-agent ${subAgentId}`);

    const body: any = { sub_agent_id: subAgentId };

    // Calendar agent needs action parameter for event creation
    if (agentType === 'calendar') {
      body.action = action || 'create_event';
    }

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Sub-agent ${functionName} failed:`, result);
      return { success: false, error: result.error || `HTTP ${response.status}` };
    }

    console.log(`Sub-agent ${functionName} completed:`, result.status || 'success');
    return { success: true, result };
  } catch (error) {
    console.error(`Error invoking ${functionName}:`, error);
    return { success: false, error: error.message };
  }
}

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

      // EXECUTE: Invoke the sub-agent immediately
      const invocationResult = await invokeSubAgent(
        agentType,
        subAgent.id,
        token,
        agentType === 'calendar' ? 'create_event' : undefined
      );

      // Update sub-agent with execution result if it failed during invocation
      if (!invocationResult.success) {
        console.error(`Sub-agent ${agentType} invocation failed:`, invocationResult.error);
        // The sub-agent function itself handles status updates, but log the error
        await supabase
          .from('agent_memory')
          .insert({
            session_id: task.session_id,
            user_id: task.user_id,
            memory_type: 'action_log',
            content: {
              action: 'sub_agent_invocation_failed',
              agent_id: subAgent.id,
              agent_type: agentType,
              error: invocationResult.error,
              timestamp: new Date().toISOString(),
            },
            importance: 4,
          });
      }
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
