import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CLAUDE_MODELS } from '../_shared/models.ts';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type ConversionType = 'transcript' | 'ai_summary' | 'both';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  status: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  executive_summary?: string;
  tags?: string[];
  user_id: string;
}

/**
 * Format messages into a readable transcript
 */
function formatTranscript(conversation: Conversation, messages: Message[]): string {
  const lines: string[] = [];

  lines.push(`Conversation: ${conversation.title || 'Untitled Conversation'}`);
  lines.push(`Date: ${new Date(conversation.created_at).toLocaleDateString()}`);
  lines.push(`Messages: ${messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const message of messages) {
    const role = message.role === 'user' ? 'User' : 'Assistant';
    const timestamp = new Date(message.created_at).toLocaleString();
    lines.push(`[${role}] (${timestamp})`);
    lines.push(message.content);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Call Claude to generate an intelligent document from the conversation
 */
async function generateAIDocument(
  conversation: Conversation,
  messages: Message[]
): Promise<{ title: string; content: string }> {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const systemPrompt = `You are a document creation assistant. Analyze the following conversation and create a well-structured standalone document.

Your task:
1. Identify the main topic/purpose of the conversation
2. Auto-detect the best document format based on content:
   - Meeting notes: If it discusses plans, decisions, or action items
   - How-to guide: If it explains how to do something
   - Reference document: If it contains factual information or specifications
   - Q&A summary: If it's primarily question and answer format
   - Analysis/Report: If it contains analysis or conclusions
3. Generate a clear, descriptive title (not just the conversation title)
4. Organize content with appropriate headings and structure
5. Extract and highlight key information, decisions, or insights
6. Remove conversational filler and redundancy
7. Make it standalone - someone reading it shouldn't need the original conversation

Output Format:
Return your response as JSON with this structure:
{
  "title": "Your generated title here",
  "content": "Your formatted document content here with proper sections and formatting"
}

Use plain text formatting (no markdown). Use section headers in ALL CAPS followed by a colon.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODELS.FAST, // Use fast model for cost-effectiveness
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Original conversation title: "${conversation.title || 'Untitled'}"

Conversation content:
${conversationText}

Please analyze this conversation and create a standalone document.`
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', response.status, errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: any) => block.type === 'text');

  if (!textBlock?.text) {
    throw new Error('No response from Claude');
  }

  // Parse the JSON response
  try {
    // Try to extract JSON from the response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || conversation.title || 'Converted Conversation',
        content: parsed.content || textBlock.text
      };
    }
  } catch (parseError) {
    console.error('Failed to parse AI response as JSON, using raw content');
  }

  // Fallback: use the raw response as content
  return {
    title: conversation.title || 'Converted Conversation',
    content: textBlock.text
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('convert-conversation-to-document function called');

    // Get authorization header
    const authHeader = req.headers.get('authorization');
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

    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    const userId = user.id;
    console.log('Authenticated user ID:', userId);

    // Parse request body
    const body = await req.json();
    const { conversation_id, conversion_type = 'ai_summary' } = body as {
      conversation_id: string;
      conversion_type: ConversionType;
    };

    if (!conversation_id) {
      throw new Error('conversation_id is required');
    }

    if (!['transcript', 'ai_summary', 'both'].includes(conversion_type)) {
      throw new Error('conversion_type must be one of: transcript, ai_summary, both');
    }

    console.log('Converting conversation:', conversation_id, 'Type:', conversion_type);

    // 1. Fetch conversation and verify ownership
    const { data: conversation, error: convError } = await supabaseService
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', userId)
      .single();

    if (convError || !conversation) {
      console.error('Conversation not found:', convError);
      throw new Error('Conversation not found or access denied');
    }

    console.log('Conversation found:', conversation.title);

    // 2. Fetch all messages for this conversation
    const { data: messages, error: msgError } = await supabaseService
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      throw new Error('Failed to fetch conversation messages');
    }

    if (!messages || messages.length === 0) {
      throw new Error('Conversation has no messages to convert');
    }

    console.log('Found', messages.length, 'messages');

    // 3. Generate document(s) based on conversion type
    const documentsToCreate: Array<{
      title: string;
      content: string;
      file_type: string;
      tags: string[];
    }> = [];

    // Get original tags and add 'from-conversation' marker
    const baseTags = [...(conversation.tags || []), 'from-conversation'];

    if (conversion_type === 'transcript' || conversion_type === 'both') {
      const transcriptContent = formatTranscript(conversation, messages);

      // Add AI summary intro if conversation has one
      let finalContent = transcriptContent;
      if (conversation.executive_summary) {
        finalContent = `SUMMARY:\n${conversation.executive_summary}\n\n---\n\n${transcriptContent}`;
      }

      documentsToCreate.push({
        title: `Transcript: ${conversation.title || 'Conversation'}`,
        content: finalContent,
        file_type: 'conversation_transcript',
        tags: [...baseTags, 'transcript'],
      });
    }

    if (conversion_type === 'ai_summary' || conversion_type === 'both') {
      const aiDoc = await generateAIDocument(conversation, messages);
      documentsToCreate.push({
        title: aiDoc.title,
        content: aiDoc.content,
        file_type: 'conversation_export',
        tags: [...baseTags, 'ai-generated'],
      });
    }

    // 4. Insert documents into knowledge_documents
    const createdDocumentIds: string[] = [];

    for (const doc of documentsToCreate) {
      const { data: createdDoc, error: insertError } = await supabaseService
        .from('knowledge_documents')
        .insert({
          title: doc.title,
          content: doc.content,
          file_type: doc.file_type,
          tags: doc.tags,
          user_id: userId,
          google_file_id: `conv-${conversation_id}-${Date.now()}`, // Unique identifier
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating document:', insertError);
        throw new Error(`Failed to create document: ${insertError.message}`);
      }

      createdDocumentIds.push(createdDoc.id);
      console.log('Created document:', createdDoc.id, doc.title);
    }

    // 5. Delete the original conversation
    const { error: deleteError } = await supabaseService
      .from('conversations')
      .delete()
      .eq('id', conversation_id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError);
      // Don't throw - documents were created successfully
      // The conversation deletion failure is not critical
    } else {
      console.log('Conversation deleted successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_ids: createdDocumentIds,
        documents_created: createdDocumentIds.length,
        conversation_deleted: !deleteError,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in convert-conversation-to-document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
