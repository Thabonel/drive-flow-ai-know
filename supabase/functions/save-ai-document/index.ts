import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

async function generateDocumentMetadata(content: string, query: string): Promise<{ title: string; category: string }> {
  const prompt = `Based on this research content and the original query, generate:
1. A concise, descriptive title (max 60 characters)
2. A single, specific category (examples: "Marketing Strategy", "Technical Analysis", "Market Research", "Planning", "Competitive Analysis", "Process Documentation", "Financial Analysis", "Product Development")

Original Query: "${query}"

Research Content: "${content.substring(0, 2000)}..."

Respond in this exact JSON format:
{
  "title": "Your Generated Title",
  "category": "Your Generated Category"
}`;

  try {
    // Use Claude exclusively
    if (anthropicApiKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 150,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const result = JSON.parse(data.content[0].text);
        return result;
      }
    }

    throw new Error('Claude API key not available');
  } catch (error) {
    console.error('Error generating metadata:', error);
    // Fallback to basic generation
    const category = query.toLowerCase().includes('marketing') ? 'Marketing Research' : 
                    query.toLowerCase().includes('technical') ? 'Technical Analysis' :
                    query.toLowerCase().includes('plan') ? 'Planning' : 'Research';
    
    return {
      title: `AI Research: ${query.substring(0, 40)}${query.length > 40 ? '...' : ''}`,
      category
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
    console.log('Save AI Document function called');
    
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

    const { query, response } = await req.json();
    
    if (!query || !response) {
      throw new Error('Query and response are required');
    }

    console.log('Generating document metadata...');
    const metadata = await generateDocumentMetadata(response, query);
    console.log('Generated metadata:', metadata);

    // Save the document
    const { data: document, error: docError } = await supabaseService
      .from('knowledge_documents')
      .insert({
        user_id: user.id,
        google_file_id: `ai_generated_${Date.now()}`,
        title: metadata.title,
        content: response,
        file_type: 'ai_research',
        mime_type: 'text/markdown',
        category: metadata.category,
        ai_summary: `AI-generated research document based on the query: "${query}". This document contains comprehensive analysis and insights.`,
        tags: ['ai-generated', 'research', metadata.category.toLowerCase().replace(' ', '-')],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (docError) {
      console.error('Error saving document:', docError);
      throw new Error(`Failed to save document: ${docError.message}`);
    }

    console.log('Document saved successfully:', document.id);

    // Try to create or update knowledge base for this category
    try {
      const { data: existingBase } = await supabaseService
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', metadata.category)
        .eq('is_active', true)
        .maybeSingle();

      if (existingBase) {
        // Update existing knowledge base
        const updatedSourceIds = [...(existingBase.source_document_ids || []), document.id];
        
        await supabaseService
          .from('knowledge_bases')
          .update({
            source_document_ids: updatedSourceIds,
            updated_at: new Date().toISOString(),
            last_updated_from_source: new Date().toISOString()
          })
          .eq('id', existingBase.id);
          
        console.log('Updated existing knowledge base:', existingBase.id);
      } else {
        // Create new knowledge base
        await supabaseService
          .from('knowledge_bases')
          .insert({
            user_id: user.id,
            title: `${metadata.category} Knowledge Base`,
            description: `AI-curated collection of ${metadata.category.toLowerCase()} documents and insights`,
            type: metadata.category,
            content: { summary: `Collection focused on ${metadata.category.toLowerCase()} topics` },
            source_document_ids: [document.id],
            ai_generated_content: `This knowledge base contains curated information about ${metadata.category.toLowerCase()}.`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_updated_from_source: new Date().toISOString()
          });
          
        console.log('Created new knowledge base for category:', metadata.category);
      }
    } catch (kbError) {
      console.error('Error updating knowledge base:', kbError);
      // Don't fail the main request if KB update fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: {
          id: document.id,
          title: document.title,
          category: document.category
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in save-ai-document function:', error);
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