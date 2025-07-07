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

    // Get folder info from database - folder_id is the internal ID
    const { data: folder, error: folderError } = await supabaseClient
      .from('google_drive_folders')
      .select('*')
      .eq('id', folder_id)
      .eq('user_id', user_id)
      .single();

    if (folderError) {
      throw new Error(`Folder not found: ${folderError.message}`);
    }

    // For now, use a static token. In production, implement OAuth properly
    const googleToken = Deno.env.get('GOOGLE_API_KEY');
    if (!googleToken) {
      throw new Error('Missing GOOGLE_API_KEY env variable. Please add your Google API key to secrets.');
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

    // Insert/update documents and trigger AI analysis
    const processedDocuments = [];
    for (const file of driveFiles) {
      let content: string | null = null;
      if (file.mimeType === 'application/vnd.google-apps.document') {
        try {
          const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`, {
            headers: { Authorization: `Bearer ${googleToken}` }
          });
          if (exportRes.ok) {
            content = await exportRes.text();
          }
        } catch (error) {
          console.log(`Could not export document ${file.name}:`, error);
        }
      }

      const { data: document, error: docError } = await supabaseClient
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
          file_size: file.size || null,
        }, {
          onConflict: 'user_id,google_file_id',
        })
        .select()
        .single();

      if (!docError && document) {
        processedDocuments.push(document);
        
        // If document has content, chunk it and store in doc_qa_documents for better AI processing
        if (content && content.length > 0) {
          await chunkAndStoreDocument(supabaseClient, document, content);
        }
        
        // Trigger AI analysis for documents with content
        if (content) {
          try {
            await supabaseClient.functions.invoke('ai-document-analysis', {
              body: { 
                document_id: document.id, 
                user_id: user_id 
              }
            });
          } catch (aiError) {
            console.log(`AI analysis failed for document ${file.name}:`, aiError);
          }
        }
      }
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

// Function to chunk documents and store them for better AI processing
async function chunkAndStoreDocument(supabaseClient: any, document: any, content: string) {
  const maxChunkSize = 1000; // Characters per chunk
  const chunks = [];
  
  // Split content into chunks
  for (let i = 0; i < content.length; i += maxChunkSize) {
    const chunk = content.substring(i, i + maxChunkSize);
    chunks.push(chunk);
  }

  // Delete existing chunks for this document
  await supabaseClient
    .from('doc_qa_documents')
    .delete()
    .eq('document_id', document.id);

  // Store new chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.trim().length === 0) continue; // Skip empty chunks

    await supabaseClient
      .from('doc_qa_documents')
      .insert({
        document_id: document.id,
        document_name: document.title,
        content: chunk,
        chunk_index: i,
        chunk_total: chunks.length,
        document_type: 'text',
        metadata: {
          source: 'google_drive',
          google_file_id: document.google_file_id,
          created_at: new Date().toISOString()
        }
      });
  }

  console.log(`Chunked document ${document.title} into ${chunks.length} chunks`);
}
