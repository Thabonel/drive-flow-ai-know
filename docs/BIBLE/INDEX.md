# AI Query Hub - Complete Documentation (THE BIBLE)

**Last Updated**: 2026-01-18
**Version**: 2.1.0
**Status**: Comprehensive Reference

---

## Welcome to The Bible

This is the complete, authoritative documentation for AI Query Hub. Every system, feature, function, and component is documented here.

**Navigation**: This folder contains 9 major sections covering 100% of the application.

---

## Recent Updates (January 2026)

### Security Hardening (2026-01-18)
- XSS prevention with DOMPurify sanitization
- Secure CORS with origin validation (backwards compatible)
- Database-backed rate limiting utility
- Path traversal prevention in document parsing
- OAuth token security (URL clearing, logging removal)
- Environment variable validation utility
- CSP headers configuration documentation
- **New Docs**: [SECURITY_HARDENING.md](05-SECURITY/SECURITY_HARDENING.md), [CSP_HEADERS.md](05-SECURITY/CSP_HEADERS.md)

---

## Recent Updates (December 2024)

### Viewport Height Fix (2024-12-29)
- ✅ Fixed `/conversations` page overflow issue
- ✅ Perfect viewport fit using `calc(100vh-48px)`
- ✅ Documented layout pattern in LAYOUT_PATTERNS.md
- ✅ Matches ChatGPT/Claude viewport behavior
- ✅ No page scrolling, input fully visible

### Email Confirmation System
- ✅ Supabase native email confirmation implemented
- ✅ Spam-optimized email templates with custom domain SMTP
- ✅ Auto-login post-confirmation with dashboard redirect
- ✅ `/auth/confirm` route with error handling
- ✅ Updated signup flow with spam folder notice

### Neumorphic Design System
- ✅ Soft shadow-based depth across all 6 themes
- ✅ Three shadow states: raised, flat, pressed
- ✅ Enhanced buttons, cards, inputs, dialogs
- ✅ Micro-interactions and subtle animations
- ✅ Professional corporate aesthetic

### Google Drive Integration
- ✅ Hierarchical folder navigation
- ✅ File and folder selection
- ✅ OAuth token management
- ✅ Sync status tracking

---

## Quick Navigation

### For New Developers
1. Start with [CLAUDE.md](../../CLAUDE.md) (project instructions at root)
2. Read [01-FRONTEND/FRONTEND_ARCHITECTURE.md](01-FRONTEND/FRONTEND_ARCHITECTURE.md)
3. Review [03-DATABASE/DATABASE_SCHEMA.md](03-DATABASE/DATABASE_SCHEMA.md)
4. Study [06-AI-SYSTEMS/MODEL_CONFIGURATION.md](06-AI-SYSTEMS/MODEL_CONFIGURATION.md)

### For System Understanding
- **Architecture**: [09-REFERENCE/ARCHITECTURE.md](09-REFERENCE/ARCHITECTURE.md)
- **Design System**: [09-REFERENCE/DESIGN_SYSTEM.md](09-REFERENCE/DESIGN_SYSTEM.md)
- **Layout Patterns**: [09-REFERENCE/LAYOUT_PATTERNS.md](09-REFERENCE/LAYOUT_PATTERNS.md)
- **AI Query Flow**: [04-EDGE-FUNCTIONS/AI_QUERY_SYSTEM.md](04-EDGE-FUNCTIONS/AI_QUERY_SYSTEM.md)

### For Feature Development
- **Authentication**: [05-SECURITY/AUTHENTICATION.md](05-SECURITY/AUTHENTICATION.md)
- **Email Confirmation**: [05-SECURITY/EMAIL_CONFIRMATION.md](05-SECURITY/EMAIL_CONFIRMATION.md)
- **Document Management**: [07-FEATURES/document-management/](07-FEATURES/document-management/)
- **Knowledge Bases**: [07-FEATURES/knowledge-bases/](07-FEATURES/knowledge-bases/)

---

## Documentation Sections

### [01-FRONTEND](01-FRONTEND/) - Frontend Architecture

**Complete React 18 + TypeScript frontend documentation**

**Files**:
- **FRONTEND_ARCHITECTURE.md** - Complete architecture overview
  - 40+ page components
  - 155+ UI components (shadcn/ui)
  - Custom hooks (useAuth, useGoogleDrive, etc.)
  - React Router v6 routing
  - Theme system (6 variants)

- **COMPONENTS.md** - Component library reference
  - AI assistant components
  - Document viewers
  - Visualization panels
  - Form components with Zod validation
  - Neumorphic UI elements

- **ROUTING.md** - Route configuration
  - Protected routes
  - Public routes
  - Auth guards
  - Page lazy loading

**Key Topics**:
- React 18 with TypeScript
- Vite build system (runs on http://[::]:8080)
- Tailwind CSS + shadcn/ui
- Neumorphic design system
- Real-time Supabase subscriptions
- Theme variants (Navy & Gold default)

---

### [02-BACKEND](02-BACKEND/) - Backend Architecture

**Supabase Edge Functions and API patterns**

**Files**:
- **EDGE_FUNCTIONS.md** - All 50+ Edge Functions
  - ai-query (main AI handler)
  - google-drive-sync
  - parse-document
  - claude-document-processor
  - register-user (with validation)
  - And 45+ more functions

- **API_PATTERNS.md** - Common patterns
  - CORS configuration
  - Error handling
  - Authentication middleware
  - Service role client usage

**Key Topics**:
- Deno runtime for Edge Functions
- Multi-provider AI system
- Document processing pipeline
- Google Drive OAuth integration
- Email sending (Supabase SMTP)

---

### [03-DATABASE](03-DATABASE/) - Database Schema

**Complete PostgreSQL database documentation**

**Files**:
- **DATABASE_SCHEMA.md** - Complete schema
  - 30+ tables documented
  - Column types and constraints
  - Foreign key relationships
  - Indexes

- **RLS_POLICIES.md** - Row Level Security
  - User isolation policies
  - Team collaboration policies
  - Admin access patterns

**Core Tables**:
- `knowledge_documents` - Documents with AI summaries
- `knowledge_bases` - Document collections
- `ai_query_history` - Query logs
- `user_google_tokens` - OAuth tokens
- `user_settings` - User preferences
- `conversations` - Chat history
- `teams` - Team collaboration
- `team_members` - Team membership
- `team_documents` - Shared documents

---

### [04-EDGE-FUNCTIONS](04-EDGE-FUNCTIONS/) - Supabase Edge Functions

**Complete Edge Functions documentation**

**Files**:
- **SUPABASE_FUNCTIONS.md** - All functions catalog
- **AI_QUERY_SYSTEM.md** - AI query architecture
  - Provider fallback chain
  - Context retrieval
  - Web search tool
  - Response streaming

**Key Functions**:
- `ai-query` - Main AI query handler with multi-provider support
- `register-user` - User registration with email confirmation
- `google-drive-sync` - Google Drive integration
- `parse-document` - Multi-format document parsing
- `ai-document-analysis` - AI-powered document summaries

**Patterns**:
- Service role authentication
- Error handling and logging
- CORS configuration
- Environment variable management

---

### [05-SECURITY](05-SECURITY/) - Security & Authentication

**Complete security documentation**

**Files**:
- **AUTHENTICATION.md** - Auth system
  - Supabase Auth with JWT
  - Row Level Security (RLS)
  - Protected/Public routes
  - Session management

- **EMAIL_CONFIRMATION.md** - Email confirmation flow
  - Signup with email_confirm: false
  - Custom email templates (spam-optimized)
  - Auto-login on confirmation
  - Error handling (expired/invalid links)
  - Custom domain SMTP configuration

- **SECURITY_HARDENING.md** - Security hardening guide (NEW)
  - XSS prevention with DOMPurify
  - Secure CORS implementation
  - Database-backed rate limiting
  - Path traversal prevention
  - OAuth token security
  - Environment variable validation
  - Security utilities reference

- **CSP_HEADERS.md** - Content Security Policy (NEW)
  - Netlify configuration
  - Vercel configuration
  - Recommended CSP directives
  - Testing and validation

- **ROW_LEVEL_SECURITY.md** - RLS policies
  - User isolation
  - Team collaboration
  - Admin access

**Key Topics**:
- Supabase Auth (JWT-based)
- Email confirmation with Resend
- OAuth (Google Drive)
- API key storage (encrypted)
- CORS and security headers
- XSS prevention (DOMPurify)
- Rate limiting (database-backed)
- Content Security Policy (CSP)

---

### [06-AI-SYSTEMS](06-AI-SYSTEMS/) - AI Systems & Models

**Complete AI system documentation**

**Files**:
- **MODEL_CONFIGURATION.md** - Centralized model config
  - `supabase/functions/_shared/models.ts`
  - Model tiers (PRIMARY, FAST, CHEAP)
  - Auto-updating aliases
  - Environment variable overrides

- **PROVIDER_FALLBACK.md** - Multi-provider system
  - Claude (Anthropic) - Primary
  - OpenRouter - Fallback
  - Ollama - Offline mode
  - Automatic failover

- **RESEARCH_AGENT.md** - Optional research system
  - Python-based Agency Swarm
  - Deep research capabilities
  - MCP server integration

**Current Models**:
- **PRIMARY**: claude-opus-4-5 (alias, auto-updates)
- **FAST**: claude-sonnet-4-5
- **CHEAP**: claude-haiku-4-5
- **Fallback**: openai/gpt-4o (OpenRouter)
- **Offline**: llama3 (Ollama)

**Key Features**:
- Single source of truth for models
- Automatic latest model versions
- Environment variable overrides
- Web search tool integration
- Offline mode support

---

### [07-FEATURES](07-FEATURES/) - Feature Documentation

**Detailed feature-by-feature guides**

#### Document Management
- **document-upload.md** - Document upload and processing
- **document-analysis.md** - AI-powered document analysis
- **document-visualization.md** - Document visualization panels

#### Knowledge Bases
- **knowledge-base-creation.md** - Creating knowledge bases
- **knowledge-base-queries.md** - Querying knowledge bases
- **knowledge-base-management.md** - Managing collections

#### AI Query
- **ai-query-interface.md** - AI query component
- **context-retrieval.md** - Document context system
- **conversation-history.md** - Chat history management

#### Google Drive
- **google-drive-sync.md** - Google Drive integration
- **folder-navigation.md** - Hierarchical folder browsing
- **file-selection.md** - File and folder selection

#### Team Collaboration
- **team-creation.md** - Creating and managing teams
- **team-members.md** - Inviting and managing members
- **shared-documents.md** - Document sharing across teams
- **team-timeline.md** - Shared activity timeline

#### Pitch Deck
- **pitch-deck-generation.md** - AI pitch deck creation
- **presentation-mode.md** - Presenting to audiences
- **slide-customization.md** - Editing generated slides

---

### [08-GUIDES](08-GUIDES/) - Development & User Guides

**Step-by-step guides for common tasks**

#### Development Guides
- **adding-features.md** - How to add new features
- **creating-components.md** - Component patterns
- **database-migrations.md** - Creating migrations
- **edge-function-development.md** - Developing Edge Functions

#### Setup Guides
- **initial-setup.md** - Project setup
- **environment-variables.md** - Environment configuration
- **supabase-setup.md** - Supabase project configuration
- **ai-provider-setup.md** - AI API key configuration

#### Troubleshooting
- **common-issues.md** - Common problems and solutions
- **debugging-edge-functions.md** - Edge Function debugging
- **authentication-issues.md** - Auth troubleshooting
- **email-deliverability.md** - Email confirmation issues

---

### [09-REFERENCE](09-REFERENCE/) - Additional References

**Supplementary documentation**

**Files**:
- **ARCHITECTURE.md** - System architecture overview
- **DESIGN_SYSTEM.md** - Complete design system guide
  - Color scheme (Navy & Gold)
  - Neumorphic shadows
  - 6 theme variants
  - CSS variables
- **LAYOUT_PATTERNS.md** - CSS layout patterns and solutions
  - Viewport height calculation
  - Flex column containment
  - ChatGPT/Claude layout comparison
  - Troubleshooting guide
  - Component styling

- **DEPLOYMENT.md** - Deployment guide
  - Frontend deployment
  - Edge Function deployment
  - Environment configuration

- **API_REFERENCE.md** - API documentation
- **DATABASE_ERD.md** - Entity relationship diagrams
- **CHANGELOG.md** - Version history

---

## Documentation Statistics

**Total Coverage**:
- **40+ React pages** documented
- **155+ UI components** documented
- **50+ Edge Functions** documented
- **30+ database tables** documented
- **6 theme variants** documented
- **Multiple AI providers** documented

**Recent Additions**:
- Security hardening (Jan 2026) - XSS, CORS, rate limiting, CSP
- Email confirmation system (Dec 2024)
- Neumorphic design system (Dec 2024)
- Google Drive hierarchical navigation (Dec 2024)
- Team collaboration features (Nov 2024)

---

## How to Use This Documentation

### For New Team Members
1. Read [CLAUDE.md](../../CLAUDE.md) at project root
2. Review [01-FRONTEND/FRONTEND_ARCHITECTURE.md](01-FRONTEND/FRONTEND_ARCHITECTURE.md)
3. Study [06-AI-SYSTEMS/MODEL_CONFIGURATION.md](06-AI-SYSTEMS/MODEL_CONFIGURATION.md)
4. Explore features in [07-FEATURES/](07-FEATURES/)

### For Feature Development
1. Check if feature exists in [07-FEATURES/](07-FEATURES/)
2. Review relevant architecture docs
3. Check database schema for required tables
4. Create Edge Function if needed
5. Update frontend components

### For Debugging
1. Check [08-GUIDES/troubleshooting/](08-GUIDES/troubleshooting/)
2. Review Edge Function logs in Supabase
3. Check browser console for frontend errors
4. Verify environment variables

### For API Work
1. Review [09-REFERENCE/API_REFERENCE.md](09-REFERENCE/API_REFERENCE.md)
2. Check [04-EDGE-FUNCTIONS/SUPABASE_FUNCTIONS.md](04-EDGE-FUNCTIONS/SUPABASE_FUNCTIONS.md)
3. Study authentication in [05-SECURITY/AUTHENTICATION.md](05-SECURITY/AUTHENTICATION.md)

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui with neumorphic design
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **State**: React Context API + Hooks

### Backend
- **Database**: PostgreSQL via Supabase
- **Serverless**: Supabase Edge Functions (Deno)
- **Authentication**: Supabase Auth (JWT)
- **Email**: Supabase SMTP with Resend
- **Storage**: Supabase Storage

### AI Services
- **Primary**: Anthropic Claude (Opus 4.5, Sonnet 4.5, Haiku 4.5)
- **Fallback**: OpenRouter (GPT-4o, GPT-4o-mini)
- **Offline**: Ollama (llama3)
- **Research**: OpenAI (via Agency Swarm - optional)

### Infrastructure
- **Hosting**: Lovable (frontend), Supabase (backend)
- **Database**: 30+ tables with RLS
- **Edge Functions**: 50+ serverless functions
- **Authentication**: JWT-based with email confirmation
- **File Storage**: Supabase Storage

---

## Key Features

1. **AI Query System** - Multi-provider AI with context retrieval
2. **Knowledge Bases** - Document collections with AI summaries
3. **Google Drive Integration** - Hierarchical sync and navigation
4. **Email Confirmation** - Spam-optimized, auto-login flow
5. **Neumorphic Design** - Soft shadows across 6 themes
6. **Team Collaboration** - Shared documents and timelines
7. **Pitch Deck Generator** - AI-powered presentations
8. **Document Processing** - Multi-format parsing and analysis
9. **Offline Mode** - Local Ollama integration
10. **Research Agent** - Deep research capabilities (optional)

---

## Important Files

**At Project Root**:
- **CLAUDE.md** - AI assistant instructions (CRITICAL)
- **README.md** - Project overview
- **package.json** - Dependencies
- **vite.config.ts** - Build configuration

**Key Config Files**:
- `supabase/functions/_shared/models.ts` - AI model configuration
- `src/index.css` - Theme variables and neumorphic shadows
- `src/App.tsx` - Routing and auth guards
- `src/hooks/useAuth.tsx` - Authentication hook

---

## Maintenance

**Last Updated**: 2024-12-24

**To Update**:
1. Update specific section files when features change
2. Update this INDEX.md with major changes
3. Update statistics if significant additions
4. Keep CLAUDE.md in sync
5. Document new Edge Functions
6. Add new features to 07-FEATURES/

---

## Questions or Issues?

- Check [08-GUIDES/troubleshooting/](08-GUIDES/troubleshooting/)
- Search this INDEX.md for keywords (Ctrl+F)
- Review [CLAUDE.md](../../CLAUDE.md) for project instructions
- Check Supabase logs for Edge Function errors

---

**Welcome to The Bible. Everything about AI Query Hub is documented here.**
