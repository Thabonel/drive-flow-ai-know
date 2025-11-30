import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CLAUDE_MODELS, OPENAI_MODELS, OPENROUTER_MODELS, LOCAL_MODELS } from '../_shared/models.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

async function anthropicCompletion(prompt: string, context: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODELS.PRIMARY,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nDocument Content:\n${context}`
        }
      ]
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

async function openAICompletion(prompt: string, context: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODELS.FAST,
      messages: [
        { role: 'system', content: context },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
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
      model: OPENROUTER_MODELS.FAST,
      messages: [
        { role: 'system', content: context },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
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
      model: LOCAL_MODELS.PRIMARY,
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

  const provider = providerEnv || (useOpenRouter ? 'openrouter' : useLocalLLM ? 'ollama' : 'anthropic');

  switch (provider) {
    case 'anthropic':
      return await anthropicCompletion(prompt, context);
    case 'openrouter':
      return await openRouterCompletion(prompt, context);
    case 'ollama':
    case 'local':
      return await localCompletion(prompt, context);
    case 'openai':
      return await openAICompletion(prompt, context);
    default:
      return await anthropicCompletion(prompt, context);
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
    const { document_id } = await req.json();

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

    // Load user model preference
    const { data: settings } = await supabaseClient
      .from('user_settings')
      .select('model_preference')
      .eq('user_id', user_id)
      .maybeSingle();

    const providerOverride = settings?.model_preference;

    const systemMessage = `You are an AI assistant that analyzes documents for a knowledge management system.
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
            }`;

    const userPrompt = `Title: ${document.title}\n\nContent: ${document.content}`;

    const aiResponseText = await getLLMResponse(userPrompt, systemMessage, providerOverride);
    const analysis = JSON.parse(aiResponseText);

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
      .eq('id', document_id)
      .eq('user_id', user_id);

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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
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

  // Get all documents in this category to generate comprehensive content
  const { data: categoryDocs } = await supabaseClient
    .from('knowledge_documents')
    .select('id, title, ai_summary, content, tags')
    .eq('user_id', userId)
    .eq('category', category)
    .not('ai_summary', 'is', null);

  // Generate comprehensive knowledge base content
  const allDocuments = categoryDocs || [];
  const documentSummaries = allDocuments.map((doc: any) => ({
    title: doc.title,
    summary: doc.ai_summary,
    tags: doc.tags || []
  }));

  const synthesizedContent = await generateKnowledgeBaseSynthesis(documentSummaries, category);

  if (existingKB) {
    // Update existing knowledge base
    const updatedSourceIds = [...new Set([...existingKB.source_document_ids || [], document.id])];
    
    await supabaseClient
      .from('knowledge_bases')
      .update({
        source_document_ids: updatedSourceIds,
        ai_generated_content: synthesizedContent,
        last_updated_from_source: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: {
          documents: updatedSourceIds,
          created_from: 'ai_analysis',
          last_synthesis: new Date().toISOString(),
          document_count: updatedSourceIds.length
        }
      })
      .eq('id', existingKB.id);
  } else {
    // Create new knowledge base
    await supabaseClient
      .from('knowledge_bases')
      .insert({
        user_id: userId,
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Knowledge Base`,
        description: `AI-synthesized knowledge base containing insights from ${allDocuments.length} ${category} documents`,
        type: category,
        source_document_ids: [document.id],
        ai_generated_content: synthesizedContent,
        content: {
          documents: [document.id],
          created_from: 'ai_analysis',
          last_synthesis: new Date().toISOString(),
          document_count: 1
        },
        last_updated_from_source: new Date().toISOString(),
      });
  }
}

async function generateKnowledgeBaseSynthesis(documentSummaries: any[], category: string): Promise<string> {
  if (documentSummaries.length === 0) {
    return `This ${category} knowledge base will be populated as documents are analyzed.`;
  }

  // Simple synthesis for now - in production, this would use AI
  const titles = documentSummaries.map(doc => doc.title).join(', ');
  const allTags = documentSummaries.flatMap(doc => doc.tags).filter((tag, index, arr) => arr.indexOf(tag) === index);
  
  return `
# ${category.charAt(0).toUpperCase() + category.slice(1)} Knowledge Base

This knowledge base synthesizes insights from ${documentSummaries.length} documents in the ${category} category.

## Document Overview
Documents included: ${titles}

## Key Topics
${allTags.map(tag => `- ${tag}`).join('\n')}

## Summary
This collection provides comprehensive coverage of ${category}-related content, drawing from multiple source documents to create a unified knowledge resource.

## Document Summaries
${documentSummaries.map(doc => `
### ${doc.title}
${doc.summary}
`).join('\n')}
  `.trim();
}