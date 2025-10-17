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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { access_token, refresh_token, token_type, expires_in, scope } = await req.json();

    if (!access_token) {
      throw new Error('Access token is required');
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + ((expires_in || 3600) * 1000));

    // Get client IP and user agent for audit logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Call the database function to store encrypted tokens
    const { data: storeResult, error: storeError } = await supabaseClient
      .rpc('store_encrypted_microsoft_token', {
        p_user_id: user.id,
        p_access_token: access_token,
        p_refresh_token: refresh_token || null,
        p_token_type: token_type || 'Bearer',
        p_expires_at: expiresAt.toISOString(),
        p_scope: scope || 'Files.Read.All Sites.Read.All',
        p_ip_address: clientIP,
        p_user_agent: userAgent
      });

    if (storeError) {
      console.error('Error storing Microsoft tokens:', storeError);
      throw storeError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Microsoft tokens stored securely',
        expires_at: expiresAt.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in store-microsoft-tokens function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
