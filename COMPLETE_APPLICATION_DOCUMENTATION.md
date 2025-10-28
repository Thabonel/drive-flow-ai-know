# AI Query Hub - Complete Application Documentation

**Version:** 1.0.0 (Perfect State Snapshot)
**Date:** October 28, 2025
**Backup Reference:** 2025-10-28_13-21-54_complete-Master

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Core Features](#3-core-features)
4. [Authentication & Security](#4-authentication--security)
5. [Subscription & Pricing](#5-subscription--pricing)
6. [Database Schema](#6-database-schema)
7. [API & Edge Functions](#7-api--edge-functions)
8. [Deployment](#8-deployment)
9. [Development Guide](#9-development-guide)
10. [User Workflows](#10-user-workflows)
11. [Known Issues & Roadmap](#11-known-issues--roadmap)
12. [API Reference](#12-api-reference)

---

## 1. Executive Summary

**AI Query Hub** is a comprehensive knowledge management and AI query platform that enables users to sync documents from multiple sources (Google Drive, Microsoft 365, AWS S3), organize them into knowledge bases, and query them using advanced AI models.

### Key Capabilities

- **Multi-Source Document Sync**: Automatic synchronization from Google Drive, Microsoft 365, and AWS S3
- **AI-Powered Querying**: Query your documents using multiple AI providers (Claude Haiku, OpenRouter, Ollama)
- **Knowledge Base Management**: Create organized collections of documents with AI-generated summaries
- **Conversation Management**: Save and continue AI conversations with full context
- **Timeline Visualization**: Visual timeline manager for tracking items and events
- **Support System**: Built-in ticketing and support management
- **Subscription Management**: Stripe-powered subscription system with 14-day trial

### Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI Integration**: Claude (Anthropic), OpenRouter, Ollama
- **Authentication**: Supabase Auth with OAuth
- **Payments**: Stripe with Customer Portal
- **Storage**: Supabase Storage + AWS S3
- **Deployment**: Vite production build, Supabase hosting

### Project Statistics

- **30 Edge Functions** for serverless backend operations
- **62 Database Migrations** defining complete schema
- **411 Files** in complete application
- **5.0M** total codebase size

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Documents │  │Knowledge │  │Timeline  │   │
│  │          │  │          │  │Bases     │  │Manager   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ (REST API / Real-time WebSocket)
┌───────────────────────┴─────────────────────────────────────┐
│                   Supabase Backend                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │  PostgreSQL    │  │ Edge Functions │  │  Auth Service  ││
│  │  + RLS         │  │  (30 funcs)    │  │  + OAuth       ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                  External Services                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Stripe   │  │ Claude   │  │ Google   │  │ Microsoft│   │
│  │          │  │ AI       │  │ Drive    │  │ 365      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

**Entry Point**: `src/App.tsx`

The application uses React Router for navigation with protected and public routes:

```typescript
<Routes>
  <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
  <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
  <Route path="/knowledge-bases" element={<ProtectedRoute><KnowledgeBases /></ProtectedRoute>} />
  <Route path="/conversations" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
  <Route path="/timeline-manager" element={<ProtectedRoute><TimelineManager /></ProtectedRoute>} />
  <Route path="/settings/*" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
  <Route path="/support/*" element={<ProtectedRoute><Support /></ProtectedRoute>} />
</Routes>
```

**Key Directories**:

- `src/pages/` - Page components for each route
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks for state management
- `src/lib/` - Utility functions and AI client
- `src/integrations/supabase/` - Supabase client and types

### Backend Architecture

**Supabase Edge Functions** (Deno runtime):

Edge Functions are serverless TypeScript/JavaScript functions that run on Deno. They handle:

- AI query processing with document context retrieval
- Document parsing and content extraction
- Google Drive and Microsoft 365 sync operations
- Stripe webhook processing
- Admin operations
- Analytics and monitoring

**Database Structure**:

PostgreSQL database with Row-Level Security (RLS) enabled on all tables. Every table has a `user_id` column with policies ensuring users can only access their own data.

### AI Provider Integration

**Provider Hierarchy** (fallback chain):

1. **Claude Haiku** (via Lovable Gateway) - Primary provider
2. **OpenRouter** - Secondary provider
3. **Ollama** (local) - Offline/development fallback

Configuration in `supabase/functions/ai-query/index.ts`:

```typescript
async function getLLMResponse(
  prompt: string,
  model_preference: string,
  userContext: string
): Promise<string> {
  // Try Claude Haiku first
  if (lovableApiKey) {
    try {
      return await claudeHaikuCompletion(prompt, userContext);
    } catch (err) {
      console.log("Claude Haiku failed, trying OpenRouter...");
    }
  }

  // Fallback to OpenRouter
  if (openRouterKey) {
    try {
      return await openRouterCompletion(prompt, userContext, model_preference);
    } catch (err) {
      console.log("OpenRouter failed, trying Ollama...");
    }
  }

  // Final fallback to Ollama
  return await ollamaCompletion(prompt, userContext);
}
```

---

## 3. Core Features

### 3.1 Document Management

**Location**: `src/pages/Documents.tsx`

Users can upload, sync, and manage documents from multiple sources:

**Supported Sources**:
- Manual upload (drag & drop or file selector)
- Google Drive (OAuth sync)
- Microsoft 365 (OAuth sync)
- AWS S3 (bucket integration)

**Supported File Types**:
- PDF, DOCX, TXT, MD (Markdown)
- JSON, CSV, XML
- Images (for OCR processing)

**Document Processing Pipeline**:

1. **Upload/Sync**: Document uploaded or synced from external source
2. **Parse**: `parse-document` Edge Function extracts text content
3. **Analyze**: `ai-document-analysis` generates AI summary and tags
4. **Store**: Content and metadata saved to `knowledge_documents` table
5. **Embed**: (Optional) Generate embeddings for semantic search

**Key Component**: `DocumentViewerModal` (`src/components/DocumentViewerModal.tsx`)

Displays document content with:
- AI-generated summary
- Tags and metadata
- Raw content viewer
- JSON visualization for structured documents

### 3.2 AI Query System

**Location**: `src/components/AIQueryInput.tsx`

The AI query system allows users to ask questions about their documents with intelligent context retrieval.

**Query Flow**:

```
User Query Input
      ↓
AI Query History Save
      ↓
Edge Function: ai-query
      ↓
Context Retrieval (documents/KB)
      ↓
LLM Provider (Claude → OpenRouter → Ollama)
      ↓
Response with Citations
      ↓
Display to User
```

**Context Retrieval Strategies**:

1. **Knowledge Base Mode**: When `knowledge_base_id` provided, retrieves all documents from that KB
2. **Full Library Mode**: When no KB specified, searches across all user documents
3. **Smart Filtering**: Applies relevance filtering based on query keywords

**Implementation** (`supabase/functions/ai-query/index.ts:50-150`):

```typescript
// Retrieve user's documents
let documentsQuery = supabase
  .from('knowledge_documents')
  .select('id, title, content, summary, tags, file_type')
  .eq('user_id', user.id);

if (knowledge_base_id) {
  // Retrieve specific knowledge base
  const { data: kb } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('id', knowledge_base_id)
    .single();

  if (kb?.source_document_ids) {
    documentsQuery = documentsQuery.in('id', kb.source_document_ids);
  }
}

const { data: documents } = await documentsQuery;

// Build context from documents
const context = documents.map(doc =>
  `Title: ${doc.title}\n` +
  `Summary: ${doc.summary || 'No summary'}\n` +
  `Content: ${doc.content?.substring(0, 2000) || 'No content'}`
).join('\n\n---\n\n');
```

**Response Format**:

```json
{
  "response": "AI-generated answer...",
  "document_count": 15,
  "knowledge_base_id": "uuid-or-null",
  "model_used": "claude-haiku"
}
```

### 3.3 Knowledge Bases

**Location**: `src/pages/KnowledgeBases.tsx`

Knowledge Bases are curated collections of documents with AI-generated summaries and insights.

**Table**: `knowledge_bases`

```sql
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  description TEXT,
  source_document_ids UUID[] DEFAULT '{}',
  ai_generated_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features**:

- **Document Collection**: Select multiple documents to include in KB
- **AI Summary Generation**: Automatic summary creation when KB is created/updated
- **Query Scoping**: Limit AI queries to specific knowledge base
- **Tagging & Organization**: Add tags and descriptions for easy discovery

**Creation Flow**:

1. User creates new KB with name and description
2. User selects documents to include
3. System calls `generate-kb-content` Edge Function
4. AI analyzes all selected documents and generates comprehensive summary
5. KB saved with `source_document_ids` array pointing to documents

### 3.4 Conversations

**Location**: `src/pages/Conversations.tsx`

Conversations allow users to save and continue AI chat sessions with full context preservation.

**Table**: `conversations`

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT NOT NULL,
  summary TEXT,
  messages JSONB DEFAULT '[]',
  knowledge_base_id UUID REFERENCES knowledge_bases(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Message Structure**:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "What are the key points in my research?",
      "timestamp": "2025-10-28T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "Based on your documents, the key points are...",
      "timestamp": "2025-10-28T10:30:05Z",
      "document_count": 12
    }
  ]
}
```

**Features**:

- **Auto-save**: Conversations automatically saved after each exchange
- **Context Preservation**: Full message history maintained
- **KB Linking**: Optionally link to specific knowledge base for scoped queries
- **Summary Generation**: AI-generated title and summary for easy reference
- **Resume Anywhere**: Continue conversations from any device

### 3.5 Timeline Manager

**Location**: `src/pages/TimelineManager.tsx`

Visual timeline for tracking items, events, and deadlines with auto-scrolling "NOW" line.

**Key Components**:

- `TimelineCanvas.tsx` - SVG-based timeline visualization
- `timelineUtils.ts` - Time marker generation and calculations

**Timeline Architecture**:

```
Fixed Day Boundaries (Midnight Markers)
    ↓
[... Mon 12:00 AM ━━━━━━━━━━━━━ Tue 12:00 AM ━━━━━━━━━━━━━ Wed 12:00 AM ...]
                                   ↑
                              NOW LINE (moving)
                        "Tue, Oct 28 | 2:45 PM"

    ↓
Timeline Items (scroll with day boundaries)
```

**Recent Fix** (Commit `3d53629`):

Changed time marker generation from relative to absolute timestamps:

**Before**: Markers recalculated relative to NOW every frame → labels changed continuously

**After**: Markers generated at fixed midnight timestamps → labels stay constant

```typescript
// NEW APPROACH (timelineUtils.ts:generateTimeMarkers)
const todayMidnight = new Date(nowTime);
todayMidnight.setHours(0, 0, 0, 0);

for (let dayOffset = -daysBeforeNow; dayOffset <= daysAfterNow; dayOffset++) {
  const markerTime = new Date(todayMidnight.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  // markerTime is FIXED - never changes unless day rolls over

  markers.push({
    x: calculatedXPosition,
    time: markerTime, // ABSOLUTE timestamp
    isPast: markerTime < nowTime,
    isMajor: true,
  });
}
```

**NOW Line Features**:
- Red vertical line marking current time
- Date label: "Mon, Oct 28"
- Time label: "2:45 PM"
- "NOW" text label
- Updates every minute
- Stays in fixed position while content scrolls

**Timeline Item Structure**:

```typescript
interface TimelineItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string; // ISO 8601
  end_time?: string;
  category?: string;
  color?: string;
  tags?: string[];
}
```

### 3.6 Support System

**Location**: `src/pages/Support.tsx`

Built-in ticketing and support management system.

**Routes**:
- `/support` - Main support dashboard
- `/support/tickets` - All support tickets
- `/support/new` - Create new ticket
- `/support/ticket/:id` - View/update ticket

**Table**: `support_tickets`

```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  category TEXT,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Ticket Workflow**:

1. User creates ticket with subject, description, category
2. Ticket appears in support dashboard
3. Admin/support responds via messages
4. Status updated as ticket progresses
5. Ticket closed when resolved

---

## 4. Authentication & Security

### 4.1 Authentication System

**Provider**: Supabase Auth

**Supported Methods**:
- Email/Password
- Google OAuth
- Microsoft OAuth
- Magic Link (email)

**Auth Hook**: `src/hooks/useAuth.ts`

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

**Route Protection**:

`ProtectedRoute` component redirects unauthenticated users to `/auth`:

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}
```

### 4.2 Row-Level Security (RLS)

**Every table has RLS enabled** with policies ensuring data isolation between users.

**Example Policy** (`subscriptions` table):

```sql
-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);
```

**Service Role Access**:

Edge Functions use service role key to bypass RLS when needed (after verifying user authentication):

```typescript
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") // Bypasses RLS
);

// But we still verify user auth
const authHeader = req.headers.get("Authorization");
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await supabase.auth.getUser(token);

if (error || !user) {
  throw new Error("User not authenticated");
}
```

### 4.3 OAuth Token Storage

**Google Drive & Microsoft 365** OAuth tokens stored securely in `user_google_tokens` table:

```sql
CREATE TABLE user_google_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  token_type TEXT,
  expiry_date BIGINT,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Encryption**: Tokens encrypted at rest using Supabase's built-in encryption.

**Token Refresh**: Edge Functions automatically refresh expired tokens before making API calls.

### 4.4 API Security

**CORS Configuration**:

All Edge Functions include CORS headers for cross-origin requests:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle preflight
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}
```

**Rate Limiting**: Configured at Supabase project level (1000 requests/minute per IP).

**API Key Rotation**: Environment variables managed in Supabase dashboard, rotated quarterly.

---

## 5. Subscription & Pricing

### 5.1 Stripe Integration

**Pricing** (AUD):

```typescript
export const PRICING_AUD = {
  starter: 9,
  pro: 45,
  business: 150,
  additionalUser: 10,
};

export const STRIPE_PRICE_IDS = {
  starter: 'price_1SJ242DXysaVZSVh4s8X7pQX',
  pro: 'price_1SJ24pDXysaVZSVhjWh5Z9dk',
  business: 'price_1SJ25YDXysaVZSVhyjwdk3HN',
  additionalUser: 'price_1SJ2JaDXysaVZSVhHqLhbHgR',
};
```

**Plan Features**:

- **Starter** ($9/month): 100 queries/month, 5GB storage, 10 documents
- **Pro** ($45/month): 1000 queries/month, 50GB storage, unlimited documents
- **Business** ($150/month): Unlimited queries, 200GB storage, unlimited documents, priority support

### 5.2 Subscription Flow

**1. Create Subscription** (`create-subscription` Edge Function):

```typescript
// Create Stripe checkout session
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  success_url: `${origin}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/settings/billing?canceled=true`,
  subscription_data: {
    trial_period_days: 14, // 14-day trial
    metadata: {
      user_id: user.id,
      plan_type: planType,
    },
  },
});
```

**2. User Completes Checkout** (redirected to Stripe)

**3. Webhook Verification** (`stripe-webhook` Edge Function):

```typescript
// Verify webhook signature
const receivedEvent = await stripe.webhooks.constructEventAsync(
  body,
  signature,
  webhookSecret,
  undefined,
  cryptoProvider
);

// Process event
switch (receivedEvent.type) {
  case "customer.subscription.created":
  case "customer.subscription.updated":
    // Upsert subscription to database
    await supabase
      .from("subscriptions")
      .upsert({
        user_id: subscription.metadata.user_id,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0].price.id,
        plan_type: subscription.metadata.plan_type,
        status: subscription.status,
        trial_start: subscription.trial_start,
        trial_end: subscription.trial_end,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
      }, {
        onConflict: "stripe_subscription_id",
      });
    break;

  case "customer.subscription.deleted":
    // Mark subscription as canceled
    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("stripe_subscription_id", subscription.id);
    break;
}
```

**4. Session Verification** (`verify-checkout-session` Edge Function):

Frontend calls this to confirm subscription created:

```typescript
const session = await stripe.checkout.sessions.retrieve(session_id, {
  expand: ['subscription', 'customer'],
});

if (session.payment_status === 'paid') {
  // Save subscription to database
  await supabase
    .from("subscriptions")
    .upsert({ /* subscription data */ });
}
```

### 5.3 Customer Portal

Users can manage their subscription via Stripe Customer Portal:

**Edge Function**: `create-portal-session`

```typescript
const session = await stripe.billingPortal.sessions.create({
  customer: subscription.stripe_customer_id,
  return_url: `${origin}/settings/billing`,
});

return { url: session.url };
```

**Portal Features**:
- Update payment method
- View invoices
- Cancel subscription
- Update billing information

### 5.4 Usage Tracking

**Table**: `usage_tracking`

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  query_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);
```

**Tracking**: Incremented on each AI query in `ai-query` Edge Function:

```typescript
// Increment usage
await supabase.rpc('increment_query_usage', {
  p_user_id: user.id,
  p_period_start: currentPeriodStart,
});
```

**Enforcement**: Queries blocked when limit exceeded (checked before processing).

---

## 6. Database Schema

### 6.1 Core Tables

#### `knowledge_documents`

Stores user documents with AI-generated metadata.

```sql
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  file_type TEXT,
  file_size BIGINT,
  file_url TEXT,
  source TEXT, -- 'upload', 'google_drive', 'microsoft_365', 's3'
  source_id TEXT, -- External file ID
  embedding VECTOR(1536), -- For semantic search
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_documents_user_id ON knowledge_documents(user_id);
CREATE INDEX idx_knowledge_documents_tags ON knowledge_documents USING GIN(tags);
CREATE INDEX idx_knowledge_documents_embedding ON knowledge_documents USING ivfflat(embedding);
```

#### `knowledge_bases`

Collections of documents with AI summaries.

```sql
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_document_ids UUID[] DEFAULT '{}',
  ai_generated_content TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_bases_user_id ON knowledge_bases(user_id);
```

#### `ai_query_history`

Logs all AI queries and responses.

```sql
CREATE TABLE ai_query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  knowledge_base_id UUID REFERENCES knowledge_bases(id),
  document_count INTEGER DEFAULT 0,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_query_history_user_id ON ai_query_history(user_id);
CREATE INDEX idx_ai_query_history_created_at ON ai_query_history(created_at DESC);
```

#### `conversations`

Saved AI chat sessions.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  messages JSONB DEFAULT '[]',
  knowledge_base_id UUID REFERENCES knowledge_bases(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
```

#### `subscriptions`

Stripe subscription data.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT NOT NULL,
  plan_type TEXT NOT NULL, -- 'starter', 'pro', 'business'
  status TEXT NOT NULL, -- 'active', 'trialing', 'past_due', 'canceled'
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
```

#### `usage_tracking`

Tracks query usage per billing period.

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  query_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
```

#### `user_google_tokens`

OAuth tokens for Google Drive and Microsoft 365.

```sql
CREATE TABLE user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  provider TEXT NOT NULL, -- 'google', 'microsoft'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT,
  expiry_date BIGINT,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_user_google_tokens_user_id ON user_google_tokens(user_id);
```

#### `timeline_items`

Items displayed on timeline manager.

```sql
CREATE TABLE timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  category TEXT,
  color TEXT DEFAULT '#3b82f6',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_items_user_id ON timeline_items(user_id);
CREATE INDEX idx_timeline_items_start_time ON timeline_items(start_time);
```

#### `support_tickets`

User support requests.

```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  category TEXT,
  messages JSONB DEFAULT '[]',
  assigned_to UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
```

#### `user_settings`

User preferences and configuration.

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  model_preference TEXT DEFAULT 'claude-haiku',
  theme TEXT DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

#### `admin_messages`

Admin command center interactions.

```sql
CREATE TABLE admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  command_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_messages_user_id ON admin_messages(user_id);
CREATE INDEX idx_admin_messages_created_at ON admin_messages(created_at DESC);
```

### 6.2 Database Functions

#### `increment_query_usage`

Increments query count for usage tracking.

```sql
CREATE OR REPLACE FUNCTION increment_query_usage(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, query_count, period_start, period_end)
  VALUES (
    p_user_id,
    1,
    p_period_start,
    p_period_start + INTERVAL '1 month'
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    query_count = usage_tracking.query_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `get_user_quota`

Returns user's current usage and limits.

```sql
CREATE OR REPLACE FUNCTION get_user_quota(p_user_id UUID)
RETURNS TABLE (
  plan_type TEXT,
  query_limit INTEGER,
  query_count INTEGER,
  storage_limit BIGINT,
  storage_used BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.plan_type,
    CASE
      WHEN s.plan_type = 'starter' THEN 100
      WHEN s.plan_type = 'pro' THEN 1000
      WHEN s.plan_type = 'business' THEN 999999
      ELSE 10
    END AS query_limit,
    COALESCE(u.query_count, 0) AS query_count,
    CASE
      WHEN s.plan_type = 'starter' THEN 5368709120 -- 5GB
      WHEN s.plan_type = 'pro' THEN 53687091200 -- 50GB
      WHEN s.plan_type = 'business' THEN 214748364800 -- 200GB
      ELSE 1073741824 -- 1GB free tier
    END AS storage_limit,
    COALESCE(SUM(d.file_size), 0) AS storage_used
  FROM subscriptions s
  LEFT JOIN usage_tracking u ON u.user_id = s.user_id
    AND u.period_start <= NOW()
    AND u.period_end >= NOW()
  LEFT JOIN knowledge_documents d ON d.user_id = s.user_id
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  GROUP BY s.plan_type, u.query_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.3 RLS Policies Summary

All tables have RLS enabled with standard policies:

```sql
-- SELECT: Users can read their own data
CREATE POLICY "users_read_own_{table}"
  ON {table}
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can insert their own data
CREATE POLICY "users_insert_own_{table}"
  ON {table}
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own data
CREATE POLICY "users_update_own_{table}"
  ON {table}
  FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: Users can delete their own data
CREATE POLICY "users_delete_own_{table}"
  ON {table}
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Exception**: `app_config` table has NO public access (service role only):

```sql
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_no_public_access"
  ON app_config
  FOR ALL
  USING (false);

GRANT SELECT ON app_config TO service_role;
```

---

## 7. API & Edge Functions

### 7.1 Edge Functions Overview

All Edge Functions located in `supabase/functions/`

**Total**: 30 functions

### 7.2 Core Functions

#### `ai-query`

**Purpose**: Main AI query handler with document context retrieval

**Location**: `supabase/functions/ai-query/index.ts`

**Input**:
```json
{
  "query": "What are the main findings?",
  "knowledge_base_id": "uuid-optional"
}
```

**Output**:
```json
{
  "response": "Based on your documents...",
  "document_count": 15,
  "knowledge_base_id": "uuid-or-null",
  "model_used": "claude-haiku"
}
```

**Process**:
1. Verify user authentication
2. Retrieve user's documents (all or from specific KB)
3. Build context from document summaries and content
4. Call LLM provider with context
5. Save query to history
6. Increment usage tracking
7. Return response

#### `parse-document`

**Purpose**: Extract text content from uploaded documents

**Supported Formats**: PDF, DOCX, TXT, MD, JSON, CSV, XML

**Input**: Multipart form data with file

**Output**:
```json
{
  "content": "Extracted text...",
  "metadata": {
    "pages": 10,
    "word_count": 5000,
    "language": "en"
  }
}
```

#### `ai-document-analysis`

**Purpose**: Generate AI summary and tags for documents

**Input**:
```json
{
  "document_id": "uuid"
}
```

**Output**:
```json
{
  "summary": "This document discusses...",
  "tags": ["research", "analysis", "2025"],
  "key_points": ["Point 1", "Point 2"]
}
```

#### `google-drive-sync`

**Purpose**: Sync documents from Google Drive

**Process**:
1. Verify user authentication
2. Retrieve OAuth tokens from `user_google_tokens`
3. Refresh token if expired
4. List files from Google Drive
5. Download new/updated files
6. Parse and analyze each file
7. Save to `knowledge_documents`

#### `microsoft-365-sync`

**Purpose**: Sync documents from Microsoft 365 (OneDrive, SharePoint)

**Similar process to `google-drive-sync`**

#### `generate-kb-content`

**Purpose**: Generate AI summary for knowledge base

**Input**:
```json
{
  "knowledge_base_id": "uuid"
}
```

**Output**:
```json
{
  "summary": "This knowledge base contains...",
  "key_themes": ["Theme 1", "Theme 2"],
  "document_count": 25
}
```

### 7.3 Stripe Functions

#### `stripe-webhook`

**Purpose**: Process Stripe webhook events

**Location**: `supabase/functions/stripe-webhook/index.ts`

**Events Handled**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Configuration** (`config.toml`):

```toml
[functions.stripe-webhook]
verify_jwt = false  # Stripe webhooks don't include JWT
```

**Security**: Webhook signature verification using `stripe.webhooks.constructEventAsync()`

```typescript
const receivedEvent = await stripe.webhooks.constructEventAsync(
  body,
  signature,
  webhookSecret,
  undefined,
  cryptoProvider
);
```

#### `create-subscription`

**Purpose**: Create Stripe checkout session

**Input**:
```json
{
  "priceId": "price_xxx",
  "planType": "pro"
}
```

**Output**:
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

#### `verify-checkout-session`

**Purpose**: Verify checkout completion and save subscription

**Input**:
```json
{
  "session_id": "cs_xxx"
}
```

**Output**:
```json
{
  "success": true,
  "subscription": {
    "plan_type": "pro",
    "status": "trialing",
    "current_period_end": "2025-11-11T00:00:00Z"
  }
}
```

#### `create-portal-session`

**Purpose**: Create Stripe Customer Portal session

**Output**:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### 7.4 Admin Functions

#### `admin-command-center`

**Purpose**: Execute admin commands

**Input**:
```json
{
  "command": "list_users",
  "params": {}
}
```

**Supported Commands**:
- `list_users` - List all users
- `user_details` - Get user details
- `subscription_status` - Check subscription
- `usage_report` - Generate usage report
- `reset_quota` - Reset user quota

### 7.5 Analytics Functions

#### `analytics-query`

**Purpose**: Query analytics data

**Metrics Tracked**:
- Daily active users (DAU)
- Query count per day
- Document upload count
- Popular knowledge bases
- Average response time

#### `generate-analytics`

**Purpose**: Generate analytics reports

**Reports**:
- User activity summary
- Subscription revenue
- Usage trends
- Document statistics

### 7.6 Storage Functions

#### `upload-document`

**Purpose**: Handle document uploads to Supabase Storage

**Process**:
1. Verify user authentication
2. Check storage quota
3. Upload file to Supabase Storage bucket
4. Create record in `knowledge_documents`
5. Trigger `parse-document` and `ai-document-analysis`

#### `delete-document`

**Purpose**: Delete document and associated files

**Process**:
1. Delete file from Supabase Storage
2. Delete record from `knowledge_documents`
3. Remove from any knowledge bases

### 7.7 Complete Function List

1. `ai-query` - Main AI query handler
2. `parse-document` - Document content extraction
3. `ai-document-analysis` - AI summary generation
4. `google-drive-sync` - Google Drive integration
5. `microsoft-365-sync` - Microsoft 365 integration
6. `s3-sync` - AWS S3 integration
7. `generate-kb-content` - Knowledge base summary
8. `stripe-webhook` - Stripe event processing
9. `create-subscription` - Checkout session creation
10. `verify-checkout-session` - Payment verification
11. `create-portal-session` - Customer portal access
12. `admin-command-center` - Admin operations
13. `analytics-query` - Analytics data retrieval
14. `generate-analytics` - Report generation
15. `upload-document` - File upload handling
16. `delete-document` - File deletion
17. `claude-document-processor` - Claude-specific processing
18. `embedding-generator` - Generate embeddings for semantic search
19. `semantic-search` - Search documents by meaning
20. `conversation-handler` - Manage conversation state
21. `export-knowledge-base` - Export KB to various formats
22. `import-knowledge-base` - Import KB from file
23. `batch-document-processor` - Process multiple documents
24. `scheduled-sync` - Automated sync jobs
25. `notification-sender` - Send user notifications
26. `webhook-handler` - Generic webhook receiver
27. `rate-limiter` - API rate limiting
28. `cache-manager` - Response caching
29. `health-check` - System health monitoring
30. `backup-scheduler` - Automated backups

---

## 8. Deployment

### 8.1 Frontend Deployment

**Build Command**:

```bash
npm run build
```

**Output**: `dist/` directory

**Configuration** (`vite.config.ts`):

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
});
```

**Environment Variables** (`.env`):

```
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

**Deployment Targets**:
- Vercel (recommended)
- Netlify
- Cloudflare Pages
- GitHub Pages (with SPA routing)

### 8.2 Backend Deployment (Supabase)

**Database Migrations**:

```bash
supabase db push
```

Applies all migrations in `supabase/migrations/` to production database.

**Edge Functions Deployment**:

```bash
supabase functions deploy <function-name>
```

Deploy all functions:

```bash
for func in supabase/functions/*/; do
  supabase functions deploy $(basename $func)
done
```

**Environment Variables**:

Set in Supabase Dashboard > Edge Functions > Secrets:

```
OPENAI_API_KEY
OPENROUTER_API_KEY
LOVABLE_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
```

### 8.3 Stripe Configuration

**1. Create Products and Prices** in Stripe Dashboard

**2. Configure Customer Portal**:
- Go to https://dashboard.stripe.com/settings/billing/portal
- Enable portal
- Configure allowed operations (cancel, update payment method, view invoices)

**3. Create Webhook Endpoint**:
- URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- Events: `customer.subscription.*`, `invoice.payment_*`
- Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

**4. Update Branding**:
- Go to https://dashboard.stripe.com/settings/public
- Update business name to "AI Query Hub"
- Add logo and brand colors

### 8.4 OAuth Configuration

**Google Drive**:
1. Create project in Google Cloud Console
2. Enable Google Drive API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
5. Copy client ID and secret to Supabase

**Microsoft 365**:
1. Register app in Azure AD
2. Add Microsoft Graph permissions (Files.Read, Files.ReadWrite)
3. Add redirect URI
4. Copy application ID and secret to Supabase

### 8.5 Production Checklist

- [ ] Database migrations applied
- [ ] All Edge Functions deployed
- [ ] Environment variables configured
- [ ] Stripe products and prices created
- [ ] Stripe webhook configured
- [ ] Stripe Customer Portal enabled
- [ ] Stripe branding updated
- [ ] Google OAuth configured
- [ ] Microsoft OAuth configured
- [ ] RLS policies verified
- [ ] Frontend build tested
- [ ] Frontend deployed
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Error monitoring configured (Sentry)
- [ ] Analytics configured (Plausible/Google Analytics)
- [ ] Backup strategy implemented

---

## 9. Development Guide

### 9.1 Getting Started

**Prerequisites**:
- Node.js 18+
- npm or yarn
- Supabase CLI
- Git

**Clone Repository**:

```bash
git clone <repository-url>
cd aiqueryhub
```

**Install Dependencies**:

```bash
npm install
```

**Configure Environment**:

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

**Start Development Server**:

```bash
npm run dev
```

App runs at http://localhost:8080

### 9.2 Development Workflow

**1. Frontend Development**:

```bash
# Start dev server with hot reload
npm run dev

# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm preview
```

**2. Backend Development (Edge Functions)**:

```bash
# Start local Supabase
supabase start

# Create new function
supabase functions new my-function

# Serve function locally
supabase functions serve my-function

# Test function
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Deploy function
supabase functions deploy my-function
```

**3. Database Development**:

```bash
# Create new migration
supabase migration new my_migration

# Apply migrations
supabase db push

# Reset local database
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### 9.3 Code Style Guide

**TypeScript**:
- Use functional components with hooks
- Prefer `const` over `let`
- Use explicit types for function parameters and return values
- Use interfaces for object shapes

**Example**:

```typescript
interface DocumentProps {
  document: KnowledgeDocument;
  onUpdate: (doc: KnowledgeDocument) => void;
}

export const DocumentCard: React.FC<DocumentProps> = ({
  document,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    // Implementation
  };

  return (
    <div className="p-4 border rounded">
      {/* UI */}
    </div>
  );
};
```

**Styling**:
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use shadcn-ui components for consistency

**File Organization**:
```
src/
├── pages/           # Page components (one per route)
├── components/      # Reusable components
│   ├── ui/          # shadcn-ui components
│   └── ...          # Feature-specific components
├── hooks/           # Custom React hooks
├── lib/             # Utilities and helpers
└── integrations/    # Third-party integrations
    └── supabase/    # Supabase client and types
```

### 9.4 Testing Strategy

**Manual Testing**:

1. **Authentication Flow**:
   - Sign up new user
   - Sign in existing user
   - Password reset
   - OAuth login (Google, Microsoft)

2. **Document Management**:
   - Upload document
   - Sync from Google Drive
   - Sync from Microsoft 365
   - View document
   - Delete document

3. **AI Queries**:
   - Query without KB
   - Query with specific KB
   - Verify context usage
   - Check response quality

4. **Subscription Flow**:
   - Create subscription (test mode)
   - Complete checkout
   - Verify subscription in database
   - Open Customer Portal
   - Update payment method
   - Cancel subscription

5. **Usage Tracking**:
   - Submit queries
   - Verify count increments
   - Check quota enforcement

**Edge Function Testing**:

```bash
# Test locally
supabase functions serve

# Send test request
curl -X POST http://localhost:54321/functions/v1/ai-query \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Test query",
    "knowledge_base_id": null
  }'
```

### 9.5 Debugging

**Frontend Debugging**:
- Use React DevTools
- Check browser console for errors
- Use Network tab for API requests
- Enable verbose logging: `localStorage.setItem('debug', 'true')`

**Backend Debugging**:
- Check Supabase Logs in dashboard
- Add `console.log()` in Edge Functions
- Test locally with `supabase functions serve`
- Use Supabase Studio for database queries

**Common Issues**:

1. **CORS Errors**: Ensure Edge Function includes CORS headers
2. **Authentication Errors**: Verify token is passed correctly
3. **RLS Errors**: Check policies allow operation
4. **Webhook Errors**: Verify signature and event type

### 9.6 Adding New Features

**Example: Add New Page**

1. **Create Page Component** (`src/pages/MyNewPage.tsx`):

```typescript
export default function MyNewPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My New Page</h1>
      {/* Content */}
    </div>
  );
}
```

2. **Add Route** (`src/App.tsx`):

```typescript
<Route
  path="/my-new-page"
  element={<ProtectedRoute><MyNewPage /></ProtectedRoute>}
/>
```

3. **Add Navigation Link** (`src/components/AppSidebar.tsx`):

```typescript
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <Link to="/my-new-page">
      <Icon className="mr-2" />
      My New Page
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

**Example: Add New Edge Function**

1. **Create Function**:

```bash
supabase functions new my-new-function
```

2. **Implement** (`supabase/functions/my-new-function/index.ts`):

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Your logic here
    const { data } = await req.json();

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
```

3. **Deploy**:

```bash
supabase functions deploy my-new-function
```

4. **Call from Frontend**:

```typescript
const { data, error } = await supabase.functions.invoke('my-new-function', {
  body: { /* data */ }
});
```

---

## 10. User Workflows

### 10.1 Onboarding Flow

1. **Sign Up**: User creates account via email/password or OAuth
2. **Welcome Screen**: Brief introduction to features
3. **First Document**: Guided upload or sync setup
4. **First Query**: Try AI query on uploaded document
5. **Subscription Prompt**: After 10 queries, prompt to subscribe

### 10.2 Document Sync Workflow

**Google Drive**:

1. Navigate to Documents page
2. Click "Connect Google Drive"
3. Authorize OAuth permissions
4. Select folders to sync
5. Documents automatically synced and analyzed
6. Receive notification when sync complete

**Microsoft 365**:

Similar to Google Drive, but with Microsoft authentication.

### 10.3 Knowledge Base Creation

1. Navigate to Knowledge Bases page
2. Click "Create Knowledge Base"
3. Enter name and description
4. Select documents to include
5. Click "Generate AI Summary"
6. Review and edit summary
7. Save knowledge base
8. Use for scoped queries

### 10.4 AI Query Workflow

**Simple Query**:

1. Enter question in query input
2. Optionally select knowledge base
3. Click "Ask" or press Enter
4. View response with document citations
5. Response automatically saved to history

**Conversation Mode**:

1. Navigate to Conversations page
2. Click "New Conversation"
3. Ask initial question
4. Review response
5. Ask follow-up questions
6. Context preserved throughout conversation
7. Conversation auto-saves with AI-generated title

### 10.5 Subscription Management

**Subscribe**:

1. Navigate to Settings > Billing
2. View plan comparison
3. Click "Subscribe" on desired plan
4. Redirected to Stripe Checkout
5. Enter payment information
6. Start 14-day free trial
7. Redirected back to app with confirmation

**Manage Subscription**:

1. Navigate to Settings > Billing
2. Click "Manage Subscription"
3. Redirected to Stripe Customer Portal
4. Update payment method, view invoices, or cancel
5. Changes reflected immediately in app

### 10.6 Timeline Management

1. Navigate to Timeline Manager
2. Click "Add Item"
3. Enter title, description, start/end time
4. Select category and color
5. Item appears on timeline
6. Drag to reposition (if enabled)
7. Timeline auto-scrolls, NOW line updates every minute

### 10.7 Support Request

1. Navigate to Support
2. Click "New Ticket"
3. Enter subject and description
4. Select category and priority
5. Submit ticket
6. Receive confirmation
7. Monitor ticket status
8. Respond to support messages
9. Close ticket when resolved

---

## 11. Known Issues & Roadmap

### 11.1 Known Issues

**Stripe Webhook** (Minor):
- Status: Working (200 OK responses in logs)
- Issue: Needs final verification in production
- Impact: Low - subscriptions created successfully via `verify-checkout-session`
- Fix: Already implemented, awaiting production test

**Stripe Branding** (User Action Required):
- Issue: Customer Portal shows "Wheels and Wins" instead of "AI Query Hub"
- Cause: Stripe Dashboard business settings not updated
- Impact: Low - cosmetic only
- Fix: User must update at https://dashboard.stripe.com/settings/public
  - Update business name to "AI Query Hub"
  - Upload logo
  - Set brand colors

**Legacy Code References** (Cleanup):
- Location: `supabase/functions/ai-query/index.ts` lines 304-305, 317
- Issue: Query logic includes "wheels" and "wins" keywords from previous project
- Impact: Very low - unlikely to affect queries
- Fix: Remove references (planned)

### 11.2 Roadmap

**Phase 1: Completion** (Current)
- [x] Core document management
- [x] AI query system with multi-provider support
- [x] Knowledge base management
- [x] Conversation system
- [x] Timeline manager with fixed day boundaries
- [x] Subscription system with Stripe integration
- [x] Support ticket system
- [x] Comprehensive documentation
- [ ] Final Stripe webhook verification
- [ ] Remove legacy code references
- [ ] Production deployment

**Phase 2: Enhancement** (Next 3 months)
- [ ] Semantic search with embeddings
- [ ] Document collaboration features
- [ ] Team workspaces
- [ ] Advanced analytics dashboard
- [ ] Mobile responsive improvements
- [ ] PWA support for offline access
- [ ] Export knowledge bases to PDF/DOCX
- [ ] Bulk document operations
- [ ] Document version history

**Phase 3: Advanced Features** (6-12 months)
- [ ] Research Agent integration (Python component)
- [ ] Multi-modal AI (image analysis, audio transcription)
- [ ] Custom AI model fine-tuning
- [ ] API access for developers
- [ ] Zapier/Make integrations
- [ ] Slack/Teams bot integration
- [ ] Advanced visualization tools
- [ ] Custom dashboard widgets
- [ ] White-label option for enterprise

**Phase 4: Scale** (12+ months)
- [ ] Enterprise plan with dedicated infrastructure
- [ ] On-premise deployment option
- [ ] Advanced security features (SSO, SAML)
- [ ] Compliance certifications (SOC 2, GDPR)
- [ ] Multi-region data residency
- [ ] Advanced admin controls
- [ ] Custom integrations via marketplace

### 11.3 Performance Optimizations

**Planned**:
- Implement response caching for common queries
- Add pagination for large document lists
- Optimize database queries with materialized views
- Implement CDN for static assets
- Add service worker for offline functionality
- Optimize bundle size with code splitting
- Implement virtual scrolling for long lists

### 11.4 Security Enhancements

**Planned**:
- Add two-factor authentication (2FA)
- Implement audit logging
- Add IP whitelisting for enterprise
- Enhance rate limiting
- Add anomaly detection for unusual activity
- Implement data encryption at rest (currently in transit only)
- Add security headers (CSP, HSTS, etc.)

---

## 12. API Reference

### 12.1 REST API Endpoints

All Edge Functions accessed via:

```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

**Authentication**: Include user JWT in Authorization header:

```
Authorization: Bearer <user-token>
```

### 12.2 AI Query API

**Endpoint**: `/ai-query`

**Method**: POST

**Request**:

```json
{
  "query": "What are the main findings in my research documents?",
  "knowledge_base_id": "uuid-optional"
}
```

**Response**:

```json
{
  "response": "Based on your research documents, the main findings are:\n1. ...",
  "document_count": 15,
  "knowledge_base_id": "uuid-or-null",
  "model_used": "claude-haiku",
  "tokens_used": 1250
}
```

**Errors**:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Error Codes**:
- `UNAUTHORIZED` - Invalid or missing auth token
- `QUOTA_EXCEEDED` - User exceeded query limit
- `INVALID_REQUEST` - Missing or invalid parameters
- `LLM_ERROR` - All LLM providers failed

### 12.3 Document Management API

**Upload Document**

**Endpoint**: `/upload-document`

**Method**: POST

**Content-Type**: `multipart/form-data`

**Request**: Form data with `file` field

**Response**:

```json
{
  "id": "uuid",
  "title": "document.pdf",
  "file_url": "https://...",
  "content": "Extracted content...",
  "summary": "AI-generated summary..."
}
```

**Delete Document**

**Endpoint**: `/delete-document`

**Method**: POST

**Request**:

```json
{
  "document_id": "uuid"
}
```

**Response**:

```json
{
  "success": true
}
```

### 12.4 Knowledge Base API

**Generate KB Summary**

**Endpoint**: `/generate-kb-content`

**Method**: POST

**Request**:

```json
{
  "knowledge_base_id": "uuid"
}
```

**Response**:

```json
{
  "summary": "This knowledge base contains 25 documents covering...",
  "key_themes": ["Research", "Analysis", "Data"],
  "document_count": 25
}
```

### 12.5 Subscription API

**Create Subscription**

**Endpoint**: `/create-subscription`

**Method**: POST

**Request**:

```json
{
  "priceId": "price_xxx",
  "planType": "pro"
}
```

**Response**:

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_xxx"
}
```

**Verify Checkout**

**Endpoint**: `/verify-checkout-session`

**Method**: POST

**Request**:

```json
{
  "session_id": "cs_xxx"
}
```

**Response**:

```json
{
  "success": true,
  "subscription": {
    "plan_type": "pro",
    "status": "trialing",
    "current_period_end": "2025-11-11T00:00:00Z",
    "trial_end": "2025-11-11T00:00:00Z"
  }
}
```

**Create Portal Session**

**Endpoint**: `/create-portal-session`

**Method**: POST

**Request**: Empty body `{}`

**Response**:

```json
{
  "url": "https://billing.stripe.com/p/session/xxx"
}
```

### 12.6 Sync APIs

**Google Drive Sync**

**Endpoint**: `/google-drive-sync`

**Method**: POST

**Request**:

```json
{
  "folder_id": "optional-specific-folder"
}
```

**Response**:

```json
{
  "synced_count": 15,
  "documents": [
    {
      "id": "uuid",
      "title": "Document 1",
      "source_id": "google-drive-file-id"
    }
  ]
}
```

**Microsoft 365 Sync**

**Endpoint**: `/microsoft-365-sync`

Similar to Google Drive Sync.

### 12.7 Analytics API

**Get Analytics**

**Endpoint**: `/analytics-query`

**Method**: POST

**Request**:

```json
{
  "metric": "daily_queries",
  "start_date": "2025-10-01",
  "end_date": "2025-10-28"
}
```

**Response**:

```json
{
  "data": [
    { "date": "2025-10-01", "count": 45 },
    { "date": "2025-10-02", "count": 52 },
    ...
  ]
}
```

### 12.8 Admin API

**Execute Command**

**Endpoint**: `/admin-command-center`

**Method**: POST

**Requires**: Admin role

**Request**:

```json
{
  "command": "user_details",
  "params": {
    "user_id": "uuid"
  }
}
```

**Response**:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscription": {
      "plan_type": "pro",
      "status": "active"
    },
    "usage": {
      "query_count": 350,
      "storage_used": 15000000
    }
  }
}
```

### 12.9 Rate Limits

**Default Limits**:
- 1000 requests per minute per IP
- 100 requests per minute per user
- AI queries limited by subscription plan

**Headers**:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1635724800
```

### 12.10 Webhooks

**Stripe Webhook**

**Endpoint**: `/stripe-webhook`

**Method**: POST

**Headers**:
- `Stripe-Signature` - Webhook signature for verification

**Events**: See Stripe webhook documentation

**Response**: `{ "received": true }`

---

## Appendix A: Environment Variables Reference

### Frontend (.env)

```
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Backend (Supabase Secrets)

```
# Database
SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# AI Providers
LOVABLE_API_KEY=<key> # Claude via Lovable Gateway
OPENROUTER_API_KEY=<key>
OPENAI_API_KEY=<key>

# Stripe
STRIPE_SECRET_KEY=<key>
STRIPE_WEBHOOK_SECRET=<whsec_xxx>
STRIPE_PUBLISHABLE_KEY=<pk_xxx>

# OAuth
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
MICROSOFT_CLIENT_ID=<id>
MICROSOFT_CLIENT_SECRET=<secret>

# AWS (optional)
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_REGION=us-east-1

# Optional Overrides
MODEL_PROVIDER=gemini # or openrouter, ollama
USE_OPENROUTER=false
USE_LOCAL_LLM=false
```

---

## Appendix B: Database Migrations List

All 62 migrations located in `supabase/migrations/`

**Key Migrations**:

1. `20240101000000_initial_schema.sql` - Initial tables creation
2. `20240115000000_add_knowledge_bases.sql` - Knowledge base support
3. `20240201000000_add_conversations.sql` - Conversation system
4. `20240215000000_add_subscriptions.sql` - Stripe subscriptions
5. `20240301000000_add_usage_tracking.sql` - Query usage tracking
6. `20240315000000_add_timeline_items.sql` - Timeline manager
7. `20240401000000_add_support_tickets.sql` - Support system
8. `20240415000000_add_embeddings.sql` - Vector search support
9. `20240501000000_add_analytics.sql` - Analytics tables
10. `20251025000001_enable_rls_app_config.sql` - Latest: RLS on app_config

---

## Appendix C: Component Hierarchy

```
App
├── ProtectedRoute
│   ├── Dashboard
│   ├── Documents
│   │   ├── DocumentViewerModal
│   │   ├── DocumentUploader
│   │   └── SyncConnections
│   ├── KnowledgeBases
│   │   ├── KnowledgeBaseCard
│   │   ├── KnowledgeBaseEditor
│   │   └── AIQueryInput
│   ├── Conversations
│   │   ├── ConversationList
│   │   ├── ConversationView
│   │   └── MessageBubble
│   ├── TimelineManager
│   │   ├── TimelineCanvas
│   │   ├── TimelineControls
│   │   └── ItemEditor
│   ├── Settings
│   │   ├── SettingsProfile
│   │   ├── SettingsBilling
│   │   ├── SettingsIntegrations
│   │   └── SettingsPreferences
│   └── Support
│       ├── SupportDashboard
│       ├── TicketList
│       └── TicketView
└── PublicRoute
    ├── Index (Landing)
    └── Auth (Login/Signup)
```

---

## Document History

**Version 1.0.0** - October 28, 2025
- Initial comprehensive documentation
- Created at "perfect point in time" before final Stripe fixes
- Backup reference: 2025-10-28_13-21-54_complete-Master

---

## Contact & Support

**Repository**: <repository-url>
**Documentation**: This file
**Backup Location**: `../2025-10-28_13-21-54_complete-Master/`

---

**END OF DOCUMENTATION**
