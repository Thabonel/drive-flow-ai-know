# Google OAuth Architecture

## Multi-User SaaS Design - Security & Scalability

This document explains how the AI Query Hub OAuth architecture correctly supports unlimited users with a single Google OAuth Client ID, addressing common misconceptions about multi-tenant OAuth implementations.

## 🔐 Security Model

### Client ID (Public)
- **Safe to hardcode in frontend code** ✅
- **Designed to be public** by OAuth 2.0 specification
- **Same Client ID shared across all users** (standard pattern)
- **No security risk** - acts like a public identifier

### Client Secret (Not Used)
- **Not required** for browser-based OAuth flows ✅
- **PKCE (Proof Key for Code Exchange)** provides security instead
- **Eliminates secret exposure risk** in frontend code

### User Tokens (Private)
- **Stored per-user** with unique `user_id` foreign key
- **Row-Level Security (RLS)** prevents cross-user access
- **Encrypted in transit and at rest** by Supabase
- **Scoped to individual Google accounts** - User A cannot access User B's data

## 🏗️ Multi-User Architecture

### How Multiple Users Connect

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User A    │    │   User B    │    │   User C    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ├─ Clicks "Connect Google Drive"        │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│        Google OAuth Popup (Same Client ID)             │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Sign in with your Google account:                   ││
│  │ • User A → alice@gmail.com                          ││
│  │ • User B → bob@company.com                          ││
│  │ • User C → charlie@example.org                      ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Token scoped│    │ Token scoped│    │ Token scoped│
│ to User A's │    │ to User B's │    │ to User C's │
│Google account│    │Google account│    │Google account│
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Database                          │
│  user_google_tokens table:                             │
│  ┌─────────┬──────────────────┬─────────────────────┐   │
│  │ user_id │ access_token     │ google_account      │   │
│  ├─────────┼──────────────────┼─────────────────────┤   │
│  │ alice-1 │ token_for_alice  │ alice@gmail.com     │   │
│  │ bob-2   │ token_for_bob    │ bob@company.com     │   │
│  │ charlie3│ token_for_charlie│ charlie@example.org │   │
│  └─────────┴──────────────────┴─────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Isolation Verification

**User A queries documents:**
```sql
-- RLS automatically filters to user's data only
SELECT * FROM knowledge_documents WHERE user_id = 'alice-1';
-- Returns: Only Alice's documents
```

**Google Drive API calls:**
```javascript
// User A's token is used
fetch('https://www.googleapis.com/drive/v3/files', {
  headers: { Authorization: `Bearer ${alice_token}` }
});
// Returns: Only Alice's Google Drive files
```

## 📋 Implementation Consistency

### Before (Inconsistent)

❌ **Mixed patterns caused confusion:**
- `useGoogleDriveSimple.ts` → Hardcoded Client ID
- `useGoogleCalendar.ts` → Hardcoded Client ID
- `useGoogleOAuth.ts` → Tried to fetch from deprecated Edge Function
- `get-google-config` → Returned 410 error (deprecated)

### After (Consistent)

✅ **Standardized hardcoded configuration:**
- `useGoogleDriveSimple.ts` → Hardcoded Client ID ✅
- `useGoogleCalendar.ts` → Hardcoded Client ID ✅
- `useGoogleOAuth.ts` → **NOW** uses hardcoded Client ID ✅
- `get-google-config` → **REMOVED** (no longer needed)

## 🔧 Current Configuration

### Hardcoded OAuth Credentials

```typescript
// Used consistently across all hooks
const GOOGLE_CLIENT_ID = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';
const GOOGLE_API_KEY = '<GOOGLE_TOKEN>'; // For API calls
```

### Files Using This Pattern

| File | Status | Configuration |
|------|--------|---------------|
| `src/hooks/useGoogleDriveSimple.ts` | ✅ Working | Hardcoded Client ID |
| `src/hooks/useGoogleCalendar.ts` | ✅ Working | Hardcoded Client ID |
| `src/hooks/useGoogleOAuth.ts` | ✅ **Fixed** | **Now** hardcoded Client ID |

### Database Schema

```sql
-- User tokens with proper isolation
CREATE TABLE user_google_tokens (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  expires_at TIMESTAMP,
  scope TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row-Level Security ensures users only see their tokens
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own tokens"
ON user_google_tokens
FOR ALL USING (auth.uid() = user_id);
```

## ✅ Why This Architecture Works

### 1. OAuth 2.0 Standard Compliance
- **Client ID is public by design** - not a secret
- **PKCE provides security** without client secrets
- **Popup-based flow** eliminates redirect complexity
- **Standard pattern** used by Google, Microsoft, etc.

### 2. Scalability
- **No per-customer setup required** - any user can connect instantly
- **No Client ID limits** - Google allows unlimited users per Client ID
- **No additional OAuth apps needed** - one app serves all users
- **Cost-effective** - no per-tenant OAuth management

### 3. Security
- **Token isolation** - users cannot access each other's tokens
- **RLS enforcement** - database-level access control
- **No credentials in frontend** - only public identifiers
- **CSRF protection** - state parameter validation

### 4. Maintenance
- **Simple deployment** - no environment variable configuration
- **Consistent patterns** - same approach across all integrations
- **No API calls for config** - faster initialization
- **Clear code flow** - easy to debug and understand

## 🚫 Common Misconceptions

### "Hardcoding is insecure"
**Reality:** OAuth 2.0 Client IDs are designed to be public. Hardcoding them is the standard practice for browser-based applications.

### "Need separate Client ID per user"
**Reality:** One Client ID serves unlimited users. Each user authenticates with their own Google account via the same OAuth app.

### "Client Secret required"
**Reality:** Browser-based OAuth uses PKCE instead of Client Secrets for security.

### "Environment variables are more secure"
**Reality:** For public values like Client IDs, environment variables add complexity without security benefits.

## 📚 References

- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [PKCE for OAuth 2.0](https://tools.ietf.org/html/rfc7636)
- [Google Identity Platform - JavaScript SDK](https://developers.google.com/identity/gsi/web)
- [OAuth 2.0 for Browser-Based Apps](https://tools.ietf.org/html/draft-ietf-oauth-browser-based-apps)

## 🎯 Summary

The AI Query Hub OAuth architecture is correctly implemented for multi-user SaaS:

✅ **Single Client ID safely supports unlimited users**
✅ **Each user connects their own Google account**
✅ **Tokens are properly isolated per-user**
✅ **Security maintained through RLS and PKCE**
✅ **Consistent implementation across all Google integrations**

No architectural changes are needed to support multiple users - the system is already designed correctly for multi-tenancy.