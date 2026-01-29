import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheets API base URL
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// Rate limiting configuration
const RATE_LIMITS = {
  REQUESTS_PER_100_SECONDS_PER_USER: 100,
  REQUESTS_PER_100_SECONDS_PER_PROJECT: 500,
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1000, // Start with 1 second
};

// Simple in-memory rate limiter (for production, use Redis or database)
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(userId: string): Promise<void> {
  const now = Date.now();
  const windowStart = Math.floor(now / (100 * 1000)) * (100 * 1000); // 100-second windows
  const resetTime = windowStart + (100 * 1000);

  const userKey = `${userId}_${windowStart}`;
  const userRate = userRequestCounts.get(userKey) || { count: 0, resetTime };

  if (userRate.count >= RATE_LIMITS.REQUESTS_PER_100_SECONDS_PER_USER) {
    const waitTime = Math.ceil((resetTime - now) / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before making more requests.`);
  }

  userRate.count++;
  userRate.resetTime = resetTime;
  userRequestCounts.set(userKey, userRate);

  // Clean up old entries
  if (Math.random() < 0.1) { // 10% chance to cleanup
    for (const [key, value] of userRequestCounts.entries()) {
      if (value.resetTime < now) {
        userRequestCounts.delete(key);
      }
    }
  }
}

async function makeGoogleApiRequest(
  url: string,
  options: RequestInit,
  retryCount: number = 0
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // Handle rate limit errors with exponential backoff
    if (response.status === 429) {
      if (retryCount >= RATE_LIMITS.MAX_RETRIES) {
        throw new Error('Google API rate limit exceeded. Please try again later.');
      }

      const delay = RATE_LIMITS.BASE_DELAY_MS * Math.pow(2, retryCount);
      console.log(`Rate limited by Google API. Retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return makeGoogleApiRequest(url, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < RATE_LIMITS.MAX_RETRIES &&
        (error.message.includes('network') || error.message.includes('timeout'))) {
      const delay = RATE_LIMITS.BASE_DELAY_MS * Math.pow(2, retryCount);
      console.log(`Network error, retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return makeGoogleApiRequest(url, options, retryCount + 1);
    }

    throw error;
  }
}

interface SheetsRequest {
  action: 'list' | 'read' | 'write' | 'create' | 'metadata';
  sheet_id?: string;
  range?: string;
  data?: any[][];
  title?: string;
  headers?: string[];
}

// Input validation functions
function validateSheetId(sheet_id: string): void {
  if (!sheet_id || typeof sheet_id !== 'string') {
    throw new Error('sheet_id must be a non-empty string');
  }

  // Google Sheets ID pattern: 44 characters long, alphanumeric + underscores/hyphens
  const sheetIdPattern = /^[a-zA-Z0-9_-]{44}$/;
  if (!sheetIdPattern.test(sheet_id)) {
    throw new Error('Invalid sheet_id format. Must be a valid Google Sheets ID.');
  }
}

function validateRange(range?: string): void {
  if (!range) return; // Range is optional

  if (typeof range !== 'string') {
    throw new Error('range must be a string');
  }

  // A1 notation pattern (e.g., A1, A1:E10, Sheet1!A1:E10)
  const rangePattern = /^([a-zA-Z0-9_\s]+!)?[A-Z]+[0-9]*(:([A-Z]+[0-9]*|[A-Z]+))?$/;
  if (!rangePattern.test(range)) {
    throw new Error('Invalid range format. Must use A1 notation (e.g., A1, A1:E10, Sheet1!A1:E10).');
  }

  // Check for potential injection patterns
  const dangerousPatterns = ['<script', 'javascript:', '=', '+', '-', '@'];
  const lowerRange = range.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (lowerRange.includes(pattern)) {
      throw new Error('Range contains potentially unsafe characters');
    }
  }
}

function validateWriteData(data: any[][]): void {
  if (!Array.isArray(data)) {
    throw new Error('data must be an array of arrays');
  }

  if (data.length === 0) {
    throw new Error('data cannot be empty');
  }

  if (data.length > 1000) {
    throw new Error('data cannot contain more than 1000 rows');
  }

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!Array.isArray(row)) {
      throw new Error(`Row ${rowIndex} must be an array`);
    }

    if (row.length > 1000) {
      throw new Error(`Row ${rowIndex} cannot contain more than 1000 columns`);
    }

    // Sanitize cell values to prevent formula injection
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex];
      if (typeof cell === 'string') {
        // Check for formula injection patterns
        const trimmedCell = cell.trim();
        if (trimmedCell.startsWith('=') || trimmedCell.startsWith('+') ||
            trimmedCell.startsWith('-') || trimmedCell.startsWith('@') ||
            trimmedCell.toLowerCase().includes('<script') ||
            trimmedCell.toLowerCase().includes('javascript:')) {
          throw new Error(`Cell at row ${rowIndex}, column ${colIndex} contains potentially unsafe content`);
        }

        // Check for excessively long strings
        if (cell.length > 50000) {
          throw new Error(`Cell at row ${rowIndex}, column ${colIndex} exceeds maximum length`);
        }
      }
    }
  }
}

function validateTitle(title: string): void {
  if (!title || typeof title !== 'string') {
    throw new Error('title must be a non-empty string');
  }

  if (title.length > 100) {
    throw new Error('title cannot exceed 100 characters');
  }

  // Check for potentially dangerous characters
  const dangerousPatterns = ['<script', 'javascript:', '\n', '\r'];
  const lowerTitle = title.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (lowerTitle.includes(pattern)) {
      throw new Error('title contains potentially unsafe characters');
    }
  }
}

function validateHeaders(headers?: string[]): void {
  if (!headers) return; // Headers are optional

  if (!Array.isArray(headers)) {
    throw new Error('headers must be an array');
  }

  if (headers.length > 1000) {
    throw new Error('headers cannot contain more than 1000 items');
  }

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (typeof header !== 'string') {
      throw new Error(`Header ${i} must be a string`);
    }

    if (header.length > 100) {
      throw new Error(`Header ${i} cannot exceed 100 characters`);
    }

    // Check for formula injection in headers
    const trimmedHeader = header.trim();
    if (trimmedHeader.startsWith('=') || trimmedHeader.startsWith('+') ||
        trimmedHeader.startsWith('-') || trimmedHeader.startsWith('@') ||
        trimmedHeader.toLowerCase().includes('<script') ||
        trimmedHeader.toLowerCase().includes('javascript:')) {
      throw new Error(`Header ${i} contains potentially unsafe content`);
    }
  }
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

    // Check rate limits
    await checkRateLimit(user_id);

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

    // Handle different actions with validation
    let result;
    switch (action) {
      case 'list':
        // No additional validation needed for list action
        result = await listUserSheets(googleToken);
        break;

      case 'metadata':
        if (!sheet_id) {
          throw new Error('sheet_id is required for metadata action');
        }
        validateSheetId(sheet_id);
        result = await getSheetMetadata(googleToken, sheet_id);
        break;

      case 'read':
        if (!sheet_id) {
          throw new Error('sheet_id is required for read action');
        }
        validateSheetId(sheet_id);
        validateRange(range);
        result = await readSheetData(googleToken, sheet_id, range);
        break;

      case 'write':
        if (!sheet_id || !data) {
          throw new Error('sheet_id and data are required for write action');
        }
        validateSheetId(sheet_id);
        validateRange(range);
        validateWriteData(data);
        result = await writeSheetData(googleToken, sheet_id, range || 'A1', data);
        break;

      case 'create':
        if (!title) {
          throw new Error('title is required for create action');
        }
        validateTitle(title);
        validateHeaders(headers);
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

    // Handle validation errors
    if (error.message.includes('Invalid') ||
        error.message.includes('must be') ||
        error.message.includes('required') ||
        error.message.includes('cannot exceed') ||
        error.message.includes('unsafe')) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: 'VALIDATION_ERROR'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle rate limit errors
    if (error.message.includes('Rate limit exceeded')) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: 'RATE_LIMITED'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
  const url = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: 'files(id,name,createdTime,modifiedTime,webViewLink)',
    pageSize: '100',
    orderBy: 'modifiedTime desc'
  });

  const response = await makeGoogleApiRequest(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

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