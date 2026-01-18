import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DocumentParseRequest {
  fileName: string;
  mimeType: string;
  fileData: string; // base64 encoded file data
}

interface DocumentParseResponse {
  content: string;
  title?: string;
  pageCount?: number;
  hasImages?: boolean;
  extractedImages?: string[];
  metadata?: Record<string, any>;
}

// Sanitize filename to prevent path traversal attacks
function sanitizeFileName(fileName: string): string {
  // Remove any path components - only keep the base filename
  const baseName = fileName.split('/').pop()?.split('\\').pop() || 'document';

  // Remove any remaining dangerous characters
  const sanitized = baseName
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove invalid filename characters
    .trim();

  // Ensure we have a valid filename
  return sanitized || 'document';
}

// Generate a secure random temp filename
function generateTempFilePath(originalFileName: string): string {
  const sanitized = sanitizeFileName(originalFileName);
  const extension = sanitized.includes('.') ? sanitized.split('.').pop() : '';
  const randomId = crypto.randomUUID();
  return `/tmp/parse_${randomId}${extension ? '.' + extension : ''}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Document parsing request received');
    
    const { fileName, mimeType, fileData }: DocumentParseRequest = await req.json();
    
    if (!fileName || !fileData) {
      throw new Error('Missing required fields: fileName and fileData');
    }

    // Sanitize filename to prevent path traversal
    const safeFileName = sanitizeFileName(fileName);
    console.log(`Processing file: ${safeFileName}, type: ${mimeType}`);

    // Convert base64 back to binary data
    const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    // Create a secure temporary file path with random name
    const tempFilePath = generateTempFilePath(fileName);

    let result: DocumentParseResponse;

    try {
      // Write file to secure temp location
      await Deno.writeFile(tempFilePath, binaryData);

      try {
        // Import the document parsing function dynamically based on file type
        const { parseDocument } = await import('./documentProcessor.ts');
        result = await parseDocument(tempFilePath, mimeType, safeFileName);
      } catch (parseError) {
        console.error('Parsing error:', parseError);

        // Fallback processing for unsupported formats
        result = {
          content: `File: ${safeFileName}\nType: ${mimeType}\nSize: ${binaryData.length} bytes\n\nContent extraction not available for this file type.`,
          title: safeFileName.replace(/\.[^/.]+$/, ''),
          metadata: {
            originalName: safeFileName,
            mimeType,
            size: binaryData.length,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
          }
        };
      }
    } finally {
      // Always clean up temporary file
      try {
        await Deno.remove(tempFilePath);
      } catch {
        // Ignore cleanup errors - file may not exist if write failed
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Document parsing error:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      content: ''
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});