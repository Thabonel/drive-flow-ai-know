import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { updateTokenUsage, extractTokensFromClaudeResponse } from '../_shared/token-tracking.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationRequest {
  unstructured_input: string;
}

interface Task {
  title: string;
  description: string;
  agent_type: 'calendar' | 'briefing' | 'analysis';
  priority: number;
  estimated_duration: number;
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

    // Parse request body
    const { unstructured_input }: TranslationRequest = await req.json();

    if (!unstructured_input || typeof unstructured_input !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: unstructured_input is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Construct translation prompt
    const translationPrompt = `You are a Personal Chief of Staff assistant. Your job is to translate unstructured thoughts into structured, actionable tasks.

User Input (unstructured): "${unstructured_input}"

Analyze the input and extract discrete tasks. For each task, determine:
1. Title (concise, actionable)
2. Description (detailed, specific)
3. Agent Type (calendar, briefing, or analysis)
4. Priority (1-5, where 5 = urgent)
5. Estimated Duration (minutes)

Return JSON array:
[
  {
    "title": "Schedule meeting with Sarah",
    "description": "Book 30-minute meeting tomorrow at 10am to discuss Q1 planning",
    "agent_type": "calendar",
    "priority": 4,
    "estimated_duration": 30
  },
  {
    "title": "Analyze Q1 revenue trends",
    "description": "Review revenue data for Q1 and identify key trends before meeting",
    "agent_type": "analysis",
    "priority": 3,
    "estimated_duration": 45
  }
]

Guidelines:
- Be specific (include times, names, metrics)
- Prioritize based on urgency + importance
- Break complex tasks into smaller sub-tasks
- Assign appropriate agent types (calendar for scheduling/meetings, briefing for daily summaries/preparation, analysis for data review/insights)
- If input is unclear, make reasonable assumptions

Output ONLY valid JSON array, no commentary.`;

    // Call Claude API
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: translationPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    const translationDuration = Date.now() - startTime;

    // Get session ID for token tracking (before processing tasks)
    const { data: sessionData } = await supabase
      .from('agent_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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

    // Extract tasks from Claude's response
    const content = data.content[0].text;
    let tasks: Task[];

    try {
      tasks = JSON.parse(content);
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
      // Store each task
      const taskInserts = tasks.map(task => ({
        session_id: sessionData.id,
        user_id: user.id,
        original_input: unstructured_input,
        structured_output: task,
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
      await supabase
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
          },
          importance: 3,
        });
    }

    return new Response(
      JSON.stringify({
        tasks,
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
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
