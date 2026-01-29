import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// =============== INLINED: CORS Utility ===============
// Allowed origins for CORS - configured via environment variable
// Set ALLOWED_ORIGINS as comma-separated list in Supabase secrets
// Example: "https://aiqueryhub.com,https://app.aiqueryhub.com"

// Default allowed origins for development
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://[::]:8080',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Check if CORS is configured for production
const isProductionCorsConfigured = (): boolean => {
  return !!Deno.env.get('ALLOWED_ORIGINS');
};

const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');

  if (envOrigins) {
    // Production: use configured origins + dev origins for flexibility
    return [...DEFAULT_DEV_ORIGINS, ...envOrigins.split(',').map(o => o.trim())];
  }

  // Development only: return default origins
  return DEFAULT_DEV_ORIGINS;
};

// Check if origin is allowed
const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;

  // If ALLOWED_ORIGINS is not configured, allow all origins (backwards compatible)
  // This ensures existing deployments don't break
  if (!isProductionCorsConfigured()) {
    // Log warning in production environments
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      console.warn(
        'SECURITY WARNING: CORS is not configured. Set ALLOWED_ORIGINS env variable ' +
        'with your production domains to restrict cross-origin requests. ' +
        `Allowing origin: ${origin}`
      );
    }
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
};

// Get CORS headers for a specific origin
const getCorsHeaders = (origin: string | null): Record<string, string> => {
  // If origin is allowed, reflect it back; otherwise use empty string
  const allowedOrigin = isOriginAllowed(origin) ? (origin || '*') : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

// Helper to handle OPTIONS preflight requests
const handleCorsPreflightRequest = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
};

// =============== INLINED: Env Validation Utility ===============
/**
 * Validates that all required environment variables are set
 * @param required - Array of required environment variable names
 * @returns null if all valid, or an error message if any are missing
 */
function validateEnvVars(required: string[]): string | null {
  const missing: string[] = [];

  for (const envVar of required) {
    const value = Deno.env.get(envVar);
    if (!value || value.trim() === '') {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please configure these in your Supabase Edge Function secrets.';
    console.error(`[ENV VALIDATION ERROR] ${errorMsg}`);
    return errorMsg;
  }

  return null;
}

// =============== Agent Orchestrator Code ===============

// Map agent types to their Edge Function names
const AGENT_FUNCTION_MAP: Record<string, string> = {
  calendar: 'calendar-sub-agent',
  briefing: 'briefing-sub-agent',
  analysis: 'analysis-sub-agent',
  creative: 'creative-sub-agent',
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
    agent_type: 'calendar' | 'briefing' | 'analysis' | 'creative';
    priority: number;
    estimated_duration: number;
    timezone_offset?: number;
  };
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightRequest(req);
  if (preflightResponse) return preflightResponse;

  try {
    // Get origin for CORS headers
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);

    // Validate environment variables
    const envError = validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    if (envError) {
      console.error('Environment validation failed:', envError);
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body to get session_id
    const body = await req.json();
    const requestedSessionId = body.session_id;

    let sessionData = null;

    // If session_id provided, use that specific session
    if (requestedSessionId) {
      const { data, error: sessionError } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('id', requestedSessionId)
        .eq('user_id', user.id)  // Security: ensure user owns session
        .single();

      if (sessionError || !data) {
        return new Response(
          JSON.stringify({
            error: 'Invalid or unauthorized session_id',
            session_id: requestedSessionId
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      sessionData = data;
      console.log('Using requested session:', requestedSessionId);
    } else {
      // Fallback: fetch most recent active session (backward compatibility)
      const { data, error: sessionError } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (!data) {
        return new Response(
          JSON.stringify({ error: 'No active session found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      sessionData = data;
      console.log('Using most recent active session:', data.id);
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
    const subAgentInvocationPromises = [];

    // Create sub-agents and collect their invocation promises in parallel
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
            timezone_offset: task.structured_output.timezone_offset ?? 2, // Pass timezone to sub-agents
          },
        })
        .select()
        .single();

      if (agentError) {
        console.error('Error creating sub-agent:', agentError);
        continue;
      }

      // Update task status to "in_progress" and link to sub-agent
      const { error: updateError } = await supabase
        .from('agent_tasks')
        .update({
          status: 'in_progress',
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

      // EXECUTE: Invoke the sub-agent immediately, but in parallel
      // Don't await here - collect promises to await all at once
      const invocationPromise = invokeSubAgent(
        agentType,
        subAgent.id,
        token,
        agentType === 'calendar' ? 'create_event' : undefined
      ).then(async (invocationResult) => {
        // Update task status based on execution result
        if (invocationResult.success) {
          // Mark task as completed
          await supabase
            .from('agent_tasks')
            .update({ status: 'completed' })
            .eq('id', task.id);

          console.log(`Task ${task.id} marked as completed`);
        } else {
          // Mark task as failed
          await supabase
            .from('agent_tasks')
            .update({ status: 'failed' })
            .eq('id', task.id);

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

        return { taskId: task.id, success: invocationResult.success };
      });

      subAgentInvocationPromises.push(invocationPromise);
    }

    // Wait for all sub-agent invocations to complete (parallel execution)
    await Promise.allSettled(subAgentInvocationPromises);

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
