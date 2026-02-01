# Google Integration Implementation Guide

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [OAuth Authentication Flow](#2-oauth-authentication-flow)
3. [Token Management & Storage](#3-token-management--storage)
4. [Google Calendar Integration](#4-google-calendar-integration)
5. [Google Drive Integration](#5-google-drive-integration)
6. [Google Sheets Integration](#6-google-sheets-integration)
7. [Error Patterns & Debugging](#7-error-patterns--debugging)
8. [Security Model](#8-security-model)
9. [Testing & Validation](#9-testing--validation)
10. [Troubleshooting Guide](#10-troubleshooting-guide)

---

## 1. Architecture Overview

### Integration Scope

AI Query Hub integrates with multiple Google services to provide seamless document management and calendar synchronization:

- **Google Drive**: File browsing, folder navigation, document import
- **Google Calendar**: Two-way event synchronization with timeline
- **Google Sheets**: Read/write access for data analysis
- **Google OAuth 2.0**: Multi-user authentication with token isolation

### Security Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase       │    │   Google APIs   │
│   (React/TS)    │    │   (Edge + DB)    │    │   (OAuth 2.0)   │
│                 │    │                  │    │                 │
│ • Hardcoded     │◄──►│ • Token Storage  │◄──►│ • Calendar API  │
│   Client ID     │    │ • RLS Policies   │    │ • Drive API     │
│ • PKCE Security │    │ • Service Role   │    │ • Sheets API    │
│ • State CSRF    │    │ • Edge Functions │    │ • Identity API  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Key Security Principles:**
- **Client ID is PUBLIC** by OAuth 2.0 design - safe to hardcode
- **No Client Secret** in frontend (uses PKCE for browser security)
- **Per-user token isolation** via Row-Level Security (RLS)
- **Multi-tenant support** - single Client ID serves unlimited users

---

## 2. OAuth Authentication Flow

### Configuration

**Hardcoded Credentials (Secure Pattern):**
```typescript
// Used consistently across all Google integrations
const GOOGLE_CLIENT_ID = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY_HERE'; // Replace with your actual API key
```

### OAuth 2.0 Flow with PKCE

**File:** `src/hooks/useGoogleOAuth.ts`

```typescript
// 1. Generate PKCE parameters
const codeVerifier = generateCodeVerifier();    // Random 32 bytes
const codeChallenge = await generateCodeChallenge(codeVerifier);  // SHA-256
const state = generateState();                  // CSRF protection

// 2. Store securely
sessionStorage.setItem('google_code_verifier', codeVerifier);
sessionStorage.setItem('google_state', state);

// 3. Initialize OAuth with Google Identity Services
const tokenClient = window.google.accounts.oauth2.initTokenClient({
  client_id: GOOGLE_CLIENT_ID,
  scope: requestedScope,
  state: state,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  callback: handleOAuthCallback
});

// 4. Request token
tokenClient.requestAccessToken({ prompt: 'consent' });
```

### Multi-User Authentication

**User Flow:**
```
User A → OAuth popup → User A's Google account → User A's tokens (isolated)
User B → OAuth popup → User B's Google account → User B's tokens (isolated)
```

**Key Points:**
- Same Client ID used for all users
- Each user authenticates with their own Google account
- Tokens stored with user-specific isolation
- No impact between different users' connections

---

## 3. Token Management & Storage

### Database Schema

**Table:** `user_google_tokens`

```sql
CREATE TABLE user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,                    -- Usually null (OAuth 2.0 implicit)
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,                           -- Comma-separated scopes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT user_google_tokens_user_id_key UNIQUE (user_id)
);
```

### Row-Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can access own tokens" ON user_google_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Service role (Edge Functions) has full access
CREATE POLICY "Service role full access" ON user_google_tokens
  FOR ALL USING (auth.role() = 'service_role');
```

### Token Storage Flow

**Edge Function:** `supabase/functions/store-google-tokens/index.ts`

```typescript
// 1. Validate user authentication
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) throw new Error('Unauthorized');

// 2. Calculate expiration
const expiresAt = new Date(Date.now() + (expiresIn * 1000));

// 3. Store token with upsert (handles existing tokens)
const { data, error } = await supabase
  .from('user_google_tokens')
  .upsert({
    user_id: user.id,
    access_token: accessToken,
    token_type: 'Bearer',
    expires_at: expiresAt.toISOString(),
    scope: scope,
    updated_at: new Date().toISOString()
  })
  .select()
  .single();
```

### Token Validation & Expiration

**Check Before API Calls:**
```typescript
const getValidToken = async () => {
  const { data: tokenRecord } = await supabase
    .from('user_google_tokens')
    .select('access_token, expires_at')
    .eq('user_id', user.id)
    .single();

  if (!tokenRecord) return null;

  // Check expiration
  if (new Date(tokenRecord.expires_at) <= new Date()) {
    console.log('Token expired, user needs to re-authenticate');
    return null;
  }

  return tokenRecord.access_token;
};
```

---

## 4. Google Calendar Integration

### Hook Implementation

**File:** `src/hooks/useGoogleCalendar.ts`

### Initialization Process

**Step 1: Load Required Scripts**
```typescript
// Load Google Identity Services and GAPI
await Promise.all([
  loadScript('https://accounts.google.com/gsi/client'),
  loadScript('https://apis.google.com/js/api.js')
]);

// Initialize GAPI client
await gapi.client.init({
  apiKey: GOOGLE_API_KEY,
  discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
});
```

**Step 2: Authentication Flow**
```typescript
const connectCalendar = async () => {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/calendar',
    callback: async (response) => {
      // Store tokens
      await storeTokens(response);

      // Load user's calendars
      const calendars = await loadCalendars();

      // Auto-select primary calendar and create sync settings
      const primaryCalendar = calendars.find(cal => cal.primary);
      if (primaryCalendar) {
        await createSyncSettings(primaryCalendar.id);
        await triggerInitialSync(primaryCalendar.id);
      }
    }
  });

  tokenClient.requestAccessToken({ prompt: 'consent' });
};
```

### Calendar Synchronization System

**Database Tables:**

**1. Calendar Sync Settings**
```sql
CREATE TABLE calendar_sync_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  enabled BOOLEAN DEFAULT true,
  selected_calendar_id TEXT,              -- Google Calendar ID
  sync_direction TEXT CHECK (sync_direction IN ('to_calendar', 'from_calendar', 'both')),
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 15,
  target_layer_id UUID REFERENCES timeline_layers(id),
  last_sync_at TIMESTAMP,
  last_sync_status TEXT,
  last_sync_error TEXT
);
```

**2. Calendar Sync Logs**
```sql
CREATE TABLE calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  sync_type TEXT CHECK (sync_type IN ('manual', 'scheduled', 'realtime')),
  status TEXT CHECK (status IN ('success', 'error', 'partial')),
  events_fetched INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  error_message TEXT,
  sync_duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Bidirectional Sync Process

**Edge Function:** `supabase/functions/google-calendar-sync/index.ts`

**Step 1: Fetch Google Calendar Events**
```typescript
// Time range: 30 days ago to 90 days future
const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

const response = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
  `timeMin=${timeMin.toISOString()}&` +
  `timeMax=${timeMax.toISOString()}&` +
  `singleEvents=true&orderBy=startTime`,
  {
    headers: { Authorization: `Bearer ${accessToken}` }
  }
);
```

**Step 2: Sync FROM Google TO Timeline**
```typescript
for (const googleEvent of googleEvents) {
  // Check if timeline item already exists
  const existingItem = await supabase
    .from('timeline_items')
    .select('*')
    .eq('google_event_id', googleEvent.id)
    .eq('user_id', userId)
    .single();

  if (existingItem.data) {
    // Check if Google event is newer
    const googleUpdated = new Date(googleEvent.updated);
    const localUpdated = new Date(existingItem.data.updated_at);

    if (googleUpdated > localUpdated) {
      // Update local item with Google data
      await updateTimelineItem(existingItem.data.id, googleEvent);
    }
  } else {
    // Create new timeline item
    await createTimelineItem(googleEvent, targetLayerId);
  }
}
```

**Step 3: Sync FROM Timeline TO Google**
```typescript
// Get timeline items not synced to Google
const localItems = await supabase
  .from('timeline_items')
  .select('*')
  .eq('user_id', userId)
  .is('google_event_id', null)
  .eq('sync_status', 'pending');

for (const item of localItems.data) {
  const googleEvent = {
    summary: item.title,
    start: {
      dateTime: new Date(item.start_time).toISOString(),
      timeZone: 'UTC'
    },
    end: {
      dateTime: new Date(
        new Date(item.start_time).getTime() +
        item.duration_minutes * 60 * 1000
      ).toISOString(),
      timeZone: 'UTC'
    },
    extendedProperties: {
      private: {
        aiqueryhub_id: item.id,
        aiqueryhub_layer_id: item.layer_id
      }
    }
  };

  // Create event in Google Calendar
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(googleEvent)
    }
  );

  const createdEvent = await response.json();

  // Update timeline item with Google event ID
  await supabase
    .from('timeline_items')
    .update({
      google_event_id: createdEvent.id,
      google_calendar_id: calendarId,
      sync_status: 'synced'
    })
    .eq('id', item.id);
}
```

---

## 5. Google Drive Integration

### Hook Implementation

**File:** `src/hooks/useGoogleDriveSimple.ts`

### Core Features

**1. Authentication & Connection Check**
```typescript
const checkConnection = async () => {
  const { data: storedToken } = await supabase
    .from('user_google_tokens')
    .select('access_token, expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (storedToken?.access_token) {
    const expiresAt = new Date(storedToken.expires_at);
    if (expiresAt > new Date()) {
      setIsAuthenticated(true);
      return true;
    }
  }

  setIsAuthenticated(false);
  return false;
};
```

**2. OAuth Sign-In**
```typescript
const signIn = async () => {
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    callback: async (response) => {
      if (response.error) {
        // Handle error
        return;
      }

      // Store token via Edge Function
      await supabase.functions.invoke('store-google-tokens', {
        body: {
          access_token: response.access_token,
          expires_in: response.expires_in || 3600,
          scope: 'https://www.googleapis.com/auth/drive.readonly'
        }
      });

      setIsAuthenticated(true);
    }
  });

  tokenClient.requestAccessToken({ prompt: 'consent' });
};
```

**3. Drive File Listing**
```typescript
const loadDriveItems = async (folderId = 'root') => {
  const accessToken = await getAccessToken();

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,parents)',
      pageSize: '100',
      orderBy: 'folder,name'
    }),
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const data = await response.json();
  setDriveItems(data.files || []);
};
```

### Document Sync System

**Edge Function:** `supabase/functions/google-drive-sync/index.ts`

**Workflow:**
1. **Folder Setup**: User adds Google Drive folder via UI
2. **Sync Job**: Periodic sync jobs fetch folder contents
3. **Document Processing**: Google Docs exported as plain text
4. **AI Analysis**: Trigger document analysis for knowledge base
5. **Storage**: Store in `knowledge_documents` table

```typescript
// Export Google Doc as plain text
const exportDoc = async (fileId: string, accessToken: string) => {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to export document: ${response.status}`);
  }

  return await response.text();
};
```

---

## 6. Google Sheets Integration

### Hook Implementation

**File:** `src/hooks/useGoogleSheets.ts`

### Edge Function API

**File:** `supabase/functions/google-sheets-api/index.ts`

### Security Features

**1. Input Validation**
```typescript
// Sheet ID validation (44 character alphanumeric)
const SHEET_ID_PATTERN = /^[a-zA-Z0-9_-]{44}$/;
if (!SHEET_ID_PATTERN.test(sheetId)) {
  throw new Error('Invalid sheet ID format');
}

// Range validation (A1 notation)
const RANGE_PATTERN = /^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$/;
if (!RANGE_PATTERN.test(range)) {
  throw new Error('Invalid range format');
}

// Dangerous character filtering
const sanitizeValue = (value: any) => {
  if (typeof value === 'string') {
    return value.replace(/[<>\"'&]/g, '');
  }
  return value;
};
```

**2. Rate Limiting**
```typescript
// Rate limiting: 100 requests per 100 seconds per user
const rateLimitKey = `sheets_api:${user.id}`;
const currentCount = await redis.incr(rateLimitKey);

if (currentCount === 1) {
  await redis.expire(rateLimitKey, 100); // 100 second window
}

if (currentCount > 100) {
  const ttl = await redis.ttl(rateLimitKey);
  return new Response(
    JSON.stringify({
      error: `Rate limit exceeded. Please wait ${ttl} seconds.`
    }),
    { status: 429 }
  );
}
```

### API Operations

**1. Read Sheet Data**
```typescript
const readSheet = async (sheetId: string, range: string) => {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const data = await response.json();
  return data.values || [];
};
```

**2. Write Sheet Data**
```typescript
const writeSheet = async (sheetId: string, range: string, values: any[][]) => {
  // Limit to 1000 rows max
  if (values.length > 1000) {
    throw new Error('Maximum 1000 rows per write operation');
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: values.map(row => row.map(sanitizeValue))
      })
    }
  );

  return await response.json();
};
```

---

## 7. Error Patterns & Debugging

### Common Error Categories

#### 1. Script Loading Failures

**Error:** "Failed to load Google Identity Services script"

**Causes:**
- CORS policy blocking script from `accounts.google.com`
- Network connectivity issues
- Browser security policies
- Script timeout

**Debug Approach:**
```typescript
// Check script loading in console
console.log('Google loaded:', !!window.google);
console.log('OAuth2 available:', !!window.google?.accounts?.oauth2);

// Monitor network tab for failed requests
// Look for CORS errors in console
```

**Resolution:**
- Ensure `accounts.google.com` is not blocked by firewall/proxy
- Check browser console for specific error messages
- Verify internet connectivity
- Try different browser to isolate browser-specific issues

#### 2. Token Expiration Issues

**Error:** "No Google Calendar access token found"

**Causes:**
- Token stored but now expired (`expires_at < NOW()`)
- Token deleted from database
- User revoked permissions in Google account

**Debug Query:**
```sql
SELECT
  user_id,
  access_token IS NOT NULL as has_token,
  expires_at,
  NOW() as current_time,
  expires_at < NOW() as is_expired,
  scope
FROM user_google_tokens
WHERE user_id = 'your-user-id';
```

**Resolution:**
- If expired: User needs to re-authenticate
- If revoked: User needs to re-grant permissions
- Implement proactive token refresh (see recommendations)

#### 3. GAPI Initialization Failures

**Error:** "Failed to initialize Google Calendar services"

**Causes:**
- GAPI library loaded but discovery document fails
- `window.gapi.client` undefined
- Google Calendar API not enabled in project
- API key invalid or quota exceeded

**Debug Steps:**
```typescript
// Step-by-step verification
console.log('1. GAPI loaded:', !!window.gapi);
console.log('2. GAPI client ready:', !!window.gapi?.client);

// After init attempt
console.log('3. Calendar API ready:', !!window.gapi?.client?.calendar);

// Check for specific error
try {
  await window.gapi.client.init({
    apiKey: 'your-api-key',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
  });
} catch (error) {
  console.error('Init error:', error);
}
```

**Resolution:**
- Verify API key is valid in Google Cloud Console
- Check Google Calendar API is enabled
- Ensure discovery document URL is accessible
- Check quota limits in Google Cloud Console

#### 4. Sync Conflicts & Duplicates

**Error:** Duplicate events or missing synchronization

**Causes:**
- `google_event_id` mismatches
- Timezone conversion issues
- Bidirectional sync race conditions
- Stale sync status values

**Debug Queries:**
```sql
-- Find duplicate Google event mappings
SELECT google_event_id, COUNT(*) as count
FROM timeline_items
WHERE user_id = 'your-user-id'
  AND google_event_id IS NOT NULL
GROUP BY google_event_id
HAVING COUNT(*) > 1;

-- Check orphaned sync data
SELECT id, title, google_event_id, sync_status, updated_at
FROM timeline_items
WHERE user_id = 'your-user-id'
  AND sync_status = 'error'
ORDER BY updated_at DESC
LIMIT 10;

-- Check recent sync activity
SELECT
  sync_type,
  status,
  events_created,
  events_updated,
  conflicts_detected,
  error_message,
  created_at
FROM calendar_sync_log
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 5;
```

**Resolution:**
- Clean up duplicate mappings manually
- Reset sync status for failed items
- Review timezone settings in both systems
- Implement conflict resolution strategy

---

## 8. Security Model

### OAuth 2.0 Security Principles

**1. Client ID is Public**
```typescript
// This is CORRECT and SECURE by OAuth 2.0 design
const CLIENT_ID = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';
```

**Why it's safe:**
- OAuth 2.0 Client IDs are designed to be public
- No secret information exposed
- Standard practice for browser-based applications
- Used by all major SaaS applications

**2. PKCE Implementation**
```typescript
// Proof Key for Code Exchange prevents token interception
const codeVerifier = crypto.getRandomValues(new Uint8Array(32));
const codeChallenge = await crypto.subtle.digest('SHA-256', codeVerifier);

// Challenge sent to Google, verifier kept in session
// Prevents authorization code interception attacks
```

**3. State Parameter CSRF Protection**
```typescript
const state = crypto.getRandomValues(new Uint8Array(16));
sessionStorage.setItem('oauth_state', state);

// Validated on callback to prevent CSRF
if (response.state !== sessionStorage.getItem('oauth_state')) {
  throw new Error('Invalid state parameter - possible CSRF attack');
}
```

### Multi-User Data Isolation

**1. Database-Level Security**
```sql
-- Row-Level Security ensures complete isolation
CREATE POLICY "Users access own tokens only" ON user_google_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Even with direct database access, users can't see others' data
SELECT * FROM user_google_tokens; -- Only returns current user's tokens
```

**2. API-Level Security**
```typescript
// Edge Functions validate user identity
const { data: { user } } = await supabase.auth.getUser(authToken);
if (!user) throw new Error('Unauthorized');

// All operations scoped to authenticated user
const { data } = await supabase
  .from('calendar_sync_settings')
  .select('*')
  .eq('user_id', user.id); // Automatic user scoping
```

**3. Google API Isolation**
```typescript
// Each user's token only accesses their Google data
const response = await fetch('/calendar/events', {
  headers: {
    Authorization: `Bearer ${userSpecificToken}` // Scoped to user's Google account
  }
});
// Can only access the Google account that granted this token
```

---

## 9. Testing & Validation

### Manual Testing Checklist

#### OAuth Flow Testing
```
□ Open DevTools Network tab during authentication
□ Verify script loads: accounts.google.com/gsi/client returns 200
□ Check OAuth popup opens and shows correct Google sign-in
□ Verify POST to store-google-tokens Edge Function succeeds
□ Confirm token stored in user_google_tokens table with correct expiry
□ Test token includes expected scopes (calendar, drive, etc.)
□ Verify sessionStorage cleaned up after successful auth
```

#### Calendar Integration Testing
```
□ Connect calendar successfully (no error messages)
□ Verify calendar_sync_settings record created with correct calendar_id
□ Trigger manual sync via UI button
□ Check calendar_sync_log shows success entry with reasonable duration
□ Add event in Google Calendar → Sync → Verify appears in timeline
□ Add event in timeline → Sync → Verify appears in Google Calendar
□ Test conflict resolution: Edit same event in both systems
□ Verify sync respects selected target layer
```

#### Error Scenario Testing
```
□ Revoke Google permissions in Google account → Try sync (should fail gracefully)
□ Wait for token expiry → Try API call (should prompt re-auth)
□ Disconnect network during sync → Should log error and not crash
□ Make 100+ API requests quickly → Should trigger rate limiting
□ Delete calendar in Google → Sync should handle gracefully
□ Change timezone settings → Events should sync with correct times
```

### Database Health Queries

```sql
-- Check token health across all users
SELECT
  user_id,
  DATE_PART('day', expires_at - NOW()) as days_until_expiry,
  scope,
  created_at
FROM user_google_tokens
WHERE expires_at < NOW() + INTERVAL '7 days'
ORDER BY expires_at ASC;

-- Monitor sync performance
SELECT
  user_id,
  status,
  COUNT(*) as sync_count,
  AVG(sync_duration_ms) as avg_duration,
  MAX(sync_duration_ms) as max_duration,
  MIN(created_at) as first_sync,
  MAX(created_at) as latest_sync
FROM calendar_sync_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id, status
ORDER BY user_id, status;

-- Check timeline sync status distribution
SELECT
  sync_status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM timeline_items
WHERE google_event_id IS NOT NULL
GROUP BY sync_status
ORDER BY count DESC;

-- Find users with sync issues
SELECT DISTINCT
  tl.user_id,
  u.email,
  COUNT(tl.id) as failed_items
FROM timeline_items tl
JOIN auth.users u ON tl.user_id = u.id
WHERE tl.sync_status = 'error'
GROUP BY tl.user_id, u.email
HAVING COUNT(tl.id) > 5
ORDER BY failed_items DESC;
```

### API Testing Scripts

```typescript
// Test Calendar API connectivity
const testCalendarAPI = async () => {
  const token = await getValidToken();

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary',
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (response.ok) {
    console.log('✓ Calendar API accessible');
  } else {
    console.error('✗ Calendar API error:', response.status);
  }
};

// Test Drive API connectivity
const testDriveAPI = async () => {
  const token = await getValidToken();

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?pageSize=1',
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (response.ok) {
    console.log('✓ Drive API accessible');
  } else {
    console.error('✗ Drive API error:', response.status);
  }
};
```

---

## 10. Troubleshooting Guide

### Issue: "Failed to initialize Google Calendar services"

**Symptoms:**
- Error message appears in red toast notification
- Calendar connection button doesn't work
- Console shows GAPI initialization errors

**Investigation Steps:**

1. **Check Script Loading**
   ```typescript
   // In browser console
   console.log('Google loaded:', !!window.google);
   console.log('GAPI loaded:', !!window.gapi);
   ```

2. **Verify API Configuration**
   ```typescript
   // Check if API key is working
   fetch(`https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest?key=${API_KEY}`)
     .then(r => r.json())
     .then(console.log);
   ```

3. **Check Google Cloud Console**
   - Verify Calendar API is enabled
   - Check API key restrictions (if any)
   - Review quota usage and limits

**Common Resolutions:**
- Wait a few seconds and retry (script loading race condition)
- Check internet connectivity
- Disable ad blockers that might block Google domains
- Clear browser cache and cookies
- Try incognito mode to rule out browser extensions

### Issue: Token Expired Errors

**Symptoms:**
- "No Google Calendar access token found"
- 401 Unauthorized responses from Google APIs
- User must re-authenticate frequently

**Investigation Steps:**

1. **Check Token Status**
   ```sql
   SELECT
     access_token IS NOT NULL as has_token,
     expires_at,
     expires_at < NOW() as is_expired
   FROM user_google_tokens
   WHERE user_id = 'user-id';
   ```

2. **Check Token Scopes**
   ```sql
   SELECT scope, created_at
   FROM user_google_tokens
   WHERE user_id = 'user-id';
   ```

**Resolutions:**
- Short-term: User re-authenticates
- Long-term: Implement refresh token flow (see recommendations)

### Issue: Sync Not Working

**Symptoms:**
- Events not appearing in timeline after calendar sync
- Timeline events not appearing in Google Calendar
- Sync log shows errors or no recent entries

**Investigation Steps:**

1. **Check Sync Settings**
   ```sql
   SELECT * FROM calendar_sync_settings
   WHERE user_id = 'user-id';
   ```

2. **Check Recent Sync Logs**
   ```sql
   SELECT * FROM calendar_sync_log
   WHERE user_id = 'user-id'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Check Timeline Items**
   ```sql
   SELECT id, title, google_event_id, sync_status
   FROM timeline_items
   WHERE user_id = 'user-id'
     AND created_at > NOW() - INTERVAL '1 day'
   ORDER BY created_at DESC;
   ```

**Common Resolutions:**
- Re-trigger manual sync from UI
- Check calendar permissions in Google account
- Verify target layer exists and is visible
- Reset sync settings and reconnect

### Issue: Rate Limiting Errors

**Symptoms:**
- "Rate limit exceeded" error messages
- 429 HTTP status codes from Google APIs
- Sync operations failing intermittently

**Investigation:**
```sql
-- Check sync frequency
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as sync_attempts,
  SUM(events_fetched) as total_api_calls
FROM calendar_sync_log
WHERE user_id = 'user-id'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

**Resolution:**
- Reduce sync frequency in settings
- Implement exponential backoff (already done in sheets API)
- Check for runaway sync loops

### Emergency Recovery Procedures

**1. Reset User's Google Integration**
```sql
-- WARNING: This will require user to re-authenticate
DELETE FROM calendar_sync_settings WHERE user_id = 'user-id';
DELETE FROM calendar_sync_log WHERE user_id = 'user-id';
UPDATE timeline_items
SET google_event_id = NULL, sync_status = 'local_only'
WHERE user_id = 'user-id';
DELETE FROM user_google_tokens WHERE user_id = 'user-id';
```

**2. Clean Up Orphaned Sync Data**
```sql
-- Remove timeline items with invalid Google event IDs
UPDATE timeline_items
SET google_event_id = NULL, sync_status = 'local_only'
WHERE google_event_id IS NOT NULL
  AND sync_status = 'error'
  AND updated_at < NOW() - INTERVAL '7 days';
```

---

## Recommendations & Future Improvements

### Critical: Implement Refresh Token Support

**Current Limitation:** Tokens expire after ~1 hour, requiring manual re-authentication.

**Solution:** Switch to OAuth 2.0 authorization code flow with refresh tokens.

```typescript
// Proposed implementation
const refreshToken = async (userId: string) => {
  const { data: tokenRecord } = await supabase
    .from('user_google_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .single();

  if (!tokenRecord.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRecord.refresh_token,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET // Backend only
    })
  });

  const newTokens = await response.json();

  // Update stored token
  await supabase
    .from('user_google_tokens')
    .update({
      access_token: newTokens.access_token,
      expires_at: new Date(Date.now() + newTokens.expires_in * 1000)
    })
    .eq('user_id', userId);
};
```

### Enhanced Error Handling

**1. Implement Circuit Breaker Pattern**
```typescript
const circuitBreaker = {
  failures: 0,
  lastFailure: null,
  threshold: 5,
  timeout: 60000, // 1 minute

  async call(fn) {
    if (this.isOpen()) {
      throw new Error('Circuit breaker open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  },

  isOpen() {
    return this.failures >= this.threshold &&
           (Date.now() - this.lastFailure) < this.timeout;
  }
};
```

**2. Implement Retry with Exponential Backoff**
```typescript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

### Performance Optimization

**1. Implement Caching Layer**
```typescript
// Cache calendar lists and metadata
const cachedCalendars = await cache.get(`calendars:${userId}`);
if (!cachedCalendars) {
  const calendars = await fetchCalendarsFromGoogle();
  await cache.set(`calendars:${userId}`, calendars, 3600); // 1 hour
}
```

**2. Batch Operations**
```typescript
// Batch timeline item updates
const batchUpdateTimelineItems = async (updates) => {
  const batches = chunkArray(updates, 100); // Supabase batch limit

  for (const batch of batches) {
    await supabase.from('timeline_items').upsert(batch);
  }
};
```

### Monitoring & Observability

**1. Add Comprehensive Logging**
```typescript
const logSyncOperation = async (operation) => {
  await supabase.from('sync_operations_log').insert({
    operation_type: operation.type,
    user_id: operation.userId,
    duration_ms: operation.duration,
    status: operation.status,
    metadata: operation.metadata
  });
};
```

**2. Health Check Endpoints**
```typescript
// Edge Function: health-check
const healthCheck = async () => {
  const checks = await Promise.all([
    checkGoogleAPIConnectivity(),
    checkDatabaseConnectivity(),
    checkTokenHealth()
  ]);

  return {
    status: checks.every(c => c.healthy) ? 'healthy' : 'unhealthy',
    checks
  };
};
```

This comprehensive guide provides everything needed to understand, debug, and maintain the Google integration system in AI Query Hub.