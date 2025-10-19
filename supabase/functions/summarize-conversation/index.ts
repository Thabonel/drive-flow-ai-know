import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LLM provider functions
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

async function claudeCompletion(systemPrompt: string, userPrompt: string) {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not available');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Claude API error:', response.status, errorData);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

async function openRouterCompletion(systemPrompt: string, userPrompt: string) {
  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key not available');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenRouter API error:', response.status, errorData);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function getLLMResponse(systemPrompt: string, userPrompt: string) {
  // Try providers in order: Claude -> OpenRouter
  const providers = [
    { name: 'claude', fn: claudeCompletion, available: !!anthropicApiKey },
    { name: 'openrouter', fn: openRouterCompletion, available: !!openRouterApiKey },
  ];

  console.log('Available API keys:', {
    anthropic: !!anthropicApiKey,
    openrouter: !!openRouterApiKey,
  });

  let lastError: Error | null = null;

  for (const provider of providers) {
    if (!provider.available) {
      console.log(`${provider.name} not available, skipping`);
      continue;
    }

    try {
      console.log(`Trying ${provider.name} for summarization`);
      const result = await provider.fn(systemPrompt, userPrompt);
      console.log(`${provider.name} succeeded`);
      return result;
    } catch (error) {
      console.error(`${provider.name} failed:`, error);
      lastError = error as Error;
      // Continue to next provider
    }
  }

  console.error('All providers failed or unavailable');
  throw lastError || new Error('No AI providers available');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with user's auth token for getUser
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Create admin client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });

    const { conversationId } = await req.json();

    if (!conversationId) {
      throw new Error('conversationId is required');
    }

    console.log('Fetching conversation:', conversationId);

    // Fetch conversation and messages
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true });

    if (msgError) {
      throw new Error('Failed to fetch messages');
    }

    console.log(`Found ${messages?.length || 0} messages`);

    // Build conversation text for AI analysis
    const conversationText = messages
      ?.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n') || '';

    // Prepare prompts for AI analysis
    const systemPrompt = `You are an executive assistant analyzing a conversation to create a comprehensive summary.
Your task is to:
1. Generate a 2-3 paragraph executive summary highlighting the main purpose and outcomes
2. List 3-5 key topics discussed
3. Identify any action items or decisions made
4. Suggest 3-5 relevant tags for categorization

Format your response as JSON:
{
  "summary": "Executive summary text...",
  "keyTopics": ["topic1", "topic2", ...],
  "actionItems": ["action1", "action2", ...],
  "tags": ["tag1", "tag2", ...]
}`;

    const userPrompt = `Please analyze this conversation:\n\n${conversationText}`;

    // Call AI with provider fallback
    const aiContent = await getLLMResponse(systemPrompt, userPrompt);

    if (!aiContent) {
      throw new Error('No response from AI');
    }

    console.log('AI response received');

    // Parse AI response
    let analysisResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || 
                       aiContent.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      analysisResult = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Fallback to using the raw content as summary
      analysisResult = {
        summary: aiContent,
        keyTopics: [],
        actionItems: [],
        tags: ['general']
      };
    }

    // Build executive summary with structured format
    const executiveSummary = `## Summary
${analysisResult.summary}

## Key Topics
${analysisResult.keyTopics?.map((topic: string) => `- ${topic}`).join('\n') || 'No key topics identified'}

## Action Items
${analysisResult.actionItems?.length > 0 
  ? analysisResult.actionItems.map((item: string) => `- ${item}`).join('\n')
  : 'No specific action items identified'}`;

    // Update conversation with summary
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        executive_summary: executiveSummary,
        summary_generated_at: new Date().toISOString(),
        tags: analysisResult.tags || ['general'],
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update conversation');
    }

    // Store key insights as memories
    if (analysisResult.keyTopics?.length > 0) {
      const memoryContent = `Conversation from ${new Date().toLocaleDateString()}:\n\n` +
        `Summary: ${analysisResult.summary}\n\n` +
        `Key Topics: ${analysisResult.keyTopics.join(', ')}`;

      await supabase.from('agentic_memories').insert({
        user_id: user.id,
        agent: 'personal_assistant',
        memory_type: 'conversation_summary',
        content: memoryContent,
        metadata: {
          conversation_id: conversationId,
          tags: analysisResult.tags,
          timestamp: new Date().toISOString(),
        },
      });
    }

    console.log('Conversation summarized successfully');

    return new Response(
      JSON.stringify({
        success: true,
        summary: executiveSummary,
        tags: analysisResult.tags,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in summarize-conversation:', error);

    // Detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        details: error instanceof Error ? {
          name: error.name,
          message: error.message,
        } : null,
      }),
      {
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
