# AI Query Hub - Quick Reference Guide

## Project at a Glance

**Name**: AI Query Hub (formerly Knowledge Base App)
**Type**: React/TypeScript SaaS Web Application
**Purpose**: Document sync, knowledge base creation, and AI-powered queries
**Repository**: `/Users/thabonel/Code/aiqueryhub`

## Technology Stack

### Frontend
- **Language**: TypeScript + React 18
- **Build Tool**: Vite 4.4
- **Styling**: Tailwind CSS 3 + shadcn-ui (40+ components)
- **State Management**: TanStack React Query + React Context
- **Routing**: React Router v6
- **Forms**: react-hook-form + zod validation
- **UI Components**: Radix UI primitives

### Backend
- **Database**: Supabase PostgreSQL
- **Serverless Functions**: Deno (Edge Functions)
- **Authentication**: Supabase Auth (JWT tokens)
- **Storage**: Supabase Storage + AWS S3

### Optional Research Component
- **Framework**: Agency Swarm (Python)
- **Model**: OpenAI Deep Research
- **Protocol**: Model Context Protocol (MCP)
- **Server**: FastMCP 2.10+

## Directory Structure Summary

```
aiqueryhub/
├── src/                          # Frontend source code
│   ├── components/               # 50+ React components
│   │   ├── ui/                  # shadcn-ui base components
│   │   ├── timeline/            # Timeline-specific components
│   │   ├── AI*.tsx              # AI query/assistant components
│   │   └── Document*.tsx        # Document management components
│   ├── pages/                   # 23 page-level components
│   ├── hooks/                   # 14 custom React hooks
│   ├── lib/                     # Utilities (AI, parsing, currency)
│   ├── integrations/supabase/   # Supabase client + types
│   ├── App.tsx                  # Main router (202 lines)
│   └── main.tsx                 # Entry point
│
├── supabase/                     # Backend configuration
│   ├── functions/               # 30+ Edge Functions
│   │   ├── ai-query/            # Main AI query handler
│   │   ├── claude-document-processor/
│   │   ├── google-drive-sync/
│   │   ├── microsoft-drive-sync/
│   │   ├── parse-document/
│   │   ├── register-user/
│   │   ├── stripe-webhook/
│   │   └── [20+ more functions]
│   └── migrations/              # 67 SQL migration files
│
├── research-agent/              # Optional Python research system
│   ├── BasicResearchAgency/     # Single-agent research
│   ├── DeepResearchAgency/      # Multi-agent research
│   ├── mcp/                     # MCP server for documents
│   └── tests/                   # Test suite
│
├── package.json                 # 60+ npm dependencies
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite build configuration
├── CLAUDE.md                    # Project instructions
└── README.md                    # Basic setup guide
```

## Core Features

### Document Management
- Multi-source upload (local, Google Drive, OneDrive, S3, WebDAV, SFTP)
- Document preview and visualization
- AI-generated summaries (Claude)
- Search, filter, categorize, tag
- Pagination and sorting

### Knowledge Bases
- Group documents for contextualized AI queries
- Share knowledge bases
- Track query history per KB
- Custom descriptions

### AI Query System
- Multi-provider LLM support (Gemini, OpenRouter, Claude, Ollama)
- Web search integration (Brave Search)
- Context-aware responses
- Query history and analytics
- Offline mode with local Ollama

### Conversations
- Save chat sessions
- Auto-generated summaries
- Message history
- Project/conversation grouping
- Tagging and organization

### Timeline & Executive-Assistant System (New Oct 2024)
- Daily planning and focus modules
- Executive-assistant relationships with permissions
- Shared timeline items with visibility controls
- Auto-generated daily briefings
- Timeline templates and layers
- Confidential items filtering

### Support Ticketing
- User support ticket submission
- Admin ticket management
- Priority and status tracking
- Response management

### User Management
- Authentication (Supabase Auth)
- User settings and preferences
- Model preference selection
- Billing/subscription management
- Connected OAuth accounts

### Admin Panel
- User management
- System configuration
- Command center
- Audit logging
- Support ticket oversight

## Database Schema

**40+ Tables** across 11 categories:

1. **Authentication** (3 tables)
   - users, user_settings, user_*_tokens

2. **Documents** (2 tables)
   - knowledge_documents, knowledge_bases

3. **AI & Conversations** (5 tables)
   - ai_query_history, conversations, messages, attachments, agents

4. **Executive-Assistant System** (5 tables)
   - assistant_relationships, timeline_items, timeline_documents, briefing_documents, timeline_templates

5. **Cloud Storage** (5 tables)
   - google_drive_folders, microsoft_drive_folders, s3_buckets, webdav_connections, sftp_connections

6. **Support & Ticketing** (2 tables)
   - support_tickets, ticket_responses

7. **Subscriptions & Billing** (2 tables)
   - subscriptions, usage_metrics

8. **Admin & System** (5 tables)
   - admin_settings, admin_messages, app_config, changelog, audit_logs

9. **Analytics** (4 tables)
   - agentic_memories, projects, doc_qa_agent_memberships, agents

10. **Storage & Enterprise** (2 tables)
    - storage_usage, enterprise_servers

11. **Attachments** (1 table)
    - attachments, timeline_documents

## Key Files

### Application Entry Points
- **App Router**: `src/App.tsx` - 23 routes with auth protection
- **Auth Context**: `src/hooks/useAuth.tsx` - Authentication state management
- **Main Entry**: `src/main.tsx` - React DOM mount

### Core Business Logic
- **AI Query**: `supabase/functions/ai-query/index.ts` - Main AI handler
- **Document Processing**: `supabase/functions/claude-document-processor/index.ts`
- **File Parsing**: `supabase/functions/parse-document/index.ts`
- **Cloud Storage**: `supabase/functions/{google,microsoft,s3,webdav,sftp}-sync/index.ts`

### UI Components
- **Document Grid**: `src/components/DocumentGrid.tsx`
- **AI Query**: `src/components/AIQueryInput.tsx`
- **Timeline**: `src/components/timeline/TimelineManager.tsx`
- **Chat**: `src/components/ConversationChat.tsx`

### Configuration
- **Supabase Types**: `src/integrations/supabase/types.ts` (2432 lines)
- **Vite Config**: `vite.config.ts`
- **TypeScript Config**: `tsconfig.json`

## API Routes Summary

### Public Routes
- `/` - Landing page
- `/auth` - Authentication
- `/reset-password` - Password reset
- `/terms`, `/privacy`, `/disclaimer`, `/data-policy`, `/acceptable-use` - Legal

### Protected Routes (Authenticated Users)
- `/dashboard` - Main dashboard
- `/documents` - Document management
- `/add-documents` - Upload interface
- `/knowledge` - Knowledge bases
- `/drive` - Google Drive sync
- `/conversations` - Chat history
- `/timeline` - Timeline planning
- `/settings`, `/settings/billing` - User settings
- `/support` - Support tickets
- `/admin` - Admin panel
- `/admin/support-tickets` - Admin ticket management

## Edge Functions (30+)

### AI & Documents (4)
- `ai-query` - Main query handler
- `claude-document-processor` - Document analysis
- `ai-document-analysis` - Multi-provider analysis
- `parse-document` - File parsing

### Cloud Storage (9)
- `google-drive-sync`, `store-google-tokens`, `get-google-config`
- `microsoft-drive-sync`, `store-microsoft-tokens`, `get-microsoft-config`
- `s3-sync`, `webdav-sync`, `sftp-sync`

### Authentication & Billing (7)
- `register-user`, `send-confirmation-email`
- `create-subscription`, `verify-checkout-session`, `create-portal-session`, `stripe-webhook`, `create-storage-payment`

### System & Admin (10+)
- `admin-command-center`, `admin-settings`, `security-audit`
- `analyze-for-charts`, `summarize-conversation`, `get-timeline-state`
- `submit-support-ticket`, `save-ai-document`, `seed-test-data`
- `enterprise-server-setup`

## Development Commands

```bash
# Frontend
npm install                 # Install dependencies
npm run dev                 # Start dev server (port 8080)
npm run build              # Production build
npm run lint               # Code quality check

# Research Agent (Optional)
pip install -r requirements.txt
python mcp/start_mcp_server.py
cd BasicResearchAgency && python agency.py
```

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

### Supabase Functions
```
OPENAI_API_KEY
OPENROUTER_API_KEY
ANTHROPIC_API_KEY
BRAVE_SEARCH_API_KEY
LOVABLE_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
MODEL_PROVIDER (override)
USE_OPENROUTER (true/false)
USE_LOCAL_LLM (true/false)
```

### Research Agent (.env)
```
OPENAI_API_KEY
VECTOR_STORE_ID (optional)
MCP_SERVER_URL
```

## Security Features

- JWT-based authentication (Supabase Auth)
- Row-level security (RLS) on all user data
- Encrypted OAuth token storage
- CORS protection on Edge Functions
- Input validation (email, password, file types)
- Audit logging with IP/user agent tracking
- Rate limiting on sensitive endpoints
- HTTPS enforced

## Notable Recent Changes

**October 31, 2024**
- Executive-Assistant system with timeline management
- Support ticketing system
- Timeline templates and briefing generation
- User role system (executive, assistant, standard)

**October 17-23, 2024**
- Microsoft OneDrive integration
- S3 bucket support
- Timeline manager and daily focus module
- Enterprise server setup

**Earlier**
- Internet search capability (Brave Search)
- Document visualization panels
- Claude document processor
- Multi-provider AI support

## Project Links

- **Lovable Project**: https://lovable.dev/projects/e9679863-45e8-4512-afee-c00b1a012e4a
- **Dev Server**: http://[::]:8080 (local development)

## Useful Statistics

- **Frontend Components**: 50+
- **Pages**: 23
- **Custom Hooks**: 14
- **Edge Functions**: 30+
- **Database Tables**: 40+
- **Migrations**: 67
- **Estimated LOC**: 10,000+
- **Dependencies**: 60+
- **Types Definition**: 2,432 lines

## Next Steps for Development

1. **Review `CLAUDE.md`** for project instructions
2. **Check `CODEBASE_OVERVIEW.md`** for detailed architecture
3. **Run `npm run dev`** to start frontend development
4. **Use Supabase dashboard** for database and functions
5. **Refer to Edge Function patterns** for backend development
6. **Review Git history** for recent feature implementations

