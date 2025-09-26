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

    console.log(`Processing file: ${fileName}, type: ${mimeType}`);

    // Convert base64 back to binary data
    const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
    
    // Create a temporary file for processing
    const tempFileName = `/tmp/${fileName}`;
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