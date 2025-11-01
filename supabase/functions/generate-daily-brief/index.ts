import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callOpenAI(prompt: string): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an executive AI assistant preparing a daily brief.
Analyze the user's schedule, tasks, and priorities to provide:
1. Key insights about the day ahead
2. Decisions that need to be made
3. Personalized suggestions to optimize the day
4. Potential conflicts or issues

Format the response as JSON with:
{
  "insights": "Executive summary of the day - what the executive needs to know",
  "key_decisions": [
    {"title": "Decision title", "description": "Why this matters", "deadline": "ISO timestamp if applicable"}
  ],
  "suggestions": [
    {"title": "Suggestion title", "description": "How this helps", "action": "Call to action"}
  ],
  "markdown": "Full brief in markdown format",
  "html": "Full brief in HTML format"
}

Be concise, executive-level, and action-oriented.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, date, raw_data } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's name for personalization
    const { data: userData } = await supabase.auth.admin.getUserById(user_id);
    const userName = userData?.user?.user_metadata?.full_name || 'there';

    // Prepare context for AI
    const context = `
Date: ${date}
User: ${userName}

Priority Meetings (${raw_data.priority_meetings?.length || 0}):
${JSON.stringify(raw_data.priority_meetings, null, 2)}

Tasks Due Today (${raw_data.tasks_due_today?.length || 0}):
${JSON.stringify(raw_data.tasks_due_today, null, 2)}

Full Schedule (${raw_data.schedule_overview?.length || 0} items):
${JSON.stringify(raw_data.schedule_overview, null, 2)}

Pending Email Tasks (${raw_data.pending_email_tasks?.length || 0}):
${JSON.stringify(raw_data.pending_email_tasks, null, 2)}

Generate an executive daily brief that:
1. Highlights what's most important today
2. Identifies decisions needed
3. Suggests how to optimize the day
4. Calls out any conflicts or preparation needed
    `.trim();

    console.log('Generating daily brief for:', user_id, date);

    // Call AI
    const aiResult = await callOpenAI(context);

    console.log('Daily brief generated successfully');

    // Add markdown and HTML if not provided
    if (!aiResult.markdown) {
      aiResult.markdown = generateMarkdownBrief(userName, date, raw_data, aiResult);
    }
    if (!aiResult.html) {
      aiResult.html = generateHTMLBrief(userName, date, raw_data, aiResult);
    }

    return new Response(
      JSON.stringify(aiResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating daily brief:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateMarkdownBrief(userName: string, date: string, data: any, ai: any): string {
  return `
# Daily Brief - ${date}

Good morning, ${userName}!

## AI Insights

${ai.insights}

## Priority Meetings (${data.priority_meetings?.length || 0})

${data.priority_meetings?.map((m: any) => `- **${m.title}** at ${new Date(m.start_time).toLocaleTimeString()}`).join('\n') || 'No priority meetings today'}

## Tasks Due Today (${data.tasks_due_today?.length || 0})

${data.tasks_due_today?.map((t: any) => `- ${t.title} ${t.priority ? `(P${t.priority})` : ''}`).join('\n') || 'No tasks due today'}

## Key Decisions Needed

${ai.key_decisions?.map((d: any) => `- **${d.title}**: ${d.description}`).join('\n') || 'No urgent decisions'}

## AI Suggestions

${ai.suggestions?.map((s: any) => `- **${s.title}**: ${s.description}`).join('\n') || 'No suggestions at this time'}

---

*Generated at ${new Date().toLocaleString()}*
  `.trim();
}

function generateHTMLBrief(userName: string, date: string, data: any, ai: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Daily Brief - ${date}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; }
    h2 { color: #4a4a4a; margin-top: 30px; }
    .insights { background: #f0f9ff; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; }
    .meeting { padding: 10px; margin: 5px 0; border-left: 3px solid #10b981; background: #f0fdf4; }
    .task { padding: 10px; margin: 5px 0; border-left: 3px solid #f59e0b; background: #fffbeb; }
    .decision { padding: 10px; margin: 5px 0; border-left: 3px solid #ef4444; background: #fef2f2; }
    .suggestion { padding: 10px; margin: 5px 0; border-left: 3px solid #8b5cf6; background: #faf5ff; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .priority { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <h1>Daily Brief - ${date}</h1>
  <p>Good morning, ${userName}!</p>

  <div class="insights">
    <h2>AI Insights</h2>
    <p>${ai.insights}</p>
  </div>

  <h2>Priority Meetings (${data.priority_meetings?.length || 0})</h2>
  ${data.priority_meetings?.map((m: any) => `
    <div class="meeting">
      <strong>${m.title}</strong><br>
      ${new Date(m.start_time).toLocaleTimeString()} - ${new Date(m.end_time).toLocaleTimeString()}
      ${m.location ? `<br>📍 ${m.location}` : ''}
    </div>
  `).join('') || '<p>No priority meetings today</p>'}

  <h2>Tasks Due Today (${data.tasks_due_today?.length || 0})</h2>
  ${data.tasks_due_today?.map((t: any) => `
    <div class="task">
      ${t.title}
      ${t.priority ? `<span class="badge priority">P${t.priority}</span>` : ''}
    </div>
  `).join('') || '<p>No tasks due today</p>'}

  <h2>Key Decisions Needed</h2>
  ${ai.key_decisions?.map((d: any) => `
    <div class="decision">
      <strong>${d.title}</strong><br>
      ${d.description}
    </div>
  `).join('') || '<p>No urgent decisions</p>'}

  <h2>AI Suggestions</h2>
  ${ai.suggestions?.map((s: any) => `
    <div class="suggestion">
      <strong>${s.title}</strong><br>
      ${s.description}
    </div>
  `).join('') || '<p>No suggestions at this time</p>'}

  <hr>
  <p style="color: #888; font-size: 14px;">Generated at ${new Date().toLocaleString()}</p>
</body>
</html>
  `.trim();
}
