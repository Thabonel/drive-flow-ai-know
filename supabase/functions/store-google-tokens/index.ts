import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header and validate JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    const user_id = user.id;
    const { access_token, refresh_token, token_type = 'Bearer', expires_in = 3600, scope } = await req.json();

    if (!access_token) {
      throw new Error('Access token is required');
    }

    // Calculate expiry time
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens directly using service role (bypasses RLS)
    // Tokens are protected by RLS when read - users can only see their own
    const { error: upsertError } = await supabaseClient
      .from('user_google_tokens')
      .upsert({
        user_id: user_id,
        access_token: access_token,
        refresh_token: refresh_token,
        token_type: token_type,
        expires_at: expires_at,
        scope: scope,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error storing tokens:', upsertError);
      throw new Error(`Failed to store tokens: ${upsertError.message}`);
    }

    console.log(`Successfully stored Google tokens for user ${user_id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Tokens stored securely' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in store-google-tokens:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});