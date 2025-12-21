# AI Query Hub - Code Documentation Bible

**Version:** 1.0.0
**Last Updated:** December 21, 2025
**Application:** AI Query Hub (formerly Knowledge Base App)

## Welcome to the AI Query Hub Documentation

This comprehensive documentation provides 100% accurate, well-organized reference material for the entire AI Query Hub application. The documentation is structured to allow you to read specific sections relevant to your needs without having to read the entire bible.

## Quick Navigation

### 📖 Core Documentation

1. **[Architecture Overview](./01-Architecture/README.md)** - System architecture, tech stack, and design patterns
2. **[Frontend Guide](./02-Frontend/README.md)** - React components, pages, hooks, and UI patterns
3. **[Backend Guide](./03-Backend/README.md)** - Supabase Edge Functions and serverless operations
4. **[Database Schema](./04-Database/README.md)** - Complete database structure and relationships
5. **[AI Integration](./05-AI-Integration/README.md)** - AI models, providers, and intelligent features
6. **[Authentication & Security](./06-Authentication/README.md)** - Auth flows, RLS policies, and security
7. **[APIs & Integrations](./07-APIs/README.md)** - External services and integration points
8. **[Development Guide](./08-Development/README.md)** - Developer workflows and best practices

## Application Overview

**AI Query Hub** is a comprehensive React/TypeScript application that enables users to:

- **Sync Documents** from Google Drive, Microsoft OneDrive, Dropbox, S3, WebDAV, SFTP
- **Create Knowledge Bases** with AI-powered analysis and summaries
- **Query Documents** using multiple AI providers (Claude, OpenAI, Gemini, Ollama)
- **Generate Pitch Decks** with AI-generated content and images
- **Manage Timeline & Tasks** with AI-powered planning and scheduling
- **Collaborate with Teams** through shared documents and delegation features
- **Automate Workflows** with AI assistants and daily briefings

### Tech Stack Summary

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Storage, Auth)
- **AI Providers**: Claude (Anthropic), Gemini (Google), OpenAI, OpenRouter, Ollama
- **Integrations**: Google Drive/Calendar, Microsoft OneDrive, Dropbox, Stripe

## How to Use This Documentation

### For New Developers
1. Start with [Architecture Overview](./01-Architecture/README.md)
2. Read [Development Guide](./08-Development/README.md) for setup
3. Explore [Frontend Guide](./02-Frontend/README.md) for UI components
4. Review [Backend Guide](./03-Backend/README.md) for serverless functions

### For Feature Development
1. Check relevant section (Frontend/Backend/Database/AI)
2. Review [APIs & Integrations](./07-APIs/README.md) for external services
3. Consult [Development Guide](./08-Development/README.md) for workflows

### For System Integration
1. Read [AI Integration](./05-AI-Integration/README.md) for AI capabilities
2. Check [APIs & Integrations](./07-APIs/README.md) for connection points
3. Review [Authentication](./06-Authentication/README.md) for security patterns

### For Database Work
1. Start with [Database Schema](./04-Database/README.md)
2. Review RLS policies in [Authentication](./06-Authentication/README.md)
3. Check migration files for change history

## Documentation Standards

- **Accuracy**: All code references are verified against current codebase
- **Completeness**: Every major component, function, and pattern is documented
- **Organization**: Logical structure for quick reference
- **Code Examples**: Real code snippets from the application
- **File Paths**: Absolute paths for easy navigation

## Quick Links

### Critical Files
- Application Entry: `src/App.tsx`
- Main Routes: `src/App.tsx:123-276`
- AI Client: `src/lib/ai.ts`
- Supabase Client: `src/integrations/supabase/client.ts`
- Model Config: `supabase/functions/_shared/models.ts`

### Key Directories
- Pages: `src/pages/`
- Components: `src/components/`
- Hooks: `src/hooks/`
- Edge Functions: `supabase/functions/`
- Migrations: `supabase/migrations/`

## Support & Updates

For questions or updates to this documentation, contact the development team or update the relevant markdown files in the `docs/` directory.

---

**Happy coding! 🚀**
