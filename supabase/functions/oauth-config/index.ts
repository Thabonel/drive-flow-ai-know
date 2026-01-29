import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed origins for OAuth client ID distribution
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'https://fskwutnoxbbflzqrphro.supabase.co',
  'https://aiqueryhub.com', // Add your production domain
  'https://www.aiqueryhub.com',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify request origin for security
    const origin = req.headers.get('origin');
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return OAuth configuration securely
    const config = {
      google: {
        client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com',
        redirect_uri: `${origin}/auth/google/callback`, // Dynamic based on origin
      },
      microsoft: {
        client_id: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
        tenant_id: Deno.env.get('MICROSOFT_TENANT_ID') || 'common',
        redirect_uri: `${origin}/auth/microsoft/callback`,
      },
      dropbox: {
        client_id: Deno.env.get('DROPBOX_CLIENT_ID') || '',
        redirect_uri: `${origin}/auth/dropbox/callback`,
      },
    };

    return new Response(
      JSON.stringify(config),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store', // Don't cache sensitive config
        },
      }
    );

  } catch (error) {
    console.error('OAuth config error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});