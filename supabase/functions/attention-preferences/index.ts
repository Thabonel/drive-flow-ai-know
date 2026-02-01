import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AttentionPreferencesRequest {
  current_role?: 'maker' | 'marker' | 'multiplier';
  current_zone?: 'wartime' | 'peacetime';
  non_negotiable_title?: string;
  non_negotiable_weekly_hours?: number;
  attention_budgets?: {
    decide: number;
    context_switches: number;
    meetings: number;
  };
  peak_hours_start?: string;
  peak_hours_end?: string;
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

    // GET: Retrieve user's attention preferences
    if (method === 'GET') {
      let { data: preferences, error } = await supabase
        .from('user_attention_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // Create default preferences if none exist
      if (!preferences) {
        const defaultPreferences = {
          user_id: user.id,
          current_role: 'maker',
          current_zone: 'peacetime',
          non_negotiable_weekly_hours: 5,
          attention_budgets: {
            decide: 2,
            context_switches: 3,
            meetings: 4
          },
          peak_hours_start: '09:00',
          peak_hours_end: '12:00'
        };

        const { data: newPreferences, error: insertError } = await supabase
          .from('user_attention_preferences')
          .insert(defaultPreferences)
          .select('*')
          .single();

        if (insertError) {
          throw insertError;
        }

        preferences = newPreferences;
      }

      return new Response(
        JSON.stringify({ preferences }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // PUT: Update user's attention preferences
    if (method === 'PUT') {
      const body: AttentionPreferencesRequest = await req.json();

      // Validate attention budgets if provided
      if (body.attention_budgets) {
        const { decide, context_switches, meetings } = body.attention_budgets;
        if (decide < 0 || decide > 10 || context_switches < 0 || context_switches > 20 || meetings < 0 || meetings > 10) {
          return new Response(
            JSON.stringify({ error: 'Invalid attention budget values' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
      }

      // Validate weekly hours if provided
      if (body.non_negotiable_weekly_hours !== undefined) {
        if (body.non_negotiable_weekly_hours < 0 || body.non_negotiable_weekly_hours > 168) {
          return new Response(
            JSON.stringify({ error: 'Weekly hours must be between 0 and 168' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
      }

      // Validate peak hours format if provided
      if (body.peak_hours_start || body.peak_hours_end) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (body.peak_hours_start && !timeRegex.test(body.peak_hours_start)) {
          return new Response(
            JSON.stringify({ error: 'Invalid peak_hours_start format (use HH:MM)' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
        if (body.peak_hours_end && !timeRegex.test(body.peak_hours_end)) {
          return new Response(
            JSON.stringify({ error: 'Invalid peak_hours_end format (use HH:MM)' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
      }

      // Update preferences (upsert)
      const { data: updatedPreferences, error } = await supabase
        .from('user_attention_preferences')
        .upsert({
          user_id: user.id,
          ...body,
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ preferences: updatedPreferences }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // POST: Reset to default preferences
    if (method === 'POST' && url.pathname.endsWith('/reset')) {
      const defaultPreferences = {
        user_id: user.id,
        current_role: 'maker',
        current_zone: 'peacetime',
        non_negotiable_weekly_hours: 5,
        attention_budgets: {
          decide: 2,
          context_switches: 3,
          meetings: 4
        },
        peak_hours_start: '09:00',
        peak_hours_end: '12:00'
      };

      const { data: resetPreferences, error } = await supabase
        .from('user_attention_preferences')
        .upsert(defaultPreferences)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ preferences: resetPreferences }),
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
    console.error('Error in attention-preferences function:', error);
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