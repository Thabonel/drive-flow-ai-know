import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedItem {
  title: string;
  suggested_date: string | null;
  duration_minutes: number;
  description: string | null;
  sequence: number;
}

interface ExtractionResponse {
  items: ExtractedItem[];
  message?: string;
}

async function extractTimelineItems(content: string): Promise<ExtractionResponse> {
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const systemPrompt = `You are a helpful assistant that extracts schedulable items from text content.

Your task is to identify items that could be added to a timeline or calendar, such as:
- Episodes (podcast, video series)
- Tasks or milestones
- Deliverables or deadlines
- Events or meetings
- Project phases
- Content publication dates
- Any other time-based items

For each item found, extract:
1. title: A concise title for the item
2. suggested_date: If a date is mentioned or implied, provide it in ISO format (YYYY-MM-DD). If only relative dates like "Week 1" or "Month 3" are mentioned, return null.
3. duration_minutes: Estimated duration (default to 60 if not specified)
4. description: Brief description if additional context is available
5. sequence: The order the item appears in the content (1, 2, 3, etc.)

IMPORTANT: Return your response as valid JSON only, with no additional text or markdown formatting.
Return format: { "items": [...] }

If no schedulable items are found, return: { "items": [], "message": "No schedulable items found in the content." }`;

  const userPrompt = `Extract all schedulable items from the following content:

${content}

Return the extracted items as JSON.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content?.[0]?.text || '';

    // Parse the JSON response
    try {
      // Try to extract JSON from the response (in case there's any wrapper text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          items: parsed.items || [],
          message: parsed.message,
        };
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error('Failed to parse extraction results');
    }
  } catch (error) {
    console.error('Extraction error:', error);
    throw error;
  }
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
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit content size to prevent abuse
    const maxContentLength = 50000; // ~50KB
    if (content.length > maxContentLength) {
      return new Response(
        JSON.stringify({ error: `Content too large. Maximum ${maxContentLength} characters allowed.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracting timeline items for user ${user.id}, content length: ${content.length}`);

    // Extract timeline items
    const result = await extractTimelineItems(content);

    console.log(`Extracted ${result.items.length} items`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-timeline-items:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
