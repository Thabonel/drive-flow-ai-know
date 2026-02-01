# Authentication & Security

## Table of Contents
1. [Authentication System](#authentication-system)
2. [Row-Level Security (RLS)](#row-level-security-rls)
3. [OAuth Integrations](#oauth-integrations)
4. [Token Management](#token-management)
5. [Enterprise Security Features](#enterprise-security-features)
6. [Security Best Practices](#security-best-practices)

---

## Authentication System

### Supabase Auth (GoTrue)

**Provider**: Supabase Auth is built on GoTrue (open-source auth system)
**Features**: Email/password, OAuth, magic links, JWT tokens

### Frontend Authentication Flow

**File**: `src/hooks/useAuth.tsx`

```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut(),
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email),
  };
}
```

### Protected Routes

**File**: `src/App.tsx:79-95`

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// Usage
<Route path="/timeline" element={
  <ProtectedRoute>
    <Timeline />
  </ProtectedRoute>
} />
```

### Public Routes

```typescript
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/timeline" replace />;  // Redirect authenticated users
  }

  return <>{children}</>;
}
```

### Edge Function Authentication

**Pattern**: All Edge Functions verify JWT token

```typescript
serve(async (req) => {
  // Get auth header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  // Verify token
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // user.id is now verified and safe to use
  console.log('Authenticated user:', user.id);
});
```

---

## Row-Level Security (RLS)

### Overview

**Concept**: Database-level authorization enforced by PostgreSQL
**Benefit**: Even if application code is compromised, users can only access their own data

### Personal Data Policies

**Pattern**: Users can only access their own records

```sql
-- Enable RLS
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Read access
CREATE POLICY "Users can view own documents"
ON knowledge_documents FOR SELECT
USING (auth.uid() = user_id);

-- Write access
CREATE POLICY "Users can insert own documents"
ON knowledge_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update access
CREATE POLICY "Users can update own documents"
ON knowledge_documents FOR UPDATE
USING (auth.uid() = user_id);

-- Delete access
CREATE POLICY "Users can delete own documents"
ON knowledge_documents FOR DELETE
USING (auth.uid() = user_id);
```

### Team Data Policies

**Pattern**: Team members can access shared resources

```sql
-- Team members can view team documents
CREATE POLICY "Team members can view team documents"
ON knowledge_documents FOR SELECT
USING (
  user_id IN (
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id IN (
      SELECT tm2.team_id
      FROM team_members tm2
      WHERE tm2.user_id = auth.uid()
    )
  )
);
```

### Assistant Access Policies

**Pattern**: Assistants can access executive's data

```sql
-- Assistants can view executive's timeline
CREATE POLICY "Assistants can view executive timeline"
ON timeline_items FOR SELECT
USING (
  user_id IN (
    SELECT executive_id
    FROM assistant_relationships
    WHERE assistant_id = auth.uid()
      AND status = 'active'
  )
);

-- Assistants can create items for executives
CREATE POLICY "Assistants can create executive items"
ON timeline_items FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT executive_id
    FROM assistant_relationships
    WHERE assistant_id = auth.uid()
      AND status = 'active'
  )
);
```

### Public Data Policies

**Pattern**: Certain data is publicly accessible

```sql
-- Anyone can view active booking links
CREATE POLICY "Anyone can view active booking links"
ON booking_links FOR SELECT
USING (active = TRUE);

-- Only owner can modify
CREATE POLICY "Owner can modify booking links"
ON booking_links FOR ALL
USING (auth.uid() = user_id);
```

### Service Role Bypass

**Pattern**: Edge Functions using service role key bypass RLS

```typescript
// Service role client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Still verify user auth, but can access all data
const { data: { user } } = await supabase.auth.getUser(userToken);

// Now can access data for specific user
const { data } = await supabase
  .from('knowledge_documents')
  .select('*')
  .eq('user_id', user.id);  // Filter by verified user
```

---

## OAuth Integrations

### Google OAuth

**Scopes**:
- `https://www.googleapis.com/auth/drive.readonly` - Read Google Drive files
- `https://www.googleapis.com/auth/calendar` - Read/write calendar events
- `https://www.googleapis.com/auth/userinfo.email` - User email
- `https://www.googleapis.com/auth/userinfo.profile` - User profile

**Flow**:
1. Frontend redirects to Google OAuth consent screen
2. User approves permissions
3. Google redirects to callback URL with authorization code
4. Frontend exchanges code for tokens
5. Tokens stored in `user_google_tokens` table
6. Edge Functions use tokens to access Google APIs

**Frontend Code** (`src/hooks/useGoogleDrive.ts`):
```typescript
const connectDrive = async () => {
  // Get OAuth config from Edge Function
  const { data: config } = await supabase.functions.invoke('get-google-config');

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: `${window.location.origin}/auth/google/callback`,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  // Redirect to Google
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};
```

**Token Storage**:
```sql
CREATE TABLE user_google_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  access_token TEXT NOT NULL,  -- Encrypted
  refresh_token TEXT NOT NULL,  -- Encrypted
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Token Refresh** (in Edge Functions):
```typescript
async function getValidAccessToken(userId: string): Promise<string> {
  // Fetch tokens
  const { data: tokens } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Check if expired
  if (new Date(tokens.expires_at) < new Date()) {
    // Refresh token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    const newTokens = await response.json();

    // Update stored tokens
    await supabase
      .from('user_google_tokens')
      .update({
        access_token: newTokens.access_token,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000)
      })
      .eq('user_id', userId);

    return newTokens.access_token;
  }

  return tokens.access_token;
}
```

---

### Microsoft OAuth

**Scopes**:
- `Files.Read` - Read OneDrive files
- `User.Read` - User profile

**Endpoint**: Microsoft Graph API
**Token Storage**: `user_microsoft_tokens`

---

### Dropbox OAuth

**Scopes**:
- `files.content.read` - Read file content

**Token Storage**: `user_dropbox_tokens`

---

## Token Management

### JWT Structure

**Supabase JWT**:
```json
{
  "aud": "authenticated",
  "exp": 1703174400,
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "role": "authenticated"
}
```

**Passed to Edge Functions**:
```typescript
// Frontend
const token = (await supabase.auth.getSession()).data.session?.access_token;

const response = await fetch(`${supabaseUrl}/functions/v1/ai-query`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: 'test' })
});
```

### Session Management

**Session Duration**: 1 hour (default)
**Refresh Token**: 30 days

**Auto-Refresh**:
```typescript
// Supabase client automatically refreshes tokens
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed:', session);
  }
});
```

---

## Enterprise Security Features

### Multi-Factor Authentication (MFA)

**Implementation**: Built on Supabase MFA with TOTP support
**Status**: ✅ Implemented (Phase 4.2)
**Files**: `src/hooks/useMFA.ts`, `src/hooks/useMFA.test.ts`

```typescript
// MFA enrollment
const { result } = renderHook(() => useMFA());

// Enroll MFA for current user
await result.current.enrollMFA();

// Verify MFA code
const isValid = await result.current.verifyMFA(totpCode);

// Check MFA status
const factors = await result.current.getMFAFactors();
```

**Security Benefits**:
- Increases user security score from 6.5 to 7+ points
- Prevents account compromise even with leaked passwords
- Required for admin users in enterprise environments

### Enhanced Audit Logging

**Implementation**: Comprehensive security event logging
**Status**: ✅ Implemented (Phase 4.3)
**Files**: `src/hooks/useAuditLog.ts`, `src/hooks/useAuditLog.test.ts`

```typescript
// Log security events
const { logEvent } = useAuditLog();

await logEvent({
  action: 'LOGIN_SUCCESS',
  category: 'authentication',
  metadata: {
    ip_address: '192.168.1.100',
    mfa_used: true
  }
});

// Retrieve audit logs
const { logs } = useAuditLog();
await getAuditLogs('authentication', 50);
```

**Event Types**:
- Authentication events (login, logout, password reset)
- Security events (MFA enrollment, CSP violations)
- Data access events (export, deletion)
- Administrative actions

### Incident Response Automation

**Implementation**: Automated security incident detection
**Status**: ✅ Implemented (Phase 5.2 - Just Completed)
**Files**: `src/hooks/useIncidentDetector.ts`, `supabase/functions/incident-detector/index.ts`

```typescript
// Detect security incidents
const { detectIncidents, activeIncidents } = useIncidentDetector();

// Scan for brute force attempts
await detectIncidents();

// Get current incidents
await getActiveIncidents();

// Resolve incident
await resolveIncident('incident-uuid');
```

**Automated Detection Rules**:
- **Brute Force Attacks**: 6+ failed logins from same IP within 1 hour → HIGH severity
- **Rate Limit Violations**: Excessive API calls → MEDIUM severity
- **Suspicious Access**: Geographic anomalies → LOW-MEDIUM severity

**Database Schema**:
```sql
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('BRUTE_FORCE_ATTEMPT', 'SUSPICIOUS_ACCESS', 'RATE_LIMIT_EXCEEDED')),
  severity TEXT NOT NULL CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
  ip_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'FALSE_POSITIVE')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}'
);
```

### SOC 2 Evidence Collection

**Implementation**: Automated compliance evidence collection
**Status**: ✅ Implemented (Phase 5.1)
**Files**: `src/hooks/useEvidenceCollector.ts`, `supabase/functions/evidence-collector/index.ts`

```typescript
// Collect evidence for SOC 2 controls
const { collectEvidence } = useEvidenceCollector();

// User permissions evidence (CC6.1)
await collectEvidence('user_permissions');

// Security monitoring evidence (CC6.2)
await collectEvidence('security_monitoring');

// Generate compliance report
const report = await generateComplianceReport('2024-Q4');
```

**SOC 2 Control Types**:
- **CC6.1**: User access controls and permissions
- **CC6.2**: Security monitoring and incident response
- **CC6.7**: System configuration management
- **CC6.8**: Data processing and protection

### Content Security Policy (CSP)

**Implementation**: XSS protection via HTTP headers
**Status**: ✅ Implemented (Phase 4.1)
**Configuration**: Netlify `_headers` file

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;
```

**Security Benefits**:
- Blocks XSS attacks by restricting resource loading
- Prevents code injection via inline scripts
- Enforces HTTPS for external resources

### GDPR/CCPA Compliance

**Implementation**: Complete user data rights portal
**Status**: ✅ Implemented (Phase 3)
**Files**: `supabase/functions/export-user-data/`, `supabase/functions/delete-user-account/`

**Data Rights Supported**:
- **Article 15**: Right to data export (structured JSON format)
- **Article 17**: Right to deletion (30-day grace period)
- **Article 16**: Right to rectification (via settings)
- **Article 7**: Right to withdraw consent

```typescript
// Export user data (GDPR Article 15)
const exportData = await supabase.functions.invoke('export-user-data', {
  body: { format: 'JSON', includeMetadata: true }
});

// Schedule account deletion (GDPR Article 17)
await supabase.functions.invoke('delete-user-account', {
  body: { confirmationCode: 'DELETE-ACCOUNT' }
});
```

### Security Scoring

**Implementation**: Dynamic security score calculation
**Base Score**: 6.5/10
**Current Score**: 9.5/10 with all enterprise features

**Scoring Factors**:
- Email confirmation: +1.0 points
- Strong password: +0.5 points
- MFA enabled: +1.5 points
- No recent security incidents: +0.5 points
- CSP headers present: +0.5 points
- Audit logging active: +0.5 points

---

## Security Best Practices

### 1. Environment Variables

**Never commit**:
- API keys
- Database passwords
- OAuth secrets

**Storage**:
- Frontend: `.env` (gitignored)
- Backend: Supabase Dashboard → Settings → Secrets

### 2. HTTPS Only

All communication encrypted via HTTPS:
- Frontend to Supabase
- Edge Functions to external APIs
- OAuth callbacks

### 3. CORS Headers

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // In production, use specific origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### 4. Input Validation

**Never trust user input**:
```typescript
// Validate and sanitize
const { query } = await req.json();

if (!query || typeof query !== 'string') {
  throw new Error('Invalid query');
}

if (query.length > 10000) {
  throw new Error('Query too long');
}

// Use prepared statements for SQL
const { data } = await supabase
  .from('documents')
  .select('*')
  .eq('user_id', user.id)  // Parameterized, safe
  .ilike('title', `%${query}%`);  // Supabase handles escaping
```

### 5. Rate Limiting

**Edge Function Level**:
```typescript
// Check request count in last minute
const { count } = await supabase
  .from('rate_limit_log')
  .select('count')
  .eq('user_id', user.id)
  .gte('created_at', new Date(Date.now() - 60000));

if (count > 60) {
  return new Response('Too many requests', { status: 429 });
}
```

### 6. Audit Logging

```typescript
// Log security-sensitive actions
await supabase.from('security_audit_log').insert({
  user_id: user.id,
  event_type: 'password_reset',
  ip_address: req.headers.get('x-forwarded-for'),
  user_agent: req.headers.get('user-agent'),
  details: { method: 'email' }
});
```

### 7. Token Encryption

**Encrypt sensitive tokens at rest**:
```sql
-- Use pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt before insert
INSERT INTO user_google_tokens (user_id, access_token, refresh_token)
VALUES (
  $1,
  pgp_sym_encrypt($2, current_setting('app.encryption_key')),
  pgp_sym_encrypt($3, current_setting('app.encryption_key'))
);

-- Decrypt on read
SELECT
  id,
  user_id,
  pgp_sym_decrypt(access_token::bytea, current_setting('app.encryption_key')) as access_token,
  pgp_sym_decrypt(refresh_token::bytea, current_setting('app.encryption_key')) as refresh_token
FROM user_google_tokens
WHERE user_id = $1;
```

### 8. XSS Prevention

**React automatically escapes**:
```tsx
// Safe - React escapes user input
<div>{userProvidedText}</div>

// Dangerous - bypasses escaping
<div dangerouslySetInnerHTML={{ __html: userHtml }} />  // Avoid!
```

### 9. CSRF Protection

**Supabase Auth** automatically includes anti-CSRF tokens in session

### 10. SQL Injection Prevention

**Use parameterized queries**:
```typescript
// Safe - parameterized
const { data } = await supabase
  .from('documents')
  .select('*')
  .eq('user_id', userId);  // Safe

// Dangerous - string concatenation
const query = `SELECT * FROM documents WHERE user_id = '${userId}'`;  // Never do this!
```

---

**Next Steps:**
- [APIs & Integrations →](../07-APIs/README.md)
- [Development Guide →](../08-Development/README.md)
