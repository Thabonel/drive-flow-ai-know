/**
 * Rate Limiting Utility for Supabase Edge Functions
 *
 * Implements a sliding window rate limiter using in-memory storage.
 * For production, consider using a database table or Redis for distributed rate limiting.
 *
 * Usage:
 *   import { checkRateLimit, RateLimitConfig } from '../_shared/rate-limit.ts';
 *
 *   const config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }; // 10 req/min
 *   const result = await checkRateLimit(userId, 'ai-query', config);
 *   if (!result.allowed) {
 *     return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
 *   }
 */

export interface RateLimitConfig {
  maxRequests: number;    // Maximum requests allowed in the window
  windowMs: number;       // Window size in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;        // Unix timestamp when the limit resets
  retryAfter?: number;    // Seconds until the client can retry (if blocked)
}

// In-memory store for rate limiting (per-isolate)
// Note: Supabase Edge Functions are stateless, so this only works within a single invocation
// For persistent rate limiting, use the database-backed version below
const memoryStore = new Map<string, { count: number; windowStart: number }>();

/**
 * Simple in-memory rate limiter (per-isolate only)
 * Use for basic protection, but note it resets on function cold starts
 */
export function checkRateLimitMemory(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${endpoint}:${identifier}`;
  const now = Date.now();

  const record = memoryStore.get(key);

  if (!record || now - record.windowStart >= config.windowMs) {
    // Start new window
    memoryStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.windowStart + config.windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.windowStart + config.windowMs,
      retryAfter,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.windowStart + config.windowMs,
  };
}

/**
 * Database-backed rate limiter for persistent rate limiting across function invocations
 * Requires a 'rate_limits' table in the database:
 *
 * CREATE TABLE IF NOT EXISTS rate_limits (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   identifier TEXT NOT NULL,
 *   endpoint TEXT NOT NULL,
 *   request_count INT NOT NULL DEFAULT 1,
 *   window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   UNIQUE(identifier, endpoint)
 * );
 *
 * CREATE INDEX idx_rate_limits_lookup ON rate_limits(identifier, endpoint, window_start);
 */
export async function checkRateLimitDb(
  supabaseClient: any,
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    // Try to get existing record within the current window
    const { data: existing, error: selectError } = await supabaseClient
      .from('rate_limits')
      .select('id, request_count, window_start')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Rate limit check error:', selectError);
      // On error, allow the request but log it
      return { allowed: true, remaining: config.maxRequests, resetAt: now.getTime() + config.windowMs };
    }

    if (!existing) {
      // No record in current window, create one
      await supabaseClient
        .from('rate_limits')
        .upsert({
          identifier,
          endpoint,
          request_count: 1,
          window_start: now.toISOString(),
        }, {
          onConflict: 'identifier,endpoint',
        });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now.getTime() + config.windowMs,
      };
    }

    if (existing.request_count >= config.maxRequests) {
      const existingWindowStart = new Date(existing.window_start).getTime();
      const retryAfter = Math.ceil((existingWindowStart + config.windowMs - now.getTime()) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt: existingWindowStart + config.windowMs,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    // Increment counter
    await supabaseClient
      .from('rate_limits')
      .update({ request_count: existing.request_count + 1 })
      .eq('id', existing.id);

    return {
      allowed: true,
      remaining: config.maxRequests - existing.request_count - 1,
      resetAt: new Date(existing.window_start).getTime() + config.windowMs,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow the request
    return { allowed: true, remaining: config.maxRequests, resetAt: now.getTime() + config.windowMs };
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

// Preset configurations for common use cases
export const RATE_LIMIT_PRESETS = {
  // Strict: 10 requests per minute (for expensive AI operations)
  AI_QUERY: { maxRequests: 10, windowMs: 60 * 1000 },

  // Moderate: 30 requests per minute (for general API calls)
  GENERAL_API: { maxRequests: 30, windowMs: 60 * 1000 },

  // Auth: 5 requests per minute (for login/register)
  AUTH: { maxRequests: 5, windowMs: 60 * 1000 },

  // Generous: 100 requests per minute (for read operations)
  READ_OPERATIONS: { maxRequests: 100, windowMs: 60 * 1000 },

  // Document processing: 5 requests per minute
  DOCUMENT_PROCESSING: { maxRequests: 5, windowMs: 60 * 1000 },
} as const;
