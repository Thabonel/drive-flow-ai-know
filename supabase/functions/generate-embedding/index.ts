/**
 * Generate Embedding Edge Function
 *
 * Generates vector embeddings for text content using OpenAI's text-embedding-3-small model.
 * Used by the semantic memory system for similarity search.
 *
 * Endpoints:
 * - POST /generate-embedding: Generate embedding for a single text
 * - POST /generate-embedding?batch=true: Generate embeddings for multiple texts
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenAI API configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

interface EmbeddingRequest {
  text: string;
  store_as_memory?: boolean;
  memory_type?: string;
  source_type?: string;
  importance_score?: number;
  metadata?: Record<string, unknown>;
}

interface BatchEmbeddingRequest {
  texts: string[];
}

interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Truncate very long texts (OpenAI has a token limit)
  const maxChars = 8000; // Approximate, leaves room for tokenization overhead
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: truncatedText,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI embedding error:', error);
    throw new Error(`Embedding generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate batch embeddings (more efficient for multiple texts)
 */
async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Truncate each text
  const maxChars = 8000;
  const truncatedTexts = texts.map(t => t.length > maxChars ? t.substring(0, maxChars) : t);

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: truncatedTexts,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI batch embedding error:', error);
    throw new Error(`Batch embedding generation failed: ${response.status}`);
  }

  const data = await response.json();
  // OpenAI returns embeddings in the same order as input
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const isBatch = url.searchParams.get('batch') === 'true';

    // Verify authorization for authenticated requests
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError.message);
      }
      userId = user?.id ?? null;
    }

    if (isBatch) {
      // Batch embedding request
      const body: BatchEmbeddingRequest = await req.json();

      if (!body.texts || !Array.isArray(body.texts) || body.texts.length === 0) {
        return new Response(
          JSON.stringify({ error: 'texts array is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Limit batch size
      if (body.texts.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Maximum batch size is 100 texts' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Generating batch embeddings for ${body.texts.length} texts`);
      const embeddings = await generateBatchEmbeddings(body.texts);

      return new Response(
        JSON.stringify({
          embeddings,
          count: embeddings.length,
          model: EMBEDDING_MODEL,
          dimension: EMBEDDING_DIMENSION,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Single embedding request
      const body: EmbeddingRequest = await req.json();

      if (!body.text || typeof body.text !== 'string') {
        return new Response(
          JSON.stringify({ error: 'text field is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Generating embedding for text (${body.text.length} chars)`);
      const embedding = await generateEmbedding(body.text);

      // Optionally store as memory
      if (body.store_as_memory && userId && body.memory_type && body.source_type) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: memory, error: memoryError } = await supabase
          .from('semantic_memories')
          .insert({
            user_id: userId,
            memory_type: body.memory_type,
            source_type: body.source_type,
            content: body.text,
            embedding: embedding,
            importance_score: body.importance_score || 3,
            metadata: body.metadata || {},
          })
          .select('id')
          .single();

        if (memoryError) {
          console.error('Failed to store memory:', memoryError.message);
        } else {
          console.log('Memory stored with ID:', memory.id);
        }

        return new Response(
          JSON.stringify({
            embedding,
            model: EMBEDDING_MODEL,
            dimension: EMBEDDING_DIMENSION,
            stored_memory_id: memory?.id || null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          embedding,
          model: EMBEDDING_MODEL,
          dimension: EMBEDDING_DIMENSION,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Embedding function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
