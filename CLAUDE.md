# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Query Hub (formerly Knowledge Base App) is a React/TypeScript application that enables users to sync documents from Google Drive, create knowledge bases, and query them using AI. The app supports multiple AI providers (Gemini via Lovable Gateway, OpenRouter, local Ollama) and includes an optional research-agent component for deep research capabilities.

Built with Vite, React, shadcn-ui, Tailwind CSS, and Supabase backend.

## Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server (runs on http://[::]:8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint the codebase
npm run lint

# Preview production build
npm preview
```

### Research Agent (Optional)
The `research-agent/` directory contains a Python-based deep research system using Agency Swarm. See `research-agent/README.md` for details.

```bash
# From research-agent directory
pip install -r requirements.txt

# Start MCP server for document search
python mcp/start_mcp_server.py

# Run basic research agency
cd BasicResearchAgency && python agency.py

# Run multi-agent deep research
cd DeepResearchAgency && python agency.py
```

## Architecture

### Frontend Structure
- **`src/App.tsx`**: Main app with routing, authentication guards (`ProtectedRoute`, `PublicRoute`), and layout structure
- **`src/pages/`**: Page components for dashboard, documents, knowledge bases, settings, conversations, etc.
- **`src/components/`**: Reusable UI components including AI assistant, document viewers, visualization panels
- **`src/hooks/`**: Custom React hooks for auth (`useAuth`), Google Drive (`useGoogleDrive`), document storage, settings
- **`src/lib/`**: Core utilities including AI client (`ai.ts`) with offline mode support
- **`src/integrations/supabase/`**: Supabase client and auto-generated TypeScript types

### Backend Structure (Supabase)
- **`supabase/functions/`**: Edge Functions for serverless operations
  - `ai-query/`: Main AI query handler with document context retrieval and multi-provider LLM support
  - `claude-document-processor/`: Process documents using Claude
  - `google-drive-sync/`: Sync documents from Google Drive
  - `parse-document/`: Extract content from various document formats
  - `admin-command-center/`: Admin operations
  - Other functions for analytics, storage, auth, etc.
- **`supabase/migrations/`**: Database schema migrations with RLS policies

### Key Architecture Patterns

#### Authentication & Authorization
- Uses Supabase Auth with row-level security (RLS)
- `useAuth` hook provides user state throughout app
- `ProtectedRoute` and `PublicRoute` components handle route-based auth
- User tokens stored in `user_google_tokens` table for Google Drive integration

#### AI Query Flow
1. User submits query via `AIQueryInput` component
2. Request sent to `ai-query` Edge Function with optional `knowledge_base_id`
3. Function retrieves user's documents/knowledge base content from Supabase
4. Context prepared and sent to LLM provider (Gemini → OpenRouter → Ollama fallback chain)
5. Response returned with document count and context metadata
6. Query saved to `ai_query_history` table

#### Offline Mode
- Toggled via `localStorage.getItem('offline-mode')`
- When enabled, `callLLM()` in `src/lib/ai.ts` uses local Ollama instance at `http://localhost:11434`
- Allows AI queries without internet connection

#### Document Management
- Documents stored in `knowledge_documents` table with AI summaries
- Knowledge bases (`knowledge_bases` table) reference multiple documents via `source_document_ids` array
- Google Drive integration syncs files and stores tokens in `user_google_tokens`
- Document content can be visualized using `DocumentVisualizationPanel` component

#### Research Agent Integration
- Separate Python application in `research-agent/`
- Uses Agency Swarm framework with OpenAI Deep Research patterns
- Two modes: Basic (single agent) and Deep Research (multi-agent with clarification workflow)
- MCP server provides internal document search capabilities
- Must be publicly accessible (via ngrok) when used with OpenAI API

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Supabase Edge Functions
- `OPENAI_API_KEY` – For OpenAI models (research agent)
- `OPENROUTER_API_KEY` – For OpenRouter API access
- `LOVABLE_API_KEY` – For Gemini via Lovable AI Gateway (primary provider)
- `SUPABASE_URL` – Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key for database operations
- `MODEL_PROVIDER` – Override LLM provider (gemini/openrouter/ollama)
- `USE_OPENROUTER` – Set to 'true' to prefer OpenRouter
- `USE_LOCAL_LLM` – Set to 'true' to use local Ollama

### Research Agent (.env)
```
OPENAI_API_KEY=your_key_here
VECTOR_STORE_ID=vs_xxxxx  # Optional, auto-detected from files_vs_* folders
MCP_SERVER_URL=https://your-ngrok-url.ngrok-free.app/sse
```

## Database Schema Notes

### Core Tables
- `knowledge_documents` – User documents with content, AI summaries, tags, embeddings
- `knowledge_bases` – Collections of documents with AI-generated content
- `ai_query_history` – Query logs with responses and context metadata
- `user_google_tokens` – OAuth tokens for Google Drive integration
- `user_settings` – User preferences including `model_preference`
- `conversations` – Saved chat conversations with summaries
- `admin_messages` – Admin command center interactions

### Key Relationships
- All tables have `user_id` foreign key with RLS policies
- Knowledge bases reference documents via `source_document_ids` (UUID array)
- Conversations store messages as JSONB array

## Important Patterns

### Adding New Pages
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx` within `<Routes>` block
3. Wrap with `<ProtectedRoute>` if authentication required
4. Add navigation link in `src/components/AppSidebar.tsx` if needed

### Adding New Edge Functions
1. Create function directory in `supabase/functions/`
2. Implement `index.ts` with `serve()` handler
3. Include CORS headers for cross-origin requests
4. Use service role client for database operations with user auth verification
5. Add environment variables to Supabase dashboard

### Working with AI Providers
- Primary: Gemini via Lovable Gateway (always available)
- Fallback chain in `getLLMResponse()` in `ai-query/index.ts`
- User preference stored in `user_settings.model_preference`
- Local development uses Ollama when offline mode enabled

### Document Processing
- Parse documents using `parse-document` Edge Function
- Generate AI summaries via `ai-document-analysis` function
- Store embeddings for semantic search capabilities
- Support formats: PDF, DOCX, TXT, MD, JSON, CSV

## Testing

No formal test suite currently configured. Manual testing via:
- Development server with hot reload (`npm run dev`)
- Preview production builds (`npm run preview`)
- Supabase local development for Edge Functions testing

## Common Development Workflows

### Adding a New AI Provider
1. Update `getLLMResponse()` in `supabase/functions/ai-query/index.ts`
2. Add completion function (e.g., `newProviderCompletion()`)
3. Update provider fallback chain
4. Add environment variable to Supabase
5. Update user settings UI if user-selectable

### Creating a New Knowledge Base Feature
1. Check schema in `src/integrations/supabase/types.ts`
2. Add UI components in `src/components/` or `src/pages/`
3. Use `supabase` client from `src/integrations/supabase/client.ts`
4. Add Edge Function if server-side logic needed
5. Update `KnowledgeBases.tsx` page if modifying main KB interface

### Debugging Edge Functions
1. Check Supabase logs in dashboard
2. Review console.log statements in function code
3. Verify environment variables are set
4. Test CORS headers if frontend can't reach function
5. Ensure user authentication token is properly passed

## Path Aliases

The project uses `@/` as an alias for the `src/` directory (configured in `vite.config.ts`).

Example: `import { supabase } from '@/integrations/supabase/client'`
