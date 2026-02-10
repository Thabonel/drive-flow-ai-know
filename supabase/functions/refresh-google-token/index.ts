import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google OAuth token endpoint
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// Google Client ID (public - safe to include in code)
const GOOGLE_CLIENT_ID = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';

/**
 * Refresh Google Token Edge Function
 *
 * Uses the stored refresh_token to obtain a new access_token when the current one
 * is expired or about to expire. This allows silent token renewal without requiring
 * the user to re-authenticate.
 *
 * REQUIRED ENVIRONMENT VARIABLES:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for database operations
 * - GOOGLE_CLIENT_SECRET: Google OAuth client secret (from Google Cloud Console)
 *
 * NOTE: GOOGLE_CLIENT_SECRET must be set in Supabase Dashboard > Settings > Environment Variables.
 * Without it, token refresh will fail and users must re-authenticate manually.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    if (!googleClientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_SECRET environment variable is not set. ' +
        'Please set it in Supabase Dashboard > Settings > Environment Variables. ' +
        'Token refresh requires the client secret to communicate with Google.'
      );
    }

    // Authenticate the requesting user
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

    console.log('Refresh token request for user:', user.id);

    // Fetch the user's stored tokens
    const { data: tokenRecord, error: fetchError } = await supabaseClient
      .from('user_google_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch stored tokens: ${fetchError.message}`);
    }

    if (!tokenRecord) {
      return new Response(
        JSON.stringify({
          error: 'No Google tokens found. Please connect your Google account first.',
          needs_reauth: true,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if the current token is still valid (with 5-minute buffer)
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const isExpiringSoon = now.getTime() >= (expiresAt.getTime() - bufferMs);

    if (!isExpiringSoon) {
      // Token is still valid - return it directly
      console.log('Token still valid, returning existing token');
      return new Response(
        JSON.stringify({
          access_token: tokenRecord.access_token,
          refreshed: false,
          expires_at: tokenRecord.expires_at,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Token is expired or expiring soon - attempt refresh
    if (!tokenRecord.refresh_token) {
      console.error('No refresh token available for user:', user.id);
      return new Response(
        JSON.stringify({
          error: 'No refresh token available. Please reconnect your Google account.',
          needs_reauth: true,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Refreshing access token using stored refresh token...');

    // Exchange refresh token for new access token
    const refreshResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: googleClientSecret,
        refresh_token: tokenRecord.refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok || refreshData.error) {
      console.error('Google token refresh failed:', {
        status: refreshResponse.status,
        error: refreshData.error,
        description: refreshData.error_description,
      });

      // If the refresh token is invalid/revoked, user needs to re-authenticate
      if (refreshData.error === 'invalid_grant') {
        return new Response(
          JSON.stringify({
            error: 'Refresh token has been revoked or expired. Please reconnect your Google account.',
            needs_reauth: true,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      throw new Error(
        `Token refresh failed: ${refreshData.error_description || refreshData.error || 'Unknown error'}`
      );
    }

    console.log('Token refresh successful:', {
      hasNewAccessToken: !!refreshData.access_token,
      expiresIn: refreshData.expires_in,
    });

    // Calculate new expiry time
    const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

    // Update the stored access token in the database
    const { error: updateError } = await supabaseClient
      .from('user_google_tokens')
      .update({
        access_token: refreshData.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
        // Google may also return a new refresh token (rare but possible)
        ...(refreshData.refresh_token ? { refresh_token: refreshData.refresh_token } : {}),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update tokens in database:', updateError);
      throw new Error(`Failed to update stored tokens: ${updateError.message}`);
    }

    console.log(`Successfully refreshed Google token for user ${user.id}`);

    return new Response(
      JSON.stringify({
        access_token: refreshData.access_token,
        refreshed: true,
        expires_at: newExpiresAt,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in refresh-google-token:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
