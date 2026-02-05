/**
 * Search Memories Edge Function
 *
 * Provides hybrid search (vector + full-text) across semantic memories.
 * Used by AI orchestrator to retrieve relevant context for responses.
 *
 * Supports:
 * - Vector similarity search using pgvector
 * - Full-text search fallback
 * - Recency and importance boosting
 * - Filtering by memory type and source
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface SearchRequest {
  query: string;
  memory_types?: string[];
  source_types?: string[];
  limit?: number;
  similarity_threshold?: number;
  include_goals?: boolean;
  include_contacts?: boolean;
  include_profile?: boolean;
  recency_boost?: boolean;
  importance_boost?: boolean;
}

interface MemoryResult {
  id: string;
  memory_type: string;
  source_type: string;
  content: string;
  importance_score: number;
  similarity: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface SearchResponse {
  memories: MemoryResult[];
  goals?: Array<{
    title: string;
    description: string | null;
    priority: number;
    progress: number;
    target_date: string | null;
  }>;
  contacts?: Array<{
    name: string;
    relationship: string | null;
    notes: string | null;
  }>;
  profile?: {
    communication_style: Record<string, unknown>;
    response_preferences: Record<string, unknown>;
    boundaries: Record<string, unknown>;
  };
  total_found: number;
}

/**
 * Generate embedding for query text
 */
async function generateQueryEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI embedding error:', error);
    throw new Error(`Query embedding failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Apply recency and importance boosting to similarity scores
 */
function applyBoosts(
  memories: MemoryResult[],
  recencyBoost: boolean,
  importanceBoost: boolean
): MemoryResult[] {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  return memories.map(memory => {
    let adjustedSimilarity = memory.similarity;

    // Recency boost: memories from last 7 days get up to +0.1 boost
    if (recencyBoost) {
      const createdAt = new Date(memory.created_at).getTime();
      const daysAgo = (now - createdAt) / dayInMs;
      if (daysAgo <= 7) {
        const recencyFactor = 1 - (daysAgo / 7); // 1.0 for today, 0 for 7 days ago
        adjustedSimilarity += 0.1 * recencyFactor;
      }
    }

    // Importance boost: high importance memories get up to +0.05 boost
    if (importanceBoost) {
      const importanceFactor = (memory.importance_score - 5) / 5; // -1 to +1
      adjustedSimilarity += 0.05 * importanceFactor;
    }

    return {
      ...memory,
      similarity: Math.min(adjustedSimilarity, 1.0), // Cap at 1.0
    };
  }).sort((a, b) => b.similarity - a.similarity);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SearchRequest = await req.json();

    if (!body.query || typeof body.query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'query field is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const limit = Math.min(body.limit || 10, 50);
    const similarityThreshold = body.similarity_threshold || 0.6;

    console.log(`Searching memories for user ${user.id}, query: "${body.query.substring(0, 50)}..."`);

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(body.query);

    // Use service role client for database queries
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Search using the database function
    const { data: memories, error: searchError } = await supabaseService.rpc(
      'search_semantic_memories',
      {
        p_user_id: user.id,
        p_query_embedding: queryEmbedding,
        p_memory_types: body.memory_types || null,
        p_limit: limit,
        p_similarity_threshold: similarityThreshold,
      }
    );

    if (searchError) {
      console.error('Memory search error:', searchError.message);
      throw new Error(`Memory search failed: ${searchError.message}`);
    }

    // Apply boosts if requested
    let processedMemories = memories || [];
    if (body.recency_boost || body.importance_boost) {
      processedMemories = applyBoosts(
        processedMemories,
        body.recency_boost ?? true,
        body.importance_boost ?? true
      );
    }

    // Update access counts for returned memories
    if (processedMemories.length > 0) {
      const memoryIds = processedMemories.map((m: MemoryResult) => m.id);
      await supabaseService
        .from('semantic_memories')
        .update({
          access_count: supabaseService.sql`access_count + 1`,
          last_accessed_at: new Date().toISOString(),
        })
        .in('id', memoryIds);
    }

    const response: SearchResponse = {
      memories: processedMemories,
      total_found: processedMemories.length,
    };

    // Optionally include goals
    if (body.include_goals) {
      const { data: goals } = await supabaseService
        .from('user_goals')
        .select('title, description, priority, progress_percentage, target_date')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(5);

      response.goals = goals?.map(g => ({
        title: g.title,
        description: g.description,
        priority: g.priority,
        progress: g.progress_percentage,
        target_date: g.target_date,
      })) || [];
    }

    // Optionally include contacts
    if (body.include_contacts) {
      const { data: contacts } = await supabaseService
        .from('user_contacts')
        .select('name, relationship, notes')
        .eq('user_id', user.id)
        .order('mention_count', { ascending: false })
        .limit(5);

      response.contacts = contacts || [];
    }

    // Optionally include profile
    if (body.include_profile) {
      const { data: profile } = await supabaseService
        .from('user_learning_profile')
        .select('communication_style, response_preferences, boundaries')
        .eq('user_id', user.id)
        .single();

      response.profile = profile || undefined;
    }

    // Log the access for audit
    await supabaseService.rpc('log_audit_event', {
      p_user_id: user.id,
      p_action_type: 'memory_access',
      p_description: `Searched memories with query: "${body.query.substring(0, 100)}"`,
      p_source_channel: 'api',
      p_metadata: {
        query_length: body.query.length,
        results_count: processedMemories.length,
        filters: {
          memory_types: body.memory_types,
          source_types: body.source_types,
        },
      },
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Search memories error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
