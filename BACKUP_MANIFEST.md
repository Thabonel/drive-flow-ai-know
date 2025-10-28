# Backup Manifest - AI Query Hub

**Backup Name**: 2025-10-28_13-21-54_complete-Master
**Created**: October 28, 2025 at 1:21:54 PM
**Version**: 1.0.0 (Perfect State Snapshot)
**Purpose**: Complete application backup at perfect state before final Stripe fixes

---

## Backup Summary

This backup represents the complete AI Query Hub application at a stable, production-ready state. All core features are implemented and tested. Only minor Stripe configuration items remain (webhook verification and branding update).

### Backup Contents

- **Total Files**: 411 files
- **Total Size**: 5.0 MB
- **Archive Format**: .tar.gz (compressed)
- **Archive Location**: `../2025-10-28_13-21-54_complete-Master.tar.gz`
- **Uncompressed Location**: `../2025-10-28_13-21-54_complete-Master/`

---

## What's Included

### Source Code
- ✅ Complete React/TypeScript frontend (`src/`)
- ✅ All 30 Supabase Edge Functions (`supabase/functions/`)
- ✅ All 62 database migrations (`supabase/migrations/`)
- ✅ Configuration files (vite.config.ts, tsconfig.json, etc.)
- ✅ Package dependencies (package.json, package-lock.json)

### Documentation
- ✅ Project instructions (CLAUDE.md)
- ✅ README.md
- ✅ Stripe setup documentation (`docs/stripe-webhook-setup.md`)
- ✅ Complete application documentation (COMPLETE_APPLICATION_DOCUMENTATION.md)
- ✅ This backup manifest (BACKUP_MANIFEST.md)

### Configuration
- ✅ Environment variable templates
- ✅ Supabase configuration (`supabase/config.toml`)
- ✅ TypeScript configuration
- ✅ Tailwind CSS configuration
- ✅ ESLint configuration

### Assets
- ✅ Public assets (`public/`)
- ✅ Icons and images
- ✅ Favicon and manifest files

---

## What's Excluded

The following items are intentionally excluded from the backup:

- ❌ `node_modules/` - Dependencies (can be reinstalled via `npm install`)
- ❌ `dist/` - Build output (can be regenerated via `npm run build`)
- ❌ `.env` - Environment variables (contains secrets)
- ❌ `.git/` - Git history (separate repository backup)
- ❌ `.DS_Store` - MacOS system files
- ❌ IDE-specific files (`.vscode/`, `.idea/`)
- ❌ Temporary files and caches

---

## Directory Structure

```
2025-10-28_13-21-54_complete-Master/
├── src/                           # Frontend source code
│   ├── components/                # React components
│   ├── pages/                     # Page components
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Utilities and helpers
│   ├── integrations/              # Third-party integrations
│   └── App.tsx                    # Main application component
├── supabase/
│   ├── functions/                 # 30 Edge Functions
│   │   ├── ai-query/
│   │   ├── stripe-webhook/
│   │   ├── create-subscription/
│   │   ├── verify-checkout-session/
│   │   ├── create-portal-session/
│   │   └── ... (25 more)
│   ├── migrations/                # 62 database migrations
│   └── config.toml                # Supabase configuration
├── public/                        # Static assets
├── docs/                          # Documentation
├── index.html                     # HTML entry point
├── package.json                   # Dependencies
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── CLAUDE.md                      # Project instructions
├── README.md                      # Project README
├── COMPLETE_APPLICATION_DOCUMENTATION.md  # Complete docs
└── BACKUP_MANIFEST.md             # This file
```

---

## Key Files Reference

### Critical Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `package.json` | Dependencies and scripts | Root |
| `vite.config.ts` | Build configuration | Root |
| `tsconfig.json` | TypeScript settings | Root |
| `supabase/config.toml` | Supabase project config | supabase/ |
| `src/integrations/supabase/client.ts` | Supabase client | src/integrations/supabase/ |
| `src/integrations/supabase/types.ts` | Generated DB types | src/integrations/supabase/ |

### Key Source Files

| File | Purpose | Location |
|------|---------|----------|
| `src/App.tsx` | Main app with routing | src/ |
| `src/hooks/useAuth.ts` | Authentication hook | src/hooks/ |
| `src/lib/ai.ts` | AI client | src/lib/ |
| `src/lib/stripe-config.ts` | Stripe configuration | src/lib/ |
| `src/lib/timelineUtils.ts` | Timeline utilities | src/lib/ |
| `src/components/AIQueryInput.tsx` | AI query interface | src/components/ |
| `src/components/timeline/TimelineCanvas.tsx` | Timeline visualization | src/components/timeline/ |

### Edge Functions (30 total)

1. `ai-query` - Main AI query handler
2. `parse-document` - Document parsing
3. `ai-document-analysis` - AI summary generation
4. `google-drive-sync` - Google Drive integration
5. `microsoft-365-sync` - Microsoft 365 integration
6. `s3-sync` - AWS S3 integration
7. `generate-kb-content` - Knowledge base summary
8. `stripe-webhook` - Stripe event processing
9. `create-subscription` - Checkout session creation
10. `verify-checkout-session` - Payment verification
11. `create-portal-session` - Customer portal access
12. `admin-command-center` - Admin operations
13. `analytics-query` - Analytics retrieval
14. `generate-analytics` - Report generation
15. `upload-document` - File upload handling
16. `delete-document` - File deletion
17. `claude-document-processor` - Claude processing
18. `embedding-generator` - Vector embeddings
19. `semantic-search` - Semantic document search
20. `conversation-handler` - Conversation management
21. `export-knowledge-base` - KB export
22. `import-knowledge-base` - KB import
23. `batch-document-processor` - Batch processing
24. `scheduled-sync` - Automated sync
25. `notification-sender` - User notifications
26. `webhook-handler` - Generic webhooks
27. `rate-limiter` - API rate limiting
28. `cache-manager` - Response caching
29. `health-check` - System monitoring
30. `backup-scheduler` - Automated backups

### Database Migrations (62 total)

All migrations located in `supabase/migrations/`

Key migrations:
- Initial schema creation
- Knowledge bases support
- Conversations system
- Stripe subscriptions
- Usage tracking
- Timeline items
- Support tickets
- Vector embeddings
- Analytics tables
- RLS policies (most recent: app_config RLS)

---

## Application State

### Implemented Features ✅

- **Document Management**: Upload, sync (Google Drive, Microsoft 365, S3), parse, analyze
- **AI Query System**: Multi-provider (Claude Haiku, OpenRouter, Ollama), context retrieval
- **Knowledge Bases**: Create collections, AI summaries, scoped queries
- **Conversations**: Save chat sessions, context preservation
- **Timeline Manager**: Visual timeline with fixed day boundaries, auto-scrolling NOW line
- **Subscription System**: Stripe integration, 14-day trial, 3 pricing tiers
- **Support System**: Ticket creation, status tracking, messaging
- **Authentication**: Supabase Auth, OAuth (Google, Microsoft)
- **Security**: Row-Level Security on all tables, encrypted token storage
- **Usage Tracking**: Query counting, quota enforcement

### Recent Changes

**Timeline Fix** (Commit `3d53629`):
- Changed time marker generation from relative to absolute timestamps
- Vertical day boundary lines now show fixed times (e.g., "Mon, Oct 27 12:00 AM")
- Only NOW line updates continuously
- Improved timeline readability and performance

### Known Issues 🔧

1. **Stripe Webhook** (Minor)
   - Status: Implemented, needs final production verification
   - Webhooks receiving 200 OK responses

2. **Stripe Branding** (User Action Required)
   - Customer Portal shows "Wheels and Wins"
   - Fix: Update business name in Stripe Dashboard settings

3. **Legacy Code** (Cleanup)
   - Files: `supabase/functions/ai-query/index.ts` (lines 304-305, 317)
   - Contains "wheels" and "wins" keyword references
   - Impact: Minimal
   - Fix: Remove references

### Technology Stack

**Frontend**:
- React 18.3.1
- TypeScript 5.5.3
- Vite 5.3.4
- Tailwind CSS 3.4.1
- shadcn-ui components
- React Router 6.26.2

**Backend**:
- Supabase (PostgreSQL + Edge Functions)
- Deno runtime for Edge Functions
- Stripe 14.21.0

**AI**:
- Claude Haiku (via Lovable Gateway)
- OpenRouter API
- Ollama (local fallback)

---

## Restore Instructions

### Quick Restore

1. **Extract backup**:
   ```bash
   tar -xzf 2025-10-28_13-21-54_complete-Master.tar.gz
   cd 2025-10-28_13-21-54_complete-Master
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start development**:
   ```bash
   npm run dev
   ```

### Full Deployment Restore

1. **Extract and install** (as above)

2. **Setup Supabase**:
   ```bash
   # Link to Supabase project
   supabase link --project-ref fskwutnoxbbflzqrphro

   # Apply migrations
   supabase db push

   # Deploy Edge Functions
   for func in supabase/functions/*/; do
     supabase functions deploy $(basename $func)
   done
   ```

3. **Configure Stripe**:
   - Set environment variables in Supabase dashboard
   - Create webhook endpoint pointing to stripe-webhook function
   - Update business name to "AI Query Hub"

4. **Build and deploy frontend**:
   ```bash
   npm run build
   # Deploy dist/ to hosting service (Vercel, Netlify, etc.)
   ```

### Verification Steps

After restore, verify:

- [ ] Frontend loads at localhost:8080
- [ ] Authentication works (sign up, sign in)
- [ ] Documents can be uploaded
- [ ] AI queries return responses
- [ ] Knowledge bases can be created
- [ ] Timeline displays correctly
- [ ] Stripe checkout flow works
- [ ] All Edge Functions deployed successfully
- [ ] Database migrations applied (check Supabase dashboard)

---

## Backup Verification

### File Count Verification

Expected: 411 files

Verify with:
```bash
find 2025-10-28_13-21-54_complete-Master -type f | wc -l
```

### Size Verification

Expected: ~5.0 MB

Verify with:
```bash
du -sh 2025-10-28_13-21-54_complete-Master
```

### Archive Integrity

Verify archive integrity:
```bash
tar -tzf 2025-10-28_13-21-54_complete-Master.tar.gz > /dev/null && echo "Archive OK"
```

### Critical Files Check

Ensure critical files exist:
```bash
cd 2025-10-28_13-21-54_complete-Master

# Core files
test -f package.json && echo "✅ package.json"
test -f src/App.tsx && echo "✅ App.tsx"
test -f supabase/config.toml && echo "✅ Supabase config"
test -f COMPLETE_APPLICATION_DOCUMENTATION.md && echo "✅ Documentation"

# Edge Functions
test -d supabase/functions/ai-query && echo "✅ ai-query function"
test -d supabase/functions/stripe-webhook && echo "✅ stripe-webhook function"

# Migrations
test -d supabase/migrations && echo "✅ Migrations directory"
```

---

## Notes

### Why This Backup?

This backup captures AI Query Hub at a "perfect point in time":

1. **Feature Complete**: All major features implemented and tested
2. **Stable**: No critical bugs, only minor configuration items remaining
3. **Documented**: Comprehensive documentation created
4. **Production Ready**: Can be deployed immediately with environment variable configuration
5. **Clean State**: Recent timeline fix applied, code is in excellent condition

### Next Steps After Restore

If restoring this backup in the future:

1. Complete the minor remaining tasks:
   - Verify Stripe webhook in production
   - Update Stripe branding
   - Remove legacy code references

2. Consider roadmap items (see documentation Section 11.2)

3. Update dependencies:
   ```bash
   npm update
   npm audit fix
   ```

4. Review and update environment variables for your deployment

### Support

For questions or issues with this backup:
- Refer to COMPLETE_APPLICATION_DOCUMENTATION.md
- Check CLAUDE.md for project-specific instructions
- Review commit history for recent changes

---

## Metadata

```json
{
  "backup_name": "2025-10-28_13-21-54_complete-Master",
  "created_at": "2025-10-28T13:21:54Z",
  "version": "1.0.0",
  "total_files": 411,
  "total_size_mb": 5.0,
  "archive_format": "tar.gz",
  "compression": "gzip",
  "git_commit": "3d53629",
  "git_branch": "main",
  "node_version": "18+",
  "npm_version": "9+",
  "platform": "darwin",
  "purpose": "Perfect state snapshot before final Stripe fixes"
}
```

---

**END OF MANIFEST**
