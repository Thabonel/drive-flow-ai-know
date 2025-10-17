import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";

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
    const { server_id, bucket_name, prefix } = await req.json();

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

    // Validate protocol is S3
    if (server.protocol !== 's3') {
      throw new Error('Invalid protocol. Expected S3.');
    }

    // Parse authentication credentials
    const auth = server.authentication || {};
    const accessKeyId = auth.access_key_id;
    const secretAccessKey = auth.secret_access_key;
    const region = server.region || 'us-east-1';
    const endpoint = server.endpoint || undefined;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('S3 credentials not configured. Please update your server settings.');
    }

    // Create S3 client
    const s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // List objects in bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket_name || server.bucket_name,
      Prefix: prefix || '',
      MaxKeys: 1000,
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];

    // Create sync job
    const { data: syncJob, error: syncError } = await supabaseClient
      .from('sync_jobs')
      .insert({
        user_id,
        server_id: server.id,
        status: 'running',
        started_at: new Date().toISOString(),
        files_total: objects.length,
      })
      .select()
      .single();

    if (syncError) {
      throw new Error(`Failed to create sync job: ${syncError.message}`);
    }

    // Process each object
    const processedDocuments = [];
    for (const object of objects) {
      // Skip folders (objects ending with /)
      if (object.Key?.endsWith('/')) continue;

      let content: string | null = null;

      // Download file content if it's a text-based file
      try {
        const getCommand = new GetObjectCommand({
          Bucket: bucket_name || server.bucket_name,
          Key: object.Key,
        });

        const getResponse = await s3Client.send(getCommand);

        // Check content type
        const contentType = object.ContentType || getResponse.ContentType || 'application/octet-stream';

        // Only download text-based files
        if (contentType.includes('text') ||
            contentType.includes('json') ||
            contentType.includes('xml') ||
            contentType.includes('javascript') ||
            contentType.includes('html') ||
            contentType.includes('css')) {

          // Read body as text
          if (getResponse.Body) {
            const bodyBytes = await getResponse.Body.transformToByteArray();
            content = new TextDecoder().decode(bodyBytes);
          }
        }
      } catch (error) {
        console.log(`Could not download file ${object.Key}:`, error);
      }

      // Store document in database
      const { data: document, error: docError } = await supabaseClient
        .from('knowledge_documents')
        .upsert({
          user_id,
          server_id: server.id,
          s3_key: object.Key,
          title: object.Key?.split('/').pop() || object.Key,
          content,
          file_type: 'file',
          mime_type: object.ContentType || 'application/octet-stream',
          file_size: object.Size || null,
          s3_etag: object.ETag || null,
          s3_last_modified: object.LastModified?.toISOString() || null,
        }, {
          onConflict: 'user_id,s3_key',
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
            console.log(`AI analysis failed for document ${object.Key}:`, aiError);
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
        files_processed: objects.length,
      })
      .eq('id', syncJob.id);

    // Update server last sync time
    await supabaseClient
      .from('enterprise_servers')
      .update({
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', server.id);

    return new Response(
      JSON.stringify({
        success: true,
        files_processed: objects.length,
        sync_job_id: syncJob.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in s3-sync:', error);
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
          source: 's3',
          s3_key: document.s3_key,
          created_at: new Date().toISOString()
        }
      });
  }

  console.log(`Chunked document ${document.title} into ${chunks.length} chunks`);
}
