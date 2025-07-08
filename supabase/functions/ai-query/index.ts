import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

async function openAICompletion(prompt: string, context: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: context },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function openRouterCompletion(prompt: string, context: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: context },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function localCompletion(prompt: string, context: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3',
      prompt: `${context}\n${prompt}`,
      stream: false,
    }),
  });
  const data = await response.json();
  return data.response ?? '';
}

export async function getLLMResponse(prompt: string, context: string, providerOverride?: string) {
  const providerEnv = providerOverride || Deno.env.get('MODEL_PROVIDER');
  const useOpenRouter = Deno.env.get('USE_OPENROUTER') === 'true';
  const useLocalLLM = Deno.env.get('USE_LOCAL_LLM') === 'true';

  const provider = providerEnv || (useOpenRouter ? 'openrouter' : useLocalLLM ? 'ollama' : 'openai');

  switch (provider) {
    case 'openrouter':
      return await openRouterCompletion(prompt, context);
    case 'ollama':
    case 'local':
      return await localCompletion(prompt, context);
    default:
      return await openAICompletion(prompt, context);
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
    console.log('AI Query function called');
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Create service role client for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    console.log('User authentication result:', { user: !!user, error: userError?.message });
    
    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    const user_id = user.id;
    console.log('Authenticated user ID:', user_id);

    const { data: settings } = await supabaseService
      .from('user_settings')
      .select('model_preference')
      .eq('user_id', user_id)
      .maybeSingle();
    const providerOverride = settings?.model_preference;

    const { query, knowledge_base_id } = await req.json();
    console.log('Query received:', query);
    console.log('Knowledge base ID:', knowledge_base_id);

    if (!query) {
      throw new Error('Query is required');
    }

    let contextDocuments = [];
    let contextText = '';

    if (knowledge_base_id) {
      console.log('Searching for specific knowledge base:', knowledge_base_id);
      
      // Get specific knowledge base content
      const { data: knowledgeBase, error: kbError } = await supabaseService
        .from('knowledge_bases')
        .select('*')
        .eq('id', knowledge_base_id)
        .eq('user_id', user_id)
        .single();

      console.log('Knowledge base query result:', { found: !!knowledgeBase, error: kbError?.message });

      if (kbError) {
        throw new Error(`Knowledge base not found: ${kbError.message}`);
      }

      // Get documents from the knowledge base  
      if (knowledgeBase.source_document_ids && knowledgeBase.source_document_ids.length > 0) {
        console.log('Fetching documents from knowledge base, count:', knowledgeBase.source_document_ids.length);
        
        const { data: documents, error: docsError } = await supabaseService
          .from('knowledge_documents')
          .select('title, content, ai_summary, tags, file_type')
          .in('id', knowledgeBase.source_document_ids)
          .eq('user_id', user_id);

        console.log('Knowledge base documents result:', { found: documents?.length || 0, error: docsError?.message });

        if (!docsError && documents) {
          contextDocuments = documents;
        }
      }

      // Use AI-generated content from knowledge base if available
      if (knowledgeBase.ai_generated_content) {
        contextText = knowledgeBase.ai_generated_content;
        console.log('Using AI-generated content from knowledge base');
      }
    } else {
      console.log('Searching all user documents');
      
      // First, get total document count for this user
      const { count: totalDocs, error: countError } = await supabaseService
        .from('knowledge_documents')
        .select('id', { count: 'exact' })
        .eq('user_id', user_id);
        
      console.log('Total documents for user:', totalDocs, 'Count error:', countError?.message);

      // Search all user's documents with more robust logic
      const queryLower = query.toLowerCase();
      console.log('Query keywords:', queryLower);
      
      // Check for marketing-related terms
      const isMarketingQuery = queryLower.includes('marketing') || queryLower.includes('market') || 
                             queryLower.includes('campaign') || queryLower.includes('brand') || 
                             queryLower.includes('promotion') || queryLower.includes('wheels') || 
                             queryLower.includes('wins');
      
      console.log('Is marketing query:', isMarketingQuery);
      
      if (isMarketingQuery) {
        console.log('Searching for marketing documents...');
        
        // Cast query for marketing documents with broader search
        const { data: marketingDocs, error: marketingError } = await supabaseService
          .from('knowledge_documents')
          .select('title, content, ai_summary, tags, file_type')
          .eq('user_id', user_id)
          .or('title.ilike.%marketing%,content.ilike.%marketing%,tags.cs.["marketing"],title.ilike.%wheels%,title.ilike.%wins%,file_type.eq.json')
          .limit(30);
        
        console.log('Marketing documents found:', marketingDocs?.length || 0, 'Error:', marketingError?.message);
        
        if (!marketingError && marketingDocs && marketingDocs.length > 0) {
          contextDocuments = marketingDocs;
        }
      }
      
      // If no marketing docs or general query, get recent documents
      if (contextDocuments.length === 0) {
        console.log('Getting recent documents as fallback...');
        
        const { data: documents, error: docsError } = await supabaseService
          .from('knowledge_documents')
          .select('title, content, ai_summary, tags, file_type')
          .eq('user_id', user_id)
          .order('updated_at', { ascending: false })
          .limit(30);

        console.log('Recent documents found:', documents?.length || 0, 'Error:', docsError?.message);

        if (!docsError && documents) {
          contextDocuments = documents;
        }
      }
    }

    console.log('Final context documents count:', contextDocuments.length);

    // Prepare context for AI
    let documentContext = '';
    if (contextDocuments.length > 0) {
      documentContext = contextDocuments.map((doc, index) => {
        // Use full content if no summary, but limit to reasonable size for AI
        const content = doc.ai_summary || doc.content?.substring(0, 3000) || 'No content available';
        console.log(`Document ${index + 1}: ${doc.title} - Content length: ${content.length}`);
        return `Title: ${doc.title}\nContent: ${content}\nTags: ${doc.tags?.join(', ') || 'None'}\nFile Type: ${doc.file_type}\n---`;
      }).join('\n');
    }

    console.log('Final document context length:', documentContext.length);

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
    const systemMessage = `You are an AI assistant that helps analyze and answer questions about the user's knowledge documents.
    You have access to their document summaries, content, and knowledge bases.

    Provide helpful, specific answers based on the available context.
    If you can't find relevant information in the provided documents, say so clearly.
    Be concise but comprehensive in your responses.`;

    const userPrompt = `Context from my documents:\n${documentContext}\n\nQuestion: ${query}`;

    const aiAnswer = await getLLMResponse(userPrompt, systemMessage, providerOverride);

    // Save query to history
    try {
      console.log('Saving query to history...');
      
      await supabaseService
        .from('ai_query_history')
        .insert({
          user_id,
          query_text: query,
          response_text: aiAnswer,
          knowledge_base_id: knowledge_base_id || null,
          context_documents_count: contextDocuments.length
        });
        
      console.log('Query history saved successfully');
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