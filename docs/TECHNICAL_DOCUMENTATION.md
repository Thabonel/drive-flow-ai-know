# AI Query Hub - Technical Documentation

**Version:** 2.1.0
**Last Updated:** January 24, 2026
**Status:** Production

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Infrastructure](#infrastructure)
5. [Authentication & Security](#authentication--security)
6. [Integrations](#integrations)
7. [Database Schema](#database-schema)
8. [API & Edge Functions](#api--edge-functions)
9. [Deployment](#deployment)
10. [Environment Variables](#environment-variables)
11. [Development Guide](#development-guide)
12. [Troubleshooting](#troubleshooting)

---

## System Overview

AI Query Hub is a full-stack document intelligence platform that enables users to:
- Sync documents from multiple cloud storage providers (Google Drive, Microsoft 365, Amazon S3)
- Upload local files
- Create knowledge bases from document collections
- Query documents using AI (Claude Haiku 4.5, OpenRouter, Ollama)
- Maintain conversation history with AI-generated titles
- Manage document metadata and organization

### Key Features

- **Multi-Provider Document Sync**: Google Drive OAuth, Microsoft 365 OAuth, S3 credentials
- **AI-Powered Search**: Natural language queries with context-aware responses
- **Knowledge Bases**: Group related documents for targeted queries
- **Conversation Management**: Save, title, and organize AI interactions
- **Flexible Storage**: Cloud (Supabase) or user-provided credentials
- **Offline Mode**: Local Ollama support for air-gapped environments

---

## Architecture

### High-Level Architecture

```
┌─────────────┐
│   Browser   │
│  (React +   │
│   Vite)     │
└──────┬──────┘
       │
       │ HTTPS
       ▼
┌─────────────────┐
│  Netlify CDN    │
│  (Static Host)  │
└────────┬────────┘
         │
         │ API Calls
         ▼
┌──────────────────────┐
│   Supabase Cloud     │
│  ┌────────────────┐  │
│  │  PostgreSQL DB │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │  Edge Functions│  │
│  │  (Deno)        │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │  Auth Service  │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │  Storage       │  │
│  └────────────────┘  │
└──────────────────────┘
         │
         │ External APIs
         ▼
┌───────────────────────┐
│  External Services    │
│  • Claude API         │
│  • Google Drive API   │
│  • Microsoft Graph    │
│  • AWS S3             │
│  • OpenRouter         │
│  • Stripe             │
└───────────────────────┘
```

### Request Flow

1. **User Action** → React component
2. **Frontend** → Supabase client library
3. **Supabase Auth** → Validates JWT token
4. **Row Level Security** → Filters data by user_id
5. **Edge Function** (if needed) → Processes business logic
6. **External API** (if needed) → AI providers, storage services
7. **Response** → Back through stack to user

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 4.5.x | Build tool & dev server |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Component library |
| TanStack Query | 5.x | Data fetching & caching |
| React Router | 6.x | Client-side routing |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Supabase | Cloud | Backend-as-a-Service |
| PostgreSQL | 15.x | Primary database |
| Deno | Latest | Edge Functions runtime |
| PostgREST | Latest | Auto-generated REST API |

### AI & ML

| Service | Model | Purpose |
|---------|-------|---------|
| Anthropic | Claude Sonnet 4.5 | Primary AI (balanced speed/capability) |
| Anthropic | Claude Haiku 4.5 | Cost-effective model for simple tasks |
| OpenRouter | GPT-4o, GPT-4o-mini | Fallback AI provider |
| Google | Gemini 2.5 Flash | Image generation, multimodal |
| Ollama | llama3 | Offline/local AI |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Netlify | Frontend hosting & CDN |
| Supabase Cloud | Database, auth, storage, functions |
| GitHub | Source control & CI/CD trigger |

---

## Infrastructure

### Hosting

**Frontend (Netlify)**
- **URL**: `https://[your-site].netlify.app`
- **Build Command**: `npm install --legacy-peer-deps && npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18.x
- **Auto-deploys**: On push to `main` branch

**Backend (Supabase)**
- **Project ID**: `fskwutnoxbbflzqrphro`
- **URL**: `https://fskwutnoxbbflzqrphro.supabase.co`
- **Region**: us-east-1
- **Database**: PostgreSQL 15.x with pgvector extension
- **Edge Functions**: Deployed via Supabase CLI

### CDN & Performance

- **Netlify CDN**: Global edge network
- **Asset Caching**: 1 year for `/assets/*`
- **Compression**: Brotli + gzip
- **HTTP/2**: Enabled by default

---

## Authentication & Security

### Authentication Flow

**OAuth 2.0 (Google Drive & Microsoft 365)**

```
User clicks "Connect"
  → Frontend redirects to OAuth provider
  → User authorizes application
  → Provider redirects to callback URL with code
  → Frontend exchanges code for tokens via Edge Function
  → Tokens encrypted with PGP (AES-256-GCM)
  → Encrypted tokens stored in database
```

**User Credentials (S3)**

```
User enters AWS credentials
  → Frontend sends to Supabase
  → Stored as encrypted JSONB in enterprise_servers table
  → Retrieved when sync is triggered
```

### Encryption

**Token Encryption (Google Drive & Microsoft 365)**
- Algorithm: PGP Symmetric Encryption (pgp_sym_encrypt)
- Key Storage:
  - Edge Functions: Supabase Secrets
  - Database: `app_config` table
- Key Rotation: Manual process via SQL UPDATE

**S3 Credentials**
- Stored in JSONB column in `enterprise_servers` table
- Encrypted at rest by Supabase
- Retrieved only by service role

### Row Level Security (RLS)

All user data tables have RLS policies:

```sql
-- Example RLS Policy
CREATE POLICY "Users can view their own documents"
  ON knowledge_documents FOR SELECT
  USING (auth.uid() = user_id);
```

**Protected Tables:**
- `knowledge_documents`
- `knowledge_bases`
- `conversations`
- `user_google_tokens`
- `user_microsoft_tokens`
- `enterprise_servers`
- `google_drive_folders`
- `microsoft_drive_folders`

### Security Headers

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## Integrations

### 1. Google Drive OAuth

**Configuration:**
- OAuth 2.0 Client ID: Set in Supabase secrets
- Scopes: `https://www.googleapis.com/auth/drive.readonly`
- Redirect URI: `https://[your-domain]/` (configured in Google Cloud Console)

**Components:**
- `GoogleAuthStatus.tsx` - Connection status
- `GoogleDrivePicker.tsx` - Folder selection UI
- `useGoogleDrive.ts` - OAuth hook

**Edge Functions:**
- `get-google-config` - Returns OAuth credentials
- `store-google-tokens` - Encrypts & stores tokens
- `google-drive-sync` - Syncs files from Drive

**Database Tables:**
- `user_google_tokens` - Encrypted OAuth tokens
- `google_drive_folders` - Synced folder metadata

### 2. Microsoft 365 OAuth

**Configuration:**
- Azure AD App ID: `48d2ef30-d273-4b24-9a8c-c95e08fb6ca2`
- Tenant ID: Set in Supabase secrets
- Scopes: `User.Read`, `Files.Read.All`, `Sites.Read.All`, `offline_access`
- Redirect URI: `https://[your-domain]/auth/microsoft/callback`

**Components:**
- `MicrosoftAuthStatus.tsx` - Connection status
- `MicrosoftDrivePicker.tsx` - File/folder selection
- `useMicrosoft.ts` - PKCE OAuth hook

**Edge Functions:**
- `get-microsoft-config` - Returns OAuth credentials
- `store-microsoft-tokens` - Encrypts & stores tokens
- `microsoft-drive-sync` - Syncs from OneDrive/SharePoint

**Database Tables:**
- `user_microsoft_tokens` - Encrypted OAuth tokens
- `microsoft_token_audit_log` - Access audit trail
- `microsoft_token_rate_limit` - Rate limiting
- `microsoft_drive_folders` - Synced folder metadata

### 3. Amazon S3

**Configuration:**
- User-provided credentials (Access Key ID, Secret Access Key)
- Supports S3-compatible services (MinIO, DigitalOcean Spaces, Wasabi)

**Components:**
- `S3Setup.tsx` - Credential input form

**Edge Functions:**
- `s3-sync` - Syncs files from S3 buckets (339.5kB with AWS SDK v3)

**Database Tables:**
- `enterprise_servers` - Stores encrypted S3 credentials
- Protocol: `s3`
- Authentication stored as JSONB

### 4. AI Providers

**Primary: Claude Sonnet 4.5 (Anthropic)**
- Model: `claude-sonnet-4-5-20250929`
- API Key: `ANTHROPIC_API_KEY`
- Use: Balanced speed and capability for most tasks

**Cost-Effective: Claude Haiku 4.5 (Anthropic)**
- Model: `claude-haiku-4-5-20250929`
- Use: Simple tasks, summarization

**Fallback 1: OpenRouter**
- Models: GPT-4o, GPT-4o-mini
- API Key: `OPENROUTER_API_KEY`
- Use: When Claude unavailable

**Fallback 2: Ollama (Local)**
- Endpoint: `http://localhost:11434`
- Models: llama3
- Use: Offline mode

**Image Generation: Gemini**
- Model: `gemini-2.5-flash` / `gemini-3-pro-image-preview`
- API Key: `GEMINI_API_KEY`
- Use: Pitch deck images, visual content

**Fallback Chain Logic:**
```typescript
try {
  return await callClaude();
} catch {
  try {
    return await callOpenRouter();
  } catch {
    return await callOllama();
  }
}
```

### 5. AI Agent System

The application includes a multi-agent orchestration system for complex task handling.

**Agent Orchestrator** (`agent-orchestrator/`)
- Manages agent sessions and task routing
- Routes tasks to specialized sub-agents
- Tracks task completion and status

**Sub-Agents:**
| Agent | Function | Purpose |
|-------|----------|---------|
| Calendar | `calendar-sub-agent` | Create calendar events, schedule tasks |
| Briefing | `briefing-sub-agent` | Generate daily briefs, summaries |
| Analysis | `analysis-sub-agent` | Deep document analysis, insights |
| Creative | `creative-sub-agent` | Creative content, taglines, marketing |

**Agent Flow:**
```
User Input → agent-translate → Classify Task Type
                ↓
        agent-orchestrator → Route to Sub-Agent
                ↓
        sub-agent (calendar/briefing/analysis/creative)
                ↓
        Execute Task → Update Timeline/Documents
```

---

## Database Schema

### Core Tables

#### `knowledge_documents`
Stores uploaded and synced documents.

```sql
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  file_type TEXT,
  file_size BIGINT,
  source TEXT, -- 'upload', 'google_drive', 'microsoft', 's3'
  source_url TEXT,
  google_drive_id TEXT,
  microsoft_file_id TEXT,
  server_id UUID REFERENCES enterprise_servers(id),
  s3_key TEXT,
  s3_etag TEXT,
  s3_last_modified TIMESTAMP WITH TIME ZONE,
  summary TEXT, -- AI-generated summary
  tags TEXT[],
  embedding VECTOR(1536), -- For semantic search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `knowledge_bases`
Collections of documents for targeted queries.

```sql
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_document_ids UUID[], -- Array of document IDs
  ai_generated_content TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `conversations`
AI chat history with titles and metadata.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '[]', -- Array of {role, content}
  status TEXT DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  executive_summary TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `ai_query_history`
Log of all AI queries.

```sql
CREATE TABLE ai_query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT,
  knowledge_base_id UUID REFERENCES knowledge_bases(id),
  model_used TEXT,
  document_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_google_tokens`
Encrypted Google OAuth tokens.

```sql
CREATE TABLE user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_access_token BYTEA NOT NULL,
  encrypted_refresh_token BYTEA,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_microsoft_tokens`
Encrypted Microsoft OAuth tokens.

```sql
CREATE TABLE user_microsoft_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_access_token BYTEA NOT NULL,
  encrypted_refresh_token BYTEA,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `enterprise_servers`
Unified table for S3, Azure, and other enterprise storage.

```sql
CREATE TABLE enterprise_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('s3', 'azure_blob', 'azure_files', 'sftp', 'ftp', 'smb_cifs', 'webdav', 'nfs')),
  bucket_name TEXT,
  region TEXT,
  endpoint TEXT, -- Custom S3 endpoints
  storage_account_name TEXT,
  container_name TEXT,
  host TEXT,
  port INTEGER,
  base_path TEXT,
  authentication JSONB DEFAULT '{}', -- Encrypted credentials
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `app_config`
Application configuration (encryption keys, settings).

```sql
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_knowledge_documents_user_id ON knowledge_documents(user_id);
CREATE INDEX idx_knowledge_documents_source ON knowledge_documents(source);
CREATE INDEX idx_knowledge_bases_user_id ON knowledge_bases(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_enterprise_servers_user_id ON enterprise_servers(user_id);
CREATE INDEX idx_enterprise_servers_protocol ON enterprise_servers(protocol);

-- Full-text search
CREATE INDEX idx_knowledge_documents_content_fts ON knowledge_documents USING gin(to_tsvector('english', content));
```

---

## API & Edge Functions

### Deployed Edge Functions

#### `ai-query`
**Purpose**: Main AI query handler
**Method**: POST
**Auth**: Required (user JWT)
**Endpoint**: `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query`

**Request Body:**
```json
{
  "query": "What is the main topic?",
  "knowledge_base_id": "uuid-optional",
  "conversation_id": "uuid-optional"
}
```

**Response:**
```json
{
  "response": "AI generated response...",
  "model_used": "claude-haiku-4-5",
  "document_count": 5,
  "context_metadata": {}
}
```

**Logic:**
1. Validate user authentication
2. Retrieve knowledge base documents (if provided)
3. Prepare context from documents
4. Call AI provider (Claude → OpenRouter → Ollama fallback)
5. Save query to `ai_query_history`
6. Return response

#### `google-drive-sync`
**Purpose**: Sync files from Google Drive folders
**Method**: POST
**Auth**: Required
**Endpoint**: `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/google-drive-sync`

**Request Body:**
```json
{
  "folder_id": "uuid",
  "user_id": "uuid"
}
```

#### `microsoft-drive-sync`
**Purpose**: Sync files from OneDrive/SharePoint
**Method**: POST
**Auth**: Required
**Endpoint**: `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/microsoft-drive-sync`

#### `s3-sync`
**Purpose**: Sync files from S3 buckets
**Method**: POST
**Auth**: Required
**Size**: 339.5kB (includes AWS SDK v3)

#### `parse-document`
**Purpose**: Extract content from various document formats
**Supported**: PDF, DOCX, TXT, MD, JSON, CSV

#### `store-google-tokens`
**Purpose**: Encrypt and store Google OAuth tokens
**Encryption**: PGP AES-256-GCM

#### `store-microsoft-tokens`
**Purpose**: Encrypt and store Microsoft OAuth tokens
**Encryption**: PGP AES-256-GCM

#### `get-google-config`
**Purpose**: Return Google OAuth client configuration

#### `get-microsoft-config`
**Purpose**: Return Microsoft OAuth client configuration

---

## Deployment

### Build Process

**Local Build:**
```bash
npm install --legacy-peer-deps
npm run build
```

**Production Build (Netlify):**
```bash
# Automatic on git push to main
# Build command: npm install --legacy-peer-deps && npm run build
# Publish directory: dist
```

### Deployment Pipeline

```
Developer pushes to GitHub main branch
  ↓
GitHub webhook triggers Netlify build
  ↓
Netlify runs: npm install --legacy-peer-deps && npm run build
  ↓
TypeScript compilation (tsc)
  ↓
Vite build (bundle, minify, tree-shake)
  ↓
Output to /dist directory
  ↓
Deploy to Netlify CDN
  ↓
Invalidate cache
  ↓
Production live
```

### Rollback Process

**Via Netlify Dashboard:**
1. Go to Deploys
2. Find previous successful deploy
3. Click "Publish deploy"
4. Confirm rollback

**Via Git:**
```bash
git revert <commit-hash>
git push origin main
# Triggers automatic redeploy
```

---

## Environment Variables

### Frontend (.env)

```env
VITE_SUPABASE_PROJECT_ID=fskwutnoxbbflzqrphro
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend (Supabase Secrets)

**AI Providers:**
```
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
LOVABLE_API_KEY=...
OPENAI_API_KEY=sk-...
```

**Google Drive:**
```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_API_KEY=AIzaSy...
GOOGLE_TOKEN_ENCRYPTION_KEY=<base64-key>
```

**Microsoft 365:**
```
MICROSOFT_CLIENT_ID=48d2ef30-d273-4b24-9a8c-c95e08fb6ca2
MICROSOFT_TENANT_ID=cd0eb89f-...
MICROSOFT_CLIENT_SECRET=teo8Q~...
MICROSOFT_TOKEN_ENCRYPTION_KEY=<base64-key>
```

**Supabase:**
```
SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgresql://...
```

**Payments:**
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Setting Secrets

**Via CLI:**
```bash
supabase secrets set KEY_NAME="value"
```

**Via Dashboard:**
1. Go to Supabase Dashboard
2. Settings → Edge Functions
3. Add secret

---

## Development Guide

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Git
- Supabase CLI (optional, for local functions)

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/Thabonel/drive-flow-ai-know.git
cd aiqueryhub

# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
# Runs on http://localhost:8080
```

### Project Structure

```
aiqueryhub/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── GoogleDrivePicker.tsx
│   │   ├── MicrosoftDrivePicker.tsx
│   │   ├── S3Setup.tsx
│   │   └── ...
│   ├── pages/           # Route components
│   │   ├── Landing.tsx
│   │   ├── Index.tsx
│   │   ├── AddDocuments.tsx
│   │   ├── KnowledgeBases.tsx
│   │   └── ...
│   ├── hooks/           # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useGoogleDrive.ts
│   │   ├── useMicrosoft.ts
│   │   └── ...
│   ├── lib/             # Utilities
│   │   ├── ai.ts        # AI client with offline mode
│   │   └── utils.ts
│   ├── integrations/
│   │   └── supabase/    # Supabase client & types
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── functions/       # Edge Functions
│   │   ├── ai-query/
│   │   ├── google-drive-sync/
│   │   ├── microsoft-drive-sync/
│   │   ├── s3-sync/
│   │   └── ...
│   └── migrations/      # SQL migrations
├── docs/                # Documentation
├── public/              # Static assets
├── netlify.toml         # Netlify config
├── vite.config.ts       # Vite config
├── tailwind.config.js   # Tailwind config
└── package.json
```

### Common Development Tasks

**Run tests:**
```bash
# Currently no test suite configured
# Manual testing via dev server
```

**Lint code:**
```bash
npm run lint
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

**Deploy Edge Functions:**
```bash
supabase functions deploy <function-name>
```

### Adding a New Feature

1. **Create components** in `src/components/`
2. **Add routes** in `src/App.tsx`
3. **Create hooks** if needed in `src/hooks/`
4. **Update database schema** with migration in `supabase/migrations/`
5. **Create Edge Function** if needed in `supabase/functions/`
6. **Test locally**
7. **Commit and push** to trigger deployment

---

## Troubleshooting

### Common Issues

#### Build Fails with SWC Error

**Error:**
```
Error: Failed to load native binding
```

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### OAuth Redirect Mismatch

**Error:**
```
redirect_uri_mismatch
```

**Solution:**
1. Check Azure AD/Google Cloud Console redirect URIs
2. Ensure production URL is added
3. Match exactly (with/without trailing slash)

#### RLS Policy Blocks Access

**Error:**
```
Row level security policy violation
```

**Solution:**
1. Check user is authenticated
2. Verify `user_id` matches `auth.uid()`
3. Review RLS policies in Supabase dashboard

#### Edge Function Timeout

**Error:**
```
Function execution timed out
```

**Solution:**
1. Optimize database queries
2. Add indexes
3. Implement pagination
4. Increase function timeout (max 60s)

#### Encryption Key Not Found

**Error:**
```
Microsoft token encryption key not configured
```

**Solution:**
1. Check `app_config` table has the key
2. Verify Supabase secret `MICROSOFT_TOKEN_ENCRYPTION_KEY` is set
3. Ensure function reads from correct source

### Debug Mode

**Frontend:**
```typescript
// Enable verbose logging
localStorage.setItem('debug', 'true');
```

**Edge Functions:**
```typescript
// Check Supabase logs dashboard
// Functions → Logs → Select function
```

### Performance Optimization

**Frontend:**
- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Lazy load routes with React.lazy()
- Optimize images (WebP, compression)

**Backend:**
- Add database indexes
- Use connection pooling
- Implement caching (Redis)
- Optimize SQL queries

**Network:**
- Enable CDN caching
- Compress assets (Brotli)
- Use HTTP/2
- Implement service workers

---

## Monitoring & Logging

### Application Monitoring

**Supabase Dashboard:**
- Database activity
- Edge Function logs
- Auth events
- Storage usage

**Netlify Dashboard:**
- Build logs
- Deploy history
- Analytics
- Performance metrics

### Error Tracking

**Recommended Tools:**
- Sentry for error tracking
- LogRocket for session replay
- Datadog for APM

### Alerts

**Set up alerts for:**
- Build failures (Netlify)
- Edge Function errors (Supabase)
- Database connection issues
- High API usage
- Authentication failures

---

## Security Best Practices

### Code Security

1. ✅ Never commit secrets to Git
2. ✅ Use environment variables for all credentials
3. ✅ Enable RLS on all user data tables
4. ✅ Validate all user inputs
5. ✅ Sanitize database queries
6. ✅ Use prepared statements

### API Security

1. ✅ Require authentication for all protected routes
2. ✅ Implement rate limiting
3. ✅ Validate JWT tokens
4. ✅ Use HTTPS only
5. ✅ Implement CORS correctly

### Data Security

1. ✅ Encrypt sensitive data at rest
2. ✅ Use PGP encryption for OAuth tokens
3. ✅ Rotate encryption keys periodically
4. ✅ Implement audit logging
5. ✅ Regular database backups

---

## Backup & Recovery

### Database Backups

**Automatic (Supabase):**
- Daily backups retained for 7 days (Free tier)
- Point-in-time recovery (Pro tier)

**Manual Backup:**
```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Via pg_dump
pg_dump $DATABASE_URL > backup.sql
```

### Restore Process

```bash
# Via Supabase
supabase db reset
supabase db push

# Via psql
psql $DATABASE_URL < backup.sql
```

### Disaster Recovery Plan

1. **Database failure**: Restore from Supabase backup
2. **Function failure**: Redeploy from Git
3. **Frontend failure**: Redeploy previous Netlify build
4. **Complete outage**: Migrate to new Supabase project

---

## Performance Benchmarks

### Frontend

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: 90+

### Backend

- **API Response Time**: < 200ms (p95)
- **Database Query Time**: < 50ms (p95)
- **Edge Function Cold Start**: < 300ms

### AI Queries

- **Claude Haiku 4.5**: 1-3s (typical)
- **OpenRouter**: 2-5s (typical)
- **Ollama (local)**: 5-15s (typical)

---

## Future Roadmap

### Planned Features

- [ ] Vector search with embeddings
- [ ] Real-time collaboration
- [ ] Mobile apps (React Native)
- [ ] Advanced analytics dashboard
- [ ] Custom AI model fine-tuning
- [ ] Webhook integrations
- [ ] API rate limiting by tier
- [ ] Multi-language support

### Technical Debt

- [ ] Add comprehensive test suite (Jest, Playwright)
- [ ] Implement error boundaries
- [ ] Add loading skeletons
- [ ] Optimize bundle size
- [ ] Implement service workers for offline mode
- [ ] Add database query optimization
- [ ] Improve error messages

---

## Support & Contact

### Documentation

- Main README: `/README.md`
- Google Drive Setup: `/GOOGLE_DRIVE_SETUP.md`
- Claude.md: `/CLAUDE.md`
- This document: `/docs/TECHNICAL_DOCUMENTATION.md`

### Resources

- GitHub Repository: https://github.com/Thabonel/drive-flow-ai-know
- Supabase Dashboard: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro
- Production Site: [Your Netlify URL]

---

## Appendix

### Glossary

- **RLS**: Row Level Security
- **Edge Function**: Serverless function running on Supabase edge network
- **Knowledge Base**: Collection of documents for targeted AI queries
- **PKCE**: Proof Key for Code Exchange (OAuth security)
- **JWT**: JSON Web Token (authentication)

### Change Log

**v2.1.0 - January 24, 2026**
- **CRITICAL FIX**: Pinned @supabase/supabase-js to v2.45.0 in all Edge Functions
  - Latest v2.92.0 is incompatible with Supabase Edge Runtime
  - Caused CORS/WORKER_ERROR on all function calls
- Added AI Agent Orchestration System
  - agent-orchestrator for task routing
  - calendar-sub-agent for scheduling
  - briefing-sub-agent for daily briefs
  - analysis-sub-agent for document analysis
  - creative-sub-agent for creative content
- Added agent-translate for natural language task classification
- Updated model configuration to claude-sonnet-4-5-20250929
- Removed Dashboard from sidebar navigation
- Removed redundant AIAssistantSidebar component
- Added timezone support to agent system
- Fixed document viewer horizontal overflow issues

**v2.0.0 - December 2025**
- Neumorphic design system implementation
- Email confirmation flow
- Pitch deck generation with AI images
- Timeline extraction from documents
- Google Calendar sync integration
- Creative sub-agent with tool awareness

**v1.0.0 - October 18, 2025**
- Initial production release
- Google Drive OAuth integration
- Microsoft 365 OAuth integration
- Amazon S3 integration
- Claude Haiku 4.5 AI
- Knowledge base management
- Conversation history

---

**Document Version**: 2.1.0
**Last Updated**: January 24, 2026
**Maintained By**: Thabonel
