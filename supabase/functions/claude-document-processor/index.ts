import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

async function processDocumentWithClaude(documentContent: string, documentType: string, fileName: string): Promise<{
  title: string;
  category: string;
  summary: string;
  insights: any;
  extractedData?: any;
}> {
  const prompt = `You are Claude MVP, an advanced document processing AI. Analyze this ${documentType} document and extract:

1. A concise, descriptive title (max 60 characters)
2. A specific category (Marketing, Technical, Financial, Legal, HR, Operations, Planning, Research, etc.)
3. A comprehensive summary (2-3 paragraphs)
4. Key insights and actionable items
5. For PDFs: Extract tables, structured data, key figures
6. For spreadsheets: Identify patterns, calculations, important metrics

Document Name: ${fileName}
Document Content: ${documentContent.substring(0, 8000)}...

Respond in this exact JSON format:
{
  "title": "Generated Title",
  "category": "Document Category", 
  "summary": "Comprehensive summary of the document",
  "insights": {
    "keyPoints": ["point 1", "point 2", "point 3"],
    "actionItems": ["action 1", "action 2"],
    "metrics": ["metric 1", "metric 2"],
    "recommendations": ["rec 1", "rec 2"]
  },
  "extractedData": {
    "tables": [],
    "figures": {},
    "calculations": {},
    "patterns": []
  }
}`;

  try {
    if (!anthropicApiKey) {
      throw new Error('Claude API key not available');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.content[0].text);
    
    return result;
  } catch (error) {
    console.error('Error processing document with Claude:', error);
    
    // Fallback processing
    const category = documentType.toLowerCase().includes('pdf') ? 'Document Analysis' :
                    documentType.toLowerCase().includes('sheet') ? 'Financial Analysis' :
                    documentType.toLowerCase().includes('doc') ? 'Documentation' : 'General';
    
    return {
      title: `${fileName.substring(0, 50)}${fileName.length > 50 ? '...' : ''}`,
      category,
      summary: `This ${documentType} document has been uploaded and processed. Content analysis was limited due to processing constraints.`,
      insights: {
        keyPoints: ['Document uploaded successfully'],
        actionItems: ['Review document content'],
        metrics: [],
        recommendations: ['Consider manual review for detailed analysis']
      },
      extractedData: {
        tables: [],
        figures: {},
        calculations: {},
        patterns: []
      }
    };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Claude Document Processor function called');
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    const { documentId } = await req.json();
    
    if (!documentId) {
      throw new Error('Document ID is required');
    }

    // Get the document to process
    const { data: document, error: docError } = await supabaseService
      .from('knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message || 'Not found'}`);
    }

    if (!document.content) {
      throw new Error('Document has no content to process');
    }

    console.log('Processing document with Claude MVP:', document.title);
    
    // Process document with Claude
    const analysis = await processDocumentWithClaude(
      document.content, 
      document.file_type || 'document',
      document.title
    );
    
    console.log('Claude analysis completed:', analysis.title);

    // Update document with Claude's analysis
    const { error: updateError } = await supabaseService
      .from('knowledge_documents')
      .update({
        title: analysis.title,
        category: analysis.category,
        ai_summary: analysis.summary,
        ai_insights: analysis.insights,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    console.log('Document updated successfully with Claude analysis');

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          title: analysis.title,
          category: analysis.category,
          summary: analysis.summary,
          insights: analysis.insights,
          extractedData: analysis.extractedData
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in claude-document-processor function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});