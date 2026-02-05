/**
 * Slack Webhook Edge Function
 *
 * Handles incoming Slack messages via Events API and Slash Commands.
 * Routes messages to the AI orchestrator with memory context.
 *
 * Supports:
 * - Direct messages to the bot
 * - @mentions in channels
 * - Slash commands (/ask, /remember, etc.)
 * - Thread conversations
 *
 * Environment Variables Required:
 * - SLACK_BOT_TOKEN: Bot User OAuth Token (xoxb-...)
 * - SLACK_SIGNING_SECRET: For verifying requests from Slack
 * - SLACK_ALLOWED_WORKSPACE_ID: Optional workspace restriction
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key
 * - OPENAI_API_KEY: For embeddings
 * - ANTHROPIC_API_KEY: For AI responses
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createHmac } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import { CLAUDE_MODELS } from '../_shared/models.ts';

// Slack Event types
interface SlackEvent {
  type: string;
  challenge?: string; // URL verification
  token?: string;
  team_id?: string;
  event?: SlackMessageEvent;
  event_id?: string;
  event_time?: number;
}

interface SlackMessageEvent {
  type: string;
  subtype?: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  bot_id?: string;
  files?: SlackFile[];
}

interface SlackFile {
  id: string;
  name: string;
  mimetype: string;
  url_private: string;
  url_private_download: string;
}

interface SlackSlashCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

// Environment variables
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const SLACK_SIGNING_SECRET = Deno.env.get('SLACK_SIGNING_SECRET');
const SLACK_ALLOWED_WORKSPACE_ID = Deno.env.get('SLACK_ALLOWED_WORKSPACE_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

/**
 * Verify Slack request signature
 */
async function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string
): Promise<boolean> {
  if (!SLACK_SIGNING_SECRET) {
    console.error('SLACK_SIGNING_SECRET not configured');
    return false;
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 60 * 5) {
    console.error('Request timestamp is too old');
    return false;
  }

  // Create the signature base string
  const sigBaseString = `v0:${timestamp}:${body}`;

  // Create HMAC SHA256 hash
  const encoder = new TextEncoder();
  const key = encoder.encode(SLACK_SIGNING_SECRET);
  const message = encoder.encode(sigBaseString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, message);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const expectedSignature = `v0=${hashHex}`;

  return expectedSignature === signature;
}

/**
 * Send message to Slack channel
 */
async function sendSlackMessage(
  channel: string,
  text: string,
  threadTs?: string
): Promise<void> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text,
      thread_ts: threadTs, // Reply in thread if specified
      unfurl_links: false,
      unfurl_media: false,
    }),
  });

  const result = await response.json();
  if (!result.ok) {
    console.error('Slack send error:', result.error);
  }
}

/**
 * Update typing indicator (reaction)
 */
async function addTypingReaction(channel: string, timestamp: string): Promise<void> {
  await fetch('https://slack.com/api/reactions.add', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      timestamp,
      name: 'thinking_face',
    }),
  });
}

/**
 * Remove typing indicator
 */
async function removeTypingReaction(channel: string, timestamp: string): Promise<void> {
  await fetch('https://slack.com/api/reactions.remove', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      timestamp,
      name: 'thinking_face',
    }),
  });
}

/**
 * Generate query embedding
 */
async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.substring(0, 8000),
        model: 'text-embedding-3-small',
        dimensions: 1536,
      }),
    });

    if (!response.ok) {
      console.error('Embedding generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

/**
 * Retrieve memory context
 */
async function retrieveMemoryContext(
  supabase: any,
  userId: string,
  query: string
): Promise<string> {
  try {
    const queryEmbedding = await generateQueryEmbedding(query);
    if (!queryEmbedding) return '';

    const { data: memories, error } = await supabase.rpc('search_semantic_memories', {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_memory_types: null,
      p_limit: 5,
      p_similarity_threshold: 0.6,
    });

    if (error || !memories || memories.length === 0) {
      return '';
    }

    const memoryContext = memories.map((m: any) =>
      `[${m.memory_type}] ${m.content}`
    ).join('\n\n');

    return `\nRelevant context from previous conversations:\n${memoryContext}\n`;
  } catch (error) {
    console.error('Memory retrieval error:', error);
    return '';
  }
}

/**
 * Call AI orchestrator
 */
async function callAIOrchestrator(
  supabase: any,
  userId: string,
  query: string,
  context?: { channel: string; thread?: boolean }
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  // Retrieve memory context
  const memoryContext = await retrieveMemoryContext(supabase, userId, query);

  const systemMessage = `You are a helpful AI assistant integrated with Slack.
Keep responses clear and well-formatted for Slack.
Use Slack markdown formatting: *bold*, _italic_, \`code\`, \`\`\`code blocks\`\`\`.
Use bullet points and line breaks for readability.
Be helpful, professional, and concise.
${memoryContext}
Current time: ${new Date().toISOString()}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODELS.FAST,
      max_tokens: 2048,
      system: systemMessage,
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Claude API error:', error);
    throw new Error(`AI response failed: ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: any) => block.type === 'text');
  return textBlock?.text || 'I apologize, but I could not generate a response.';
}

/**
 * Log interaction to memory
 */
async function logInteraction(
  supabase: any,
  slackUserId: string,
  userMessage: string,
  assistantResponse: string,
  channel: string
): Promise<void> {
  try {
    const conversationId = crypto.randomUUID();
    const conversationText = `User: ${userMessage}\nAssistant: ${assistantResponse}`;
    const embedding = await generateQueryEmbedding(conversationText);

    await supabase
      .from('conversation_summaries')
      .insert({
        user_id: null, // Would be linked Supabase user
        conversation_id: conversationId,
        source_type: 'text_chat',
        chunk_index: 0,
        raw_content: conversationText,
        summary: userMessage.substring(0, 200),
        key_topics: ['slack'],
        mentioned_entities: [],
        conversation_date: new Date().toISOString(),
      });

    await supabase
      .from('semantic_memories')
      .insert({
        user_id: null,
        memory_type: 'conversation_summary',
        source_type: 'text_chat',
        content: `[Slack] ${conversationText.substring(0, 500)}`,
        embedding: embedding,
        importance_score: 3,
        metadata: {
          slack_user_id: slackUserId,
          channel: channel,
          conversation_id: conversationId,
          timestamp: new Date().toISOString(),
        },
      });

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_user_id: null,
      p_action_type: 'memory_write',
      p_description: 'Logged Slack conversation',
      p_source_channel: 'api',
      p_metadata: {
        slack_user_id: slackUserId,
        channel: channel,
        conversation_id: conversationId,
      },
    });

    console.log('Slack interaction logged successfully');
  } catch (error) {
    console.error('Error logging interaction:', error);
  }
}

/**
 * Handle message event
 */
async function handleMessageEvent(
  event: SlackMessageEvent,
  supabase: any
): Promise<void> {
  // Ignore bot messages to prevent loops
  if (event.bot_id || event.subtype === 'bot_message') {
    return;
  }

  // Get the message text (remove bot mention if present)
  let messageText = event.text || '';
  messageText = messageText.replace(/<@[A-Z0-9]+>/g, '').trim();

  if (!messageText) {
    return;
  }

  console.log(`Processing Slack message from ${event.user}: "${messageText.substring(0, 50)}..."`);

  // Add thinking reaction
  await addTypingReaction(event.channel, event.ts);

  try {
    // Get AI response
    const aiResponse = await callAIOrchestrator(
      supabase,
      event.user,
      messageText,
      { channel: event.channel, thread: !!event.thread_ts }
    );

    // Send response in thread
    await sendSlackMessage(
      event.channel,
      aiResponse,
      event.thread_ts || event.ts // Reply in existing thread or start new one
    );

    // Log the interaction
    await logInteraction(supabase, event.user, messageText, aiResponse, event.channel);
  } catch (error) {
    console.error('Error handling message:', error);
    await sendSlackMessage(
      event.channel,
      "Sorry, I encountered an error processing your message. Please try again.",
      event.thread_ts || event.ts
    );
  } finally {
    // Remove thinking reaction
    await removeTypingReaction(event.channel, event.ts);
  }
}

/**
 * Handle slash command
 */
async function handleSlashCommand(
  command: SlackSlashCommand,
  supabase: any
): Promise<Response> {
  console.log(`Processing Slack command ${command.command}: "${command.text}"`);

  // Handle different commands
  switch (command.command) {
    case '/ask':
    case '/assistant': {
      // Immediate acknowledgment
      const immediateResponse = new Response(
        JSON.stringify({
          response_type: 'ephemeral',
          text: '_Thinking..._',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Process asynchronously
      (async () => {
        try {
          const aiResponse = await callAIOrchestrator(
            supabase,
            command.user_id,
            command.text,
            { channel: command.channel_id }
          );

          // Send delayed response
          await fetch(command.response_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              response_type: 'in_channel',
              text: aiResponse,
            }),
          });

          // Log interaction
          await logInteraction(
            supabase,
            command.user_id,
            command.text,
            aiResponse,
            command.channel_id
          );
        } catch (error) {
          console.error('Slash command error:', error);
          await fetch(command.response_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              response_type: 'ephemeral',
              text: 'Sorry, I encountered an error. Please try again.',
            }),
          });
        }
      })();

      return immediateResponse;
    }

    case '/remember': {
      // Store a memory explicitly
      const embedding = await generateQueryEmbedding(command.text);

      await supabase
        .from('semantic_memories')
        .insert({
          user_id: null,
          memory_type: 'user_fact',
          source_type: 'manual',
          content: command.text,
          embedding: embedding,
          importance_score: 7, // Higher importance for explicit memories
          metadata: {
            slack_user_id: command.user_id,
            channel: command.channel_id,
            source: 'slash_command',
          },
        });

      return new Response(
        JSON.stringify({
          response_type: 'ephemeral',
          text: `Got it! I'll remember: "${command.text}"`,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    case '/forget': {
      // Remove memories matching the query
      // For now, just acknowledge - actual deletion would need more sophisticated matching
      return new Response(
        JSON.stringify({
          response_type: 'ephemeral',
          text: "I've noted your request. Use the web app for more granular memory management.",
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    default:
      return new Response(
        JSON.stringify({
          response_type: 'ephemeral',
          text: `Unknown command: ${command.command}`,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
  }
}

// Main webhook handler
serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Validate required environment variables
  if (!SLACK_BOT_TOKEN) {
    console.error('SLACK_BOT_TOKEN not configured');
    return new Response('Bot not configured', { status: 500 });
  }

  try {
    const body = await req.text();

    // Verify Slack signature
    const timestamp = req.headers.get('x-slack-request-timestamp') || '';
    const signature = req.headers.get('x-slack-signature') || '';

    if (SLACK_SIGNING_SECRET && !(await verifySlackSignature(body, timestamp, signature))) {
      console.error('Invalid Slack signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse the request
    const contentType = req.headers.get('content-type') || '';

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (contentType.includes('application/json')) {
      // Events API
      const event: SlackEvent = JSON.parse(body);

      // Handle URL verification challenge
      if (event.type === 'url_verification') {
        return new Response(
          JSON.stringify({ challenge: event.challenge }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check workspace restriction
      if (SLACK_ALLOWED_WORKSPACE_ID && event.team_id !== SLACK_ALLOWED_WORKSPACE_ID) {
        console.warn(`Unauthorized workspace attempted access: ${event.team_id}`);
        return new Response('Unauthorized workspace', { status: 403 });
      }

      // Handle event callback
      if (event.type === 'event_callback' && event.event) {
        const innerEvent = event.event;

        // Handle app_mention or direct message
        if (innerEvent.type === 'app_mention' || innerEvent.type === 'message') {
          // Don't wait for processing - acknowledge immediately
          handleMessageEvent(innerEvent, supabase).catch(console.error);
        }
      }

      return new Response('OK', { status: 200 });
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Slash command
      const params = new URLSearchParams(body);
      const command: SlackSlashCommand = {
        token: params.get('token') || '',
        team_id: params.get('team_id') || '',
        team_domain: params.get('team_domain') || '',
        channel_id: params.get('channel_id') || '',
        channel_name: params.get('channel_name') || '',
        user_id: params.get('user_id') || '',
        user_name: params.get('user_name') || '',
        command: params.get('command') || '',
        text: params.get('text') || '',
        response_url: params.get('response_url') || '',
        trigger_id: params.get('trigger_id') || '',
      };

      // Check workspace restriction
      if (SLACK_ALLOWED_WORKSPACE_ID && command.team_id !== SLACK_ALLOWED_WORKSPACE_ID) {
        console.warn(`Unauthorized workspace attempted access: ${command.team_id}`);
        return new Response(
          JSON.stringify({ response_type: 'ephemeral', text: 'Unauthorized workspace' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return handleSlashCommand(command, supabase);
    }

    return new Response('Unsupported content type', { status: 400 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
