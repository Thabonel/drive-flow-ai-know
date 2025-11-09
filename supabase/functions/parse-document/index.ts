import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { basename } from "https://deno.land/std@0.168.0/path/mod.ts"
import { getCorsHeaders } from '../_shared/cors.ts';

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

serve(async (req) => {
  // Get CORS headers with origin validation
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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

    // Sanitize fileName to prevent path traversal attacks
    // Extract only the basename and remove any path components
    const sanitizedFileName = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

    // Validate sanitized filename
    if (!sanitizedFileName || sanitizedFileName.length > 255) {
      throw new Error('Invalid file name');
    }

    console.log(`Processing file: ${sanitizedFileName} (original: ${fileName}), type: ${mimeType}`);

    // Convert base64 back to binary data
    const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    // Create a temporary file for processing using sanitized filename
    const tempFileName = `/tmp/${sanitizedFileName}`;
    await Deno.writeFile(tempFileName, binaryData);

    let result: DocumentParseResponse;

    try {
      // Import the document parsing function dynamically based on file type
      const { parseDocument } = await import('./documentProcessor.ts');
      result = await parseDocument(tempFileName, mimeType, fileName);
    } catch (parseError) {
      console.error('Parsing error:', parseError);
      
      // Fallback processing for unsupported formats
      result = {
        content: `File: ${fileName}\nType: ${mimeType}\nSize: ${binaryData.length} bytes\n\nContent extraction not available for this file type.`,
        title: fileName.replace(/\.[^/.]+$/, ''),
        metadata: {
          originalName: fileName,
          mimeType,
          size: binaryData.length,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
        }
      };
    }

    // Clean up temporary file
    try {
      await Deno.remove(tempFileName);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError);
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