# AI Query Hub

AI-powered document search and knowledge management platform. Upload documents, create knowledge bases, and query them using natural language.

**Live App**: [AI Query Hub](https://drive-flow-ai-know.netlify.app/)
**Lovable Project**: https://lovable.dev/projects/e9679863-45e8-4512-afee-c00b1a012e4a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e9679863-45e8-4512-afee-c00b1a012e4a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI framework
- **shadcn-ui** - Component library
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend (PostgreSQL, Auth, Edge Functions, Storage)
- **Claude Sonnet 4.5** - Primary AI model (via Anthropic API)
- **OpenRouter** - Fallback AI provider

## Design System

### Navy & Gold Theme

The application uses a professional "Deep Corporate" color scheme:

- **Primary (Navy)**: #0A2342 - Headers, navigation, primary elements
- **Accent (Gold)**: #FFC300 - CTAs, highlights, important actions
- **Backgrounds**: White and light gray (#F8F8F8)

**Key Features:**
- Solid colors (no animated gradients) for clean, professional aesthetic
- Navy conveys trust and authority
- Gold creates high contrast for important CTAs
- Fully responsive and accessible (WCAG AA)
- Dark mode support

### Customizing Colors

Colors are defined as CSS variables in `src/index.css`:

```css
:root {
  --primary: 213 74% 15%;    /* Navy */
  --accent: 46 100% 50%;     /* Gold */
  --secondary: 213 74% 20%;  /* Light Navy */
  --muted: 0 0% 97%;         /* Light Gray */
}
```

All colors use HSL format for consistency. Update both `:root` (light mode) and `.dark` (dark mode) sections when modifying theme.

For detailed theming documentation, see `CLAUDE.md`.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e9679863-45e8-4512-afee-c00b1a012e4a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Supabase Edge Functions

Configure these in your Supabase dashboard (Project Settings → Edge Functions):

- `ANTHROPIC_API_KEY` – Claude AI access (primary provider)
- `OPENROUTER_API_KEY` – OpenRouter API access (fallback provider)
- `OPENAI_API_KEY` – OpenAI API access (research agent)
- `BRAVE_SEARCH_API_KEY` – Web search capability for Claude
- `SUPABASE_URL` – Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key for database operations

### Optional Configuration

- `MODEL_PROVIDER` – Override AI provider (claude/openrouter/ollama)
- `USE_OPENROUTER` – Set to 'true' to prefer OpenRouter
- `USE_LOCAL_LLM` – Set to 'true' to use local Ollama instance

## Key Features

- 📄 **Document Upload** - PDF, DOCX, TXT, MD, CSV, JSON support
- 🔍 **AI-Powered Search** - Natural language queries across documents
- 📚 **Knowledge Bases** - Organize documents into searchable collections
- 💬 **AI Chat** - Conversational interface with document context
- ⏱️ **Timeline** - Track and plan your daily activities
- 👥 **Team Collaboration** - Share documents and timelines (Business tier)
- 🤝 **Assistant Delegation** - Executive tier assistant management
- 🔐 **Secure** - Row-level security, private data storage

## Subscription Tiers

- **Starter** ($9 AUD/month) - 200 queries, 5GB storage, 3 knowledge bases
- **Pro** ($45 AUD/month) - 1,000 queries, 50GB storage, unlimited knowledge bases
- **Business** ($150 AUD/month) - Unlimited queries, 500GB storage, team features

All plans include a 14-day free trial.

## Documentation

- **CLAUDE.md** - Comprehensive development guide for AI assistants and developers
- **research-agent/README.md** - Deep research agent documentation

## Support

If something doesn't work, please [open an issue](https://github.com/Thabonel/drive-flow-ai-know/issues) or contact support.
