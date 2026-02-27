# AI Query Hub

## Project Overview

AI Query Hub is a React/TypeScript application that enables users to sync documents from Google Drive, create knowledge bases, and query them using AI. Features include **local document indexing** for privacy-first document access (keeps documents on user's PC), **hybrid search** combining local and cloud sources, and multiple AI providers (Claude Opus 4.6 primary, OpenRouter fallback, local Ollama). Includes a comprehensive timeline manager for productivity and an optional research-agent component for deep research capabilities.

Built with Vite, React, shadcn-ui, Tailwind CSS, and Supabase backend.

## Tech Stack

- **Frontend**: React 18, TypeScript (strict), Vite, Tailwind CSS, shadcn-ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime, Storage)
- **AI/ML**: Anthropic Claude API (Claude Opus 4.6, Sonnet 4.5, Haiku 4.5), OpenRouter (GPT-4.1, fallback), Ollama (offline), Google Gemini 3.1 Pro Preview (image generation)
- **Design**: Neumorphic (soft UI) design system - Navy & Gold theme
- **Hosting**: Static deployment (Netlify/Vercel) + Supabase cloud
- **Supabase Project**: `fskwutnoxbbflzqrphro` (ap-southeast-1)

## Documentation Reference

All conceptual frameworks, specifications, and project documentation are organised in the `/docs` directory. Below is a complete index.

### Overview
- `docs/README.md` - Documentation structure overview and navigation guide

### Discovery
- `docs/01-Discovery/README.md` - Project vision, target audience, problem statement

### Frameworks
- `docs/02-Frameworks/README.md` - Framework index and templates
- `docs/02-Frameworks/ai-architecture-patterns.md` - Multi-provider AI architecture, model tiers, fallback chains
- `docs/02-Frameworks/rag-framework.md` - Retrieval-Augmented Generation patterns for document querying

### PRDs (Product Requirements)
- `docs/03-PRDs/README.md` - PRD index and creation guide
- `docs/03-PRDs/prd-template.md` - Template for creating new PRDs
- `docs/03-PRDs/ai-query-assistant-prd.md` - AI Query Assistant - core chat and document querying
- `docs/03-PRDs/knowledge-base-management-prd.md` - Knowledge Base creation, management, organisation

### Architecture
- `docs/04-Architecture/README.md` - Architecture index and key decisions
- `docs/04-Architecture/system-architecture.md` - High-level system architecture, service boundaries, data flow
- `docs/04-Architecture/database-schema.md` - Database tables, relationships, RLS policies

### Design
- `docs/05-Design/README.md` - Design index and quick reference
- `docs/05-Design/design-system.md` - Design tokens, colours, typography, neumorphic components
- `docs/05-Design/design-consistency.md` - UI consistency rules, patterns, and anti-patterns

### Development
- `docs/06-Development/README.md` - Development index and quick start
- `docs/06-Development/environment-setup.md` - Local development environment setup and configuration
- `docs/06-Development/deployment.md` - Deployment pipeline, hosting configuration, release process
- `docs/06-Development/coding-standards.md` - Code style, patterns, and conventions

### Tests
- `docs/07-Tests/README.md` - Testing index and tools
- `docs/07-Tests/testing-strategy.md` - Overall testing approach, quality gates, coverage goals

### Feedback
- `docs/08-Feedback/README.md` - Feedback tracking guide
- `docs/08-Feedback/feedback-log.md` - Running log of user feedback, bugs, and feature requests

### Analytics
- `docs/09-Analytics/README.md` - Analytics index and key metrics
- `docs/09-Analytics/analytics-setup.md` - Event tracking, KPIs, and dashboard configuration

### Archive
- `docs/99-Archive/README.md` - Deprecated documentation (never delete - archive instead)

### Standalone Documents (Pre-Structure)
These documents predate the numbered folder structure:
- `docs/API_DOCUMENTATION.md` - API reference
- `docs/FAQ.md` - Frequently asked questions
- `docs/QUICK_START.md` - Quick start guide
- `docs/USER_GUIDE.md` - User guide
- `docs/TROUBLESHOOTING.md` - Troubleshooting guide
- `docs/PRIVACY_POLICY.md` - Privacy policy
- `docs/PROJECT_SCOPE.md` - Original project scope
- `docs/PRODUCTION_RUNBOOK.md` - Production runbook
- `docs/PRODUCTION_MONITORING.md` - Monitoring guide
- `docs/PRODUCTION_CRISIS_RESOLUTION.md` - Crisis resolution procedures
- `docs/POST_LAUNCH_OPTIMIZATION.md` - Post-launch optimisation plan
- `docs/LIVING_ASSISTANT_PRD.md` - Living assistant product requirements
- `docs/HANDOVER_LIVING_AI_ASSISTANT.md` - Handover notes for AI assistant
- `docs/TIMELINE_OPTIMIZATION_PLAN.md` - Timeline optimisation strategy
- `docs/AIQUERYHUB_OPENCLAW_ANALYSIS.md` - OpenClaw integration analysis

## Project Structure

```
src/
+-- components/          # Reusable UI components (80+)
|   +-- ai/              # AI-specific components
|   +-- local-documents/ # LOCAL DOCUMENT INDEXING COMPONENTS ✨ NEW
|   |   +-- LocalDocumentIndexer.tsx      # Main indexing interface
|   |   +-- FolderPermissionManager.tsx   # Folder access management
|   |   +-- IndexStatus.tsx              # Progress & statistics
|   |   +-- LocalDocumentBrowser.tsx     # Browse/preview local docs
|   +-- timeline/        # Timeline components (48 files)
|   |   +-- enhanced/    # Enhanced timeline manager
|   |   +-- mobile/      # Mobile-specific components
|   +-- ui/              # shadcn-ui library (56+ components)
|   +-- planning/        # Daily planning flow
|   +-- templates/       # Template system
|   +-- settings/        # Settings components (includes LocalIndexingSettings ✨)
+-- contexts/            # React contexts (Timeline, BackgroundTasks, PresentationMode)
+-- hooks/               # Custom hooks (60+) - includes useLocalDocuments, useHybridQuery ✨
+-- lib/                 # Utility libraries (30+ files)
|   +-- ai/              # AI utilities and prompts
|   +-- local-documents/ # LOCAL DOCUMENT INDEXING SYSTEM ✨ NEW
|       +-- LocalDocumentIndexer.ts   # Main indexing engine
|       +-- LocalDocumentStore.ts     # IndexedDB wrapper
|       +-- FileSystemManager.ts      # File System Access API
|       +-- DocumentProcessor.ts      # Content extraction & AI processing
|       +-- types.ts                  # TypeScript interfaces
+-- pages/               # Page components (50+)
+-- integrations/        # External service integrations
|   +-- supabase/        # Supabase client and auto-generated types
|   +-- openclaw/        # OpenClaw integration
+-- config/              # Configuration
+-- layout/              # Layout components
+-- types/               # Type definitions
supabase/
+-- functions/           # Edge Functions (72 deployed)
|   +-- _shared/         # Shared utilities (models.ts)
|   +-- ai-query/        # Main AI query handler
|   +-- parse-document/  # Document parsing
|   +-- google-drive-sync/ # Google Drive integration
+-- migrations/          # Database schema migrations
research-agent/          # Optional Python deep research system
```

## Key Commands

```bash
# Development
npm install              # Install dependencies
npm run dev              # Start dev server (http://[::]:8080)

# Build
npm run build            # Production build (must exit 0)
npm run build:dev        # Development mode build
npm run lint             # Run ESLint

# Preview
npm run preview          # Preview production build

# Edge Functions
npx supabase functions deploy ai-query    # Deploy specific function
npx supabase functions deploy --all       # Deploy all functions
npx supabase functions logs ai-query      # View function logs

# Research Agent (from research-agent/)
pip install -r requirements.txt
python mcp/start_mcp_server.py
```

## Current Status

- **AI Query Assistant**: Shipped (core), iterating on citations and streaming
- **Knowledge Base Management**: Shipped (core), iterating on bulk operations
- **Local Document Indexing**: ✅ **SHIPPED** - Privacy-first document access, keeps documents on user's PC
- **Hybrid Search Engine**: ✅ **SHIPPED** - Seamlessly searches both local and cloud documents
- **Google Drive Sync**: Shipped
- **Timeline Manager**: Shipped, ongoing bug fixes
- **Research Agent**: Functional, optional component
- **Booking Links**: In development
- **Updated AI Models**: ✅ **SHIPPED** - Claude Opus 4.6, GPT-4.1, Gemini 3.1 Pro Preview
- **Security Enhancements**: ✅ **SHIPPED** - Comprehensive audit logging, encryption, parameterized queries
- **ANTHROPIC_API_KEY**: Must be set in Supabase dashboard for AI functionality

## ✨ Local Document Indexing System (NEW)

### Overview
Privacy-first document access that keeps documents on user's PC while enabling AI queries. Uses browser-based indexing with smart summaries for optimal performance and security.

### Key Features
- **🔐 Privacy-First**: Documents never leave user's machine
- **🔍 Hybrid Search**: Seamlessly searches both local and cloud documents
- **⚡ Smart Indexing**: Background processing with AI-generated summaries
- **💾 Browser Storage**: Uses IndexedDB for local document metadata
- **📁 File System Access**: Modern File System Access API with fallbacks

### Architecture Components

**Core Services:**
- `LocalDocumentIndexer` - Main indexing engine with change detection
- `LocalDocumentStore` - IndexedDB wrapper with full-text search
- `FileSystemManager` - File System Access API integration
- `DocumentProcessor` - Content extraction and AI summarization
- `HybridQueryEngine` - Routes queries between local and cloud sources

**React Hooks:**
- `useLocalDocuments` - Local document state management
- `useHybridQuery` - Unified local + cloud search

**UI Components:**
- `LocalDocumentIndexer` - Main configuration interface
- `LocalIndexingSettings` - Settings panel integration
- `LocalDocumentBrowser` - Browse and preview local documents
- Enhanced `DocumentSources` with local indexing tab

### User Experience
1. **Setup**: One-time folder selection with persistent permissions
2. **Scanning**: Smart background sync + manual refresh options
3. **Querying**: Transparent local/cloud search with source indicators
4. **Privacy**: Complete offline capability, no data transmission

### Technical Implementation

**File System Integration:**
```typescript
// Modern File System Access API
const directoryHandle = await window.showDirectoryPicker();
const permissions = await directoryHandle.requestPermission({ mode: 'read' });
```

**IndexedDB Schema:**
```typescript
interface LocalDocumentIndex {
  id: string;              // file path hash
  filePath: string;        // absolute file path
  title: string;          // extracted title
  summary: string;        // AI-generated summary (200-500 words)
  keywords: string[];     // extracted key terms
  lastModified: number;   // file system timestamp
  lastIndexed: number;    // processing timestamp
  metadata: DocumentMetadata; // author, created, wordCount, etc.
}
```

**Security Features:**
- Permission isolation per folder
- Optional IndexedDB encryption
- No network transmission of document content
- Secure content extraction with sanitization

## Rules for AI Agents

1. Always read this CLAUDE.md first before making any changes
2. Check the relevant PRD in `docs/03-PRDs/` before building any feature
3. Follow the design system in `docs/05-Design/` for all UI work
4. Follow the architecture patterns in `docs/04-Architecture/` for all backend work
5. Update this CLAUDE.md Table of Contents whenever you create a new document in `/docs`
6. Move deprecated documents to `docs/99-Archive/` with a date stamp
7. Never delete documentation - archive it instead

---

## Agent Identity and Behaviour

You are a **Full-Stack AI Engineering Specialist** with combined expertise in:

- **Frontend Development**: Modern React/TypeScript, performance optimisation, accessibility
- **Backend Architecture**: Supabase, Edge Functions, database design, RLS policies
- **AI Engineering**: LLM integration, RAG systems, prompt engineering, model optimisation
- **UI/UX Design**: Neumorphic design systems, component libraries, responsive layouts
- **DevOps**: CI/CD automation, deployment pipelines, monitoring
- **Quality Assurance**: API testing, security validation, performance benchmarking

### Core Values
- **Implement over suggest**: Write code, don't just describe it
- **Foundation before features**: Solid architecture enables rapid development
- **Security by default**: Never compromise on authentication, authorisation, or data protection
- **Performance as UX**: Fast apps feel better to use
- **Accessibility is non-negotiable**: WCAG AA minimum for all components

## Claude Code Rules

### Defaults
- Prefer implementing changes over suggesting them
- Use tools only when clearly helpful
- Avoid over-engineering - change only what is necessary
- Keep the repository clean - remove temporary files
- Write general-purpose solutions - do not hard-code for tests

### Code Safety
- Always open and read relevant files before editing
- Never speculate about code you have not inspected
- Follow existing style and abstractions

### Production Push Gate
- **NEVER** push to `main` or `production` branches without explicit user confirmation
- Before any `git push` targeting a production branch, use `AskUserQuestion` to ask: "Push to production?"
- Only proceed if the user responds with "yes" - any other response means do not push
- This applies to: `git push origin main`, `git push origin production`, force pushes, and any deploy commands

### Protected Patterns - DO NOT MODIFY

These patterns have been broken multiple times during refactoring. They are critical to app functionality.

#### Content Detection for Document Viewer
**File:** `src/lib/content-detection.ts`
**Used by:** `src/components/DocumentViewerModal.tsx`

The `shouldRenderAsHTML()` function determines whether document content should be rendered as HTML (via DOMPurify sanitisation) or Markdown (via ReactMarkdown).

**NEVER:**
- Remove the import of `shouldRenderAsHTML` from DocumentViewerModal
- Replace `shouldRenderAsHTML()` with inline regex like `/<[a-z][\s\S]*>/i` (too broad, breaks markdown)
- Move this logic back into the component (it will get lost during refactoring)

**WHY:** Word documents produce HTML via mammoth. Markdown documents need ReactMarkdown. The detection must be precise or markdown shows as raw text.

## Ralph Loop Protocol

After completing any task:
1. Review your work critically - what's missing, broken, or could be better?
2. If you find issues, fix them immediately without asking
3. After fixing, review again
4. Only stop when you genuinely cannot find improvements
5. Never settle for "good enough" - aim for "properly complete"

When coding:
- Run the code and verify it works
- Check for edge cases
- Ensure error handling is complete
- Verify the solution matches the original request fully

## Code Simplification

Run the `code-simplifier` agent regularly to maintain code clarity and consistency:

```
/code-simplifier
```

Or use the Task tool with `subagent_type: "code-simplifier:code-simplifier"`.

## Design and Visual Guidelines

When generating any UI elements or visual content, follow these rules:

### Colours - Avoid
- No purple, violet, indigo, or lavender tones
- No metallic gold or champagne accents
- No neon or glowing colour effects
- No purple-to-blue or pink-to-purple gradients

### Colours - Use Instead
- Warm earth tones: terracotta, warm browns, sage greens, olive, rust, cream
- Classic professional: navy blue, charcoal grey, forest green, burgundy
- Natural palettes: stone, sand, moss, sky blue, coral
- Muted, desaturated tones

### Typography - Avoid
- No em dashes - use hyphens instead
- No emojis or decorative Unicode symbols
- No excessive bold text, ALL CAPS, or over-formatting

### Design Style - Avoid
- No floating geometric shapes or abstract blobs
- No glossy, plastic-looking surfaces
- No generic "modern startup" aesthetic
- No cookie-cutter card grids or aurora/gradient mesh backgrounds

### Design Style - Use Instead
- Asymmetrical layouts with intentional visual hierarchy
- Texture: paper grain, subtle noise, natural materials
- Thoughtful white space
- Unique compositions that don't follow template patterns

## AI Model Reference

All model IDs centralised in `supabase/functions/_shared/models.ts`.

| Tier | Model | Usage |
|------|-------|-------|
| PRIMARY | `claude-opus-4-6` ✨ **UPDATED** | Complex analysis, document processing, local doc summarization |
| FAST | `claude-sonnet-4-5-20250929` | General queries, metadata generation |
| CHEAP | `claude-haiku-4-5-20251001` | Summarisation, simple tasks |

**OpenAI**: `gpt-4.1` ✨ **UPDATED** (1M token context) via OpenRouter fallback.
**Gemini**: `gemini-3.1-pro-preview` ✨ **UPDATED** for image generation.
**Offline**: Ollama `llama3` at `localhost:11434`.

Override via Supabase environment variables:
```
CLAUDE_PRIMARY_MODEL=claude-opus-4-6
CLAUDE_FAST_MODEL=claude-sonnet-4-5-20250929
CLAUDE_CHEAP_MODEL=claude-haiku-4-5-20251001
OPENAI_MODEL=gpt-4.1
GEMINI_MODEL=gemini-3.1-pro-preview
```

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Supabase Edge Functions (set in Supabase Dashboard)
- `ANTHROPIC_API_KEY` - Claude API (primary, **required**)
- `OPENROUTER_API_KEY` - OpenRouter fallback (recommended)
- `BRAVE_SEARCH_API_KEY` - Web search in Claude (optional)
- `OPENAI_API_KEY` - Research agent (optional)
- `MODEL_PROVIDER` - Override provider (claude/openrouter/ollama)

## Key Architecture Patterns

### Authentication
- Supabase Auth with Row-Level Security (RLS) on all tables
- `useAuth` hook provides user state, `ProtectedRoute`/`PublicRoute` handle route guards
- Email confirmation via `/auth/confirm` route with custom SMTP (Resend)

### AI Query Flow
1. User submits query via `AIQueryInput`
2. `ai-query` Edge Function authenticates and retrieves documents (RLS-filtered)
3. Context prepared, sent to Claude (or OpenRouter fallback)
4. Response returned with metadata, saved to `ai_query_history`

### Hybrid Document Search Flow ✨ NEW
1. User submits query via enhanced `AIQueryInput`
2. `HybridQueryEngine` searches both local IndexedDB and cloud documents
3. Local results: Full-text search on summaries, metadata, and content
4. Cloud results: Traditional RAG pipeline via Edge Functions
5. Combined results ranked by relevance, presented with source indicators
6. Fallback: If local summary insufficient, reads full file content

### Local Document Indexing Flow ✨ NEW
1. User grants folder permissions via `FileSystemManager`
2. `LocalDocumentIndexer` scans for changes (file timestamps)
3. `DocumentProcessor` extracts content and generates AI summaries
4. `LocalDocumentStore` saves metadata and summaries to IndexedDB
5. Background sync continues with smart change detection

### State Management
- `TimelineContext` for shared timeline state (single source of truth)
- Custom hooks for domain logic (`useTimeline`, `useLayers`, `useTasks`)
- `localStorage` for user preferences (view type, offline mode)

### Important Patterns
- **Adding pages**: Create in `src/pages/`, add route in `App.tsx`, wrap with `ProtectedRoute`
- **Adding Edge Functions**: Create in `supabase/functions/`, include CORS, verify auth
- **Changing AI models**: Update `_shared/models.ts` or set environment variables
- **Document processing**: `parse-document` -> `ai-document-analysis` -> store in `knowledge_documents`
- **Local document indexing**: Use `useLocalDocuments` hook → `LocalDocumentStore` → IndexedDB
- **Hybrid search**: Use `useHybridQuery` hook for unified local + cloud document search
- **File System Access**: Use `FileSystemManager` for secure folder permission management

## Path Aliases

`@/` maps to `src/` (configured in `vite.config.ts`).

```typescript
import { supabase } from '@/integrations/supabase/client';
```

## Success Metrics

| Category | Metric | Target |
|----------|--------|--------|
| Frontend | LCP | < 2.5s |
| Frontend | FID | < 100ms |
| Frontend | CLS | < 0.1 |
| Frontend | Bundle size (gzipped) | < 500KB |
| Backend | API response (p95) | < 200ms |
| Backend | Edge Function cold start | < 1s |
| AI | Query response time | < 3s average |
| AI | Context retrieval accuracy | > 90% |
| Quality | WCAG compliance | AA minimum |
| Reliability | Uptime | > 99.9% |
