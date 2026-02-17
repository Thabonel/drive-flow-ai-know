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
    // Get authorization header and validate JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    const user_id = user.id;
    const { folder_id } = await req.json();

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

    // Get user's stored OAuth token directly from table
    const { data: tokenRecord, error: tokenError } = await supabaseClient
      .from('user_google_tokens')
      .select('access_token, expires_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (tokenError || !tokenRecord || !tokenRecord.access_token) {
      throw new Error('No Google Drive access token found. Please reconnect your Google Drive account.');
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    if (now >= expiresAt) {
      throw new Error('Google Drive access token has expired. Please reconnect your Google Drive account.');
    }

    const googleToken = tokenRecord.access_token;

    // First, get folder details to update folder_path if needed
    const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folder.folder_id}?fields=name,parents&supportsAllDrives=true`, {
      headers: { 
        Authorization: `Bearer ${googleToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    let folderPath = folder.folder_path;
    if (folderRes.ok) {
      const folderData = await folderRes.json();
      if (folderData.parents && folderData.parents.length > 0) {
        // Try to build a folder path by getting parent folder names
        try {
          const parentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderData.parents[0]}?fields=name&supportsAllDrives=true`, {
            headers: { 
              Authorization: `Bearer ${googleToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (parentRes.ok) {
            const parentData = await parentRes.json();
            folderPath = `${parentData.name}/${folderData.name}`;
          }
        } catch (e) {
          console.log('Could not get parent folder info:', e);
          folderPath = folderData.name;
        }
      }
    }

    // Fetch files from Google Drive using OAuth token
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folder.folder_id}'+in+parents&fields=files(id,name,mimeType,createdTime,modifiedTime,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
      headers: { 
        Authorization: `Bearer ${googleToken}`,
        'Content-Type': 'application/json'
      }
    });
    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.error('Google Drive API error:', errorText);
      throw new Error(`Failed to fetch files from Google Drive: ${listRes.status} ${listRes.statusText}`);
    }
    
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
      let sheetData: any = null;
      let sheetMetadata: any = null;

      if (file.mimeType === 'application/vnd.google-apps.document') {
        try {
          const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`, {
            headers: {
              Authorization: `Bearer ${googleToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (exportRes.ok) {
            content = await exportRes.text();
          } else {
            console.log(`Could not export document ${file.name}: ${exportRes.status} ${exportRes.statusText}`);
          }
        } catch (error) {
          console.log(`Could not export document ${file.name}:`, error);
        }
      } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        try {
          // Get spreadsheet metadata and data
          const [metadata, sheetsData] = await Promise.all([
            getSheetMetadata(googleToken, file.id),
            getAllSheetData(googleToken, file.id)
          ]);

          sheetMetadata = {
            title: metadata.properties?.title || file.name,
            sheets: metadata.sheets?.map(sheet => ({
              name: sheet.properties?.title,
              sheetId: sheet.properties?.sheetId,
              gridProperties: sheet.properties?.gridProperties,
              rowCount: sheet.properties?.gridProperties?.rowCount || 0,
              columnCount: sheet.properties?.gridProperties?.columnCount || 0
            })) || [],
            totalSheets: metadata.sheets?.length || 0
          };

          sheetData = {
            sheets: sheetsData
          };

          // Convert spreadsheet data to AI-queryable text
          content = convertSpreadsheetToText(sheetData, sheetMetadata);

        } catch (error) {
          console.log(`Could not process spreadsheet ${file.name}:`, error);
        }
      }

      // Determine file type more precisely
      let fileType = 'file';
      if (file.mimeType === 'application/vnd.google-apps.document') {
        fileType = 'document';
      } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        fileType = 'spreadsheet';
      }

      const documentData: any = {
        user_id,
        folder_id: folder.id,
        google_file_id: file.id,
        title: file.name,
        content,
        file_type: fileType,
        mime_type: file.mimeType,
        drive_created_at: file.createdTime,
        drive_modified_at: file.modifiedTime,
        file_size: file.size || null,
      };

      // Add spreadsheet-specific data if it's a spreadsheet
      if (fileType === 'spreadsheet') {
        documentData.sheet_data = sheetData;
        documentData.sheet_metadata = sheetMetadata;
      }

      const { data: document, error: docError } = await supabaseClient
        .from('knowledge_documents')
        .upsert(documentData, {
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

    // Update folder last sync time and path
    await supabaseClient
      .from('google_drive_folders')
      .update({
        last_synced_at: new Date().toISOString(),
        folder_path: folderPath,
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

// Helper functions for Google Sheets integration

// Get metadata about a specific spreadsheet
async function getSheetMetadata(token: string, sheetId: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets(properties),properties`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error:', errorText);
    throw new Error(`Failed to get sheet metadata: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Get data from all sheets in a spreadsheet
async function getAllSheetData(token: string, sheetId: string) {
  try {
    // First get metadata to know all sheet names
    const metadata = await getSheetMetadata(token, sheetId);
    const sheets = metadata.sheets || [];

    const sheetsData = [];

    // Read data from each sheet
    for (const sheet of sheets) {
      const sheetName = sheet.properties?.title || `Sheet${sheet.properties?.sheetId}`;

      try {
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:ZZ1000`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const values = data.values || [];

          if (values.length > 0) {
            sheetsData.push({
              name: sheetName,
              range: data.range,
              data: values,
              headers: values[0] || [],
              rowCount: values.length,
              columnCount: values[0]?.length || 0
            });
          } else {
            // Empty sheet
            sheetsData.push({
              name: sheetName,
              range: `${sheetName}!A1:A1`,
              data: [],
              headers: [],
              rowCount: 0,
              columnCount: 0
            });
          }
        } else {
          console.log(`Could not read sheet ${sheetName}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`Error reading sheet ${sheetName}:`, error);
      }
    }

    return sheetsData;
  } catch (error) {
    console.error('Error getting all sheet data:', error);
    throw error;
  }
}

// Convert spreadsheet data to AI-queryable text format
function convertSpreadsheetToText(sheetData: any, sheetMetadata: any): string {
  if (!sheetData?.sheets || sheetData.sheets.length === 0) {
    return `SPREADSHEET: ${sheetMetadata?.title || 'Untitled'}\n\nThis spreadsheet appears to be empty or could not be read.`;
  }

  const sections = [];
  sections.push(`SPREADSHEET: ${sheetMetadata?.title || 'Untitled'}`);
  sections.push(`Total Sheets: ${sheetData.sheets.length}`);
  sections.push('');

  for (const sheet of sheetData.sheets) {
    sections.push(`== SHEET: ${sheet.name} ==`);
    sections.push(`Dimensions: ${sheet.rowCount} rows × ${sheet.columnCount} columns`);

    if (sheet.data && sheet.data.length > 0) {
      const headers = sheet.headers || [];
      if (headers.length > 0) {
        sections.push(`Columns: ${headers.join(' | ')}`);
      }

      // Add sample data (first 5 rows after headers)
      const dataRows = sheet.data.slice(1, 6);
      if (dataRows.length > 0) {
        sections.push('Sample Data:');
        dataRows.forEach((row: any[], index: number) => {
          const rowData = headers.map((header: string, colIndex: number) =>
            `${header}: ${row[colIndex] || '(empty)'}`
          ).join(', ');
          sections.push(`Row ${index + 2}: ${rowData}`);
        });
      }

      // Add summary statistics if numeric data is found
      if (headers.length > 0 && sheet.data.length > 1) {
        const numericColumns = [];
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const columnValues = sheet.data.slice(1).map(row => row[colIndex]);
          const numericValues = columnValues.filter(val => val && !isNaN(parseFloat(val))).map(val => parseFloat(val));

          if (numericValues.length > 0) {
            const sum = numericValues.reduce((a, b) => a + b, 0);
            const avg = sum / numericValues.length;
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);

            numericColumns.push(`${headers[colIndex]}: ${numericValues.length} values, avg=${avg.toFixed(2)}, min=${min}, max=${max}`);
          }
        }

        if (numericColumns.length > 0) {
          sections.push('Numeric Column Summary:');
          sections.push(...numericColumns);
        }
      }
    } else {
      sections.push('This sheet is empty.');
    }

    sections.push('');
  }

  return sections.join('\n');
}
