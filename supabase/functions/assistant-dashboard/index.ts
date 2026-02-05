/**
 * Assistant Dashboard Edge Function
 *
 * Provides dashboard statistics and metrics for the Living AI Assistant.
 * Returns usage stats, memory counts, autonomy status, and cost estimates.
 *
 * Endpoints:
 * GET /assistant-dashboard - Full dashboard stats
 * GET /assistant-dashboard?section=usage - Just usage stats
 * GET /assistant-dashboard?section=memory - Just memory stats
 * GET /assistant-dashboard?section=checkins - Check-in effectiveness
 * GET /assistant-dashboard?section=cost - Cost estimates
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface DashboardStats {
  today: {
    messages: number;
    checkins: number;
    actions: number;
  };
  week: {
    messages: number;
    checkins: number;
    actions: number;
    cost_cents: number;
  };
  month: {
    messages: number;
    telegram_messages: number;
    slack_messages: number;
    voice_messages: number;
    image_messages: number;
    checkins_total: number;
    checkins_skipped: number;
    checkins_texted: number;
    cost_cents: number;
  };
  memory: {
    total_memories: number;
    conversation_summaries: number;
    user_facts: number;
    user_goals: number;
    preferences: number;
    corrections: number;
  };
  autonomy: {
    active_session: boolean;
    total_sessions: number;
    total_actions: number;
  };
  recent_checkins: Array<{
    time: string;
    urgency: number;
    action: string;
    reason: string;
  }>;
  active_goals: number;
  pending_confirmations: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const section = url.searchParams.get('section');

    // Use service role for database queries
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Return specific section if requested
    if (section) {
      switch (section) {
        case 'usage': {
          const { data: channelBreakdown } = await supabase.rpc('get_channel_breakdown', {
            p_user_id: user.id,
            p_days: 30,
          });

          return new Response(
            JSON.stringify({
              channel_breakdown: channelBreakdown || [],
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'checkins': {
          const { data: effectiveness } = await supabase.rpc('get_checkin_effectiveness', {
            p_user_id: user.id,
            p_days: 30,
          });

          return new Response(
            JSON.stringify({
              effectiveness: effectiveness || {},
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'cost': {
          const { data: costEstimate } = await supabase.rpc('estimate_monthly_cost', {
            p_user_id: user.id,
          });

          return new Response(
            JSON.stringify({
              cost: costEstimate || {},
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'memory': {
          const { data: stats } = await supabase.rpc('get_user_dashboard_stats', {
            p_user_id: user.id,
          });

          return new Response(
            JSON.stringify({
              memory: stats?.memory || {},
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Unknown section' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
    }

    // Return full dashboard stats
    const { data: stats, error: statsError } = await supabase.rpc('get_user_dashboard_stats', {
      p_user_id: user.id,
    });

    if (statsError) {
      console.error('Stats error:', statsError);
      throw statsError;
    }

    // Get additional data
    const [
      { data: costEstimate },
      { data: effectiveness },
      { data: channelBreakdown },
    ] = await Promise.all([
      supabase.rpc('estimate_monthly_cost', { p_user_id: user.id }),
      supabase.rpc('get_checkin_effectiveness', { p_user_id: user.id, p_days: 30 }),
      supabase.rpc('get_channel_breakdown', { p_user_id: user.id, p_days: 7 }),
    ]);

    const response = {
      ...stats,
      cost: costEstimate || {},
      checkin_effectiveness: effectiveness || {},
      channel_breakdown_7d: channelBreakdown || [],
      generated_at: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
