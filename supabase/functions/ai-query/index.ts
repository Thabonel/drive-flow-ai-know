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

    const { query, user_id, knowledge_base_id } = await req.json();

    if (!query || !user_id) {
      throw new Error('Query and user_id are required');
    }

    let contextDocuments = [];
    let contextText = '';

    if (knowledge_base_id) {
      // Get specific knowledge base content
      const { data: knowledgeBase, error: kbError } = await supabaseClient
        .from('knowledge_bases')
        .select('*')
        .eq('id', knowledge_base_id)
        .eq('user_id', user_id)
        .single();

      if (kbError) {
        throw new Error(`Knowledge base not found: ${kbError.message}`);
      }

      // Get documents from the knowledge base
      if (knowledgeBase.source_document_ids && knowledgeBase.source_document_ids.length > 0) {
        const { data: documents, error: docsError } = await supabaseClient
          .from('knowledge_documents')
          .select('title, content, ai_summary, tags')
          .in('id', knowledgeBase.source_document_ids)
          .eq('user_id', user_id);

        if (!docsError && documents) {
          contextDocuments = documents;
        }
      }

      // Use AI-generated content from knowledge base if available
      if (knowledgeBase.ai_generated_content) {
        contextText = knowledgeBase.ai_generated_content;
      }
    } else {
      // Search all user's documents with intelligent filtering based on query
      let query_builder = supabaseClient
        .from('knowledge_documents')
        .select('title, content, ai_summary, tags')
        .eq('user_id', user_id);

      // If query mentions specific keywords, filter for relevant documents first
      const queryLower = query.toLowerCase();
      const isMarketingQuery = queryLower.includes('marketing') || queryLower.includes('market') || queryLower.includes('campaign') || queryLower.includes('brand') || queryLower.includes('promotion');
      const isTrelloQuery = queryLower.includes('trello') || queryLower.includes('json');
      
      if (isMarketingQuery) {
        // First try to get marketing-specific documents
        const { data: marketingDocs, error: marketingError } = await query_builder
          .or('title.ilike.%marketing%,content.ilike.%marketing%,tags.cs.["marketing"]')
          .limit(15);
        
        if (!marketingError && marketingDocs && marketingDocs.length > 0) {
          contextDocuments = marketingDocs;
        }
      }
      
      if (isTrelloQuery) {
        // Look for Trello/JSON documents
        const { data: trelloDocs, error: trelloError } = await query_builder
          .or('title.ilike.%trello%,title.ilike.%json%,file_type.eq.json')
          .limit(10);
        
        if (!trelloError && trelloDocs) {
          contextDocuments = [...contextDocuments, ...trelloDocs];
        }
      }
      
      // If no specific documents found or query is general, get recent documents
      if (contextDocuments.length === 0) {
        const { data: documents, error: docsError } = await query_builder
          .order('updated_at', { ascending: false })
          .limit(20);

        if (!docsError && documents) {
          contextDocuments = documents;
        }
      }
    }

    // Prepare context for AI
    let documentContext = '';
    if (contextDocuments.length > 0) {
      documentContext = contextDocuments.map(doc => {
        const summary = doc.ai_summary || doc.content?.substring(0, 500) || '';
        return `Title: ${doc.title}\nSummary: ${summary}\nTags: ${doc.tags?.join(', ') || 'None'}\n---`;
      }).join('\n');
    }

    if (contextText) {
      documentContext += `\n\nKnowledge Base Content:\n${contextText}`;
    }

    if (!documentContext) {
      return new Response(
        JSON.stringify({
          response: "I don't have any documents to analyze yet. Please sync some documents from Google Drive first, or create some knowledge documents."
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate AI response
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
            content: `You are an AI assistant that helps analyze and answer questions about the user's knowledge documents. 
            You have access to their document summaries, content, and knowledge bases.
            
            Provide helpful, specific answers based on the available context.
            If you can't find relevant information in the provided documents, say so clearly.
            Be concise but comprehensive in your responses.`
          },
          {
            role: 'user',
            content: `Context from my documents:\n${documentContext}\n\nQuestion: ${query}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    const aiResponse = await response.json();
    
    if (!aiResponse.choices || !aiResponse.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }

    const aiAnswer = aiResponse.choices[0].message.content;

    // Save query to history
    try {
      await supabaseClient
        .from('ai_query_history')
        .insert({
          user_id,
          query_text: query,
          response_text: aiAnswer,
          knowledge_base_id: knowledge_base_id || null,
          context_documents_count: contextDocuments.length
        });
    } catch (historyError) {
      console.error('Failed to save query history:', historyError);
      // Don't fail the main request if history saving fails
    }

    return new Response(
      JSON.stringify({
        response: aiAnswer,
        context_documents_count: contextDocuments.length,
        knowledge_base_used: !!knowledge_base_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-query function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "Sorry, I encountered an error processing your query. Please try again."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});