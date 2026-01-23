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
    const { folder_id } = await req.json();

    // Get folder info from database
    const { data: folder, error: folderError } = await supabaseClient
      .from('microsoft_drive_folders')
      .select('*')
      .eq('id', folder_id)
      .eq('user_id', user_id)
      .single();

    if (folderError) {
      throw new Error(`Folder not found: ${folderError.message}`);
    }

    // Get client IP and user agent
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Get user's stored OAuth token
    const { data: tokenData, error: tokenError } = await supabaseClient.rpc('get_decrypted_microsoft_token', {
      p_user_id: user_id,
      p_ip_address: clientIP,
      p_user_agent: userAgent
    });

    if (tokenError || !tokenData || tokenData.length === 0) {
      throw new Error('No Microsoft access token found. Please reconnect your Microsoft account.');
    }

    const tokenRecord = tokenData[0];
    const microsoftToken = tokenRecord.access_token;

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    if (now >= expiresAt) {
      throw new Error('Microsoft access token has expired. Please reconnect your Microsoft account.');
    }

    // Build Microsoft Graph API URL based on drive type
    let graphApiUrl;
    if (folder.drive_type === 'sharepoint' && folder.site_id) {
      graphApiUrl = `https://graph.microsoft.com/v1.0/sites/${folder.site_id}/drives/${folder.drive_id}/items/${folder.item_id}/children`;
    } else {
      // Personal OneDrive or Business OneDrive
      graphApiUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folder.item_id}/children`;
    }

    // Fetch files from Microsoft Drive
    const listRes = await fetch(graphApiUrl, {
      headers: {
        Authorization: `Bearer ${microsoftToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.error('Microsoft Graph API error:', errorText);
      throw new Error(`Failed to fetch files from Microsoft Drive: ${listRes.status} ${listRes.statusText}`);
    }

    const listData = await listRes.json();
    const driveItems = listData.value || [];

    // Create sync job
    const { data: syncJob, error: syncError } = await supabaseClient
      .from('sync_jobs')
      .insert({
        user_id,
        folder_id: folder.id,
        status: 'running',
        started_at: new Date().toISOString(),
        files_total: driveItems.length,
      })
      .select()
      .single();

    if (syncError) {
      throw new Error(`Failed to create sync job: ${syncError.message}`);
    }

    // Process each file
    const processedDocuments = [];
    for (const item of driveItems) {
      // Skip folders, only process files
      if (item.folder) continue;

      let content: string | null = null;

      // Download file content if it's a supported type
      if (item.file) {
        try {
          const downloadUrl = item['@microsoft.graph.downloadUrl'];
          if (downloadUrl) {
            const downloadRes = await fetch(downloadUrl);
            if (downloadRes.ok) {
              const contentType = item.file.mimeType || 'application/octet-stream';

              // Handle text-based files
              if (contentType.includes('text') || contentType.includes('document')) {
                content = await downloadRes.text();
              }
              // For Office files, we'd need to use conversion API
              // For now, we'll just store metadata
            }
          }
        } catch (error) {
          console.log(`Could not download file ${item.name}:`, error);
        }
      }

      // Store document in database
      const { data: document, error: docError } = await supabaseClient
        .from('knowledge_documents')
        .upsert({
          user_id,
          folder_id: folder.id,
          microsoft_file_id: item.id,
          title: item.name,
          content,
          file_type: item.file ? 'file' : 'folder',
          mime_type: item.file?.mimeType || 'unknown',
          file_size: item.size || null,
          drive_created_at: item.createdDateTime,
          drive_modified_at: item.lastModifiedDateTime,
        }, {
          onConflict: 'user_id,microsoft_file_id',
        })
        .select()
        .single();

      if (!docError && document) {
        processedDocuments.push(document);

        // If document has content, chunk it for AI processing
        if (content && content.length > 0) {
          await chunkAndStoreDocument(supabaseClient, document, content);

          // Trigger AI analysis
          try {
            await supabaseClient.functions.invoke('ai-document-analysis', {
              body: {
                document_id: document.id,
                user_id: user_id
              }
            });
          } catch (aiError) {
            console.log(`AI analysis failed for document ${item.name}:`, aiError);
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
        files_processed: driveItems.length,
      })
      .eq('id', syncJob.id);

    // Update folder last sync time
    await supabaseClient
      .from('microsoft_drive_folders')
      .update({
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', folder.id);

    return new Response(
      JSON.stringify({
        success: true,
        files_processed: driveItems.length,
        sync_job_id: syncJob.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in microsoft-drive-sync:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Function to chunk documents and store them for better AI processing
async function chunkAndStoreDocument(supabaseClient: any, document: any, content: string) {
  const maxChunkSize = 1000;
  const chunks = [];

  for (let i = 0; i < content.length; i += maxChunkSize) {
    const chunk = content.substring(i, i + maxChunkSize);
    chunks.push(chunk);
  }

  // Delete existing chunks
  await supabaseClient
    .from('doc_qa_documents')
    .delete()
    .eq('document_id', document.id);

  // Store new chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.trim().length === 0) continue;

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
          source: 'microsoft_drive',
          microsoft_file_id: document.microsoft_file_id,
          created_at: new Date().toISOString()
        }
      });
  }

  console.log(`Chunked document ${document.title} into ${chunks.length} chunks`);
}
