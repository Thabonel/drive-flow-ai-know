import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { folder_id, user_id } = await req.json();

    // Get folder info from database
    const { data: folder, error: folderError } = await supabaseClient
      .from('google_drive_folders')
      .select('*')
      .eq('folder_id', folder_id)
      .eq('user_id', user_id)
      .single();

    if (folderError) {
      throw new Error(`Folder not found: ${folderError.message}`);
    }

    const googleToken = Deno.env.get('GOOGLE_DRIVE_TOKEN');
    if (!googleToken) {
      throw new Error('Missing GOOGLE_DRIVE_TOKEN env variable');
    }

    // Fetch files from Google Drive
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folder.folder_id}'+in+parents&fields=files(id,name,mimeType,createdTime,modifiedTime,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
      headers: { Authorization: `Bearer ${googleToken}` }
    });
    const listData = await listRes.json();
    const driveFiles = listData.files || [];

    // Create sync job
    
    // Create sync job
    const { data: syncJob, error: syncError } = await supabaseClient
      .from('sync_jobs')
      .insert({
        user_id,
        folder_id: folder.id,
        status: 'running',
        started_at: new Date().toISOString(),
        files_total: driveFiles.length,
      })
      .select()
      .single();

    if (syncError) {
      throw new Error(`Failed to create sync job: ${syncError.message}`);
    }

    // Insert/update documents
    for (const file of driveFiles) {
      let content: string | null = null;
      if (file.mimeType === 'application/vnd.google-apps.document') {
        const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`, {
          headers: { Authorization: `Bearer ${googleToken}` }
        });
        content = await exportRes.text();
      }

      await supabaseClient
        .from('knowledge_documents')
        .upsert({
          user_id,
          folder_id: folder.id,
          google_file_id: file.id,
          title: file.name,
          content,
          file_type: file.mimeType.startsWith('application/vnd.google-apps') ? 'document' : 'file',
          mime_type: file.mimeType,
          drive_created_at: file.createdTime,
          drive_modified_at: file.modifiedTime,
        }, {
          onConflict: 'user_id,google_file_id',
        });
    }

    // Update sync job as completed
      await supabaseClient
        .from('sync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          files_processed: driveFiles.length,
        })
      .eq('id', syncJob.id);

    // Update folder last sync time
    await supabaseClient
      .from('google_drive_folders')
      .update({
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', folder.id);

    return new Response(
        JSON.stringify({
          success: true,
          files_processed: driveFiles.length,
          sync_job_id: syncJob.id,
        }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in google-drive-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
