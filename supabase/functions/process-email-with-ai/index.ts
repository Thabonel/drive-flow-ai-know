import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedTask {
  title: string;
  description?: string;
  priority: number;
  estimated_duration_minutes?: number;
  suggested_deadline?: string;
  category?: string;
}

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
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that extracts actionable tasks from emails.
Analyze the email and identify action items, decisions needed, or tasks to complete.
For each task, determine:
- Priority (1-5, where 1 is highest)
- Estimated time needed (in minutes)
- Suggested deadline (if mentioned or can be inferred)
- Category (work, personal, meeting, decision, etc.)

Also categorize the email itself as: actionable, informational, spam, newsletter, meeting, or other.

Return JSON in this exact format:
{
  "category": "actionable|informational|spam|newsletter|meeting|other",
  "priority": 1-5,
  "summary": "brief summary of the email",
  "tasks": [
    {
      "title": "task title",
      "description": "more details",
      "priority": 1-5,
      "estimated_duration_minutes": 30,
      "suggested_deadline": "2024-01-15T17:00:00Z",
      "category": "work"
    }
  ]
}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
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
    const { email_id, user_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the email
    const { data: email, error: emailError } = await supabase
      .from('received_emails')
      .select('*')
      .eq('id', email_id)
      .single();

    if (emailError) throw emailError;

    // Update status to processing
    await supabase
      .from('received_emails')
      .update({ processing_status: 'processing' })
      .eq('id', email_id);

    // Prepare prompt for AI
    const emailContent = `
From: ${email.from_name || email.from_email}
Subject: ${email.subject}

${email.body_text}
    `.trim();

    console.log('Processing email with AI:', email_id);

    // Call AI to extract tasks
    const aiResult = await callOpenAI(emailContent);

    console.log('AI result:', aiResult);

    // Update sender pattern statistics
    const isActionable = aiResult.tasks && aiResult.tasks.length > 0;
    await supabase.rpc('update_sender_pattern', {
      p_user_id: user_id,
      p_sender_email: email.from_email,
      p_category: aiResult.category,
      p_is_actionable: isActionable,
      p_is_ignored: false
    });

    // Store extracted tasks
    const tasks: ExtractedTask[] = aiResult.tasks || [];
    if (tasks.length > 0) {
      const taskInserts = tasks.map(task => ({
        user_id,
        email_id,
        title: task.title,
        description: task.description,
        estimated_duration_minutes: task.estimated_duration_minutes,
        ai_priority: task.priority,
        ai_suggested_deadline: task.suggested_deadline,
        ai_category: task.category,
        status: 'pending'
      }));

      const { error: taskError } = await supabase
        .from('email_tasks')
        .insert(taskInserts);

      if (taskError) {
        console.error('Error inserting tasks:', taskError);
      }
    }

    // Update email with AI results
    const { error: updateError } = await supabase
      .from('received_emails')
      .update({
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
        ai_extracted_tasks: tasks,
        ai_summary: aiResult.summary,
        ai_category: aiResult.category,
        ai_priority: aiResult.priority
      })
      .eq('id', email_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        email_id,
        tasks_extracted: tasks.length,
        category: aiResult.category
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing email with AI:', error);

    // Mark email as failed
    if (req.json) {
      const { email_id } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('received_emails')
        .update({ processing_status: 'failed' })
        .eq('id', email_id);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
