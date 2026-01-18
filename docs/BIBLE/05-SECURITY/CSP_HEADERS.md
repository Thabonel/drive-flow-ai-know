# Content Security Policy (CSP) Headers

## Overview

Content Security Policy (CSP) is a security standard that helps prevent cross-site scripting (XSS), clickjacking, and other code injection attacks. This document describes the recommended CSP configuration for AI Query Hub.

## Recommended CSP Headers

Add these headers to your deployment configuration (Netlify, Vercel, or custom server):

### Production Configuration

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://openrouter.ai https://api.search.brave.com https://accounts.google.com https://www.googleapis.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Breakdown of Directives

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Default policy for all resource types |
| `script-src` | `'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com` | Allow scripts from self, inline (for React), and Google OAuth |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Allow styles from self, inline (for Tailwind), and Google Fonts |
| `font-src` | `'self' https://fonts.gstatic.com` | Allow fonts from self and Google Fonts |
| `img-src` | `'self' data: https: blob:` | Allow images from self, data URIs, HTTPS, and blobs |
| `connect-src` | See below | API endpoints the app can connect to |
| `frame-src` | `https://accounts.google.com` | Allow Google OAuth iframe |
| `frame-ancestors` | `'none'` | Prevent embedding in iframes (clickjacking protection) |
| `base-uri` | `'self'` | Restrict base tag URLs |
| `form-action` | `'self'` | Restrict form submission targets |

### Connect Sources (API Endpoints)

The `connect-src` directive allows connections to:
- `'self'` - Same origin
- `https://*.supabase.co` - Supabase API and Edge Functions
- `wss://*.supabase.co` - Supabase Realtime WebSocket
- `https://api.anthropic.com` - Claude AI API (for future direct calls)
- `https://openrouter.ai` - OpenRouter API fallback
- `https://api.search.brave.com` - Brave Search API
- `https://accounts.google.com` - Google OAuth
- `https://www.googleapis.com` - Google Drive API

## Implementation

### Netlify (`netlify.toml`)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://openrouter.ai https://api.search.brave.com https://accounts.google.com https://www.googleapis.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
```

### Vercel (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://openrouter.ai https://api.search.brave.com https://accounts.google.com https://www.googleapis.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" }
      ]
    }
  ]
}
```

### Vite Development (`vite.config.ts`)

For development, you can add headers via the Vite server config:

```typescript
export default defineConfig({
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    },
  },
});
```

Note: Full CSP may break hot module replacement in development. Use a relaxed policy for dev.

## Testing CSP

### Browser DevTools
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for CSP violation messages
4. Adjust policy as needed

### Online Tools
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - Google's CSP analyzer
- [Security Headers](https://securityheaders.com/) - Check all security headers

### Report-Only Mode

To test CSP without blocking, use `Content-Security-Policy-Report-Only`:

```
Content-Security-Policy-Report-Only: [your policy here]; report-uri /csp-report
```

This logs violations without enforcing the policy.

## Security Benefits

| Header | Protection Against |
|--------|-------------------|
| CSP | XSS, code injection, data theft |
| X-Frame-Options | Clickjacking |
| X-Content-Type-Options | MIME-type confusion attacks |
| X-XSS-Protection | Reflected XSS (legacy browsers) |
| Referrer-Policy | Information leakage via referrer |
| Permissions-Policy | Unauthorized feature access |

## Maintenance

Review and update CSP when:
- Adding new third-party services
- Integrating new APIs
- Adding new CDN resources
- Changing authentication providers

## Related Documentation

- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
