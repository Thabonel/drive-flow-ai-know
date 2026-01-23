import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const user_id = user.id;
    const { server_id, path } = await req.json();

    // Get server configuration from database
    const { data: server, error: serverError } = await supabaseClient
      .from('enterprise_servers')
      .select('*')
      .eq('id', server_id)
      .eq('user_id', user_id)
      .single();

    if (serverError || !server) {
      throw new Error(`Server configuration not found: ${serverError?.message || 'Unknown error'}`);
    }

    // Validate protocol is SFTP
    if (server.protocol !== 'sftp') {
      throw new Error('Invalid protocol. Expected SFTP.');
    }

    // Parse authentication credentials
    const auth = server.authentication || {};
    const username = auth.username;
    const password = auth.password;
    const privateKey = auth.private_key;
    const host = server.host;
    const port = server.port || 22;
    const basePath = server.base_path || '/';

    if (!username || (!password && !privateKey)) {
      throw new Error('SFTP credentials not configured. Please update your server settings with username and password or SSH key.');
    }

    // SFTP connection using SSH2
    // Note: This requires ssh2 library which may not be directly available in Deno
    // For now, we'll implement a workaround using command execution

    // Create a temporary SSH config and run sftp commands
    const remotePath = path || basePath;

    // Use sftp command via Deno.Command for file listing
    let files: Array<any> = [];

    try {
      // For SFTP, we'll use a different approach - spawn sftp process
      // This is a simplified implementation that works with password authentication

      // Create batch file for SFTP commands
      const batchCommands = `ls -l ${remotePath}\nbye\n`;

      // For production, you'd want to use a proper SSH2 client library
      // This is a placeholder that demonstrates the flow
      console.log(`SFTP sync requested for ${host}:${port}${remotePath}`);
      console.log(`Username: ${username}`);

      // Since we can't easily execute SFTP commands in Edge Functions,
      // we'll create a sync job and mark it as pending for external processing
      const { data: syncJob, error: syncError } = await supabaseClient
        .from('sync_jobs')
        .insert({
          user_id,
          server_id: server.id,
          status: 'pending',
          started_at: new Date().toISOString(),
          files_total: 0,
          metadata: {
            protocol: 'sftp',
            host,
            port,
            path: remotePath,
            message: 'SFTP sync requires external worker. Job queued for processing.'
          }
        })
        .select()
        .single();

      if (syncError) {
        throw new Error(`Failed to create sync job: ${syncError.message}`);
      }

      // Return pending status with instructions
      return new Response(
        JSON.stringify({
          success: true,
          status: 'pending',
          sync_job_id: syncJob.id,
          message: 'SFTP sync job created. This will be processed by a background worker.',
          instructions: 'SFTP requires SSH2 client capabilities not available in Edge Functions. ' +
                       'Consider using our desktop sync client or API gateway for SFTP synchronization.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (error) {
      throw new Error(`SFTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error in sftp-sync:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        note: 'SFTP synchronization requires SSH2 capabilities. Consider alternative sync methods or contact support for enterprise SFTP integration.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function for file type detection
function getContentTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
