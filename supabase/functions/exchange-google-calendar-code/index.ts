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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasGoogleClientId: !!googleClientId,
      hasGoogleClientSecret: !!googleClientSecret,
    });

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Missing Google OAuth credentials');
    }

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    console.log('User authenticated:', user.id);

    // Get authorization code from request body
    const body = await req.json();
    const { code } = body;

    if (!code) {
      throw new Error('Authorization code is required');
    }

    console.log('Exchanging authorization code for tokens...');

    // Exchange authorization code for tokens
    const redirectUri = 'https://aiqueryhub.com/auth/google-calendar/callback';

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code');
    }

    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    });

    // Calculate expiry time
    const expires_at = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Store tokens in database
    const { error: upsertError } = await supabaseClient
      .from('user_google_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: expires_at,
        scope: tokenData.scope,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError);
      throw new Error(`Failed to store tokens: ${upsertError.message}`);
    }

    // Create or update calendar sync settings
    const { error: syncSettingsError } = await supabaseClient
      .from('calendar_sync_settings')
      .upsert({
        user_id: user.id,
        enabled: true,
        selected_calendar_id: 'primary',
        sync_direction: 'both',
        auto_sync_enabled: true,
        sync_interval_minutes: 15,
      }, {
        onConflict: 'user_id'
      });

    if (syncSettingsError) {
      console.error('Failed to update sync settings:', syncSettingsError);
      // Don't throw - tokens are stored, sync settings are secondary
    }

    console.log(`Successfully stored Google Calendar tokens for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google Calendar connected successfully',
        has_refresh_token: !!tokenData.refresh_token,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in exchange-google-calendar-code:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
