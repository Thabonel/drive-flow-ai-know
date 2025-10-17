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
    const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const microsoftTenantId = Deno.env.get('MICROSOFT_TENANT_ID') || 'common'; // 'common' for multi-tenant

    if (!microsoftClientId) {
      throw new Error('Microsoft API credentials not configured');
    }

    return new Response(
      JSON.stringify({
        clientId: microsoftClientId,
        tenantId: microsoftTenantId,
        redirectUri: `${req.headers.get('origin') || 'http://localhost:5173'}/auth/microsoft/callback`,
        authority: `https://login.microsoftonline.com/${microsoftTenantId}`,
        scopes: [
          'User.Read',
          'Files.Read.All',
          'Sites.Read.All',
          'offline_access'
        ]
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
