/**
 * Slack OAuth Callback Handler
 *
 * Handles the OAuth callback from Slack after user authorization.
 * Exchanges the temporary code for an access token and stores the connection.
 *
 * Flow:
 * 1. User clicks "Add to Slack" button
 * 2. User authorizes on Slack
 * 3. Slack redirects to this function with ?code=XXX&state=YYY
 * 4. We exchange code for token
 * 5. Store connection in database
 * 6. Redirect user back to settings page
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SLACK_CLIENT_ID = Deno.env.get('SLACK_CLIENT_ID') ?? '';
const SLACK_CLIENT_SECRET = Deno.env.get('SLACK_CLIENT_SECRET') ?? '';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:8080';

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number; // seconds until token expires
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  error?: string;
}

serve(async (req) => {
  const url = new URL(req.url);

  // Handle OAuth callback
  if (req.method === 'GET') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle user denial
    if (error) {
      console.log('User denied Slack authorization:', error);
      return Response.redirect(`${FRONTEND_URL}/settings?slack_error=denied`, 302);
    }

    // Validate required parameters
    if (!code) {
      console.error('Missing code parameter');
      return Response.redirect(`${FRONTEND_URL}/settings?slack_error=missing_code`, 302);
    }

    // Note: State validation should be done on the frontend
    // The frontend stores state in sessionStorage and should validate it

    try {
      // Exchange code for token
      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: SLACK_CLIENT_ID,
          client_secret: SLACK_CLIENT_SECRET,
          code,
          redirect_uri: `${FRONTEND_URL}/settings/slack/callback`,
        }),
      });

      const tokenData: SlackOAuthResponse = await tokenResponse.json();

      if (!tokenData.ok) {
        console.error('Slack OAuth error:', tokenData.error);
        return Response.redirect(`${FRONTEND_URL}/settings?slack_error=${tokenData.error}`, 302);
      }

      console.log('Slack OAuth successful for team:', tokenData.team?.name);

      // We need to identify which user initiated this OAuth flow
      // This requires the state parameter to contain the user ID
      // For security, the state should be a signed JWT or lookup token

      // For now, we'll store the token in a pending state
      // The frontend will need to claim it using the state parameter
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Store pending Slack connection
      const { error: insertError } = await supabase
        .from('pending_slack_connections')
        .insert({
          state,
          team_id: tokenData.team?.id,
          team_name: tokenData.team?.name,
          bot_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_in: tokenData.expires_in,
          bot_user_id: tokenData.bot_user_id,
          authed_user_id: tokenData.authed_user?.id,
          channel_id: tokenData.incoming_webhook?.channel_id,
          channel_name: tokenData.incoming_webhook?.channel,
          scope: tokenData.scope,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes to claim
        });

      if (insertError) {
        console.error('Failed to store pending connection:', insertError);
        return Response.redirect(`${FRONTEND_URL}/settings?slack_error=storage_failed`, 302);
      }

      // Redirect back to settings with success state
      return Response.redirect(`${FRONTEND_URL}/settings?slack_connected=true&state=${state}`, 302);
    } catch (error) {
      console.error('Slack OAuth callback error:', error);
      return Response.redirect(`${FRONTEND_URL}/settings?slack_error=server_error`, 302);
    }
  }

  // Handle claiming a pending connection (POST from frontend)
  if (req.method === 'POST') {
    try {
      const { state, user_id } = await req.json();

      if (!state || !user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing state or user_id' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Find pending connection
      const { data: pending, error: fetchError } = await supabase
        .from('pending_slack_connections')
        .select('*')
        .eq('state', state)
        .gt('expires_at', new Date().toISOString())
        .is('claimed_at', null)
        .single();

      if (fetchError || !pending) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired state' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Calculate token expiration timestamp
      const tokenExpiresAt = pending.token_expires_in
        ? new Date(Date.now() + pending.token_expires_in * 1000).toISOString()
        : null;

      // Create the actual connection
      const { data: connectionId, error: connectError } = await supabase.rpc('connect_messaging_platform', {
        p_user_id: user_id,
        p_platform: 'slack',
        p_slack_team_id: pending.team_id,
        p_slack_team_name: pending.team_name,
        p_slack_channel_id: pending.channel_id,
        p_slack_channel_name: pending.channel_name,
        p_slack_bot_token: pending.bot_token,
        p_slack_refresh_token: pending.refresh_token,
        p_slack_token_expires_at: tokenExpiresAt,
        p_slack_user_id: pending.authed_user_id,
      });

      if (connectError) {
        console.error('Failed to create connection:', connectError);
        return new Response(
          JSON.stringify({ error: 'Failed to create connection' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Mark pending connection as claimed
      await supabase
        .from('pending_slack_connections')
        .update({ claimed_at: new Date().toISOString() })
        .eq('state', state);

      return new Response(
        JSON.stringify({
          success: true,
          connection_id: connectionId,
          team_name: pending.team_name,
          channel_name: pending.channel_name,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Claim connection error:', error);
      return new Response(
        JSON.stringify({ error: 'Server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
