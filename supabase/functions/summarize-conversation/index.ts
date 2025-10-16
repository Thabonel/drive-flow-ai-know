import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

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

    // Call Lovable AI to generate summary
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an executive assistant analyzing a conversation to create a comprehensive summary. 
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
}`
          },
          {
            role: 'user',
            content: `Please analyze this conversation:\n\n${conversationText}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      throw new Error(`AI analysis failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

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
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
