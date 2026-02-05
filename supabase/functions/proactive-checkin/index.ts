/**
 * Proactive Check-in Edge Function
 *
 * Triggered by pg_cron every 30 minutes to scan user's email, calendar, and tasks.
 * Calculates urgency score and decides whether to SKIP, TEXT, or CALL the user.
 *
 * Decision Framework:
 * - Score 0-3: SKIP (no action needed)
 * - Score 4-7: TEXT (send Telegram/Slack message)
 * - Score 8-10: CALL (initiate phone call via Twilio)
 *
 * Environment Variables Required:
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - TELEGRAM_BOT_TOKEN (for TEXT action)
 * - ANTHROPIC_API_KEY (for generating check-in messages)
 * - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (for CALL action - Phase 4)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CLAUDE_MODELS } from '../_shared/models.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

interface UserCheckinConfig {
  user_id: string;
  telegram_chat_id: string | null;
  slack_channel_id: string | null;
  phone_number: string | null;
  text_threshold: number;
  call_threshold: number;
  monitor_emails: boolean;
  monitor_calendar: boolean;
  monitor_tasks: boolean;
  monitor_goals: boolean;
  email_urgent_keywords: string[];
  email_important_senders: string[];
  calendar_reminder_minutes: number;
}

interface CheckinContext {
  emails: {
    total_unread: number;
    urgent_count: number;
    important_senders: string[];
  };
  calendar: {
    upcoming_count: number;
    next_event: {
      title: string;
      start_time: string;
      minutes_until: number;
    } | null;
    events_next_2_hours: Array<{
      title: string;
      start_time: string;
      minutes_until: number;
    }>;
  };
  tasks: {
    total_pending: number;
    high_priority: number;
    overdue: number;
    top_tasks: Array<{
      title: string;
      priority: number;
    }>;
  };
  goals: {
    active_count: number;
    overdue: number;
    due_soon: number;
    recent_goals: Array<{
      title: string;
      priority: number;
      progress: number;
      target_date: string | null;
    }>;
  };
}

type ActionType = 'skip' | 'text' | 'call';

/**
 * Calculate urgency score based on context
 */
function calculateUrgencyScore(context: CheckinContext): number {
  let score = 0;

  // Email scoring (max 3 points)
  score += Math.min(context.emails.urgent_count * 2, 3);

  // Calendar scoring (max 5 points)
  if (context.calendar.next_event) {
    const minutesUntil = context.calendar.next_event.minutes_until;
    if (minutesUntil <= 10) {
      score += 5; // Meeting in 10 mins or less - critical
    } else if (minutesUntil <= 30) {
      score += 3; // Meeting in 30 mins - important
    } else if (minutesUntil <= 60) {
      score += 1; // Meeting in 1 hour - notable
    }
  }

  // Task scoring (max 3 points)
  score += Math.min(context.tasks.high_priority, 3);

  // Goal scoring (max 2 points)
  score += Math.min(context.goals.overdue * 2, 2);

  return Math.min(score, 10);
}

/**
 * Decide action based on urgency score and thresholds
 */
function decideAction(
  urgencyScore: number,
  textThreshold: number,
  callThreshold: number
): { action: ActionType; reason: string } {
  if (urgencyScore >= callThreshold) {
    return {
      action: 'call',
      reason: `Urgency score ${urgencyScore} exceeds call threshold ${callThreshold}`,
    };
  } else if (urgencyScore >= textThreshold) {
    return {
      action: 'text',
      reason: `Urgency score ${urgencyScore} exceeds text threshold ${textThreshold}`,
    };
  } else {
    return {
      action: 'skip',
      reason: `Urgency score ${urgencyScore} below text threshold ${textThreshold}`,
    };
  }
}

/**
 * Generate a helpful check-in message using AI
 */
async function generateCheckinMessage(
  context: CheckinContext,
  urgencyScore: number
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    // Fallback to template if no AI
    return formatTemplateMessage(context, urgencyScore);
  }

  try {
    const prompt = `You are a helpful AI assistant sending a proactive check-in message to the user.
Based on the following context, write a brief, friendly, and actionable check-in message.
Keep it under 200 words. Be conversational but professional. Use simple formatting (line breaks, no markdown).

Context:
- Urgency Score: ${urgencyScore}/10
- Unread Emails: ${context.emails.total_unread} (${context.emails.urgent_count} urgent)
- Upcoming Calendar Events: ${context.calendar.upcoming_count}
${context.calendar.next_event ? `- Next Meeting: "${context.calendar.next_event.title}" in ${Math.round(context.calendar.next_event.minutes_until)} minutes` : '- No immediate meetings'}
- Pending Tasks: ${context.tasks.total_pending} (${context.tasks.high_priority} high priority)
- Active Goals: ${context.goals.active_count} (${context.goals.overdue} overdue)

Top Tasks: ${context.tasks.top_tasks?.map(t => t.title).join(', ') || 'None'}
Top Goals: ${context.goals.recent_goals?.map(g => g.title).join(', ') || 'None'}

Write the check-in message:`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODELS.CHEAP, // Use cheap model for simple message generation
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('AI message generation failed:', response.status);
      return formatTemplateMessage(context, urgencyScore);
    }

    const data = await response.json();
    const textBlock = data.content?.find((block: any) => block.type === 'text');
    return textBlock?.text || formatTemplateMessage(context, urgencyScore);
  } catch (error) {
    console.error('Error generating AI message:', error);
    return formatTemplateMessage(context, urgencyScore);
  }
}

/**
 * Fallback template message
 */
function formatTemplateMessage(context: CheckinContext, urgencyScore: number): string {
  const lines: string[] = [];

  lines.push(`Hey! Quick check-in for you.`);
  lines.push('');

  if (context.calendar.next_event && context.calendar.next_event.minutes_until <= 30) {
    lines.push(`Your next meeting "${context.calendar.next_event.title}" starts in ${Math.round(context.calendar.next_event.minutes_until)} minutes.`);
    lines.push('');
  }

  if (context.emails.urgent_count > 0) {
    lines.push(`You have ${context.emails.urgent_count} urgent email${context.emails.urgent_count > 1 ? 's' : ''} waiting.`);
  }

  if (context.tasks.high_priority > 0) {
    lines.push(`${context.tasks.high_priority} high-priority task${context.tasks.high_priority > 1 ? 's' : ''} need attention.`);
  }

  if (context.goals.overdue > 0) {
    lines.push(`${context.goals.overdue} goal${context.goals.overdue > 1 ? 's are' : ' is'} overdue.`);
  }

  if (lines.length === 2) {
    lines.push(`All clear! No urgent items right now.`);
  }

  return lines.join('\n');
}

/**
 * Send message via Telegram
 */
async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Proactive Check-in\n\n${text}`,
          parse_mode: undefined, // Plain text for reliability
        }),
      }
    );

    const result = await response.json();
    if (!result.ok) {
      console.error('Telegram send error:', result);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

/**
 * Send message via Slack
 */
async function sendSlackMessage(channelId: string, text: string): Promise<boolean> {
  if (!SLACK_BOT_TOKEN) {
    console.error('SLACK_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: `*Proactive Check-in*\n\n${text}`,
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('Slack send error:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Slack send error:', error);
    return false;
  }
}

/**
 * Process a single user's check-in
 */
async function processUserCheckin(
  supabase: any,
  config: UserCheckinConfig
): Promise<{ success: boolean; action: ActionType; urgency: number }> {
  console.log(`Processing check-in for user ${config.user_id}`);

  try {
    // Get user's context using the database function
    const { data: context, error: contextError } = await supabase.rpc(
      'get_user_checkin_context',
      { p_user_id: config.user_id }
    );

    if (contextError) {
      console.error(`Error getting context for user ${config.user_id}:`, contextError);
      throw contextError;
    }

    const checkinContext: CheckinContext = {
      emails: context.emails || { total_unread: 0, urgent_count: 0, important_senders: [] },
      calendar: context.calendar || { upcoming_count: 0, next_event: null, events_next_2_hours: [] },
      tasks: context.tasks || { total_pending: 0, high_priority: 0, overdue: 0, top_tasks: [] },
      goals: context.goals || { active_count: 0, overdue: 0, due_soon: 0, recent_goals: [] },
    };

    // Calculate urgency score
    const urgencyScore = calculateUrgencyScore(checkinContext);

    // Decide action
    const decision = decideAction(
      urgencyScore,
      config.text_threshold,
      config.call_threshold
    );

    console.log(`User ${config.user_id}: urgency=${urgencyScore}, action=${decision.action}`);

    let messageSent: string | null = null;

    // Execute action
    if (decision.action === 'text') {
      // Generate message
      const message = await generateCheckinMessage(checkinContext, urgencyScore);

      // Try Telegram first
      if (config.telegram_chat_id) {
        const sent = await sendTelegramMessage(config.telegram_chat_id, message);
        if (sent) messageSent = message;
      }

      // Fallback to Slack
      if (!messageSent && config.slack_channel_id) {
        const sent = await sendSlackMessage(config.slack_channel_id, message);
        if (sent) messageSent = message;
      }

      if (!messageSent) {
        console.warn(`User ${config.user_id}: No channel available for TEXT action`);
      }
    } else if (decision.action === 'call') {
      // CALL action will be implemented in Phase 4 (Voice & Phone)
      // For now, fall back to text
      console.log(`User ${config.user_id}: CALL action not yet implemented, falling back to TEXT`);

      const message = await generateCheckinMessage(checkinContext, urgencyScore);
      const urgentMessage = `URGENT CHECK-IN\n\n${message}\n\n(Note: Auto-call not yet configured - this would have been a phone call)`;

      if (config.telegram_chat_id) {
        const sent = await sendTelegramMessage(config.telegram_chat_id, urgentMessage);
        if (sent) messageSent = urgentMessage;
      }

      if (!messageSent && config.slack_channel_id) {
        const sent = await sendSlackMessage(config.slack_channel_id, urgentMessage);
        if (sent) messageSent = urgentMessage;
      }
    }

    // Record the execution
    await supabase.rpc('record_checkin_execution', {
      p_user_id: config.user_id,
      p_context: checkinContext,
      p_urgency_score: urgencyScore,
      p_action: decision.action,
      p_reason: decision.reason,
      p_message: messageSent,
    });

    // Log to audit trail
    await supabase.rpc('log_audit_event', {
      p_user_id: config.user_id,
      p_action_type: 'autonomy_action',
      p_description: `Proactive check-in: ${decision.action} (urgency ${urgencyScore})`,
      p_source_channel: 'cron',
      p_metadata: {
        urgency_score: urgencyScore,
        action: decision.action,
        reason: decision.reason,
        message_sent: !!messageSent,
      },
    });

    return {
      success: true,
      action: decision.action,
      urgency: urgencyScore,
    };
  } catch (error) {
    console.error(`Error processing check-in for user ${config.user_id}:`, error);

    // Record failed execution
    await supabase.from('checkin_executions').insert({
      user_id: config.user_id,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      action: 'skip',
      urgency: 0,
    };
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Proactive check-in triggered');

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users due for check-in
    const { data: users, error: usersError } = await supabase.rpc('get_users_due_for_checkin');

    if (usersError) {
      console.error('Error getting users due for check-in:', usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log('No users due for check-in');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users due for check-in',
          users_processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing check-ins for ${users.length} users`);

    // Process each user
    const results = {
      total: users.length,
      processed: 0,
      skipped: 0,
      texted: 0,
      called: 0,
      failed: 0,
    };

    for (const user of users) {
      const result = await processUserCheckin(supabase, user);

      results.processed++;
      if (!result.success) {
        results.failed++;
      } else if (result.action === 'skip') {
        results.skipped++;
      } else if (result.action === 'text') {
        results.texted++;
      } else if (result.action === 'call') {
        results.called++;
      }
    }

    console.log('Check-in results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Proactive check-in error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
