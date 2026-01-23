import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export async function verifyWorkspaceApiToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('workspace_api_keys')
    .select('user_id')
    .eq('api_key', token)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data.user_id as string;
}
