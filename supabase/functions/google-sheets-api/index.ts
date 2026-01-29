import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheets API base URL
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

interface SheetsRequest {
  action: 'list' | 'read' | 'write' | 'create' | 'metadata';
  sheet_id?: string;
  range?: string;
  data?: any[][];
  title?: string;
  headers?: string[];
}

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

    // Get request body
    const requestBody: SheetsRequest = await req.json();
    const { action, sheet_id, range, data, title, headers } = requestBody;

    if (!action) {
      throw new Error('Action parameter is required');
    }

    // Get user's Google OAuth token
    const { data: tokenRecord, error: tokenError } = await supabaseClient
      .from('user_google_tokens')
      .select('access_token, expires_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (tokenError || !tokenRecord || !tokenRecord.access_token) {
      throw new Error('No Google Sheets access token found. Please reconnect your Google account.');
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    if (now >= expiresAt) {
      throw new Error('Google Sheets access token has expired. Please reconnect your Google account.');
    }

    const googleToken = tokenRecord.access_token;

    // Handle different actions
    let result;
    switch (action) {
      case 'list':
        result = await listUserSheets(googleToken);
        break;

      case 'metadata':
        if (!sheet_id) {
          throw new Error('sheet_id is required for metadata action');
        }
        result = await getSheetMetadata(googleToken, sheet_id);
        break;

      case 'read':
        if (!sheet_id) {
          throw new Error('sheet_id is required for read action');
        }
        result = await readSheetData(googleToken, sheet_id, range);
        break;

      case 'write':
        if (!sheet_id || !data) {
          throw new Error('sheet_id and data are required for write action');
        }
        result = await writeSheetData(googleToken, sheet_id, range || 'A1', data);
        break;

      case 'create':
        if (!title) {
          throw new Error('title is required for create action');
        }
        result = await createNewSheet(googleToken, title, headers);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in google-sheets-api:', error);

    // Handle Google API specific errors
    if (error.message.includes('403')) {
      return new Response(
        JSON.stringify({
          error: 'Permission denied. Please ensure the sheet is accessible and you have the correct permissions.',
          code: 'PERMISSION_DENIED'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (error.message.includes('404')) {
      return new Response(
        JSON.stringify({
          error: 'Sheet not found. Please check the sheet ID.',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (error.message.includes('429')) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMITED'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// List all accessible spreadsheets for the user
async function listUserSheets(token: string) {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id,name,createdTime,modifiedTime,webViewLink)',
      pageSize: '100',
      orderBy: 'modifiedTime desc'
    }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Drive API error:', errorText);
    throw new Error(`Failed to list sheets: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
}

// Get metadata about a specific sheet
async function getSheetMetadata(token: string, sheetId: string) {
  const response = await fetch(
    `${SHEETS_API_BASE}/${sheetId}?fields=sheets(properties),properties`,
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

// Read data from a sheet range
async function readSheetData(token: string, sheetId: string, range: string = 'A1:Z1000') {
  const response = await fetch(
    `${SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(range)}`,
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
    throw new Error(`Failed to read sheet data: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    range: data.range,
    majorDimension: data.majorDimension,
    values: data.values || []
  };
}

// Write data to a sheet range
async function writeSheetData(token: string, sheetId: string, range: string, data: any[][]) {
  const response = await fetch(
    `${SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: data
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error:', errorText);
    throw new Error(`Failed to write sheet data: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Create a new spreadsheet
async function createNewSheet(token: string, title: string, headers?: string[]) {
  const createBody: any = {
    properties: {
      title
    }
  };

  // Add headers as the first row if provided
  if (headers && headers.length > 0) {
    createBody.sheets = [{
      data: [{
        rowData: [{
          values: headers.map(header => ({
            userEnteredValue: { stringValue: header },
            userEnteredFormat: { textFormat: { bold: true } }
          }))
        }]
      }]
    }];
  }

  const response = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error:', errorText);
    throw new Error(`Failed to create sheet: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}