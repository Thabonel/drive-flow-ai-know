import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Google OAuth configuration from environment
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');

    // ADD DIAGNOSTIC LOGGING FOR TROUBLESHOOTING
    console.log('Google OAuth config check:', {
      hasApiKey: !!googleApiKey,
      hasClientId: !!googleClientId,
      apiKeyLength: googleApiKey?.length || 0,
      clientIdPrefix: googleClientId?.substring(0, 20) || 'none',
      timestamp: new Date().toISOString()
    });

    if (!googleApiKey || !googleClientId) {
      console.error('Missing Google credentials:', {
        apiKey: !!googleApiKey,
        clientId: !!googleClientId
      });
      throw new Error('Google API credentials not configured');
    }

    return new Response(
      JSON.stringify({
        apiKey: googleApiKey?.trim(),
        clientId: googleClientId?.trim(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});