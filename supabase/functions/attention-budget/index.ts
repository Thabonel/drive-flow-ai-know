import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AttentionBudgetRequest {
  date?: string; // YYYY-MM-DD format
  attention_type?: string;
}

interface AttentionUsageResult {
  attention_type: string;
  items_count: number;
  total_duration_minutes: number;
  context_switches: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the Authorization header from the request
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid auth token');
    }

    const method = req.method;
    const url = new URL(req.url);

    // GET: Get daily attention usage
    if (method === 'GET') {
      const params = new URLSearchParams(url.search);
      const date = params.get('date') || new Date().toISOString().split('T')[0]; // Default to today
      const attentionType = params.get('attention_type') || null;

      // Get user's current attention preferences for budget limits
      let { data: preferences } = await supabase
        .from('user_attention_preferences')
        .select('attention_budgets')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!preferences) {
        // Create default preferences if none exist
        preferences = {
          attention_budgets: {
            decide: 2,
            context_switches: 3,
            meetings: 4
          }
        };
      }

      // Use the database function to calculate daily usage
      const { data: usageData, error } = await supabase.rpc('get_daily_attention_usage', {
        p_user_id: user.id,
        p_date: date,
        p_attention_type: attentionType
      });

      if (error) {
        throw error;
      }

      // Calculate budget status for each attention type
      const budgetStatus = usageData.map((usage: AttentionUsageResult) => {
        const budgetLimit = preferences!.attention_budgets[usage.attention_type as keyof typeof preferences.attention_budgets] || 5;
        const usagePercentage = Math.round((usage.items_count / budgetLimit) * 100);

        return {
          attention_type: usage.attention_type,
          items_count: usage.items_count,
          budget_limit: budgetLimit,
          usage_percentage: usagePercentage,
          is_over_budget: usage.items_count > budgetLimit,
          total_duration_minutes: usage.total_duration_minutes,
          context_switches: usage.context_switches
        };
      });

      // Get overall context switch count for the day
      const { data: contextSwitchData } = await supabase
        .from('timeline_items')
        .select('context_switch_cost')
        .eq('user_id', user.id)
        .gte('start_time', `${date}T00:00:00.000Z`)
        .lt('start_time', `${date}T23:59:59.999Z`);

      const totalContextSwitches = contextSwitchData?.reduce((sum, item) => sum + (item.context_switch_cost || 0), 0) || 0;
      const contextSwitchBudget = preferences.attention_budgets.context_switches || 3;

      return new Response(
        JSON.stringify({
          date,
          budget_status: budgetStatus,
          context_switches: {
            total: totalContextSwitches,
            budget: contextSwitchBudget,
            is_over_budget: totalContextSwitches > contextSwitchBudget
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // POST: Log attention budget usage (for tracking)
    if (method === 'POST') {
      const body: AttentionBudgetRequest & {
        budget_used: number;
        budget_limit: number;
        context_switches: number;
      } = await req.json();

      const { date = new Date().toISOString().split('T')[0], attention_type, budget_used, budget_limit, context_switches } = body;

      if (!attention_type || budget_used === undefined || budget_limit === undefined) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: attention_type, budget_used, budget_limit' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Upsert the budget tracking record
      const { data: trackingRecord, error } = await supabase
        .from('attention_budget_tracking')
        .upsert({
          user_id: user.id,
          date,
          attention_type,
          budget_used,
          budget_limit,
          context_switches
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ tracking_record: trackingRecord }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );

  } catch (error) {
    console.error('Error in attention-budget function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});