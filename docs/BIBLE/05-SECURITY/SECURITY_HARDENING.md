# Security Hardening Guide

**Last Updated**: January 18, 2026
**Version**: 1.0.0
**Status**: Production Ready

---

## Overview

This document covers the security hardening measures implemented in AI Query Hub, including XSS prevention, CORS protection, rate limiting, and other security utilities.

---

## Table of Contents

1. [XSS Prevention](#xss-prevention)
2. [CORS Protection](#cors-protection)
3. [Rate Limiting](#rate-limiting)
4. [Path Traversal Prevention](#path-traversal-prevention)
5. [OAuth Token Security](#oauth-token-security)
6. [Environment Variable Validation](#environment-variable-validation)
7. [Content Security Policy](#content-security-policy)
8. [Security Checklist](#security-checklist)

---

## XSS Prevention

### DOMPurify Integration

All user-generated HTML content is sanitized using DOMPurify before rendering.

**File**: `src/components/DocumentViewerModal.tsx`

```typescript
import DOMPurify from 'dompurify';

// Safe HTML rendering
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(formData.content || 'No content available')
}} />
```

### Why DOMPurify?

- Industry-standard XSS sanitization library
- Removes malicious scripts, event handlers, and dangerous attributes
- Preserves safe HTML formatting
- Actively maintained with security updates

### Installation

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### Best Practices

1. **Always sanitize** before using `dangerouslySetInnerHTML`
2. **Never trust** user-generated content
3. **Audit regularly** for new `dangerouslySetInnerHTML` usage
4. **Test with payloads** like `<img src=x onerror="alert(1)">`

---

## CORS Protection

### Secure CORS Implementation

**File**: `supabase/functions/_shared/cors.ts`

The CORS utility provides:
- Configurable allowed origins via environment variable
- Backwards compatibility for existing deployments
- Security warnings for misconfigured production environments

### Configuration

Set `ALLOWED_ORIGINS` in Supabase secrets:

```bash
# Set allowed origins (comma-separated)
supabase secrets set ALLOWED_ORIGINS="https://aiqueryhub.com,https://app.aiqueryhub.com"
```

### Usage in Edge Functions

```typescript
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle preflight requests
  const preflightResponse = handleCorsPreflightRequest(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get('origin');

  // Use secure CORS headers
  return new Response(JSON.stringify(data), {
    headers: {
      ...getCorsHeaders(origin),
      'Content-Type': 'application/json'
    }
  });
});
```

### Default Allowed Origins (Development)

- `http://localhost:8080`
- `http://localhost:5173`
- `http://localhost:3000`
- `http://[::]:8080`
- `http://127.0.0.1:8080`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

### Backwards Compatibility

If `ALLOWED_ORIGINS` is not configured:
- All origins are allowed (for backwards compatibility)
- Security warning is logged for non-localhost origins
- This ensures existing deployments don't break

### Production Checklist

1. Set `ALLOWED_ORIGINS` environment variable
2. Include only production domains
3. Test CORS from allowed and blocked origins
4. Monitor logs for CORS security warnings

---

## Rate Limiting

### Database-Backed Rate Limiting

**File**: `supabase/functions/_shared/rate-limit.ts`

Implements sliding window rate limiting using Supabase database.

### Rate Limit Presets

```typescript
export const RATE_LIMIT_PRESETS = {
  AI_QUERY: { maxRequests: 10, windowMs: 60 * 1000 },      // 10/min
  AUTH: { maxRequests: 5, windowMs: 60 * 1000 },           // 5/min
  DOCUMENT_UPLOAD: { maxRequests: 20, windowMs: 60 * 1000 }, // 20/min
  API_GENERAL: { maxRequests: 100, windowMs: 60 * 1000 },  // 100/min
};
```

### Database Schema

**File**: `supabase/migrations/20260118_add_rate_limits_table.sql`

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only access
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL
  USING (auth.role() = 'service_role');
```

### Usage in Edge Functions

```typescript
import {
  checkRateLimitDb,
  getRateLimitHeaders,
  RATE_LIMIT_PRESETS
} from '../_shared/rate-limit.ts';

// After user authentication
const rateLimitResult = await checkRateLimitDb(
  supabaseService,
  user.id,
  'ai-query',
  RATE_LIMIT_PRESETS.AI_QUERY
);

if (!rateLimitResult.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(rateLimitResult),
        'Content-Type': 'application/json'
      }
    }
  );
}
```

### Rate Limit Response Headers

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when window resets

---

## Path Traversal Prevention

### Filename Sanitization

**File**: `supabase/functions/parse-document/index.ts`

```typescript
// Sanitize filename to prevent path traversal attacks
function sanitizeFileName(fileName: string): string {
  // Remove any path components - only keep the base filename
  const baseName = fileName.split('/').pop()?.split('\\').pop() || 'document';

  // Remove any remaining dangerous characters
  const sanitized = baseName
    .replace(/\.\./g, '')                    // Remove parent directory references
    .replace(/[<>:"|?*\x00-\x1f]/g, '')      // Remove invalid filename characters
    .trim();

  // Ensure we have a valid filename
  return sanitized || 'document';
}

// Generate a secure random temp filename
function generateTempFilePath(originalFileName: string): string {
  const sanitized = sanitizeFileName(originalFileName);
  const extension = sanitized.includes('.') ? sanitized.split('.').pop() : '';
  const randomId = crypto.randomUUID();
  return `/tmp/parse_${randomId}${extension ? '.' + extension : ''}`;
}
```

### Attack Prevention

- Strips path components (`/`, `\`)
- Removes parent directory references (`..`)
- Removes invalid filename characters
- Uses random UUIDs for temp files
- Cleans up temp files in `finally` block

---

## OAuth Token Security

### Token Logging Prevention

**File**: `src/hooks/useGoogleDrive.ts`

All `console.log` statements containing sensitive token data have been removed.

### URL Token Clearing

Tokens are cleared from URL hash after OAuth redirect:

```typescript
if (urlAccessToken || urlProviderToken) {
  await new Promise(resolve => setTimeout(resolve, 500));

  // Security: Clear tokens from URL to prevent exposure in browser history
  if (window.history && window.history.replaceState) {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.search
    );
  }
}
```

### Best Practices

1. Never log tokens to console
2. Clear tokens from URL immediately after extraction
3. Store tokens securely in database (encrypted)
4. Use short-lived access tokens
5. Refresh tokens before expiration

---

## Environment Variable Validation

### Validation Utility

**File**: `supabase/functions/_shared/env-validation.ts`

```typescript
/**
 * Validates that required environment variables are set
 * @param required Array of required environment variable names
 * @returns Error message if validation fails, null if all vars are set
 */
export function validateEnvVars(required: string[]): string | null {
  const missing: string[] = [];

  for (const envVar of required) {
    const value = Deno.env.get(envVar);
    if (!value || value.trim() === '') {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    return `Missing required environment variables: ${missing.join(', ')}`;
  }

  return null;
}

/**
 * Validates environment variables and throws if any are missing
 */
export function requireEnvVars(required: string[]): void {
  const error = validateEnvVars(required);
  if (error) {
    throw new Error(error);
  }
}
```

### Usage

```typescript
import { validateEnvVars } from '../_shared/env-validation.ts';

serve(async (req) => {
  // Validate required env vars at start
  const envError = validateEnvVars([
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY'
  ]);

  if (envError) {
    console.error(envError);
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500 }
    );
  }

  // Continue with function logic...
});
```

---

## Content Security Policy

See [CSP_HEADERS.md](./CSP_HEADERS.md) for complete CSP configuration documentation.

### Quick Reference

**Netlify** (`netlify.toml`):
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; ..."
```

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; ..." }
      ]
    }
  ]
}
```

---

## Security Checklist

### Pre-Deployment

- [ ] `ALLOWED_ORIGINS` environment variable set
- [ ] All required environment variables configured
- [ ] CSP headers configured in hosting platform
- [ ] Rate limit migration applied
- [ ] DOMPurify installed and configured

### Testing

- [ ] XSS payloads blocked: `<img src=x onerror="alert(1)">`
- [ ] CORS blocks requests from unauthorized origins
- [ ] Rate limiting triggers after threshold
- [ ] Path traversal attempts fail
- [ ] Tokens not visible in console logs
- [ ] Tokens cleared from URL after OAuth

### Monitoring

- [ ] Monitor logs for CORS security warnings
- [ ] Track rate limit violations
- [ ] Alert on authentication failures
- [ ] Review error logs for security issues

---

## Security Utilities Reference

| Utility | File | Purpose |
|---------|------|---------|
| `getCorsHeaders` | `_shared/cors.ts` | Secure CORS headers |
| `handleCorsPreflightRequest` | `_shared/cors.ts` | Handle OPTIONS requests |
| `isOriginAllowed` | `_shared/cors.ts` | Check origin against whitelist |
| `checkRateLimitDb` | `_shared/rate-limit.ts` | Database rate limiting |
| `getRateLimitHeaders` | `_shared/rate-limit.ts` | Rate limit response headers |
| `validateEnvVars` | `_shared/env-validation.ts` | Environment validation |
| `requireEnvVars` | `_shared/env-validation.ts` | Throw on missing env vars |
| `sanitizeFileName` | `parse-document/index.ts` | Path traversal prevention |
| `DOMPurify.sanitize` | Frontend | XSS prevention |

---

## Related Documentation

- [EMAIL_CONFIRMATION.md](./EMAIL_CONFIRMATION.md) - Email authentication flow
- [CSP_HEADERS.md](./CSP_HEADERS.md) - Content Security Policy configuration
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Authentication system overview
- [ROW_LEVEL_SECURITY.md](./ROW_LEVEL_SECURITY.md) - RLS policies

---

**End of Security Hardening Guide**
