import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Update token usage for an agent session
 * @param sessionId - The session ID to update
 * @param tokensUsed - Number of tokens consumed in this operation
 * @returns Updated session data including budget status
 */
export async function updateTokenUsage(
  sessionId: string,
  tokensUsed: number
): Promise<{
  success: boolean;
  budgetExceeded: boolean;
  tokensRemaining: number;
}> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Fetch current session
    const { data: session, error: fetchError } = await supabase
      .from('agent_sessions')
      .select('tokens_used, tokens_budget, user_id')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      console.error('Failed to fetch session for token tracking:', fetchError);
      return {
        success: false,
        budgetExceeded: false,
        tokensRemaining: 0,
      };
    }

    const newTokensUsed = session.tokens_used + tokensUsed;
    const tokensRemaining = session.tokens_budget - newTokensUsed;
    const budgetExceeded = tokensRemaining <= 0;

    // Update session with new token count
    const { error: updateError } = await supabase
      .from('agent_sessions')
      .update({ tokens_used: newTokensUsed })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update token usage:', updateError);
      return {
        success: false,
        budgetExceeded,
        tokensRemaining,
      };
    }

    // If budget exceeded, pause the session
    if (budgetExceeded) {
      await supabase
        .from('agent_sessions')
        .update({ status: 'paused' })
        .eq('id', sessionId);

      // Log budget exceeded event
      await supabase
        .from('agent_memory')
        .insert({
          session_id: sessionId,
          user_id: session.user_id,
          memory_type: 'checkpoint',
          content: {
            event: 'budget_exceeded',
            timestamp: new Date().toISOString(),
            tokens_used: newTokensUsed,
            tokens_budget: session.tokens_budget,
          },
          importance: 5,
        });
    }

    return {
      success: true,
      budgetExceeded,
      tokensRemaining,
    };
  } catch (error) {
    console.error('Error in token tracking:', error);
    return {
      success: false,
      budgetExceeded: false,
      tokensRemaining: 0,
    };
  }
}

/**
 * Extract token usage from Claude API response
 * @param response - The Claude API response object
 * @returns Total tokens used (input + output)
 */
export function extractTokensFromClaudeResponse(response: any): number {
  if (!response.usage) return 0;

  const inputTokens = response.usage.input_tokens || 0;
  const outputTokens = response.usage.output_tokens || 0;

  return inputTokens + outputTokens;
}
