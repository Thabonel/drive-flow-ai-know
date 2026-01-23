# Architecture Overview

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Tech Stack](#tech-stack)
3. [Application Structure](#application-structure)
4. [Design Patterns](#design-patterns)
5. [Data Flow](#data-flow)
6. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

AI Query Hub follows a **modern serverless JAMstack architecture** with clear separation between frontend, backend, and data layers.

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  React SPA (Vite) + TypeScript + Tailwind CSS + shadcn/ui   │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │   Pages     │  │ Components  │  │    Hooks     │        │
│  │  (Routes)   │  │   (UI)      │  │  (Logic)     │        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE LAYER                            │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │  PostgreSQL    │  │  Edge Functions │  │   Storage     │ │
│  │   Database     │  │   (Deno)        │  │   (S3-like)   │ │
│  │   + RLS        │  │                 │  │               │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │     Auth       │  │   Realtime     │  │   Vectors     │ │
│  │  (GoTrue)      │  │  (WebSockets)  │  │  (pgvector)   │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ API Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │   Claude    │  │   Gemini    │  │   OpenAI     │        │
│  │ (Anthropic) │  │  (Google)   │  │  (OpenRouter)│        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │   Google    │  │  Microsoft  │  │   Dropbox    │        │
│  │ Drive/Cal   │  │   OneDrive  │  │              │        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │   Stripe    │  │    Brave    │                           │
│  │  (Billing)  │  │  (Search)   │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Serverless Backend**: Edge Functions eliminate server management
2. **Row-Level Security (RLS)**: Database-level authorization for multi-tenant security
3. **JAMstack Pattern**: Pre-rendered static frontend + dynamic API calls
4. **Real-time Sync**: WebSocket-based collaboration features
5. **Multi-Provider AI**: Fallback chains for reliability (Claude → OpenRouter → Ollama)

---

## Tech Stack

### Frontend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.2.0 | UI framework |
| **TypeScript** | 5.0.2 | Type safety |
| **Vite** | 5.4.0 | Build tool & dev server |
| **Tailwind CSS** | 3.3.0 | Utility-first styling |
| **shadcn/ui** | Latest | Component library (Radix UI) |
| **React Router** | 6.11.2 | Client-side routing |
| **TanStack Query** | 4.29.7 | Server state management |
| **React Hook Form** | 7.60.0 | Form management |
| **Zod** | 4.0.0 | Schema validation |

### Backend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase** | 2.21.0 | Backend-as-a-Service |
| **@supabase/supabase-js** | **2.45.0** | **CRITICAL: Must pin to this version** |
| **PostgreSQL** | 15+ | Relational database |
| **Deno** | Latest | Edge Function runtime |
| **PostgREST** | Auto | Auto-generated REST API |
| **GoTrue** | Auto | Authentication service |

> **⚠️ CRITICAL**: All Edge Functions must import `@supabase/supabase-js@2.45.0` (not `@2`). The latest version (v2.92.0+) is incompatible with Supabase Edge Runtime and causes CORS/WORKER_ERROR.

### AI & ML Stack

| Provider | Models | Purpose |
|---------|---------|---------|
| **Anthropic** | Claude Sonnet 4.5 (primary), Haiku 4.5 (cheap) | Primary AI (text generation, analysis) |
| **Google** | Gemini 3 Pro Image, Gemini 2.5 Flash | Image generation, multimodal |
| **OpenAI** | GPT-4o, GPT-4o-mini | Fallback provider (via OpenRouter) |
| **Ollama** | Llama3 | Local/offline AI |

### AI Agent System

| Component | Purpose |
|-----------|---------|
| **agent-translate** | Natural language → structured task classification |
| **agent-orchestrator** | Routes tasks to specialized sub-agents |
| **calendar-sub-agent** | Calendar events, scheduling, timezone handling |
| **briefing-sub-agent** | Daily briefs, task summaries |
| **analysis-sub-agent** | Deep document analysis |
| **creative-sub-agent** | Creative content, marketing materials |

### Integration Stack

| Service | Purpose |
|---------|---------|
| **Google Workspace** | Drive sync, Calendar integration |
| **Microsoft 365** | OneDrive sync, Microsoft Graph API |
| **Dropbox** | Cloud storage sync |
| **Stripe** | Payment processing & subscriptions |
| **Brave Search** | Web search for AI queries |

---

## Application Structure

### Directory Structure

```
aiqueryhub/
├── docs/                          # Documentation (this directory)
│   ├── 01-Architecture/          # Architecture docs
│   ├── 02-Frontend/              # Frontend docs
│   ├── 03-Backend/               # Backend docs
│   ├── 04-Database/              # Database docs
│   ├── 05-AI-Integration/        # AI docs
│   ├── 06-Authentication/        # Auth docs
│   ├── 07-APIs/                  # API docs
│   └── 08-Development/           # Dev guide
│
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── ai/                  # AI-related components
│   │   ├── assistant/           # Assistant features
│   │   ├── booking/             # Booking system
│   │   ├── documents/           # Document management
│   │   ├── email/               # Email features
│   │   ├── planning/            # Planning features
│   │   ├── routines/            # Routine management
│   │   ├── templates/           # Template system
│   │   └── timeline/            # Timeline components
│   │
│   ├── pages/                   # Route pages
│   │   ├── Team/               # Team collaboration pages
│   │   └── auth/               # Auth callback pages
│   │
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility libraries
│   ├── layout/                  # Layout components
│   ├── integrations/            # External integrations
│   │   └── supabase/           # Supabase client & types
│   └── App.tsx                  # Root application component
│
├── supabase/                    # Supabase backend
│   ├── functions/               # Edge Functions (serverless)
│   │   ├── _shared/            # Shared utilities
│   │   ├── ai-query/           # Main AI query handler
│   │   ├── generate-pitch-deck/# Pitch deck generation
│   │   ├── generate-image/     # Image generation (Gemini)
│   │   ├── google-drive-sync/  # Google Drive integration
│   │   ├── microsoft-drive-sync/# OneDrive integration
│   │   ├── stripe-webhook/     # Stripe webhooks
│   │   └── [50+ other functions]
│   │
│   └── migrations/              # Database migrations (SQL)
│
├── public/                      # Static assets
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind config
├── vite.config.ts               # Vite config
└── README.md                    # Project readme
```

### Code Organization Principles

1. **Component Co-location**: Related components grouped by feature (ai/, booking/, timeline/)
2. **Hook Separation**: Business logic extracted to custom hooks
3. **Shared Utilities**: Common code in `lib/` and `_shared/`
4. **Type Safety**: Auto-generated types from database schema
5. **Environment-based Config**: Different configs for dev/prod

---

## Design Patterns

### Frontend Patterns

#### 1. Protected Route Pattern
Routes require authentication via `ProtectedRoute` wrapper:

```tsx
// src/App.tsx:79-95
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="spinner">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}
```

**Usage in routes:**
```tsx
<Route path="/timeline" element={
  <ProtectedRoute>
    <Timeline />
  </ProtectedRoute>
} />
```

#### 2. Custom Hook Pattern
Encapsulate business logic and API calls in custom hooks:

**Example: `useAuth` hook**
```tsx
// Provides user state and auth methods throughout app
const { user, loading, signOut } = useAuth();
```

**Example: `useGoogleDrive` hook**
```tsx
// Handles Google Drive OAuth and file syncing
const { connectDrive, syncFiles, isConnected } = useGoogleDrive();
```

#### 3. Compound Component Pattern
Complex UI built from smaller composable components:

```tsx
{/* Note: AIAssistantSidebar was removed Jan 23, 2026.
    This pattern is now used in ConversationChat component. */}
<ConversationChat>
  <AIQueryInput onSubmit={handleQuery} />
  <ConversationHistory messages={messages} />
  <DocumentContext documents={contextDocs} />
</ConversationChat>
```

#### 4. Render Props Pattern
Share logic between components:

```tsx
<DocumentVisualizationPanel
  document={doc}
  renderActions={(doc) => <DocumentActions document={doc} />}
/>
```

### Backend Patterns

#### 1. Edge Function Handler Pattern
Consistent structure for all Edge Functions:

```typescript
serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2. Verify authentication
    const authHeader = req.headers.get('Authorization');
    const { user } = await supabase.auth.getUser(token);

    // 3. Parse request
    const body = await req.json();

    // 4. Execute business logic
    const result = await processRequest(body, user);

    // 5. Return response
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // 6. Handle errors
    return errorResponse(error);
  }
});
```

#### 2. Provider Fallback Pattern
Gracefully handle AI provider failures:

```typescript
// Try Claude first
try {
  return await callClaude(prompt);
} catch (claudeError) {
  console.warn('Claude failed, trying OpenRouter...');
  try {
    return await callOpenRouter(prompt);
  } catch (openRouterError) {
    // Fallback to local if available
    if (offlineMode) {
      return await callOllama(prompt);
    }
    throw openRouterError;
  }
}
```

#### 3. Row-Level Security (RLS) Pattern
Database enforces authorization automatically:

```sql
-- Users can only see their own documents
CREATE POLICY "Users can view own documents"
ON knowledge_documents FOR SELECT
USING (auth.uid() = user_id);

-- Team members can see shared documents
CREATE POLICY "Team members can view team documents"
ON knowledge_documents FOR SELECT
USING (
  user_id IN (
    SELECT user_id FROM team_members
    WHERE team_id = current_team_id
  )
);
```

---

## Data Flow

### AI Query Flow

```
User Input (AIQueryInput)
    │
    ▼
React Component
    │
    ├─> Optional: Select Knowledge Base
    ├─> Optional: Select Documents
    │
    ▼
Edge Function: ai-query
    │
    ├─> 1. Authenticate user
    ├─> 2. Fetch documents from DB
    ├─> 3. Rank by relevance
    ├─> 4. Build context (top 10 docs)
    │
    ▼
AI Provider (Claude/OpenRouter/Ollama)
    │
    ├─> Generate response
    ├─> Optional: Web search tool
    │
    ▼
Response Processing
    │
    ├─> Store in ai_query_history
    ├─> Return to frontend
    │
    ▼
Display to User (Markdown rendering)
```

### Document Sync Flow

```
User Connects Cloud Storage
    │
    ▼
OAuth Flow (Google/Microsoft/Dropbox)
    │
    ├─> Store tokens in user_google_tokens
    │
    ▼
Sync Edge Function
    │
    ├─> 1. Fetch file list from API
    ├─> 2. Download changed files
    ├─> 3. Parse content (parse-document)
    ├─> 4. Generate AI summary
    ├─> 5. Store in knowledge_documents
    │
    ▼
Document Available for Queries
```

### AI Agent Task Flow

```
User Input (Natural Language)
    │
    │ "Schedule meeting with John tomorrow at 2pm"
    │
    ▼
Edge Function: agent-translate
    │
    ├─> Classify task type (calendar/briefing/analysis/creative)
    ├─> Extract structured data (title, datetime, participants)
    ├─> Detect timezone offset
    │
    ▼
Edge Function: agent-orchestrator
    │
    ├─> Get active agent session
    ├─> Create agent_tasks record
    ├─> Create agent_sub_agents record
    ├─> Invoke sub-agent function
    │
    ▼
Sub-Agent (e.g., calendar-sub-agent)
    │
    ├─> Parse task details
    ├─> Create timeline_items record
    ├─> Optionally sync to Google Calendar
    ├─> Update sub-agent status
    │
    ▼
Response to User
    │
    └─> Task created confirmation
        └─> Timeline item visible in UI
```

### Pitch Deck Generation Flow

```
User Requests Pitch Deck
    │
    ├─> Topic
    ├─> Target Audience
    ├─> Number of Slides
    ├─> Style (professional/creative/minimal/bold)
    ├─> Selected Documents (optional)
    │
    ▼
Edge Function: generate-pitch-deck
    │
    ├─> 1. Fetch selected documents
    ├─> 2. Rank by relevance to topic
    ├─> 3. Extract key metrics
    ├─> 4. Build context
    │
    ▼
Claude API (PRIMARY model)
    │
    ├─> Generate deck structure
    ├─> Create slide content
    ├─> Write speaker notes
    ├─> Suggest visual types
    │
    ▼
Image Generation (if enabled)
    │
    ├─> For each slide with visualPrompt
    ├─> Call generate-image function
    │
    ▼
Edge Function: generate-image
    │
    ├─> Enhance prompt with style
    ├─> Call Gemini 3 Pro Image API
    ├─> Return base64 image data
    │
    ▼
Complete Pitch Deck
    │
    ├─> Store in presentation_storage
    ├─> Return to frontend
    │
    ▼
Presentation Mode (PitchDeck.tsx)
```

---

## Deployment Architecture

### Frontend Deployment
- **Platform**: Vercel / Netlify / Custom hosting
- **Build Command**: `npm run build`
- **Output**: `dist/` directory (static HTML/CSS/JS)
- **CDN**: Automatic edge caching

### Backend Deployment
- **Platform**: Supabase Cloud
- **Edge Functions**: Deployed via Supabase CLI
- **Database**: Managed PostgreSQL (multi-region replication)
- **Storage**: S3-compatible object storage

### Environment Variables

**Frontend** (`.env`):
```bash
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

**Backend** (Supabase Dashboard → Settings → Edge Functions):
```bash
ANTHROPIC_API_KEY=<claude-api-key>
GEMINI_API_KEY=<gemini-api-key>
OPENROUTER_API_KEY=<openrouter-key>
OPENAI_API_KEY=<openai-key>
BRAVE_SEARCH_API_KEY=<brave-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Scaling Considerations

1. **Database Connection Pooling**: Supavisor handles connection management
2. **Edge Function Concurrency**: Auto-scales based on load
3. **Storage**: S3-compatible with CDN caching
4. **Rate Limiting**: Implemented at API provider level

---

## Performance Optimizations

1. **Code Splitting**: Vite automatically splits routes
2. **Lazy Loading**: Components loaded on-demand
3. **Image Optimization**: Base64 encoding for pitch decks
4. **Database Indexing**: Strategic indexes on user_id, created_at
5. **Query Caching**: TanStack Query caches API responses
6. **Parallel Processing**: Image generation runs in parallel

---

## Security Architecture

See [Authentication & Security](../06-Authentication/README.md) for detailed security documentation.

**Key Security Features:**
- Row-Level Security (RLS) on all tables
- JWT-based authentication
- HTTPS-only communication
- API key rotation support
- Rate limiting on expensive operations
- XSS protection via React's built-in escaping
- CSRF protection via SameSite cookies

---

**Next Steps:**
- [Frontend Guide →](../02-Frontend/README.md)
- [Backend Guide →](../03-Backend/README.md)
- [Database Schema →](../04-Database/README.md)
