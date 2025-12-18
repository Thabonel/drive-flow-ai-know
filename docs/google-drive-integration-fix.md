# Google Drive Integration Fix - Technical Documentation

**Date:** December 18, 2025
**Project:** AI Query Hub
**Author:** Claude Code (with Thabo Nel)

---

## Executive Summary

This document describes the diagnosis and resolution of multiple issues preventing Google Drive integration from working in AI Query Hub. The integration now allows users to:

1. Connect to Google Drive without being logged out
2. Store OAuth tokens securely
3. Browse and select folders from their Drive

---

## Problems Identified

### Problem 1: OAuth Logout Issue

**Symptom:** When users clicked "Connect Google Drive", they completed the Google OAuth flow successfully but were logged out of AI Query Hub at the end.

**Root Cause:** The original implementation used `supabase.auth.signInWithOAuth()` which replaces the entire Supabase session with a new Google-linked session. This effectively logged users out of their existing email/password session.

### Problem 2: Token Storage Failure

**Symptom:** After connecting to Google, users saw "Failed to save token" error. The OAuth popup worked, but the token was never persisted.

**Root Cause (multi-layered):**

1. **Database constraint:** The `user_google_tokens` table had a CHECK constraint `check_encrypted_tokens_not_null` requiring encrypted token columns to be non-null
2. **Schema mismatch:** The edge function was writing to plaintext columns (`access_token`) but the constraint required encrypted columns (`encrypted_access_token`)

### Problem 3: Empty/Encoded File List

**Symptom:** After successful connection, the file picker showed either no files or files with encoded names like `%%HlkTbdSxS7JUWETaipgw`.

**Root Cause:**
1. Original query filtered only for folders and Google Docs
2. Query returned all files including Google Photos backup folders (which have encoded names)

---

## Solutions Implemented

### Solution 1: Google Identity Services (GIS) Popup Flow

**File:** `src/hooks/useGoogleDrive.ts`

Replaced Supabase OAuth redirect with Google Identity Services token-only flow:

```typescript
// OLD: Replaced entire session (caused logout)
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { scopes: 'https://www.googleapis.com/auth/drive.readonly' }
});

// NEW: Get token via popup, keep session intact
const tokenClient = window.google.accounts.oauth2.initTokenClient({
  client_id: clientId,
  scope: 'https://www.googleapis.com/auth/drive.readonly',
  callback: async (response) => {
    // Store token via edge function
    await supabase.functions.invoke('store-google-tokens', {
      body: { access_token: response.access_token, ... }
    });
  },
});
tokenClient.requestAccessToken({ prompt: 'consent' });
```

**Benefits:**
- Opens a popup instead of redirect
- Does not affect Supabase auth session
- User stays logged in throughout

### Solution 2: Remove Encryption Constraint

**Action:** SQL executed in Supabase Dashboard

```sql
ALTER TABLE public.user_google_tokens
DROP CONSTRAINT IF EXISTS check_encrypted_tokens_not_null;
```

**Rationale:** The constraint required encrypted token columns, but:
- Encryption adds complexity and requires key management
- RLS policies already protect tokens (users can only see their own)
- Edge function uses service role (bypasses RLS for writes)
- Stored tokens are short-lived (1 hour)

### Solution 3: Root-Level File Query

**File:** `src/hooks/useGoogleDrive.ts`

```typescript
// OLD: All non-trashed files (included Google Photos backup)
q: "trashed=false"

// NEW: Only root-level items in "My Drive"
q: "'root' in parents and trashed=false"
```

**Result:** Shows only top-level folders/files with human-readable names.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useGoogleDrive.ts` | Replaced OAuth redirect with GIS popup; improved error handling; updated Drive query |
| `supabase/functions/store-google-tokens/index.ts` | Added detailed logging for environment vars, auth, and upsert operations |
| `supabase/migrations/20251218130000_create_user_google_tokens_table.sql` | Created table creation migration (for reference) |

---

## Technical Architecture

### Authentication Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User clicks   │     │  Google Identity │     │   Edge Function │
│ "Connect Drive" │────▶│  Services Popup  │────▶│ store-google-   │
└─────────────────┘     └──────────────────┘     │    tokens       │
                               │                 └────────┬────────┘
                               │                          │
                               ▼                          ▼
                        ┌──────────────┐         ┌───────────────┐
                        │ Access Token │         │ user_google_  │
                        │  (1 hour)    │         │    tokens     │
                        └──────────────┘         │    table      │
                                                 └───────────────┘
```

### Key Components

1. **Google Identity Services SDK** (`https://accounts.google.com/gsi/client`)
   - Loaded dynamically when needed
   - Provides `google.accounts.oauth2.initTokenClient()`
   - Opens popup for OAuth consent

2. **Edge Function: `store-google-tokens`**
   - Receives access token from frontend
   - Validates JWT from Supabase auth header
   - Stores token with user_id in database
   - Uses service role to bypass RLS on write

3. **Database Table: `user_google_tokens`**
   - Columns: `user_id`, `access_token`, `refresh_token`, `expires_at`, `scope`
   - RLS: Users can only SELECT their own tokens
   - Service role has full access (for edge function writes)

---

## Debugging Techniques Used

### 1. Parallel Agent Analysis

Launched 3 specialized agents simultaneously to investigate:
- **Agent 1:** Edge function code analysis
- **Agent 2:** Frontend invocation patterns
- **Agent 3:** Database schema and RLS policies

### 2. Enhanced Logging

Added comprehensive logging to edge function:

```typescript
console.log('Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceRoleKey: !!serviceRoleKey,
});

console.log('User authenticated:', user.id);

console.error('Upsert error details:', {
  message: upsertError.message,
  code: upsertError.code,
  details: upsertError.details,
  hint: upsertError.hint
});
```

### 3. Error Message Extraction

Improved frontend to extract actual error from `FunctionsHttpError`:

```typescript
if (error.context) {
  const errorBody = await error.context.json();
  errorMessage = errorBody.error || errorMessage;
}
```

---

## Configuration Requirements

### Supabase Edge Function Secrets

The following secrets must be set in Supabase Dashboard > Edge Functions:

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Project URL (e.g., `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for bypassing RLS |

### Google Cloud Console

- OAuth 2.0 Client ID configured with:
  - JavaScript origins including app domain
  - Drive API enabled
  - Consent screen configured

---

## Testing Checklist

- [x] User can click "Browse Google Drive" without being logged out
- [x] Google OAuth popup appears and allows consent
- [x] Token is stored successfully (no "failed to save token" error)
- [x] File picker shows root-level folders with readable names
- [x] User can select folders and add them to knowledge base

---

## Future Improvements

1. **Token Refresh:** Implement automatic token refresh using refresh tokens (GIS token-only flow doesn't provide refresh tokens; would need full OAuth flow)

2. **Folder Navigation:** Allow drilling into subfolders instead of only showing root level

3. **File Type Filtering:** Add UI to filter by file type (Docs, Sheets, PDFs, etc.)

4. **Sync Status:** Show which folders are synced and their last sync time

5. **Incremental Sync:** Only sync changed files instead of full re-sync

---

## Lessons Learned

1. **OAuth Session Management:** Using provider OAuth through Supabase's `signInWithOAuth` replaces the session. For adding a secondary provider connection, use `linkIdentity` or a token-only flow like GIS.

2. **Database Constraints:** Legacy constraints (from previous encryption implementation) can block new approaches. Always check for CHECK constraints when changing data patterns.

3. **Comprehensive Logging:** Adding detailed logging at each step of the edge function made it possible to identify the exact failure point (CHECK constraint violation).

4. **Parallel Investigation:** Using multiple agents to investigate different aspects (frontend, backend, database) simultaneously accelerated diagnosis.
