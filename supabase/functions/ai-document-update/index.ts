import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CLAUDE_MODELS } from '../_shared/models.ts';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateRequest {
  document_id: string;
  context: string;
  update_type: 'refresh_data' | 'add_section' | 'restructure' | 'improve_clarity' | 'custom';
  custom_instructions?: string;
}

async function generateDocumentUpdate(
  originalContent: string,
  originalTitle: string,
  context: string,
  updateType: string,
  customInstructions?: string
): Promise<{
  suggestedContent: string;
  changeSummary: string;
  changeHighlights: string[];
}> {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not available');
  }

  const updatePrompts: Record<string, string> = {
    refresh_data: 'Update any outdated information, statistics, or data points with the latest information from the context provided.',
    add_section: 'Add new relevant sections or content based on the context provided, while maintaining the existing structure.',
    restructure: 'Reorganize the document for better flow and clarity, while preserving all important content.',
    improve_clarity: 'Improve the writing clarity, fix grammar issues, and make the content more readable.',
    custom: customInstructions || 'Update the document based on the provided context.',
  };

  const systemPrompt = `You are an AI document editor that helps update and improve documents.

Your task is to modify the document based on the user's request while:
1. Preserving the original document's voice and style
2. Making targeted, purposeful changes (not rewriting everything)
3. Keeping changes minimal but impactful
4. Maintaining document structure unless restructuring is requested

IMPORTANT:
- Return the COMPLETE updated document, not just the changes
- Be conservative - only change what needs to change
- Preserve formatting (headings, lists, paragraphs)

Return your response as JSON:
{
  "suggestedContent": "The complete updated document content...",
  "changeSummary": "A 1-2 sentence summary of what was changed",
  "changeHighlights": ["Change 1", "Change 2", "Change 3"]
}`;

  const userPrompt = `## Original Document
Title: ${originalTitle}

Content:
${originalContent}

## Update Request
Type: ${updateType}
Instructions: ${updatePrompts[updateType]}

## Context/Information for Update
${context}

Please update the document according to the instructions above. Return the complete updated document with a summary of changes.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODELS.PRIMARY,
      max_tokens: 8192,
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
  const aiContent = data.content?.[0]?.text ?? '';

  // Parse JSON response
  let result;
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) ||
                      aiContent.match(/```\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
    result = JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', e);
    // Fallback: treat entire response as the updated content
    result = {
      suggestedContent: aiContent,
      changeSummary: 'Document updated based on your request',
      changeHighlights: ['Content modified'],
    };
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
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
    const body: UpdateRequest = await req.json();
    const { document_id, context, update_type, custom_instructions } = body;

    // Validate input
    if (!document_id) {
      throw new Error('document_id is required');
    }
    if (!context) {
      throw new Error('context is required');
    }
    if (!update_type) {
      throw new Error('update_type is required');
    }

    console.log('Processing document update:', { document_id, update_type });

    // Get document from database
    const { data: document, error: docError } = await supabaseClient
      .from('knowledge_documents')
      .select('id, title, content, current_version, user_id')
      .eq('id', document_id)
      .eq('user_id', user_id)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message || 'No document found'}`);
    }

    console.log('Document found:', document.title);

    // Generate AI update
    const updateResult = await generateDocumentUpdate(
      document.content || '',
      document.title,
      context,
      update_type,
      custom_instructions
    );

    console.log('Update generated, change summary:', updateResult.changeSummary);

    // Return the update proposal (not applied yet - user must approve)
    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        original_title: document.title,
        original_content: document.content,
        suggested_content: updateResult.suggestedContent,
        change_summary: updateResult.changeSummary,
        change_highlights: updateResult.changeHighlights,
        current_version: document.current_version || 1,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-document-update:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
