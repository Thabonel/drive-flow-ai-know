/**
 * Slack Token Refresh Edge Function
 *
 * Refreshes Slack OAuth tokens before they expire.
 * Can be called:
 * 1. Via cron (every hour) to refresh tokens expiring soon
 * 2. On-demand when a token is found to be expired
 *
 * Slack tokens expire in ~12 hours, so we refresh when < 1 hour remaining.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SLACK_CLIENT_ID = Deno.env.get('SLACK_CLIENT_ID') ?? '';
const SLACK_CLIENT_SECRET = Deno.env.get('SLACK_CLIENT_SECRET') ?? '';

interface SlackRefreshResponse {
  ok: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  team_id?: string;
  error?: string;
}

/**
 * Refresh a single Slack token
 */
async function refreshSlackToken(refreshToken: string): Promise<SlackRefreshResponse> {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if this is a single user refresh or batch refresh
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    let connectionsToRefresh;

    if (userId) {
      // Refresh specific user's token
      const { data } = await supabase
        .from('user_messaging_connections')
        .select('user_id, slack_refresh_token')
        .eq('user_id', userId)
        .eq('platform', 'slack')
        .eq('is_active', true)
        .not('slack_refresh_token', 'is', null)
        .single();

      connectionsToRefresh = data ? [data] : [];
    } else {
      // Batch refresh: get all tokens expiring in the next hour
      const { data } = await supabase.rpc('get_slack_connections_needing_refresh');
      connectionsToRefresh = data || [];
    }

    if (connectionsToRefresh.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tokens need refresh', refreshed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      refreshed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Refresh each token
    for (const connection of connectionsToRefresh) {
      try {
        const refreshResult = await refreshSlackToken(connection.slack_refresh_token || connection.refresh_token);

        if (refreshResult.ok && refreshResult.access_token) {
          // Calculate new expiration
          const expiresAt = refreshResult.expires_in
            ? new Date(Date.now() + refreshResult.expires_in * 1000).toISOString()
            : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // Default 12 hours

          // Update tokens in database
          await supabase.rpc('update_slack_tokens', {
            p_user_id: connection.user_id,
            p_access_token: refreshResult.access_token,
            p_refresh_token: refreshResult.refresh_token || connection.slack_refresh_token,
            p_expires_at: expiresAt,
          });

          results.refreshed++;
          console.log(`Refreshed Slack token for user ${connection.user_id}`);
        } else {
          results.failed++;
          results.errors.push(`User ${connection.user_id}: ${refreshResult.error || 'Unknown error'}`);
          console.error(`Failed to refresh token for user ${connection.user_id}:`, refreshResult.error);

          // If token is invalid, mark connection as inactive
          if (refreshResult.error === 'invalid_refresh_token' || refreshResult.error === 'token_revoked') {
            await supabase
              .from('user_messaging_connections')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('user_id', connection.user_id)
              .eq('platform', 'slack');
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${connection.user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error refreshing token for user ${connection.user_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Refreshed ${results.refreshed} tokens, ${results.failed} failed`,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
