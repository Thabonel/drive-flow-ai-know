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

    // TODO: Implement actual Google Drive API integration
    // For now, we'll simulate the sync process
    
    // Create sync job
    const { data: syncJob, error: syncError } = await supabaseClient
      .from('sync_jobs')
      .insert({
        user_id,
        folder_id: folder.id,
        status: 'running',
        started_at: new Date().toISOString(),
        files_total: 10, // Mock data
      })
      .select()
      .single();

    if (syncError) {
      throw new Error(`Failed to create sync job: ${syncError.message}`);
    }

    // Simulate processing files
    const mockFiles = [
      {
        google_file_id: 'file1',
        title: 'AI Prompts Collection',
        content: 'This document contains various AI prompts for different use cases...',
        file_type: 'document',
        mime_type: 'application/vnd.google-apps.document',
        drive_created_at: new Date('2024-01-01').toISOString(),
        drive_modified_at: new Date('2024-01-15').toISOString(),
        category: 'prompts',
        tags: ['ai', 'prompts'],
      },
      {
        google_file_id: 'file2',
        title: 'Marketing Strategy Q1',
        content: 'Marketing strategy document for Q1 2024...',
        file_type: 'document',
        mime_type: 'application/vnd.google-apps.document',
        drive_created_at: new Date('2024-01-05').toISOString(),
        drive_modified_at: new Date('2024-01-12').toISOString(),
        category: 'marketing',
        tags: ['marketing', 'strategy'],
      },
    ];

    // Insert/update documents
    for (const file of mockFiles) {
      await supabaseClient
        .from('knowledge_documents')
        .upsert({
          user_id,
          folder_id: folder.id,
          ...file,
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
        files_processed: mockFiles.length,
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
        files_processed: mockFiles.length,
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