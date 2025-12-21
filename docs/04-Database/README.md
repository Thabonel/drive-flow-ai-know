# Database Schema Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Document Management](#document-management)
4. [AI & Knowledge Base](#ai--knowledge-base)
5. [Timeline & Tasks](#timeline--tasks)
6. [Team Collaboration](#team-collaboration)
7. [Assistant Features](#assistant-features)
8. [Calendar & Scheduling](#calendar--scheduling)
9. [Storage Integration](#storage-integration)
10. [Billing & Subscriptions](#billing--subscriptions)
11. [Admin & Audit](#admin--audit)
12. [Relationships](#relationships)
13. [Indexes & Performance](#indexes--performance)
14. [Row-Level Security](#row-level-security)

---

## Overview

**Database**: PostgreSQL 15+ (Supabase-managed)
**Extensions**:
- `uuid-ossp` - UUID generation
- `pgvector` - Vector embeddings for AI
- `pg_cron` - Scheduled jobs

**Total Tables**: 98 (as of December 2025)
**Migration Files**: 98

### Schema Principles

1. **User Isolation**: Every table has `user_id` foreign key
2. **Row-Level Security (RLS)**: Enforced on all tables
3. **Soft Deletes**: Most tables use `deleted_at` instead of hard deletes
4. **Timestamps**: `created_at` and `updated_at` on all tables
5. **JSONB**: Used for flexible metadata and settings
6. **UUIDs**: All primary keys are UUIDs

---

## Core Tables

### `profiles`
**Purpose**: User profile information (extends Supabase Auth users)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free',  -- free, premium, enterprise
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Tiers**:
- `free` - Basic features
- `premium` - Advanced AI, unlimited documents
- `enterprise` - Team features, SSO, dedicated support

---

### `user_settings`
**Purpose**: User preferences and configuration

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  model_preference TEXT DEFAULT 'claude',  -- claude, openai, gemini
  theme TEXT DEFAULT 'system',  -- light, dark, system
  notifications_enabled BOOLEAN DEFAULT TRUE,
  daily_brief_time TIME,  -- HH:mm format
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Document Management

### `knowledge_documents`
**Purpose**: Uploaded and synced documents

```sql
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT,  -- Extracted text content
  ai_summary TEXT,  -- AI-generated summary
  category TEXT,  -- Document category
  tags TEXT[],  -- Array of tags
  file_path TEXT,  -- Storage path
  file_size INTEGER,
  mime_type TEXT,
  source TEXT,  -- 'upload', 'google_drive', 'onedrive', 'dropbox'
  source_id TEXT,  -- External file ID
  embedding VECTOR(1536),  -- OpenAI embedding for semantic search
  metadata JSONB,  -- Additional metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knowledge_documents_user_id ON knowledge_documents(user_id);
CREATE INDEX idx_knowledge_documents_created_at ON knowledge_documents(created_at DESC);
CREATE INDEX idx_knowledge_documents_embedding ON knowledge_documents USING ivfflat (embedding vector_cosine_ops);
```

**Common Queries**:
```sql
-- Get user's documents
SELECT * FROM knowledge_documents
WHERE user_id = 'xxx'
ORDER BY created_at DESC;

-- Search by tags
SELECT * FROM knowledge_documents
WHERE user_id = 'xxx'
  AND tags && ARRAY['tag1', 'tag2'];

-- Semantic search
SELECT * FROM knowledge_documents
WHERE user_id = 'xxx'
ORDER BY embedding <=> query_embedding
LIMIT 10;
```

---

### `document_attachments`
**Purpose**: File attachments for documents

```sql
CREATE TABLE document_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES knowledge_documents ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## AI & Knowledge Base

### `knowledge_bases`
**Purpose**: Collections of documents with AI-generated content

```sql
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,  -- AI-generated knowledge base content
  source_document_ids UUID[],  -- Array of document IDs
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Relationship**:
- `source_document_ids` contains array of `knowledge_documents.id` values
- Not enforced as foreign key to allow deleted documents to remain referenced

---

### `ai_query_history`
**Purpose**: Saved AI conversation history

```sql
CREATE TABLE ai_query_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  knowledge_base_id UUID REFERENCES knowledge_bases,
  document_count INTEGER DEFAULT 0,
  model_used TEXT,  -- claude-opus-4-5, gpt-4o, etc.
  web_search_used BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `conversations`
**Purpose**: Saved multi-turn conversations

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL,  -- Array of {role, content, timestamp}
  summary TEXT,  -- AI-generated summary
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Messages Format**:
```json
[
  {
    "role": "user",
    "content": "What is machine learning?",
    "timestamp": "2025-12-21T10:00:00Z"
  },
  {
    "role": "assistant",
    "content": "Machine learning is...",
    "timestamp": "2025-12-21T10:00:05Z"
  }
]
```

---

### `agentic_memories`
**Purpose**: Long-term AI memory storage

```sql
CREATE TABLE agentic_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  agent TEXT NOT NULL,  -- 'assistant', 'planner', 'researcher'
  memory_type TEXT NOT NULL,  -- 'preference', 'fact', 'skill', 'goal'
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Timeline & Tasks

### `timeline_items`
**Purpose**: User tasks and calendar events (main timeline)

```sql
CREATE TABLE timeline_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Scheduling
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT FALSE,

  -- Time tracking
  actual_duration_minutes INTEGER,
  estimated_duration_minutes INTEGER,

  -- Status & Priority
  status TEXT DEFAULT 'pending',  -- pending, in_progress, completed, parked
  priority TEXT DEFAULT 'medium',  -- low, medium, high, urgent

  -- Organization
  layer_id UUID REFERENCES timeline_layers,  -- Visual layer/category
  parent_id UUID REFERENCES timeline_items,  -- Parent task (for sub-tasks)
  order_index INTEGER,  -- Manual ordering

  -- Recurrence
  recurring_series_id UUID,  -- Groups recurring instances
  recurrence_pattern JSONB,  -- RRULE-like pattern

  -- Metadata
  tags TEXT[],
  metadata JSONB,

  -- Collaboration
  assigned_to UUID REFERENCES auth.users,
  delegated_by UUID REFERENCES auth.users,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_timeline_items_user_id ON timeline_items(user_id);
CREATE INDEX idx_timeline_items_scheduled_start ON timeline_items(scheduled_start);
CREATE INDEX idx_timeline_items_status ON timeline_items(status);
CREATE INDEX idx_timeline_items_layer_id ON timeline_items(layer_id);
```

**Common Queries**:
```sql
-- Get day's tasks
SELECT * FROM timeline_items
WHERE user_id = 'xxx'
  AND scheduled_start::DATE = '2025-12-21'
  AND deleted_at IS NULL
ORDER BY scheduled_start;

-- Get pending tasks
SELECT * FROM timeline_items
WHERE user_id = 'xxx'
  AND status = 'pending'
  AND deleted_at IS NULL
ORDER BY priority DESC, scheduled_start;

-- Get sub-tasks
SELECT * FROM timeline_items
WHERE parent_id = 'xxx'
ORDER BY order_index;
```

---

### `timeline_layers`
**Purpose**: Visual categories/layers for timeline items

```sql
CREATE TABLE timeline_layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  color TEXT,  -- Hex color code
  icon TEXT,  -- Icon name
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Example Layers**:
- 📧 Email
- 💼 Work
- 👥 Meetings
- 🏠 Personal
- 🎯 Goals

---

### `timeline_item_documents`
**Purpose**: Link documents to timeline items

```sql
CREATE TABLE timeline_item_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timeline_item_id UUID REFERENCES timeline_items ON DELETE CASCADE,
  document_id UUID REFERENCES knowledge_documents ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `timeline_item_notes`
**Purpose**: Notes attached to timeline items

```sql
CREATE TABLE timeline_item_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timeline_item_id UUID REFERENCES timeline_items ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `time_tracking`
**Purpose**: Detailed time tracking for tasks

```sql
CREATE TABLE time_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  timeline_item_id UUID REFERENCES timeline_items,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Team Collaboration

### `teams`
**Purpose**: Team/organization records

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users NOT NULL,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `team_members`
**Purpose**: Team membership and roles

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL,  -- owner, admin, member, assistant
  invited_by UUID REFERENCES auth.users,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

**Roles**:
- `owner` - Full control, billing
- `admin` - Manage members, settings
- `member` - View/edit shared content
- `assistant` - Limited access, delegation queue

---

### `team_invitations`
**Purpose**: Pending team invitations

```sql
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Assistant Features

### `assistant_relationships`
**Purpose**: Executive-assistant relationships

```sql
CREATE TABLE assistant_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  executive_id UUID REFERENCES auth.users NOT NULL,
  assistant_id UUID REFERENCES auth.users NOT NULL,
  permissions JSONB,  -- What assistant can access
  status TEXT DEFAULT 'active',  -- active, inactive
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(executive_id, assistant_id)
);
```

**Permissions**:
```json
{
  "can_view_timeline": true,
  "can_edit_timeline": true,
  "can_view_documents": true,
  "can_view_calendar": true,
  "can_schedule_meetings": true
}
```

---

### `delegation_queue`
**Purpose**: Tasks delegated to assistants

```sql
CREATE TABLE delegation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timeline_item_id UUID REFERENCES timeline_items,
  delegated_by UUID REFERENCES auth.users NOT NULL,
  assigned_to UUID REFERENCES auth.users NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, accepted, completed, declined
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `meeting_briefings`
**Purpose**: AI-generated meeting preparation briefs

```sql
CREATE TABLE meeting_briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  timeline_item_id UUID REFERENCES timeline_items,  -- Associated meeting
  briefing_content TEXT,  -- AI-generated brief
  attendees TEXT[],
  agenda JSONB,
  preparation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Calendar & Scheduling

### `calendar_sync_settings`
**Purpose**: Google Calendar sync configuration

```sql
CREATE TABLE calendar_sync_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  calendar_id TEXT,  -- Google Calendar ID
  sync_enabled BOOLEAN DEFAULT FALSE,
  sync_direction TEXT DEFAULT 'both',  -- to_calendar, from_calendar, both
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `calendar_sync_log`
**Purpose**: Sync operation history

```sql
CREATE TABLE calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  sync_type TEXT,  -- 'full', 'incremental'
  items_synced INTEGER DEFAULT 0,
  errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `bookings`
**Purpose**: Booking appointments

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_link_id UUID REFERENCES booking_links ON DELETE CASCADE,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'confirmed',  -- confirmed, cancelled, completed
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `booking_links`
**Purpose**: Public booking pages

```sql
CREATE TABLE booking_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  availability JSONB,  -- Available time slots
  settings JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Availability Format**:
```json
{
  "timezone": "America/New_York",
  "schedule": {
    "monday": [{"start": "09:00", "end": "17:00"}],
    "tuesday": [{"start": "09:00", "end": "17:00"}],
    "wednesday": [{"start": "09:00", "end": "17:00"}],
    "thursday": [{"start": "09:00", "end": "17:00"}],
    "friday": [{"start": "09:00", "end": "12:00"}]
  }
}
```

---

## Storage Integration

### `user_google_tokens`
**Purpose**: Google OAuth tokens for Drive/Calendar

```sql
CREATE TABLE user_google_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encryption: access_token and refresh_token should be encrypted at rest
```

---

### `user_microsoft_tokens`
**Purpose**: Microsoft OAuth tokens for OneDrive

```sql
CREATE TABLE user_microsoft_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `user_dropbox_tokens`
**Purpose**: Dropbox OAuth tokens

```sql
CREATE TABLE user_dropbox_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Billing & Subscriptions

### `subscriptions`
**Purpose**: User subscription records

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,  -- active, cancelled, past_due
  plan_id TEXT,  -- free, premium, enterprise
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Admin & Audit

### `admin_messages`
**Purpose**: Admin command center interactions

```sql
CREATE TABLE admin_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES auth.users NOT NULL,
  message_text TEXT NOT NULL,
  ai_response TEXT,
  status TEXT,  -- pending, completed, failed
  priority TEXT,  -- low, medium, high
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### `security_audit_log`
**Purpose**: Security event logging

```sql
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users,
  event_type TEXT NOT NULL,  -- login, logout, permission_change, etc.
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Relationships

### Entity Relationship Diagram (Key Tables)

```
auth.users (Supabase Auth)
    │
    ├──< profiles (1:1)
    ├──< user_settings (1:1)
    │
    ├──< knowledge_documents (1:many)
    │      └──< document_attachments (1:many)
    │
    ├──< knowledge_bases (1:many)
    │      └── source_document_ids[] → knowledge_documents
    │
    ├──< ai_query_history (1:many)
    ├──< conversations (1:many)
    │
    ├──< timeline_items (1:many)
    │      ├──< timeline_item_documents (many:many with knowledge_documents)
    │      ├──< timeline_item_notes (1:many)
    │      └──> parent_id → timeline_items (self-referencing)
    │
    ├──< timeline_layers (1:many)
    │
    ├──< teams (1:many as owner)
    ├──< team_members (many:many with teams)
    │
    ├──< assistant_relationships (many:many)
    ├──< delegation_queue (1:many)
    │
    ├──< user_google_tokens (1:1)
    ├──< user_microsoft_tokens (1:1)
    ├──< user_dropbox_tokens (1:1)
    │
    └──< subscriptions (1:1)
```

---

## Indexes & Performance

### Critical Indexes

**Performance-Critical**:
```sql
-- Timeline queries (most frequent)
CREATE INDEX idx_timeline_items_user_scheduled ON timeline_items(user_id, scheduled_start);
CREATE INDEX idx_timeline_items_user_status ON timeline_items(user_id, status);

-- Document search
CREATE INDEX idx_knowledge_documents_user_created ON knowledge_documents(user_id, created_at DESC);

-- Vector similarity search
CREATE INDEX idx_knowledge_documents_embedding
  ON knowledge_documents USING ivfflat (embedding vector_cosine_ops);

-- Team queries
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
```

**Composite Indexes**:
```sql
-- Timeline day view
CREATE INDEX idx_timeline_day_view
  ON timeline_items(user_id, scheduled_start::DATE, status);

-- Document by category and tags
CREATE INDEX idx_documents_category_tags
  ON knowledge_documents(user_id, category, tags);
```

---

## Row-Level Security

### RLS Policies

**Personal Data**:
```sql
-- Users can only see their own documents
CREATE POLICY "Users can view own documents"
ON knowledge_documents FOR SELECT
USING (auth.uid() = user_id);

-- Users can only modify their own documents
CREATE POLICY "Users can modify own documents"
ON knowledge_documents FOR ALL
USING (auth.uid() = user_id);
```

**Team Data**:
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

**Assistant Access**:
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
```

**Public Access**:
```sql
-- Booking pages are public
CREATE POLICY "Anyone can view active booking links"
ON booking_links FOR SELECT
USING (active = TRUE);
```

---

**Next Steps:**
- [AI Integration →](../05-AI-Integration/README.md)
- [Authentication & Security →](../06-Authentication/README.md)
- [Development Guide →](../08-Development/README.md)
