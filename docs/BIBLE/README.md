# THE BIBLE - Complete AI Query Hub Documentation

**Welcome to the authoritative documentation for AI Query Hub.**

---

## Start Here

**New to the project?** Start with [INDEX.md](INDEX.md) for complete navigation.

**Quick Links**:
- [Frontend Documentation](01-FRONTEND/FRONTEND_ARCHITECTURE.md)
- [Backend Documentation](02-BACKEND/EDGE_FUNCTIONS.md)
- [Database Schema](03-DATABASE/DATABASE_SCHEMA.md)
- [Edge Functions](04-EDGE-FUNCTIONS/SUPABASE_FUNCTIONS.md)
- [Security](05-SECURITY/AUTHENTICATION.md)
- [AI Systems](06-AI-SYSTEMS/MODEL_CONFIGURATION.md)

---

## Documentation Structure

```
BIBLE/
├── INDEX.md                    ← START HERE (Master Navigation)
├── 01-FRONTEND/
│   ├── FRONTEND_ARCHITECTURE.md
│   ├── COMPONENTS.md
│   └── ROUTING.md
├── 02-BACKEND/
│   ├── EDGE_FUNCTIONS.md
│   └── API_PATTERNS.md
├── 03-DATABASE/
│   ├── DATABASE_SCHEMA.md
│   └── RLS_POLICIES.md
├── 04-EDGE-FUNCTIONS/
│   ├── SUPABASE_FUNCTIONS.md
│   └── AI_QUERY_SYSTEM.md
├── 05-SECURITY/
│   ├── AUTHENTICATION.md
│   ├── EMAIL_CONFIRMATION.md
│   └── ROW_LEVEL_SECURITY.md
├── 06-AI-SYSTEMS/
│   ├── MODEL_CONFIGURATION.md
│   ├── PROVIDER_FALLBACK.md
│   └── RESEARCH_AGENT.md
├── 07-FEATURES/
│   ├── document-management/
│   ├── knowledge-bases/
│   ├── ai-query/
│   ├── google-drive/
│   └── team-collaboration/
├── 08-GUIDES/
│   ├── development/
│   ├── setup/
│   └── troubleshooting/
└── 09-REFERENCE/
    ├── ARCHITECTURE.md
    ├── DESIGN_SYSTEM.md
    └── DEPLOYMENT.md
```

---

## Coverage Statistics

- **40+ React pages** documented
- **155+ UI components** documented
- **50+ Edge Functions** documented
- **30+ database tables** documented
- **Multiple AI providers** (Claude, OpenRouter, Ollama)
- **6 theme variants** with neumorphic design
- **Complete authentication flow** with email confirmation

**Coverage: 100% of the application**

---

## Technology Stack

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui
**Backend**: Supabase Edge Functions (Deno), PostgreSQL
**AI Models**: Claude Sonnet 4.5 (primary), OpenRouter (fallback), Ollama (offline)
**AI Agents**: Multi-agent orchestration system (calendar, briefing, analysis, creative)
**Design**: Neumorphic soft shadows, 6 theme variants (Navy & Gold default)

**Critical**: All Edge Functions must use `@supabase/supabase-js@2.45.0` (latest versions incompatible)

---

## Last Updated

**Date**: 2026-01-24
**Version**: 2.1.0
**Recent Changes**:
- Fixed Edge Functions CORS errors (pinned @supabase/supabase-js@2.45.0)
- AI Agent Orchestration System (orchestrator + sub-agents)
- Creative sub-agent with tool awareness
- Calendar sub-agent with timezone support
- Removed Dashboard from sidebar navigation

---

**Need something specific? Open [INDEX.md](INDEX.md) and use Ctrl+F to search.**
