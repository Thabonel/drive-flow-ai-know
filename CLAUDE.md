# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Query Hub (formerly Knowledge Base App) is a React/TypeScript application that enables users to sync documents from Google Drive, create knowledge bases, and query them using AI. The app supports multiple AI providers (Claude Sonnet 4.5 primary, OpenRouter fallback, local Ollama) and includes an optional research-agent component for deep research capabilities.

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
3. Function retrieves user's documents/knowledge base content from Supabase (including team documents if applicable)
4. Context prepared and sent to LLM provider (Claude → OpenRouter fallback chain)
5. Claude may invoke web search tool for current information
6. Response returned with document count and context metadata
7. Query saved to `ai_query_history` table

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

## Design System & Theming

### Color Scheme

The application uses a **"Deep Corporate" Navy & Gold** theme for professional, authoritative branding.

**Primary Colors:**
- **Navy**: #0A2342 (HSL: 213 74% 15%) - Used for headers, main text, primary UI elements
- **Gold**: #FFC300 (HSL: 46 100% 50%) - Used for CTAs, accents, highlights
- **Secondary**: Lighter navy tones for gradients and variations
- **Backgrounds**: White and light gray (#F8F8F8 / HSL: 0 0% 97%)

**Implementation:**
- All colors defined as CSS variables in `src/index.css`
- Uses HSL format for consistency with Tailwind and shadcn-ui
- Supports light and dark modes with separate color definitions
- Additional theme variants available: `.pure-light`, `.magic-blue`, `.classic-dark`

### Color Variables (src/index.css)

```css
:root {
  --primary: 213 74% 15%;           /* Deep Navy */
  --primary-foreground: 0 0% 100%;  /* White text on navy */
  --accent: 46 100% 50%;            /* Vibrant Gold */
  --accent-foreground: 213 74% 15%; /* Navy text on gold */
  --secondary: 213 74% 20%;         /* Lighter navy */
  --muted: 0 0% 97%;                /* Light gray backgrounds */
  --success: 165 98% 30%;           /* Teal for success states */

  /* Gradients */
  --gradient-primary: linear-gradient(90deg, hsl(213 74% 15%) 0%, hsl(213 74% 20%) 100%);
  --gradient-accent: linear-gradient(135deg, hsl(46 100% 50%) 0%, hsl(213 74% 20%) 100%);

  /* Shadows */
  --shadow-glow: 0 0 60px -10px hsl(213 74% 15% / 0.5);
  --shadow-card: 0 4px 20px -2px hsl(213 74% 15% / 0.15);
}
```

### Using Theme Colors

**In Components:**
```tsx
// Use Tailwind classes with theme colors
<h1 className="text-primary">AI Query Hub</h1>
<Button className="bg-accent hover:bg-accent/90">Get Started</Button>
<div className="bg-muted border border-primary/20">Content</div>
```

**Design Principles:**
- Use solid colors instead of animated gradients for professional look
- Navy for trust and authority (headers, navigation, primary actions)
- Gold for high-value CTAs and important highlights
- White/light gray for clean, accessible backgrounds
- Consistent shadow and border treatments using theme variables

### Modifying Colors

To change the theme:
1. Edit CSS variables in `src/index.css` (`:root` section)
2. Update both light (`:root`) and dark (`.dark`) mode values
3. Colors must be in HSL format without `hsl()` wrapper
4. Test both light and dark modes
5. Verify accessibility contrast ratios (WCAG AA minimum)

**Color Conversion:**
- Hex to HSL: Use tools like [HSL Color Converter](https://www.w3schools.com/colors/colors_hsl.asp)
- Format: `213 74% 15%` (hue saturation lightness, space-separated, no commas)

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Supabase Edge Functions
- `ANTHROPIC_API_KEY` – For Claude models (primary AI provider)
- `OPENROUTER_API_KEY` – For OpenRouter API access (fallback provider)
- `OPENAI_API_KEY` – For OpenAI models (research agent)
- `BRAVE_SEARCH_API_KEY` – For web search tool in Claude
- `SUPABASE_URL` – Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key for database operations
- `MODEL_PROVIDER` – Override LLM provider (claude/openrouter/ollama)
- `USE_OPENROUTER` – Set to 'true' to prefer OpenRouter
- `USE_LOCAL_LLM` – Set to 'true' to use local Ollama

### Research Agent (.env)
```
OPENAI_API_KEY=your_key_here
VECTOR_STORE_ID=vs_xxxxx  # Optional, auto-detected from files_vs_* folders
MCP_SERVER_URL=https://your-ngrok-url.ngrok-free.app/sse
```

## AI Model Reference

### Claude Models (Anthropic API)

**Current Models (as of November 2025):**

- **Claude Sonnet 4.5** - Flagship model for complex agents and coding
  - API ID: `claude-sonnet-4-5-20250929` or alias `claude-sonnet-4-5`
  - Best for: Advanced reasoning, computer use, coding, multi-step actions
  - Currently used in: `ai-query` Edge Function

- **Claude Haiku 4.5** - Fastest model with near-frontier performance
  - API ID: `claude-haiku-4-5-20251001` or alias `claude-haiku-4-5`
  - Best for: Rapid responses, customer service, cost-sensitive applications

- **Claude Opus 4.1** - Most powerful model
  - API ID: `claude-opus-4-1-20250805`
  - Best for: Most complex reasoning tasks

- **Claude Opus 4**
  - API ID: `claude-opus-4-20250320`

- **Claude Sonnet 4**
  - API ID: `claude-sonnet-4-20250320`

**Note:** Model names and availability may change. Always verify current models at [Anthropic's API documentation](https://docs.anthropic.com/en/api/messages).

### OpenAI Models (via OpenRouter)

**GPT Family:**
- `gpt-5` - Flagship GPT model
- `gpt-5-mini` - Cheaper/faster GPT variant
- `gpt-5-pro` - Higher-compute GPT-5 snapshot
- `gpt-4.1` - Stable GPT-4 family option
- `gpt-4o` - Omni multimodal model
- `gpt-4o-mini` - Small/fast omni model

**Reasoning-Optimized (o-series):**
- `o3` - Top reasoning model
- `o4-mini` - Fast, cost-efficient reasoning
- `o3-mini` - Smaller reasoning model

**OpenRouter Model Format:** When using via OpenRouter, prefix with provider: `openai/gpt-5`

### Model Selection Strategy

The `ai-query` Edge Function implements a fallback chain:
1. **Claude** (default) - Uses `ANTHROPIC_API_KEY`
2. **OpenRouter** - Uses `OPENROUTER_API_KEY` (if Claude fails)

Override via environment variables:
- `MODEL_PROVIDER` - Force specific provider (claude/openrouter)
- `USE_OPENROUTER` - Set to 'true' to prefer OpenRouter

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
- Primary: Claude Sonnet 4.5 (default provider via Anthropic API)
- Fallback: OpenRouter (if Claude fails)
- Provider selection via `getLLMResponse()` in `ai-query/index.ts`
- User preference stored in `user_settings.model_preference`
- Local development uses Ollama when offline mode enabled
- See "AI Model Reference" section above for current model names

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
