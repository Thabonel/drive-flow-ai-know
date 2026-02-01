import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // DISABLED - Calendar now uses hardcoded config like Google Drive
  return new Response(JSON.stringify({
    error: 'This function is deprecated. Calendar integration now uses direct configuration.'
  }), {
    status: 410,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});