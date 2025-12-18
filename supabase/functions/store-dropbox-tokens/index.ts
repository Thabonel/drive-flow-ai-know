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
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const dropboxClientId = Deno.env.get('DROPBOX_CLIENT_ID');
    const dropboxClientSecret = Deno.env.get('DROPBOX_CLIENT_SECRET');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasDropboxClientId: !!dropboxClientId,
      hasDropboxClientSecret: !!dropboxClientSecret,
    });

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!dropboxClientId || !dropboxClientSecret) {
      throw new Error('Missing Dropbox OAuth credentials');
    }

    // Get authorization header and validate JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    console.log('User authenticated:', user.id);

    const body = await req.json();
    const { code, redirect_uri } = body;

    if (!code) {
      throw new Error('Authorization code is required');
    }

    console.log('Exchanging code for tokens...');

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: dropboxClientId,
        client_secret: dropboxClientSecret,
        redirect_uri: redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Dropbox token exchange error:', errorText);
      throw new Error(`Dropbox token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
    });

    const { access_token, refresh_token, token_type, expires_in, account_id, scope } = tokenData;

    // Calculate expiry time (Dropbox offline tokens may have long expiration)
    const expires_at = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null; // null means no expiration (long-lived token)

    // Store tokens in database
    console.log('Storing tokens for user:', user.id);

    const { data: upsertData, error: upsertError } = await supabaseClient
      .from('user_dropbox_tokens')
      .upsert({
        user_id: user.id,
        access_token: access_token,
        refresh_token: refresh_token || null,
        token_type: token_type || 'Bearer',
        expires_at: expires_at,
        scope: scope || null,
        account_id: account_id || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (upsertError) {
      console.error('Upsert error:', {
        message: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
      });
      throw new Error(`Failed to store tokens: ${upsertError.message}`);
    }

    console.log('Tokens stored successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Dropbox tokens stored securely' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in store-dropbox-tokens:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
