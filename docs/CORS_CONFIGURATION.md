# CORS Configuration

## Overview

Cross-Origin Resource Sharing (CORS) is configured via the `ALLOWED_ORIGINS` environment variable in Supabase Edge Functions to prevent unauthorized cross-origin requests.

## Security Configuration

### Required for Production

**CRITICAL**: Set `ALLOWED_ORIGINS` environment variable in Supabase dashboard before deploying to production.

```bash
# Via Supabase CLI (requires authentication)
supabase secrets set ALLOWED_ORIGINS="https://aiqueryhub.com,https://app.aiqueryhub.com,https://www.aiqueryhub.com"
```

### Via Supabase Dashboard

1. Go to Supabase Dashboard → Settings → Edge Functions
2. Add environment variable:
   - **Key**: `ALLOWED_ORIGINS`
   - **Value**: `https://aiqueryhub.com,https://app.aiqueryhub.com,https://www.aiqueryhub.com`

## Configuration Examples

### Production Domains
```
ALLOWED_ORIGINS=https://aiqueryhub.com,https://app.aiqueryhub.com,https://api.aiqueryhub.com
```

### Staging + Production
```
ALLOWED_ORIGINS=https://staging.aiqueryhub.com,https://app.aiqueryhub.com,https://demo.aiqueryhub.com
```

## Security Behavior

### When ALLOWED_ORIGINS is Configured ✅
- Only whitelisted production domains are allowed
- Development origins (localhost, 127.0.0.1) are always allowed
- All other origins are blocked

### When ALLOWED_ORIGINS is NOT Configured ⚠️
- **ONLY development origins are allowed** (localhost, 127.0.0.1, [::])
- **Production origins are BLOCKED**
- Critical security warnings logged for blocked origins

## Testing CORS Configuration

### Test Allowed Origin
```bash
curl -H "Origin: https://app.aiqueryhub.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query
```

Expected: `Access-Control-Allow-Origin: https://app.aiqueryhub.com`

### Test Blocked Origin
```bash
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query
```

Expected: `Access-Control-Allow-Origin: ` (empty)

## Implementation

CORS logic implemented in `/supabase/functions/_shared/cors.ts`:

- `isOriginAllowed(origin)` - Check if origin is whitelisted
- `getCorsHeaders(origin)` - Generate appropriate CORS headers
- `handleCorsPreflightRequest(request)` - Handle OPTIONS preflight requests

## Security Principles

1. **Secure by Default**: Block unknown origins unless explicitly allowed
2. **Development Friendly**: Local development origins always allowed
3. **Explicit Configuration**: Production domains must be explicitly whitelisted
4. **Fail Secure**: Missing configuration blocks rather than allows

## Troubleshooting

### CORS Errors in Browser Console
```
Access to fetch at 'https://api.aiqueryhub.com' from origin 'https://newdomain.com'
has been blocked by CORS policy
```

**Solution**: Add `https://newdomain.com` to `ALLOWED_ORIGINS` environment variable.

### Functions Logging CORS Warnings
```
SECURITY CRITICAL: CORS is not configured for production.
Set ALLOWED_ORIGINS environment variable immediately.
```

**Solution**: Configure `ALLOWED_ORIGINS` in Supabase dashboard immediately.

## Deployment Checklist

- [ ] Set `ALLOWED_ORIGINS` in Supabase dashboard
- [ ] Include all production domains (www, app, api subdomains)
- [ ] Test CORS preflight requests work correctly
- [ ] Verify unauthorized origins are blocked
- [ ] Check Edge Function logs for security warnings