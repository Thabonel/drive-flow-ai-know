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

    // Validate protocol is WebDAV
    if (server.protocol !== 'webdav') {
      throw new Error('Invalid protocol. Expected WebDAV.');
    }

    // Parse authentication credentials
    const auth = server.authentication || {};
    const username = auth.username;
    const password = auth.password;
    const baseUrl = `${server.host}${server.base_path || ''}`;

    if (!username || !password) {
      throw new Error('WebDAV credentials not configured. Please update your server settings.');
    }

    // Create auth header
    const authString = btoa(`${username}:${password}`);
    const webdavHeaders = {
      'Authorization': `Basic ${authString}`,
      'Depth': '1',
    };

    // List files using PROPFIND
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:getcontentlength/>
    <D:getcontenttype/>
    <D:getlastmodified/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`;

    const listUrl = `${baseUrl}${path || '/'}`;
    const propfindResponse = await fetch(listUrl, {
      method: 'PROPFIND',
      headers: {
        ...webdavHeaders,
        'Content-Type': 'application/xml',
      },
      body: propfindBody,
    });

    if (!propfindResponse.ok) {
      throw new Error(`WebDAV PROPFIND failed: ${propfindResponse.status} ${propfindResponse.statusText}`);
    }

    const responseText = await propfindResponse.text();

    // Parse WebDAV XML response
    const files = parseWebDAVResponse(responseText, baseUrl);

    // Create sync job
    const { data: syncJob, error: syncError } = await supabaseClient
      .from('sync_jobs')
      .insert({
        user_id,
        server_id: server.id,
        status: 'running',
        started_at: new Date().toISOString(),
        files_total: files.length,
      })
      .select()
      .single();

    if (syncError) {
      throw new Error(`Failed to create sync job: ${syncError.message}`);
    }

    // Process each file
    const processedDocuments = [];
    for (const file of files) {
      // Skip directories
      if (file.isDirectory) continue;

      let content: string | null = null;

      // Download file content if it's a text-based file
      try {
        const fileUrl = `${baseUrl}${file.path}`;
        const fileResponse = await fetch(fileUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authString}`,
          },
        });

        if (!fileResponse.ok) {
          console.log(`Could not download file ${file.path}: ${fileResponse.status}`);
          continue;
        }

        const contentType = file.contentType || 'application/octet-stream';

        // Only download text-based files
        if (contentType.includes('text') ||
            contentType.includes('json') ||
            contentType.includes('xml') ||
            contentType.includes('javascript') ||
            contentType.includes('html') ||
            contentType.includes('css') ||
            contentType.includes('markdown')) {
          content = await fileResponse.text();
        }
      } catch (error) {
        console.log(`Could not download file ${file.path}:`, error);
      }

      // Store document in database
      const { data: document, error: docError } = await supabaseClient
        .from('knowledge_documents')
        .upsert({
          user_id,
          server_id: server.id,
          s3_key: file.path, // Reusing s3_key field for WebDAV path
          title: file.name,
          content,
          file_type: 'file',
          mime_type: file.contentType || 'application/octet-stream',
          file_size: file.size || null,
          s3_last_modified: file.lastModified || null,
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
            console.log(`AI analysis failed for document ${file.path}:`, aiError);
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
        files_processed: files.length,
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
        files_processed: files.length,
        sync_job_id: syncJob.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in webdav-sync:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Parse WebDAV XML response
function parseWebDAVResponse(xmlText: string, baseUrl: string): Array<{
  path: string;
  name: string;
  isDirectory: boolean;
  size: number | null;
  contentType: string | null;
  lastModified: string | null;
}> {
  const files: Array<any> = [];

  // Simple regex-based XML parsing (for production, consider using a proper XML parser)
  const responseRegex = /<D:response[^>]*>([\s\S]*?)<\/D:response>/gi;
  const matches = xmlText.matchAll(responseRegex);

  for (const match of matches) {
    const responseBlock = match[1];

    // Extract href (file path)
    const hrefMatch = responseBlock.match(/<D:href[^>]*>(.*?)<\/D:href>/i);
    const href = hrefMatch ? decodeURIComponent(hrefMatch[1]) : null;

    if (!href) continue;

    // Extract properties
    const nameMatch = responseBlock.match(/<D:displayname[^>]*>(.*?)<\/D:displayname>/i);
    const sizeMatch = responseBlock.match(/<D:getcontentlength[^>]*>(.*?)<\/D:getcontentlength>/i);
    const typeMatch = responseBlock.match(/<D:getcontenttype[^>]*>(.*?)<\/D:getcontenttype>/i);
    const modifiedMatch = responseBlock.match(/<D:getlastmodified[^>]*>(.*?)<\/D:getlastmodified>/i);
    const isCollection = responseBlock.includes('<D:collection');

    // Remove base URL from href to get relative path
    let path = href;
    try {
      const baseUrlObj = new URL(baseUrl);
      const hrefUrlObj = new URL(href, baseUrl);
      path = hrefUrlObj.pathname.replace(baseUrlObj.pathname, '');
    } catch (e) {
      // If URL parsing fails, use href as-is
    }

    // Skip the root directory itself
    if (path === '/' || path === '') continue;

    const name = nameMatch ? nameMatch[1] : path.split('/').filter(p => p).pop() || path;

    files.push({
      path,
      name,
      isDirectory: isCollection,
      size: sizeMatch ? parseInt(sizeMatch[1]) : null,
      contentType: typeMatch ? typeMatch[1] : null,
      lastModified: modifiedMatch ? modifiedMatch[1] : null,
    });
  }

  return files;
}

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
          source: 'webdav',
          webdav_path: document.s3_key,
          created_at: new Date().toISOString()
        }
      });
  }

  console.log(`Chunked document ${document.title} into ${chunks.length} chunks`);
}
