import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
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

    // Find active sessions for this user
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('agent_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (sessionsError) throw sessionsError;

    if (!activeSessions || activeSessions.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No active sessions to clean up',
          cleaned: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let cleanedCount = 0;

    // Check each session to see if all tasks are completed/failed
    for (const session of activeSessions) {
      const { data: tasks } = await supabase
        .from('agent_tasks')
        .select('status')
        .eq('session_id', session.id);

      if (!tasks || tasks.length === 0) {
        // Session with no tasks - can be cleaned
        await supabase
          .from('agent_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', session.id);

        cleanedCount++;
        console.log(`Cleaned session ${session.id} (no tasks)`);
        continue;
      }

      // Check if all tasks are in terminal state (completed or failed)
      const allTasksDone = tasks.every(
        t => t.status === 'completed' || t.status === 'failed'
      );

      if (allTasksDone) {
        await supabase
          .from('agent_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', session.id);

        cleanedCount++;
        console.log(`Cleaned session ${session.id} (all tasks complete)`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Cleaned ${cleanedCount} completed session(s)`,
        cleaned: cleanedCount,
        total_active: activeSessions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cleanup-sessions function:', error);
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
