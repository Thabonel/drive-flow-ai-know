import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { document_id, user_id } = await req.json();

    // Get document from database
    const { data: document, error: docError } = await supabaseClient
      .from('knowledge_documents')
      .select('*')
      .eq('id', document_id)
      .eq('user_id', user_id)
      .single();

    if (docError) {
      throw new Error(`Document not found: ${docError.message}`);
    }

    // Generate AI summary and insights
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes documents for a knowledge management system. 
            Analyze the document and provide:
            1. A concise summary (2-3 sentences)
            2. Key insights and takeaways
            3. Suggested tags/categories
            4. Relationships to other content types
            
            Return your response as JSON with the following structure:
            {
              "summary": "Brief summary here",
              "insights": ["insight 1", "insight 2", "insight 3"],
              "suggested_tags": ["tag1", "tag2", "tag3"],
              "category": "prompts|marketing|specs|general",
              "content_type": "guide|strategy|reference|template",
              "key_concepts": ["concept1", "concept2"]
            }`
          },
          {
            role: 'user',
            content: `Title: ${document.title}\n\nContent: ${document.content}`
          }
        ],
        temperature: 0.3,
      }),
    });

    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);

    // Update document with AI analysis
    const { error: updateError } = await supabaseClient
      .from('knowledge_documents')
      .update({
        ai_summary: analysis.summary,
        ai_insights: {
          insights: analysis.insights,
          key_concepts: analysis.key_concepts,
          content_type: analysis.content_type,
          analysis_date: new Date().toISOString(),
        },
        category: analysis.category,
        tags: analysis.suggested_tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', document_id);

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    // Check if we should create or update knowledge bases
    await createOrUpdateKnowledgeBase(supabaseClient, user_id, analysis.category, document);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        document_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-document-analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function createOrUpdateKnowledgeBase(supabaseClient: any, userId: string, category: string, document: any) {
  // Find existing knowledge base for this category
  const { data: existingKB } = await supabaseClient
    .from('knowledge_bases')
    .select('*')
    .eq('user_id', userId)
    .eq('type', category)
    .eq('is_active', true)
    .single();

  if (existingKB) {
    // Update existing knowledge base
    const updatedSourceIds = [...new Set([...existingKB.source_document_ids, document.id])];
    
    await supabaseClient
      .from('knowledge_bases')
      .update({
        source_document_ids: updatedSourceIds,
        last_updated_from_source: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingKB.id);
  } else {
    // Create new knowledge base
    await supabaseClient
      .from('knowledge_bases')
      .insert({
        user_id: userId,
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Knowledge Base`,
        description: `Automatically generated knowledge base for ${category} documents`,
        type: category,
        source_document_ids: [document.id],
        content: {
          documents: [document.id],
          created_from: 'ai_analysis',
        },
        last_updated_from_source: new Date().toISOString(),
      });
  }
}