import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { updateTokenUsage, extractTokensFromClaudeResponse } from '../_shared/token-tracking.ts';
import { CLAUDE_MODELS } from '../_shared/models.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TranslationRequest {
  unstructured_input: string;
  timezone_offset?: number;  // User's timezone offset in hours from UTC (e.g., +2 for Africa/Johannesburg)
  context?: {
    timezone?: string;
    location?: string;
  };
}

interface Task {
  title: string;
  description: string;
  agent_type: 'calendar' | 'briefing' | 'analysis' | 'creative';
  priority: number;
  estimated_duration: number;
}

/**
 * Builds a timezone-aware system prompt following PAM architecture patterns.
 * Includes current date/time in user's timezone and anti-hallucination guards.
 */
function buildSystemPrompt(context?: { timezone?: string }): string {
  const tz = context?.timezone || 'UTC';
  const now = new Date();

  // Format current date/time in user's timezone
  let currentDateTime: string;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    currentDateTime = formatter.format(now);
  } catch {
    // Fallback if timezone is invalid
    currentDateTime = now.toISOString();
  }

  return `You are a Personal Chief of Staff assistant that translates unstructured thoughts into structured, actionable tasks.

**Current date/time:** ${currentDateTime} (${tz})

**Your Task:**
Analyze the user's input and extract discrete tasks. For each task provide:
1. title - Concise, actionable verb phrase (e.g., "Schedule meeting with Sarah")
2. description - Detailed context including all specifics from the input
3. agent_type - One of: "calendar" (scheduling/meetings), "briefing" (daily prep/summaries), "analysis" (data review/insights)
4. priority - Number 1-5 where 5 is most urgent
5. estimated_duration - Minutes as integer

**CRITICAL RULES:**
- Extract ALL tasks, even implicit ones
- Use the current date/time above when interpreting relative dates like "today", "tomorrow", "next Monday"
- Be specific: include times, names, metrics, locations mentioned
- Break complex requests into multiple smaller tasks
- If unclear, make reasonable assumptions rather than asking
- NEVER output anything except valid JSON

**Agent Type Guidelines:**
- calendar: meetings, appointments, calls, events, scheduling anything
- briefing: daily summaries, preparation notes, status updates
- analysis: data review, research, reports, insights generation
- creative: content drafting, copywriting, taglines, strategy documents, marketing copy, visuals planning, ideation

**Output Format:**
Return ONLY a valid JSON array. No markdown code fences, no commentary, no explanation.
Example output:
[{"title": "Schedule dentist appointment", "description": "Book routine checkup at Dr. Smith's office for next Tuesday afternoon", "agent_type": "calendar", "priority": 3, "estimated_duration": 60}]`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body with optional context
    const { unstructured_input, timezone_offset, context }: TranslationRequest = await req.json();

    if (!unstructured_input || typeof unstructured_input !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: unstructured_input is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build timezone-aware system prompt (PAM pattern)
    const systemPrompt = buildSystemPrompt(context);

    // Call Claude API
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    console.log('Using Claude model:', CLAUDE_MODELS.FAST);
    console.log('User timezone:', context?.timezone || 'UTC (default)');
    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODELS.FAST,
        max_tokens: 2000,
        system: systemPrompt,  // PAM pattern: explicit system prompt
        messages: [
          {
            role: 'user',
            content: unstructured_input,  // Just the user input, context is in system prompt
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error - Status:', response.status, 'Model:', CLAUDE_MODELS.FAST, 'Response:', errorData);
      throw new Error(`Claude API request failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const translationDuration = Date.now() - startTime;

    // Get session ID for token tracking (before processing tasks)
    let { data: sessionData } = await supabase
      .from('agent_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Auto-create session if none exists
    if (!sessionData) {
      console.log('No active session found, creating new session for user:', user.id);
      const { data: newSession, error: sessionError } = await supabase
        .from('agent_sessions')
        .insert({
          user_id: user.id,
          status: 'active',
          tokens_used: 0,
          tokens_budget: 100000,
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Failed to create agent session:', sessionError);
        // Continue without session - tasks won't be stored but translation still works
      } else {
        sessionData = newSession;
        console.log('Created new agent session:', newSession.id);
      }
    }

    // Track token usage
    if (sessionData) {
      const tokensUsed = extractTokensFromClaudeResponse(data);
      const tokenUpdate = await updateTokenUsage(sessionData.id, tokensUsed);

      if (tokenUpdate.budgetExceeded) {
        console.warn(`Token budget exceeded. Session paused. Tokens remaining: ${tokenUpdate.tokensRemaining}`);
        return new Response(
          JSON.stringify({
            error: 'Token budget exceeded. Session has been paused.',
            budget_exceeded: true,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Extract tasks from Claude's response with defensive access
    if (!data?.content?.[0]?.text) {
      console.error('Unexpected Claude API response format:', JSON.stringify(data));
      throw new Error('Unexpected AI response format');
    }
    const content = data.content[0].text;
    let tasks: Task[];

    try {
      // Handle potential markdown code fences (despite instructions to avoid them)
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      tasks = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', content);
      throw new Error('Failed to parse AI response');
    }

    // Validate tasks structure
    if (!Array.isArray(tasks)) {
      throw new Error('Invalid response format: expected array of tasks');
    }

    // Store tasks in agent_tasks table (sessionData already fetched above for token tracking)
    if (sessionData) {
      // Store each task - include timezone_offset for sub-agents to use
      const taskInserts = tasks.map(task => ({
        session_id: sessionData.id,
        user_id: user.id,
        original_input: unstructured_input,
        structured_output: {
          ...task,
          timezone_offset: timezone_offset ?? 2, // Default to UTC+2 if not provided
        },
        status: 'pending',
      }));

      const { error: insertError } = await supabase
        .from('agent_tasks')
        .insert(taskInserts);

      if (insertError) {
        console.error('Error storing tasks:', insertError);
      }
    }

    // Log translation to agent memory
    if (sessionData) {
      const { error: memoryError } = await supabase
        .from('agent_memory')
        .insert({
          session_id: sessionData.id,
          user_id: user.id,
          memory_type: 'action_log',
          content: {
            action: 'translation_completed',
            input: unstructured_input,
            task_count: tasks.length,
            duration_ms: translationDuration,
            timezone: context?.timezone || 'UTC',
          },
          importance: 3,
        });

      if (memoryError) {
        console.error('Error logging to agent_memory:', memoryError);
        // Continue - not fatal, but log it for debugging
      }
    }

    return new Response(
      JSON.stringify({
        tasks,
        session_id: sessionData?.id,
        metadata: {
          task_count: tasks.length,
          translation_duration_ms: translationDuration,
          user_id: user.id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in agent-translate function:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    // Provide more specific error messages for debugging
    let errorMessage = 'Internal server error';
    let errorDetails = {};

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for common issues
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        errorDetails = { hint: 'ANTHROPIC_API_KEY environment variable may not be configured' };
      } else if (error.message.includes('Claude API')) {
        errorDetails = { hint: 'Claude API request failed - check API key and model availability' };
      } else if (error.message.includes('parse')) {
        errorDetails = { hint: 'Failed to parse AI response as JSON' };
      } else if (error.message.includes('Unauthorized')) {
        errorDetails = { hint: 'User authentication failed' };
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        ...errorDetails,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
