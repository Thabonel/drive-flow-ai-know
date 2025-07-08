import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyWorkspaceApiToken } from './auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'workspace-api-token, authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const token = req.headers.get('workspace-api-token');
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'workspace-api-token header required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userId = await verifyWorkspaceApiToken(token);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Invalid workspace token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const lastUpdated = url.searchParams.get('last_updated');
  const titleContains = url.searchParams.get('title_contains');

  let query = supabase
    .from('knowledge_documents')
    .select('*')
    .eq('user_id', userId);

  if (category) {
    query = query.eq('category', category);
  }

  if (lastUpdated) {
    query = query.gte('updated_at', lastUpdated);
  }

  if (titleContains) {
    query = query.ilike('title', `%${titleContains}%`);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
