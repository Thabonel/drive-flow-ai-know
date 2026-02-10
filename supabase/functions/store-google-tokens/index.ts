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
 * Exchange an authorization code for access + refresh tokens via Google's token endpoint.
 * Requires GOOGLE_CLIENT_SECRET environment variable to be set in Supabase dashboard.
 */
async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token: string | null; expires_in: number; scope: string; token_type: string }> {
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_SECRET environment variable is not set. ' +
      'Please set it in Supabase Dashboard > Settings > Environment Variables. ' +
      'You can find your client secret in the Google Cloud Console > APIs & Services > Credentials.'
    );
  }

  console.log('Exchanging authorization code for tokens...', {
    hasCode: !!code,
    redirectUri,
    clientId: GOOGLE_CLIENT_ID.substring(0, 20) + '...',
  });

  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error) {
    console.error('Google token exchange failed:', {
      status: tokenResponse.status,
      error: tokenData.error,
      description: tokenData.error_description,
    });
    throw new Error(
      `Google token exchange failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`
    );
  }

  console.log('Token exchange successful:', {
    hasAccessToken: !!tokenData.access_token,
    hasRefreshToken: !!tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    scope: tokenData.scope,
  });

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    expires_in: tokenData.expires_in || 3600,
    scope: tokenData.scope || '',
    token_type: tokenData.token_type || 'Bearer',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasGoogleClientSecret: !!Deno.env.get('GOOGLE_CLIENT_SECRET'),
      urlLength: supabaseUrl?.length || 0,
      keyLength: serviceRoleKey?.length || 0,
    });

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        `Missing environment variables: ${!supabaseUrl ? 'SUPABASE_URL' : ''} ${!serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''}`.trim()
      );
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

    const user_id = user.id;
    const body = await req.json();

    // Determine flow: authorization code exchange or direct token storage
    // If 'code' is present, exchange it for tokens via Google's token endpoint
    // If 'access_token' is present, store directly (legacy/fallback support)
    let access_token: string;
    let refresh_token: string | null = null;
    let token_type = 'Bearer';
    let expires_in = 3600;
    let scope = '';

    if (body.code) {
      // Authorization code flow - exchange code for tokens
      console.log('Authorization code flow detected, exchanging code...');
      const redirectUri = body.redirect_uri || '';
      const tokenResult = await exchangeAuthorizationCode(body.code, redirectUri);
      access_token = tokenResult.access_token;
      refresh_token = tokenResult.refresh_token;
      token_type = tokenResult.token_type;
      expires_in = tokenResult.expires_in;
      scope = tokenResult.scope || body.scope || '';
    } else if (body.access_token) {
      // Direct token storage (legacy implicit flow fallback)
      console.log('Direct token storage (legacy flow)');
      access_token = body.access_token;
      refresh_token = body.refresh_token || null;
      token_type = body.token_type || 'Bearer';
      expires_in = body.expires_in || 3600;
      scope = body.scope || '';
    } else {
      throw new Error('Either "code" (authorization code) or "access_token" is required');
    }

    console.log('Token details:', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      tokenType: token_type,
      expiresIn: expires_in,
      scope: scope,
    });

    // Calculate expiry time
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

    // When upserting, preserve the existing refresh_token if the new one is null.
    // This handles the case where Google only sends a refresh_token on the first
    // authorization (when prompt=consent), and subsequent code exchanges omit it.
    let upsertData: Record<string, unknown> = {
      user_id: user_id,
      access_token: access_token,
      token_type: token_type,
      expires_at: expires_at,
      scope: scope,
      updated_at: new Date().toISOString(),
    };

    if (refresh_token) {
      // We have a new refresh token - store it
      upsertData.refresh_token = refresh_token;
    }
    // If refresh_token is null, we intentionally omit it from the upsert
    // so the existing refresh_token in the database is preserved.

    console.log('Attempting to upsert tokens for user:', user_id);

    // First, check if we need to preserve the existing refresh token
    if (!refresh_token) {
      const { data: existingRecord } = await supabaseClient
        .from('user_google_tokens')
        .select('refresh_token')
        .eq('user_id', user_id)
        .maybeSingle();

      if (existingRecord?.refresh_token) {
        console.log('Preserving existing refresh_token from database');
        upsertData.refresh_token = existingRecord.refresh_token;
      } else {
        upsertData.refresh_token = null;
      }
    }

    const { data: result, error: upsertError } = await supabaseClient
      .from('user_google_tokens')
      .upsert(upsertData, {
        onConflict: 'user_id',
      })
      .select();

    if (upsertError) {
      console.error('Upsert error details:', {
        message: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
        hint: upsertError.hint,
      });
      throw new Error(`Failed to store tokens: ${upsertError.message} (code: ${upsertError.code})`);
    }

    console.log('Upsert successful:', result);
    console.log(`Successfully stored Google tokens for user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tokens stored securely',
        has_refresh_token: !!upsertData.refresh_token,
      }),
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
