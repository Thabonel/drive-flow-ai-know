import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supported file extensions for document processing
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx', '.doc', '.csv', '.json'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
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
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    const body = await req.json();
    const { folder_id } = body;

    if (!folder_id) {
      throw new Error('Folder ID is required');
    }

    console.log(`Starting Dropbox sync for folder ${folder_id}, user ${user.id}`);

    // Get user's Dropbox token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_dropbox_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData?.access_token) {
      throw new Error('Dropbox not connected. Please connect your Dropbox account first.');
    }

    // Get folder info
    const { data: folderData, error: folderError } = await supabaseClient
      .from('dropbox_folders')
      .select('*')
      .eq('id', folder_id)
      .eq('user_id', user.id)
      .single();

    if (folderError || !folderData) {
      throw new Error('Folder not found');
    }

    const accessToken = tokenData.access_token;
    const folderPath = folderData.folder_path || '';

    // List files in the folder
    const listResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: folderPath,
        recursive: true,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        include_non_downloadable_files: false,
      }),
    });

    if (!listResponse.ok) {
      const errorData = await listResponse.json();
      throw new Error(`Dropbox API error: ${errorData?.error_summary || listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    const entries = listData.entries || [];

    // Filter for supported file types
    const files = entries.filter((entry: any) => {
      if (entry['.tag'] !== 'file') return false;
      const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
      return SUPPORTED_EXTENSIONS.includes(ext);
    });

    console.log(`Found ${files.length} supported files to process`);

    let filesProcessed = 0;
    const errors: string[] = [];

    // Process each file
    for (const file of files) {
      try {
        // Check if document already exists
        const { data: existingDoc } = await supabaseClient
          .from('knowledge_documents')
          .select('id, updated_at')
          .eq('user_id', user.id)
          .eq('source_id', file.id)
          .eq('source_type', 'dropbox')
          .single();

        // Skip if document exists and hasn't been modified
        if (existingDoc && file.server_modified) {
          const docUpdated = new Date(existingDoc.updated_at);
          const fileModified = new Date(file.server_modified);
          if (docUpdated >= fileModified) {
            console.log(`Skipping ${file.name} - not modified`);
            continue;
          }
        }

        // Download file content
        const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Dropbox-API-Arg': JSON.stringify({ path: file.id }),
          },
        });

        if (!downloadResponse.ok) {
          console.error(`Failed to download ${file.name}`);
          errors.push(`Failed to download ${file.name}`);
          continue;
        }

        // Get file content based on type
        let content = '';
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (ext === '.pdf') {
          // For PDFs, we'd need to use a PDF parsing service
          // For now, store metadata only
          content = `[PDF Document: ${file.name}]`;
        } else if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
          content = await downloadResponse.text();
        } else if (['.docx', '.doc'].includes(ext)) {
          // For Office docs, we'd need document parsing
          content = `[Office Document: ${file.name}]`;
        }

        // Determine category based on file path or name
        let category = 'general';
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes('prompt')) category = 'prompts';
        else if (lowerName.includes('market')) category = 'marketing';
        else if (lowerName.includes('spec') || lowerName.includes('requirement')) category = 'specs';
        else if (lowerName.includes('research')) category = 'research';
        else if (lowerName.includes('note')) category = 'notes';

        // Upsert document
        const { error: docError } = await supabaseClient
          .from('knowledge_documents')
          .upsert({
            user_id: user.id,
            title: file.name,
            content: content,
            category: category,
            source_type: 'dropbox',
            source_id: file.id,
            source_url: file.path_display,
            file_type: ext.replace('.', ''),
            drive_modified_at: file.server_modified,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,source_id,source_type'
          });

        if (docError) {
          console.error(`Error saving ${file.name}:`, docError);
          errors.push(`Failed to save ${file.name}`);
          continue;
        }

        filesProcessed++;
        console.log(`Processed: ${file.name}`);

      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError);
        errors.push(`Error processing ${file.name}`);
      }
    }

    // Update folder sync timestamp
    await supabaseClient
      .from('dropbox_folders')
      .update({
        last_synced_at: new Date().toISOString(),
        files_count: filesProcessed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', folder_id);

    console.log(`Sync complete. Processed ${filesProcessed} files.`);

    return new Response(
      JSON.stringify({
        success: true,
        files_processed: filesProcessed,
        total_files: files.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in dropbox-sync:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
