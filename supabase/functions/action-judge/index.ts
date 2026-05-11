import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// ============================================================================
// ACTION JUDGE — Dual-agent safety layer
//
// Architecture: Actor agent proposes actions → Judge model (different vendor)
// evaluates → 4-way decision: allow / block / revise / escalate.
//
// Risk classification:
//   readonly         → auto-allow, no AI call needed
//   reversible_write → auto-allow with logging (user-owned data, undoable)
//   external_impact  → judge model evaluates (sheets, calendar, external APIs)
//   high_risk        → auto-escalate to human (delete, financial, bulk ops)
//
// Judge model: OpenRouter GPT-4.1 (uncorrelated from Claude Opus actor)
//              Fallback: Claude Sonnet 4.5 (different tier from Opus actor)
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY');
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');

// ─────────────────────────────────────────────────────────────────────────────
// Risk classification map
// ─────────────────────────────────────────────────────────────────────────────
const RISK_CLASSIFICATION: Record<string, 'readonly' | 'reversible_write' | 'external_impact' | 'high_risk'> = {
  // READ-ONLY (no side effects)
  web_search:              'readonly',
  product_price_search:    'readonly',
  australian_retail_search:'readonly',
  list_sheets:             'readonly',
  read_sheet:              'readonly',
  analyze_sheet:           'readonly',
  list_knowledge_bases:    'readonly',
  // REVERSIBLE WRITES (user-owned, fully deletable)
  save_document:           'reversible_write',
  create_knowledge_base:   'reversible_write',
  add_documents_to_kb:     'reversible_write',
  // EXTERNAL IMPACT (writes to external services or affects other people)
  write_sheet:             'external_impact',
  create_sheet:            'external_impact',
  calendar_sub_agent:      'external_impact',
  creative_sub_agent:      'external_impact',
  // HIGH-RISK (irreversible, financial, bulk, or destructive)
  delete_document:         'high_risk',
  bulk_delete:             'high_risk',
  send_email:              'high_risk',
  charge_payment:          'high_risk',
};

// ─────────────────────────────────────────────────────────────────────────────
// Judge model call — GPT-4.1 via OpenRouter (uncorrelated from Claude actor)
// ─────────────────────────────────────────────────────────────────────────────
const JUDGE_SYSTEM_PROMPT = `You are an action safety judge for an AI assistant system.

An AI agent (the actor) has proposed executing a tool. Evaluate whether it should proceed.

DECISION CRITERIA:
- allow    : Action directly and proportionately fulfills the user's explicit request
- block    : Action exceeds intent, modifies unexpected data, or creates unauthorized side effects
- revise   : Intent is correct but inputs need modification (scope too broad, wrong target)
- escalate : Action has significant, hard-to-reverse external impact requiring explicit human confirmation

EVALUATION RULES:
1. Be STRICT for external writes (Google Sheets, Calendar events, external APIs)
2. Be PERMISSIVE when the user clearly and explicitly asked for this
3. Block scope creep: user asked to update one cell → agent writing the whole sheet → BLOCK
4. Block mismatch: user asked a question → agent creating a file → BLOCK
5. Revise when the action is right but the scale is wrong (too many rows, wrong sheet, extra fields)
6. Escalate when the action will affect other people or is hard to reverse

Respond with valid JSON only, no other text:
{"decision":"allow","reason":"one sentence","revised_input":null,"confidence":0.95}`;

async function callJudgeModel(params: {
  toolName: string;
  toolInput: Record<string, unknown>;
  actorReasoning: string;
  userQuery: string;
}): Promise<{
  decision: 'allow' | 'block' | 'revise' | 'escalate';
  reason: string;
  revisedInput?: Record<string, unknown>;
  model: string;
  confidence: number;
}> {
  const userMessage = `User's original request: "${params.userQuery}"

Actor agent's reasoning: ${params.actorReasoning || '(no reasoning provided)'}

Proposed action:
  Tool: ${params.toolName}
  Inputs: ${JSON.stringify(params.toolInput, null, 2)}

Should this action execute? Respond with JSON only.`;

  // ── Primary: OpenRouter GPT-4.1 (different vendor from Claude actor) ──────
  if (OPENROUTER_KEY) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4.1',
          messages: [
            { role: 'system', content: JUDGE_SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 400,
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            decision: ['allow','block','revise','escalate'].includes(parsed.decision) ? parsed.decision : 'allow',
            reason: parsed.reason || '',
            revisedInput: parsed.revised_input ?? undefined,
            model: 'openai/gpt-4.1',
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
          };
        }
      }
    } catch (err) {
      console.warn('Judge GPT-4.1 call failed:', err);
    }
  }

  // ── Fallback: Claude Sonnet 4.5 (different tier from Opus actor) ──────────
  if (ANTHROPIC_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 400,
          system: JUDGE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text: string = data.content?.[0]?.text || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            decision: ['allow','block','revise','escalate'].includes(parsed.decision) ? parsed.decision : 'allow',
            reason: parsed.reason || '',
            revisedInput: parsed.revised_input ?? undefined,
            model: 'claude-sonnet-4-5',
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
          };
        }
      }
    } catch (err) {
      console.warn('Judge Claude Sonnet fallback failed:', err);
    }
  }

  // ── Ultimate fallback: fail-open (blocking legitimate actions is worse) ───
  console.warn('All judge models unavailable — defaulting to allow');
  return { decision: 'allow', reason: 'Judge unavailable, defaulting to allow', model: 'fallback', confidence: 0.5 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // ── Parse request ─────────────────────────────────────────────────────────
    const body = await req.json();
    const toolName: string = body.tool_name ?? '';
    const toolInput: Record<string, unknown> = body.tool_input ?? {};
    const actorReasoning: string = body.actor_reasoning ?? '';
    const userQuery: string = body.user_query ?? '';

    if (!toolName) {
      return new Response(JSON.stringify({ error: 'tool_name is required' }), { status: 400, headers: corsHeaders });
    }

    // ── Check user-level policy overrides ────────────────────────────────────
    const riskClass = RISK_CLASSIFICATION[toolName] ?? 'external_impact';
    const { data: policies } = await supabase
      .from('action_policies')
      .select('policy')
      .eq('user_id', user.id)
      .eq('risk_class', riskClass)
      .order('tool_name', { ascending: false }) // tool-specific before class-level
      .limit(1);

    const userPolicy = policies?.[0]?.policy ?? null;

    const actionId = `${toolName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startMs = Date.now();
    let decision: 'allow' | 'block' | 'revise' | 'escalate' = 'allow';
    let reason = '';
    let revisedInput: Record<string, unknown> | null = null;
    let judgeModel = 'auto';
    let confidence = 1.0;

    // ── Apply risk classification logic ───────────────────────────────────────

    if (userPolicy === 'auto_allow') {
      decision = 'allow';
      reason = `Policy override: auto_allow for ${riskClass}`;
    } else if (userPolicy === 'auto_block') {
      decision = 'block';
      reason = `Policy override: auto_block for ${riskClass}`;
    } else if (userPolicy === 'require_human' || riskClass === 'high_risk') {
      // High-risk: no AI judgment, always escalate to human
      decision = 'escalate';
      reason = 'High-risk action requires explicit human confirmation before execution';
      judgeModel = 'policy:require_human';
      confidence = 1.0;

      // Create a pending_confirmation record
      await supabase.from('pending_confirmations').insert({
        user_id: user.id,
        confirmation_type: 'action_approval',
        action_description: `${toolName}: ${JSON.stringify(toolInput).substring(0, 200)}`,
        action_data: { tool_name: toolName, tool_input: toolInput, actor_reasoning: actorReasoning, user_query: userQuery },
        channel: 'app',
        status: 'pending',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
      });

    } else if (riskClass === 'readonly' || riskClass === 'reversible_write') {
      // Auto-allow with logging
      decision = 'allow';
      reason = riskClass === 'readonly'
        ? 'Read-only action: no side effects'
        : 'Reversible write: user-owned data, fully undoable';
      judgeModel = `auto:${riskClass}`;

    } else {
      // EXTERNAL_IMPACT with no override: call judge model
      const judgeResult = await callJudgeModel({ toolName, toolInput, actorReasoning, userQuery });
      decision = judgeResult.decision;
      reason = judgeResult.reason;
      revisedInput = judgeResult.revisedInput ?? null;
      judgeModel = judgeResult.model;
      confidence = judgeResult.confidence;

      // If judge escalates: create pending_confirmation
      if (decision === 'escalate') {
        await supabase.from('pending_confirmations').insert({
          user_id: user.id,
          confirmation_type: 'action_approval',
          action_description: `${toolName} — ${reason}`,
          action_data: { tool_name: toolName, tool_input: toolInput, actor_reasoning: actorReasoning, user_query: userQuery },
          channel: 'app',
          status: 'pending',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
      }
    }

    const processingMs = Date.now() - startMs;

    // ── Log decision (fire-and-forget) ────────────────────────────────────────
    supabase.from('judge_decisions').insert({
      user_id: user.id,
      action_id: actionId,
      tool_name: toolName,
      risk_class: riskClass,
      tool_input: toolInput,
      actor_reasoning: actorReasoning,
      user_query: userQuery,
      decision,
      reason,
      revised_input: revisedInput,
      confidence,
      judge_model: judgeModel,
      processing_ms: processingMs,
    }).then(() => {}).catch(err => console.error('Failed to log judge decision:', err));

    console.log(`Judge: ${toolName} [${riskClass}] → ${decision} (${processingMs}ms, ${judgeModel})`);

    return new Response(
      JSON.stringify({
        decision,
        reason,
        risk_class: riskClass,
        revised_input: revisedInput,
        confidence,
        judge_model: judgeModel,
        processing_ms: processingMs,
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Action judge error:', error);
    // Fail-open: don't block actions when judge is broken
    return new Response(
      JSON.stringify({ decision: 'allow', reason: 'Judge error: defaulting to allow', error: error.message }),
      { status: 200, headers: corsHeaders }
    );
  }
});
