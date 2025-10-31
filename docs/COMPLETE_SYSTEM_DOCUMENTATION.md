# AI Query Hub - Complete System Documentation

**Version:** 2.0.0
**Last Updated:** October 31, 2025
**Status:** Production with Advanced Features

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Recent Major Additions (Oct 2025)](#recent-major-additions)
3. [Complete Feature List](#complete-feature-list)
4. [Architecture](#architecture)
5. [Technology Stack](#technology-stack)
6. [Database Schema](#database-schema)
7. [Edge Functions](#edge-functions)
8. [Frontend Components](#frontend-components)
9. [AI & Machine Learning](#ai--machine-learning)
10. [Security & Authentication](#security--authentication)
11. [Deployment](#deployment)
12. [Development Guide](#development-guide)

---

## System Overview

**AI Query Hub** is an enterprise-grade document intelligence and timeline management platform that combines AI-powered knowledge management with sophisticated timeline planning and executive-assistant collaboration tools.

### Core Capabilities

1. **Document Intelligence Platform**
   - Multi-cloud document sync (Google Drive, OneDrive, S3, WebDAV, SFTP)
   - AI-powered document querying with context-aware responses
   - Knowledge base creation and management
   - Conversation history with auto-generated titles

2. **Advanced Timeline Manager**
   - Magnetic timeline with 24-hour constraint
   - 20+ pre-built templates (sleep, meals, work, etc.)
   - AI goal planning with natural language processing
   - Executive-assistant delegation system

3. **Executive-Assistant System** (NEW)
   - Delegated timeline management
   - Document attachment to timeline items
   - Granular permission control
   - Complete audit trail
   - AI-generated daily briefs

4. **Research Agent** (Optional)
   - Python-based deep research using Agency Swarm
   - Multi-agent collaboration
   - Internal document search via MCP server

---

## Recent Major Additions

### October 31, 2025: Executive-Assistant System

**Migration**: `20251031000003_executive_assistant_system.sql`

**New Tables** (6):
1. `user_roles` - Role types, subscription tiers, feature flags
2. `assistant_relationships` - Executive-assistant delegated access with granular permissions
3. `timeline_documents` - Document storage metadata with tagging and categorization
4. `timeline_item_documents` - Document attachments to timeline items
5. `executive_daily_briefs` - AI-generated daily summaries for executives
6. `assistant_audit_log` - Complete audit trail of all assistant actions

**Key Features**:
- ✅ Executives can delegate timeline management to assistants
- ✅ Granular permissions (manage_timeline, upload_documents, create/edit/delete_items, view_confidential)
- ✅ Document upload with categories, tags, and confidential flag
- ✅ Attach documents to timeline items (briefings, references, outputs, notes)
- ✅ Automatic audit logging of all changes
- ✅ Row-level security for complete data isolation

**Utilities**: `src/lib/assistantUtils.ts` (30+ helper functions)

**Git Commits**: `94608a9`, `f80b728`, `a419274`

---

### October 31, 2025: AI Goal Planning System

**Files Created**:
- `src/hooks/useAIGoalPlanner.ts` - AI-powered goal planning with intelligent scheduling
- `src/lib/ai/prompts.ts` - Centralized prompt engineering library
- `src/components/timeline/AIGoalPlanner.tsx` - Full-featured UI component

**Key Features**:
- ✅ Natural language goal input (stream-of-consciousness)
- ✅ AI analyzes goals and creates milestones
- ✅ Generates specific, actionable tasks (30-240 minutes each)
- ✅ Intelligent scheduling with energy management
- ✅ Topological sorting for dependency resolution
- ✅ Habit stacking and progressive overload

**Git Commits**: `f09f076`, `b5a7276`

---

### October 2025: Timeline Manager Enhancements

**Improvements**:
- ✅ Intelligent time markers (view-specific subdivisions)
- ✅ 24-hour time format (cleaner display)
- ✅ Fixed day boundaries (markers are fixed timestamps)
- ✅ Temporary chat mode (conversations not saved)
- ✅ Auto-open conversation input
- ✅ Document viewer improvements (wider modal, better formatting)

**Database Migrations**:
- `20251031000000_enhanced_timeline_manager.sql` - Templates, goals, AI sessions
- `20251031000001_setup_me_timeline.sql` - Auto-creates "Me" timeline for all users
- `20251031000002_seed_timeline_templates.sql` - 20 system default templates

**Git Commits**: Multiple (see `docs/october-2025-improvements.md`)

---

## Complete Feature List

### Document Management
- ✅ Upload local files (PDF, Word, Excel, PowerPoint, images, text)
- ✅ Sync from Google Drive (OAuth 2.0)
- ✅ Sync from Microsoft OneDrive (OAuth 2.0)
- ✅ Connect to AWS S3 (access keys)
- ✅ Connect to WebDAV servers
- ✅ Connect to SFTP servers
- ✅ Document parsing and text extraction
- ✅ AI-powered document analysis
- ✅ Document categorization and tagging
- ✅ Full-text search
- ✅ Document viewer with formatting preservation

### Knowledge Bases
- ✅ Create knowledge bases from document collections
- ✅ AI-generated summaries for knowledge bases
- ✅ Query knowledge bases with context-aware AI
- ✅ Share knowledge bases (upcoming)
- ✅ Knowledge base analytics

### AI Query System
- ✅ Multi-provider support (Gemini, OpenRouter, Claude, Ollama)
- ✅ Automatic fallback chain (Gemini → OpenRouter → Ollama)
- ✅ Offline mode with local Ollama
- ✅ Context retrieval from documents
- ✅ Conversation management
- ✅ Auto-generated conversation titles
- ✅ Temporary chat mode (no history)
- ✅ Internet search integration (Brave Search)

### Timeline Manager
- ✅ Multi-layer timeline system
- ✅ Magnetic timeline (24-hour constraint, no gaps)
- ✅ Standard timeline (free positioning)
- ✅ Drag-and-drop timeline items
- ✅ Item status management (active, logjam, completed, parked)
- ✅ Parking lot for postponed items
- ✅ Zoom controls (day/week/month views)
- ✅ Real-time updates
- ✅ Auto-archive completed items

### Timeline Templates (NEW)
- ✅ 20 system default templates
- ✅ Categories: rest, personal, meal, health, work, travel, social, learning
- ✅ Custom user templates
- ✅ Template-based item creation
- ✅ Default start times for locked items
- ✅ Flexible vs locked templates

### Timeline Goals (NEW)
- ✅ Goal creation with AI planning
- ✅ Natural language goal input
- ✅ Milestone breakdown (3-7 major phases)
- ✅ Task generation (3-8 tasks per milestone)
- ✅ Intelligent scheduling with energy management
- ✅ Dependency resolution (topological sort)
- ✅ Progress tracking
- ✅ Goal-item linking
- ✅ Hours completed calculation

### Executive-Assistant System (NEW)
- ✅ Role management (executive, assistant, standard)
- ✅ Subscription tiers (starter, professional, executive)
- ✅ Feature flags (max_assistants, storage_gb, daily_briefs)
- ✅ Assistant relationship creation
- ✅ Granular permission control
- ✅ Document upload for executives
- ✅ Document attachment to timeline items
- ✅ Daily brief creation
- ✅ Audit logging of all actions
- ✅ IP address and user agent tracking

### Admin Features
- ✅ User management
- ✅ Support ticket system
- ✅ Analytics dashboard
- ✅ System health monitoring
- ✅ Stripe subscription management
- ✅ Storage usage tracking
- ✅ API usage analytics

### Subscription & Billing
- ✅ Stripe integration
- ✅ Three-tier pricing (Starter $9, Pro $45, Business $150)
- ✅ Subscription management
- ✅ Usage-based limits
- ✅ Payment history
- ✅ Invoice generation

### Security
- ✅ Row-Level Security (RLS) on all tables
- ✅ JWT authentication via Supabase Auth
- ✅ OAuth 2.0 for third-party integrations
- ✅ Encrypted token storage (AES-256-GCM)
- ✅ Audit trails for sensitive operations
- ✅ IP whitelisting (optional)
- ✅ Two-factor authentication (Supabase native)

---

## Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                          │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   React 18  │  │ TypeScript  │  │ Tailwind CSS│            │
│  │   + Vite    │  │     5.x     │  │  + shadcn   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│  Components: 50+  │  Pages: 23  │  Hooks: 14  │  Utils: 20+   │
└──────────────────────────────────────────────────────────────────┘
                                ↓
                          HTTPS/WebSocket
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                         SUPABASE LAYER                           │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │   PostgreSQL 15.x    │  │  Edge Functions (30+)│            │
│  │   • 40+ Tables       │  │  • Deno Runtime      │            │
│  │   • RLS Policies     │  │  • Serverless        │            │
│  │   • 67 Migrations    │  │  • Auto-scale        │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │   Auth Service       │  │  Storage Service     │            │
│  │   • JWT Tokens       │  │  • File Upload       │            │
│  │   • OAuth 2.0        │  │  • CDN Delivery      │            │
│  └──────────────────────┘  └──────────────────────┘            │
└──────────────────────────────────────────────────────────────────┘
                                ↓
                           External APIs
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                          │
│                                                                  │
│  AI Providers         │  Cloud Storage       │  Payments        │
│  • Anthropic Claude   │  • Google Drive      │  • Stripe        │
│  • OpenRouter         │  • Microsoft Graph   │                  │
│  • Ollama (local)     │  • AWS S3            │  Search          │
│                       │  • WebDAV/SFTP       │  • Brave Search  │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

**1. AI Query Flow**
```
User Query → AIQueryInput
  → supabase.functions.invoke('ai-query')
    → Retrieve user documents
    → Build context from knowledge base
    → Call LLM (Gemini → OpenRouter → Ollama)
    → Return response
  → Save to ai_query_history
  → Display to user
```

**2. Timeline Item Creation Flow**
```
User Action → AddItemForm
  → Validate data
  → supabase.from('timeline_items').insert()
    → RLS check (user_id match)
    → Insert item
    → Trigger: log_timeline_item_changes (if assistant)
  → Real-time update → TimelineCanvas
```

**3. Executive-Assistant Flow**
```
Executive creates relationship
  → assistant_relationships (status: pending)
  → Assistant approves
    → Update status: active
  → Assistant creates timeline item
    → RLS check: has permission 'create_items'?
    → Insert item
    → Trigger: auto_log_timeline_item_changes
      → Insert into assistant_audit_log
```

**4. Document Upload Flow**
```
User selects file → uploadDocument()
  → Validate file (type, size)
  → Upload to Supabase Storage
    → Generate public URL
  → Create record in timeline_documents
    → Trigger: auto_log_document_actions
  → Return document metadata
```

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose | Files |
|-----------|---------|---------|-------|
| React | 18.3.1 | UI framework | 50+ components |
| TypeScript | 5.5.3 | Type safety | All `.ts`/`.tsx` |
| Vite | 5.4.1 | Build tool | `vite.config.ts` |
| Tailwind CSS | 3.4.1 | Styling | All components |
| shadcn/ui | Latest | Component library | `src/components/ui/` |
| TanStack Query | 5.x | Data fetching | Throughout |
| React Router | 6.26.2 | Routing | `src/App.tsx` |
| Lucide React | Latest | Icons | Throughout |
| date-fns | 3.x | Date utilities | Timeline components |

### Backend Technologies

| Technology | Version | Purpose | Location |
|-----------|---------|---------|----------|
| Supabase | Cloud | BaaS platform | All backend |
| PostgreSQL | 15.x | Database | Supabase hosted |
| Deno | Latest | Edge Functions | `supabase/functions/` |
| PostgREST | Latest | Auto-generated API | Supabase |
| pg_net | Latest | HTTP client | Edge Functions |
| pgvector | 0.5.x | Vector embeddings | Future use |

### AI & ML

| Provider | Models | Use Case |
|----------|--------|----------|
| Anthropic | Claude Haiku 4.5 | Primary AI (fast, cost-effective) |
| OpenRouter | GPT-4o, Claude, etc. | Fallback provider |
| Ollama | llama3, mistral, etc. | Offline/local AI |
| Lovable AI | Gemini via gateway | Always available |

### Infrastructure

| Service | Purpose | Details |
|---------|---------|---------|
| Netlify | Frontend CDN | Auto-deploy from GitHub |
| Supabase Cloud | Backend | Database, Auth, Storage, Functions |
| GitHub | Version control | Source repository |
| Stripe | Payments | Subscription billing |

---

## Database Schema

### Schema Overview (40+ Tables)

**Category 1: Core User Management**
- `auth.users` - User accounts (Supabase managed)
- `user_roles` - Role types, subscription tiers, feature flags ✨ NEW
- `user_settings` - User preferences
- `user_google_tokens` - Google Drive OAuth tokens (encrypted)
- `subscriptions` - Stripe subscription data

**Category 2: Document Management**
- `knowledge_documents` - User documents with AI summaries
- `knowledge_bases` - Document collections
- `enterprise_servers` - Cloud storage connections (S3, WebDAV, SFTP)
- `timeline_documents` - Timeline-attached documents ✨ NEW
- `timeline_item_documents` - Document-item relationships ✨ NEW

**Category 3: Timeline System**
- `timeline_layers` - Timeline tracks
- `timeline_items` - Timeline events/tasks
- `timeline_settings` - User timeline preferences
- `parked_items` - Postponed items
- `timeline_templates` - Reusable item templates ✨ NEW
- `timeline_goals` - User goals with AI planning ✨ NEW
- `timeline_goal_items` - Goal-item relationships ✨ NEW
- `timeline_ai_sessions` - AI interaction logs ✨ NEW

**Category 4: Executive-Assistant System** ✨ NEW
- `assistant_relationships` - Executive-assistant delegations
- `executive_daily_briefs` - AI-generated daily summaries
- `assistant_audit_log` - Complete audit trail

**Category 5: AI & Conversations**
- `conversations` - Chat history
- `ai_query_history` - Query logs with context

**Category 6: Admin & Support**
- `support_tickets` - In-app support system
- `admin_messages` - Admin command center
- `analytics_events` - Usage tracking

**Category 7: Payments**
- `invoices` - Stripe invoices
- `payments` - Payment records
- `usage_tracking` - API usage

### Key Tables Details

#### user_roles ✨ NEW

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  role_type user_role_type NOT NULL DEFAULT 'standard',
  subscription_tier subscription_tier NOT NULL DEFAULT 'starter',
  features_enabled JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enums
CREATE TYPE user_role_type AS ENUM ('executive', 'assistant', 'standard');
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'executive');
```

**Purpose**: Manages user roles and feature access based on subscription

**Key Fields**:
- `role_type`: executive (has assistants), assistant (manages for others), standard (regular user)
- `subscription_tier`: Controls storage, features, limits
- `features_enabled`: JSON flags like `{ai_assistant: true, max_assistants: 3, storage_gb: 50}`

#### assistant_relationships ✨ NEW

```sql
CREATE TABLE assistant_relationships (
  id UUID PRIMARY KEY,
  executive_id UUID NOT NULL REFERENCES auth.users(id),
  assistant_id UUID NOT NULL REFERENCES auth.users(id),
  permissions JSONB NOT NULL DEFAULT '{
    "manage_timeline": true,
    "upload_documents": true,
    "create_items": true,
    "edit_items": true,
    "delete_items": false,
    "view_confidential": false
  }'::jsonb,
  status relationship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  CONSTRAINT no_self_assignment CHECK (executive_id != assistant_id),
  CONSTRAINT unique_relationship UNIQUE (executive_id, assistant_id)
);
```

**Purpose**: Manages executive-assistant delegations with granular permissions

**Permissions**:
- `manage_timeline`: View and navigate executive's timeline
- `upload_documents`: Upload files for executive
- `create_items`: Create new timeline items
- `edit_items`: Modify existing items
- `delete_items`: Delete items (default false for safety)
- `view_confidential`: Access confidential documents
- `view_only_layers`: Array of layer IDs with read-only access

#### timeline_documents ✨ NEW

```sql
CREATE TABLE timeline_documents (
  id UUID PRIMARY KEY,
  uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  for_user_id UUID NOT NULL REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  document_date DATE, -- When document is relevant
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  is_confidential BOOLEAN DEFAULT false,
  storage_provider storage_provider NOT NULL DEFAULT 'supabase',
  checksum TEXT -- SHA-256 for integrity
);
```

**Purpose**: Stores document metadata for timeline attachments

**Key Fields**:
- `uploaded_by_user_id`: Who uploaded (could be assistant)
- `for_user_id`: Who owns the document
- `document_date`: Relevance date (e.g., meeting date)
- `is_confidential`: Requires special permission to view

#### timeline_templates ✨ NEW

```sql
CREATE TABLE timeline_templates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- NULL for system defaults
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  default_start_time TIME, -- e.g., '22:00:00' for sleep
  category template_category NOT NULL,
  color TEXT NOT NULL,
  icon TEXT, -- Lucide icon name
  is_locked_time BOOLEAN DEFAULT false,
  is_flexible BOOLEAN DEFAULT true,
  is_system_default BOOLEAN DEFAULT false
);
```

**Purpose**: Pre-configured timeline items (Sleep, Breakfast, Work Block, etc.)

**System Defaults**: 20 templates seeded in migration `20251031000002`

---

## Edge Functions

### Complete Function List (30+)

**AI & Query Functions**:
1. `ai-query` - Main AI query handler with context retrieval
2. `ai-document-analysis` - Generate document summaries
3. `generate-conversation-title` - Auto-title conversations
4. `claude-document-processor` - Process docs with Claude

**Document Functions**:
5. `parse-document` - Extract text from files
6. `google-drive-sync` - Sync Google Drive files
7. `onedrive-sync` - Sync OneDrive files
8. `s3-sync` - Sync AWS S3 files
9. `webdav-sync` - Sync WebDAV files
10. `sftp-sync` - Sync SFTP files

**Storage Functions**:
11. `storage-callback` - Handle OAuth callbacks
12. `get-storage-providers` - List connected providers
13. `disconnect-storage` - Remove storage connection

**Subscription Functions**:
14. `create-subscription` - Create Stripe checkout session
15. `stripe-webhook` - Handle Stripe events
16. `cancel-subscription` - Cancel user subscription
17. `get-subscription-status` - Check subscription state

**Admin Functions**:
18. `admin-query` - Admin command execution
19. `get-system-health` - System status
20. `get-analytics` - Usage analytics
21. `admin-command-center` - Admin operations

**Support Functions**:
22. `submit-support-ticket` - Create support tickets
23. `update-support-ticket` - Update ticket status

**Auth Functions**:
24. `register-user` - User registration with validation ✨ NEW

**Other Functions**:
25. `process-payment` - Handle payments
26. `generate-invoice` - Create invoices
27. `track-usage` - Log API usage
28. `health-check` - Function health status

### Key Function Details

#### ai-query

**Location**: `supabase/functions/ai-query/index.ts`

**Purpose**: Main AI query handler with multi-provider support and context retrieval

**Flow**:
```typescript
1. Authenticate user (JWT token)
2. Fetch user settings (model preference)
3. Retrieve documents:
   - If knowledge_base_id provided → get KB documents
   - Else → get all user documents
4. Build context (up to 100k tokens)
5. Call LLM provider:
   - Try Gemini via Lovable Gateway
   - Fallback to OpenRouter if fails
   - Fallback to local Ollama if available
6. Save query to ai_query_history
7. Return response with metadata
```

**Request**:
```json
{
  "query": "What are the key points from Q3 report?",
  "knowledge_base_id": "optional-uuid",
  "model_preference": "gemini|openrouter|ollama"
}
```

**Response**:
```json
{
  "response": "Based on the Q3 report...",
  "documents_used": 5,
  "provider": "gemini",
  "tokens": 1247
}
```

#### stripe-webhook

**Location**: `supabase/functions/stripe-webhook/index.ts`

**Purpose**: Handle Stripe subscription lifecycle events

**Recent Fix (Oct 31)**:
- Fixed API version mismatch (2024-10-28 → 2025-02-24)
- Fixed upsert syntax causing HTTP 500 errors
- Improved error handling

**Events Handled**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

#### register-user ✨ NEW

**Location**: `supabase/functions/register-user/index.ts`

**Purpose**: User registration with email/password validation

**Features**:
- Email format validation
- Password strength requirements (8+ chars, uppercase, lowercase, number, special)
- Common password blocking
- Auto-create user_role on signup
- Auto-create "Me" timeline

---

## Frontend Components

### Component Structure (50+ Components)

**Layout Components** (`src/components/layout/`):
- `AppSidebar.tsx` - Main navigation sidebar
- `Navbar.tsx` - Top navigation bar
- `Footer.tsx` - Footer with links

**Timeline Components** (`src/components/timeline/`):
- `TimelineManager.tsx` - Main timeline container
- `TimelineCanvas.tsx` - SVG timeline renderer
- `TimelineItem.tsx` - Individual timeline items
- `TimelineControls.tsx` - Zoom and view controls
- `AddItemForm.tsx` - Create new items
- `ItemActionMenu.tsx` - Context menu for items
- `ParkedItemsPanel.tsx` - Parking lot sidebar
- `TimelineLayerManager.tsx` - Layer management
- `AIGoalPlanner.tsx` - AI goal planning modal ✨ NEW

**UI Components** (`src/components/ui/`):
- 40+ shadcn components (Button, Card, Dialog, etc.)

**Feature Components** (`src/components/`):
- `AIAssistant.tsx` - General AI chat
- `AIQueryInput.tsx` - Document query interface
- `ConversationChat.tsx` - Conversation UI
- `DocumentVisualizationPanel.tsx` - Document viewer
- `KnowledgeBasePanel.tsx` - KB management
- `AdminAnalyticsPanel.tsx` - Admin analytics
- `StorageConnectionPanel.tsx` - Cloud storage

### Pages (23 Pages)

**Public Pages**:
- `Landing.tsx` - Marketing landing page
- `Auth.tsx` - Login/registration

**Protected Pages**:
- `Dashboard.tsx` - Main dashboard
- `Documents.tsx` - Document management
- `KnowledgeBases.tsx` - Knowledge base list
- `Conversations.tsx` - Chat history
- `TimelineView.tsx` - Timeline manager
- `Settings.tsx` - User settings
- `Support.tsx` - Support tickets
- `Subscription.tsx` - Billing management

**Admin Pages** (`src/pages/admin/`):
- `AdminDashboard.tsx` - Admin overview
- `AdminUsers.tsx` - User management
- `AdminAnalytics.tsx` - System analytics
- `AdminSupportTickets.tsx` - Support management

### Custom Hooks (14 Hooks)

**Auth & User**:
- `useAuth.tsx` - Authentication state
- `useUser.tsx` - User profile

**Data Management**:
- `useDocuments.tsx` - Document CRUD
- `useKnowledgeBases.tsx` - KB operations
- `useConversations.tsx` - Chat management
- `useGoogleDrive.tsx` - Google Drive integration

**Timeline**:
- `useTimeline.tsx` - Timeline items
- `useMagneticTimeline.ts` - Magnetic timeline logic ⏳ Pending
- `useAIGoalPlanner.ts` - AI goal planning ✨ NEW

**Executive-Assistant** ✨ NEW:
- Functions in `src/lib/assistantUtils.ts` (not hooks, but utilities)

**Others**:
- `useToast.tsx` - Toast notifications
- `useLocalStorage.tsx` - Local storage wrapper

---

## AI & Machine Learning

### AI Provider Configuration

**Primary**: Anthropic Claude
- Model: Claude Haiku 4.5
- Use Case: Fast, cost-effective queries
- Endpoint: `https://api.anthropic.com/v1/messages`

**Fallback**: OpenRouter
- Models: GPT-4o, Claude Opus, etc.
- Use Case: When Anthropic fails or user preference
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`

**Offline**: Ollama
- Models: llama3, mistral, codellama
- Use Case: Air-gapped environments
- Endpoint: `http://localhost:11434/api/chat`

**Always Available**: Lovable AI Gateway
- Model: Gemini via proxy
- Use Case: Guaranteed availability
- Endpoint: Lovable proxy

### Prompt Engineering ✨ NEW

**Location**: `src/lib/ai/prompts.ts`

**Templates**:

1. **Goal Analysis**:
```typescript
analyzeGoal(goal: string, timeframe: string)
// Returns: {interpretedGoal, estimatedHours, priority, category, targetDate}
```

2. **Milestone Creation**:
```typescript
createMilestones(goal, timeframe, estimatedHours, targetDate)
// Returns: [{title, description, weekNumber, estimatedHours, dependencies}]
```

3. **Task Generation**:
```typescript
generateTasks(milestones, category)
// Returns: [{title, duration, cognitiveLoad, flexibility, preferredTimeOfDay}]
```

4. **Timeline Optimization**:
```typescript
optimizeTimeline(items)
// Analyzes for work-overload, insufficient-sleep, skipped-meals, no-leisure
```

### AI Query Context Building

```typescript
// From ai-query Edge Function
const buildContext = (documents, maxTokens = 100000) => {
  let context = "Documents:\n\n";
  let tokenCount = 0;

  for (const doc of documents) {
    const docText = `${doc.title}\n${doc.content}\n\n`;
    const estimatedTokens = docText.length / 4;

    if (tokenCount + estimatedTokens > maxTokens) break;

    context += docText;
    tokenCount += estimatedTokens;
  }

  return { context, documentsUsed: count };
};
```

---

## Security & Authentication

### Authentication Methods

1. **Email/Password**
   - Validation in `register-user` Edge Function
   - Password requirements: 8+ chars, mixed case, number, special char
   - Stored securely by Supabase Auth (bcrypt)

2. **OAuth 2.0**
   - Google (for Drive sync)
   - Microsoft (for OneDrive sync)
   - Tokens encrypted with AES-256-GCM before storage

3. **JWT Tokens**
   - Issued by Supabase Auth
   - Validated on every request
   - Expire after 1 hour (refresh token: 7 days)

### Row-Level Security (RLS)

**All tables have RLS enabled** with policies like:

```sql
-- Users can only see their own data
CREATE POLICY "Users view own items"
ON timeline_items FOR SELECT
USING (auth.uid() = user_id);

-- Assistants can view executive data with permission
CREATE POLICY "Assistants view executive items"
ON timeline_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assistant_relationships
    WHERE assistant_id = auth.uid()
      AND executive_id = timeline_items.user_id
      AND status = 'active'
      AND (permissions->>'manage_timeline')::boolean = true
  )
);
```

### Audit Logging ✨ NEW

**Automatic Triggers**:
```sql
-- Log all timeline item changes by assistants
CREATE TRIGGER log_timeline_item_changes
AFTER INSERT OR UPDATE OR DELETE ON timeline_items
FOR EACH ROW EXECUTE FUNCTION auto_log_timeline_item_changes();

-- Log all document uploads/deletes
CREATE TRIGGER log_document_actions
AFTER INSERT OR DELETE ON timeline_documents
FOR EACH ROW EXECUTE FUNCTION auto_log_document_actions();
```

**Audit Log Fields**:
- actor_user_id (who did it)
- target_user_id (whose data)
- action (create/update/delete/view/upload/etc.)
- resource_type (timeline_item, document, etc.)
- resource_id (UUID of affected resource)
- details (JSON with before/after states)
- ip_address, user_agent
- created_at (timestamp)

---

## Deployment

### Frontend Deployment (Netlify)

**Build Settings**:
```bash
# Build command
npm install --legacy-peer-deps && npm run build

# Publish directory
dist

# Environment variables
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

**Auto-Deploy**:
- Triggers on push to `main` branch
- Build time: ~2-3 minutes
- CDN propagation: Instant

### Backend Deployment (Supabase)

**Database Migrations**:
```bash
# Apply migrations
supabase db push

# Or apply manually via SQL Editor
# Copy/paste migration files
```

**Edge Functions**:
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy ai-query

# Set environment variables
supabase secrets set OPENAI_API_KEY=sk-...
```

**Storage Buckets**:
- `assets` - Public assets (hero images)
- `timeline-documents` - Timeline attachments ✨ NEW
- `knowledge-documents` - Uploaded documents

---

## Development Guide

### Getting Started

```bash
# Clone repository
git clone https://github.com/Thabonel/drive-flow-ai-know.git
cd aiqueryhub

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
# Opens on http://localhost:8080

# In another terminal, start Supabase locally (optional)
supabase start
```

### Environment Setup

**`.env` file**:
```bash
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Database Setup

```bash
# Pull remote schema
supabase db pull

# Reset local database
supabase db reset

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Code Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn components
│   ├── timeline/       # Timeline-specific
│   └── layout/         # Layout components
├── pages/              # Page components
│   └── admin/          # Admin pages
├── hooks/              # Custom React hooks
├── lib/                # Utilities
│   ├── ai/            # AI utilities
│   ├── timelineUtils.ts
│   └── assistantUtils.ts
├── integrations/       # External integrations
│   └── supabase/       # Supabase client
└── App.tsx             # Main app component

supabase/
├── functions/          # Edge Functions (30+)
│   ├── ai-query/
│   ├── stripe-webhook/
│   └── register-user/
└── migrations/         # SQL migrations (67)
    └── 20251031000003_executive_assistant_system.sql
```

### Testing

```bash
# Run linter
npm run lint

# Build for production (test)
npm run build

# Preview production build
npm preview
```

### Common Tasks

**Add a new page**:
1. Create `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add nav link in `src/components/AppSidebar.tsx`

**Add a new Edge Function**:
1. Create `supabase/functions/new-function/index.ts`
2. Deploy: `supabase functions deploy new-function`
3. Set secrets: `supabase secrets set KEY=value`

**Add a new database table**:
1. Create migration: `supabase migration new table_name`
2. Write SQL in generated file
3. Apply: `supabase db push`
4. Update types: `supabase gen types typescript --linked`

---

## Additional Resources

### Documentation Files

- `ENHANCED_TIMELINE_IMPLEMENTATION.md` - Timeline feature guide
- `TECHNICAL_DOCUMENTATION.md` - Original technical docs
- `handover.md` - October 23 handover document
- `october-2025-improvements.md` - October improvements log
- `FUTURE_IMPROVEMENTS.md` - Roadmap
- `stripe-webhook-setup.md` - Stripe integration guide
- `APPLY_EXECUTIVE_SYSTEM.md` - Executive-assistant setup

### Migration Files

**Recent Key Migrations**:
- `20251031000000_enhanced_timeline_manager.sql` - Templates, goals, AI sessions
- `20251031000001_setup_me_timeline.sql` - Auto-create "Me" timeline
- `20251031000002_seed_timeline_templates.sql` - 20 system templates
- `20251031000003_executive_assistant_system.sql` - Executive-assistant system
- `20251031000004_fix_user_roles.sql` - Fix features_enabled column
- `20251031000005_complete_executive_assistant_system.sql` - Completion migration

### Git Commits

**Recent Major Commits**:
- `94608a9` - Executive-assistant system and document management
- `f80b728` - Fix user_roles.features_enabled column
- `a419274` - Complete executive-assistant system migration
- `f09f076` - AI goal planning hook and prompts
- `b5a7276` - AI Goal Planner UI component
- `12dcba0` - Enhanced timeline database schema
- `2b93718` - Timeline setup and seed migrations

### Support

- **In-App**: Use Support Tickets page (`/support`)
- **GitHub**: https://github.com/Thabonel/drive-flow-ai-know
- **Supabase Dashboard**: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro

---

**End of Complete System Documentation**
