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

    // Create a user context client to ensure auth.uid() works correctly in the function
    const userContextClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            authorization: authHeader
          }
        }
      }
    );

    // Get client IP and user agent for enhanced security logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Use the enhanced secure function to store encrypted tokens
    const { error: storeError } = await userContextClient.rpc('store_encrypted_google_tokens_enhanced', {
      p_access_token: access_token,
      p_refresh_token: refresh_token,
      p_token_type: token_type,
      p_expires_in: expires_in,
      p_scope: scope,
      p_ip_address: clientIP,
      p_user_agent: userAgent
    });

    if (storeError) {
      console.error('Error storing tokens:', storeError);
      throw new Error(`Failed to store tokens: ${storeError.message}`);
    }

    console.log(`Successfully stored encrypted Google tokens for user ${user_id}`);

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