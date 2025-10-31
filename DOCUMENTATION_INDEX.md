# AI Query Hub - Complete Documentation Index

This document serves as a navigation guide to all project documentation and resources.

## Project Overview Documents

### 1. QUICK_REFERENCE.md (10KB)
**Best For**: Getting started quickly, finding key information at a glance
- Technology stack overview
- Directory structure summary
- Core features list
- Database schema categories
- Key files and entry points
- API routes summary
- Edge functions categorized
- Development commands
- Environment variables
- Security features
- Recent changes

### 2. CODEBASE_OVERVIEW.md (33KB)
**Best For**: Deep understanding of architecture and implementation
- Executive summary with statistics
- Detailed source code structure with file locations
- Application architecture (routing, auth, state management)
- Comprehensive feature documentation (9 major features)
- Complete database schema (40+ tables with detailed descriptions)
- All 30+ Edge Functions documented
- Research Agent system (Python component)
- Configuration files explained
- Technical patterns and data flows
- Development workflow
- Security considerations
- Deployment architecture
- Third-party integrations
- Codebase statistics

### 3. CLAUDE.md
**Best For**: AI/Claude-specific instructions and patterns
- Project overview and context
- Development commands
- Architecture overview
- Key architecture patterns
- Environment variables
- Database schema notes
- Important patterns for development
- Path aliases and conventions
- Common development workflows

### 4. README.md
**Best For**: Basic setup and deployment
- Quick start with npm
- Editing code locally
- Technologies used
- Deployment instructions
- Environment variables

## Documentation by Use Case

### I Want to...

#### Understand the project quickly
1. Start with **QUICK_REFERENCE.md** for the big picture
2. Skim **CODEBASE_OVERVIEW.md** sections of interest
3. Review **CLAUDE.md** for architectural patterns

#### Start frontend development
1. Read **README.md** for setup instructions
2. Check **QUICK_REFERENCE.md** development commands section
3. Review `src/App.tsx` route structure in **CODEBASE_OVERVIEW.md**
4. Look at component organization in section 1 of **CODEBASE_OVERVIEW.md**

#### Understand a specific feature
1. Find the feature in section 3 of **CODEBASE_OVERVIEW.md**
2. Look up related components and pages
3. Check Edge Functions that support it (section 5)
4. Review database tables (section 4)

#### Work with the database
1. Review database schema in **CODEBASE_OVERVIEW.md** section 4
2. Check migrations in `supabase/migrations/` directory
3. Look at `src/integrations/supabase/types.ts` for TypeScript types
4. Review RLS policies in migration files

#### Develop Edge Functions
1. Review **CODEBASE_OVERVIEW.md** section 5
2. Check existing functions in `supabase/functions/` for patterns
3. Look at function architecture pattern subsection
4. Follow the consistent patterns outlined

#### Set up the research agent
1. Read `research-agent/README.md` directly
2. Review section 6 in **CODEBASE_OVERVIEW.md**
3. Follow setup commands in **QUICK_REFERENCE.md**

#### Deploy or configure
1. Check **QUICK_REFERENCE.md** environment variables section
2. Review **CODEBASE_OVERVIEW.md** deployment architecture section
3. Consult individual README files in subdirectories

#### Understand authentication
1. **QUICK_REFERENCE.md** - Authentication summary
2. **CODEBASE_OVERVIEW.md** section 2.3 - Auth context and methods
3. `src/hooks/useAuth.tsx` - Implementation details
4. Look up `register-user` Edge Function in section 5

#### Add a new feature
1. Check **CLAUDE.md** "Common Development Workflows"
2. Review similar existing features in **CODEBASE_OVERVIEW.md** section 3
3. Follow component structure patterns from section 1
4. Look at Edge Function patterns from section 5

#### Understand AI capabilities
1. **CODEBASE_OVERVIEW.md** section 3.3 - AI Query System
2. Review `ai-query` Edge Function documentation
3. Check `claude-document-processor` function
4. Look at `src/lib/ai.ts` for LLM interface

#### Work with cloud storage
1. **CODEBASE_OVERVIEW.md** section 3.7 - Cloud Storage Integration
2. Review Google Drive, Microsoft, S3 sections
3. Look at related Edge Functions (section 5)
4. Check database tables for storage configuration

#### Understand timeline/executive-assistant features
1. **CODEBASE_OVERVIEW.md** section 3.5
2. Review database tables in section 4.2 (Executive-Assistant System)
3. Look at `src/components/timeline/` components
4. Check migrations from October 2024

## File Navigation

### Source Code Root
```
/Users/thabonel/Code/aiqueryhub/

Core Files:
- CODEBASE_OVERVIEW.md        ← You are here (comprehensive architecture)
- QUICK_REFERENCE.md          ← Quick lookup guide
- DOCUMENTATION_INDEX.md       ← This file
- CLAUDE.md                   ← AI project instructions
- README.md                   ← Basic setup
- package.json                ← Dependencies
- vite.config.ts              ← Build configuration
- tsconfig.json               ← TypeScript configuration
```

### Frontend Code
```
src/
- App.tsx                     ← Main router (23 routes)
- main.tsx                    ← Entry point
- hooks/useAuth.tsx           ← Authentication context
- integrations/supabase/      ← Supabase client & types
- components/                 ← 50+ React components
- pages/                      ← 23 page components
- lib/ai.ts                   ← LLM interface
```

### Backend Code
```
supabase/
- functions/                  ← 30+ Edge Functions
  - ai-query/                 ← Main AI handler
  - claude-document-processor/
  - google-drive-sync/
  - [27 more functions]
- migrations/                 ← 67 SQL migrations
```

### Research Agent (Optional)
```
research-agent/
- BasicResearchAgency/        ← Single-agent research
- DeepResearchAgency/         ← Multi-agent research
- mcp/                        ← Model Context Protocol server
- README.md                   ← Detailed setup guide
```

## Key Statistics

| Category | Count | Reference |
|----------|-------|-----------|
| React Components | 50+ | CODEBASE section 1 |
| Pages | 23 | CODEBASE section 2 |
| Custom Hooks | 14 | CODEBASE section 1 |
| Edge Functions | 30+ | CODEBASE section 5 |
| Database Tables | 40+ | CODEBASE section 4 |
| Migrations | 67 | CODEBASE section 4 |
| Dependencies | 60+ | package.json |
| Route Definitions | 23 | CODEBASE section 2 |
| Estimated LOC | 10,000+ | CODEBASE section 13 |

## Recent Major Changes

All recent changes documented in **QUICK_REFERENCE.md** section "Notable Recent Changes"

### Latest (October 31, 2024)
- Executive-Assistant system with timeline
- Support ticketing system
- Timeline templates and briefing generation

### October 17-23, 2024
- Microsoft OneDrive integration
- S3 bucket support
- Timeline manager and daily focus module

## Technology Stack Reference

Quick lookup for technologies:

| Technology | Version | Purpose | File |
|-----------|---------|---------|------|
| React | 18.2 | UI framework | package.json |
| TypeScript | 5.0 | Language | tsconfig.json |
| Vite | 4.4 | Build tool | vite.config.ts |
| Tailwind CSS | 3.3 | Styling | (implicit) |
| React Router | 6.11 | Routing | src/App.tsx |
| React Query | 4.29 | Server state | package.json |
| Supabase JS | 2.21 | Backend | integrations/ |
| shadcn-ui | (latest) | UI components | components/ui/ |

## Quick Links to Key Components

### UI Components
- Document Management: `src/components/Document*.tsx`
- AI Query: `src/components/AIQueryInput.tsx`
- Timeline: `src/components/timeline/TimelineManager.tsx`
- Chat: `src/components/ConversationChat.tsx`
- Cloud Storage: `src/components/*Storage*.tsx`

### Pages
- Dashboard: `src/pages/Index.tsx`
- Documents: `src/pages/Documents.tsx`
- Knowledge Bases: `src/pages/KnowledgeBases.tsx`
- Timeline: `src/pages/Timeline.tsx`
- Settings: `src/pages/Settings.tsx`
- Admin: `src/pages/Admin.tsx`

### Hooks
- Authentication: `src/hooks/useAuth.tsx`
- Google Drive: `src/hooks/useGoogleDrive.ts`
- Microsoft: `src/hooks/useMicrosoft.ts`
- Timeline: `src/hooks/useTimeline.ts`

### Edge Functions
- AI Query: `supabase/functions/ai-query/index.ts`
- Document Processing: `supabase/functions/claude-document-processor/index.ts`
- Cloud Sync: `supabase/functions/{google,microsoft,s3,webdav,sftp}-sync/index.ts`

## Development Workflow Quick Guide

```bash
# 1. Setup
npm install

# 2. Development
npm run dev                 # http://[::]:8080

# 3. Code Quality
npm run lint

# 4. Production Build
npm run build
npm run preview
```

## Common Questions

**Q: Where do I start?**
A: Start with QUICK_REFERENCE.md, then CODEBASE_OVERVIEW.md as needed.

**Q: How do I understand a specific feature?**
A: Find it in CODEBASE_OVERVIEW.md section 3, then look up related components/functions.

**Q: Where are the routes defined?**
A: `src/App.tsx` - See CODEBASE_OVERVIEW.md section 2.1

**Q: How do I add a new page?**
A: CLAUDE.md "Important Patterns" → "Adding New Pages"

**Q: How do I work with the database?**
A: CODEBASE_OVERVIEW.md section 4 + `src/integrations/supabase/types.ts`

**Q: How do I call an Edge Function?**
A: Look at existing usage in components, then check the function signature in CODEBASE_OVERVIEW.md section 5

**Q: What's the authentication flow?**
A: CODEBASE_OVERVIEW.md section 2.2 or QUICK_REFERENCE.md "Security Features"

**Q: How do I set up the research agent?**
A: CODEBASE_OVERVIEW.md section 6 or `research-agent/README.md`

## Version Info

- **Project Version**: 1.0.0 (package.json)
- **Last Updated**: October 31, 2024
- **Documentation Version**: 1.0
- **Repository**: `/Users/thabonel/Code/aiqueryhub`

## Next Steps

1. Choose your use case from the "I Want to..." section above
2. Follow the recommended reading order
3. Use the file navigation and quick links to jump to relevant code
4. Refer back to this index when you need to find something

---

**Total Documentation**: 43KB across 3 comprehensive documents
**Total Code**: 10,000+ lines across 100+ files
**Estimated Learning Time**: 2-4 hours for complete understanding
