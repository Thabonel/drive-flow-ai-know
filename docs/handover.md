# AI Query Hub - Development Handover Document
**Date:** October 23, 2025
**Session Summary:** Support System, Landing Page Updates, Document Viewer Improvements

---

## Table of Contents
1. [Overview](#overview)
2. [Key Features Implemented](#key-features-implemented)
3. [Technical Details](#technical-details)
4. [Pending Tasks](#pending-tasks)
5. [Important Notes](#important-notes)
6. [Git Commits Reference](#git-commits-reference)
7. [Next Steps](#next-steps)

---

## Overview

This handover document covers the implementation of three major feature sets:
1. **In-App Support Ticket System** - Complete replacement for email support
2. **Landing Page Enhancements** - Hero image and pricing accuracy updates
3. **Document Viewer Improvements** - Better formatting and UX

All features have been implemented, tested, and pushed to the GitHub repository.

---

## Key Features Implemented

### 1. Support Ticket System

**Purpose:** Replace email support with an integrated ticketing system accessible to users and admins.

**Components Created:**
- **Database Table:** `support_tickets`
  - Location: `supabase/migrations/20251023000000_support_tickets.sql`
  - Fields: id, user_id, subject, message, category, priority, status, admin_response, admin_id, responded_at, created_at, updated_at
  - RLS Policies: Users can view/create/update their own tickets

- **Edge Function:** `submit-support-ticket`
  - Location: `supabase/functions/submit-support-ticket/index.ts`
  - Status: ✅ Deployed to Supabase
  - Functionality: Validates inputs, auto-assigns priority, creates tickets

- **User Support Page:** `/support`
  - Location: `src/pages/Support.tsx`
  - Features:
    - Ticket submission form with categories
    - View all personal tickets
    - Real-time status updates
    - Admin response display

- **Admin Support Tickets Page:** `/admin/support-tickets`
  - Location: `src/pages/AdminSupportTickets.tsx`
  - Features:
    - Tabs for Open/In Progress/Resolved tickets
    - Ticket detail modal with response form
    - Status update functionality
    - Badge counters for each category

**UI Updates:**
- Added "Support" link to sidebar navigation (HelpCircle icon)
- Added "Support Tickets" card in Admin Dashboard → Management tab
- Updated Landing page: "Email support" → "Support tickets"

**Ticket Categories:**
- Technical Issue
- Billing & Payments
- Feature Request
- Bug Report
- General Question

**Ticket Statuses:**
- Open
- In Progress
- Waiting for Response
- Resolved
- Closed

**Auto-Priority Logic:**
- Billing → High priority
- Bug Report → High priority
- Technical Issue → Normal priority
- Feature Request → Normal priority
- General Question → Normal priority

**Routes:**
- User: `/support`
- Admin: `/admin/support-tickets`

---

### 2. Landing Page Enhancements

#### A. Hero Background Image

**Implementation:**
- Added AI-themed background image to hero section
- Image URL: `https://fskwutnoxbbflzqrphro.supabase.co/storage/v1/object/public/assets/Hero%20AI.png`
- Storage: Supabase Storage bucket named `assets` (public)
- Location: `src/pages/Landing.tsx` (lines 228-238)

**Styling:**
- Image opacity: 90%
- Gradient overlay: `from-black/40 via-black/30 to-transparent`
- Fallback background: `bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800`
- Text colors: White/light with drop shadows for readability
- Headline gradient: Blue/cyan animated gradient

**Cache Management:**
- Added `?v=2` query parameter for cache-busting

#### B. Pricing Accuracy Updates

**Purpose:** Align landing page pricing with actual implemented features.

**Changes Made:**

**Starter Plan ($9/month):**
- ✅ 5GB storage
- ✅ Google Drive sync
- ✅ Knowledge bases
- ✅ Support tickets
- ❌ Removed: "200 questions/month" (no monthly limits)
- ❌ Removed: "(Gemini)" (admin-controlled)
- ❌ Removed: "Up to 3 knowledge bases" (no artificial limit)

**Pro Plan ($45/month):**
- ✅ 50GB storage
- ✅ Unlimited Google Drive sync
- ✅ Unlimited knowledge bases
- ✅ Full conversation history
- ✅ Priority support
- ❌ Removed: "1,000 questions/month"
- ❌ Removed: "Pick your AI (Gemini or GPT-4o)"
- ❌ Removed: "API access"
- ❌ Removed: "Faster support"

**Business Plan ($150/month):**
- ✅ 5 team members included
- ✅ +$10/month per extra person
- ✅ 500GB shared storage
- ✅ Team admin tools
- ✅ Usage analytics
- ✅ Dedicated account manager
- ❌ Removed: "Unlimited questions per person"
- ❌ Removed: "Your own AI models if you want"

**Actual System Implementation:**
- Rate limit: 100 queries/hour (abuse prevention)
- No monthly query limits enforced
- AI model selection: Admin-controlled via user_settings table
- API access: Not implemented

**Reference Files:**
- `src/lib/stripe-config.ts` - PLAN_LIMITS configuration
- `supabase/migrations/20251019_simple_rate_limiting.sql` - Rate limit logic

---

### 3. Document Viewer Improvements

**Purpose:** Improve readability and professionalism of document display.

**Components Modified:**
- `src/components/DocumentViewerModal.tsx`
- `src/components/DocumentCard.tsx`

#### A. Markdown Formatting Cleanup

**Created Function:** `cleanMarkdown(text: string)`
- Location: `src/components/DocumentViewerModal.tsx` (lines 21-46)

**Removes:**
- Horizontal rules: `---`, `___`, `***`
- Headers: `##`, `###`, etc.
- Bold/Italic: `**bold**`, `*italic*`, `__underline__`, `_italic_`
- Inline code: `` `code` ``
- Code blocks: ` ```code``` `
- Links: `[text](url)` (keeps text, removes URL)
- Images: `![alt](url)`
- Blockquotes: `>`
- Multiple consecutive blank lines

**Preserves:**
- Paragraph structure
- Line breaks
- Readable text content

#### B. Font and Typography Updates

**Before:**
- Font: `font-mono` (monospace/code-like)
- Size: `text-sm`
- Spacing: Default

**After:**
- Font: `font-sans` (modern sans-serif)
- Size: `text-base`
- Spacing: `leading-relaxed`
- Title: `text-lg font-semibold`

**Benefits:**
- Professional document appearance
- Better readability
- Larger, more comfortable text size
- Modern, clean presentation

#### C. UI Simplification

**DocumentCard Component:**
- ❌ Removed: "Edit" button from document cards
- ✅ Kept: "View" button
- ✅ Edit functionality still available within the viewer modal

**Rationale:**
- Reduces button clutter
- Edit is already available in the modal
- Cleaner card interface

---

## Technical Details

### Database

**Supabase Project:**
- Project ID: `fskwutnoxbbflzqrphro`
- URL: `https://fskwutnoxbbflzqrphro.supabase.co`

**Tables:**
- `support_tickets` - Support ticket data
- `knowledge_documents` - User documents
- `knowledge_bases` - Collections of documents
- `ai_query_history` - AI query logs
- `user_google_tokens` - OAuth tokens
- `user_settings` - User preferences
- `conversations` - Saved chat conversations
- `admin_messages` - Admin command center
- `subscriptions` - Stripe subscriptions
- `usage_tracking` - User usage metrics

**Row Level Security (RLS):**
- All tables have RLS policies
- Users can only access their own data
- Service role bypasses RLS for admin functions

### Edge Functions (Supabase)

**Deployed Functions:**
1. `submit-support-ticket` - Creates support tickets
2. `verify-checkout-session` - Verifies Stripe checkout
3. `create-subscription` - Creates Stripe checkout session
4. `create-portal-session` - Opens Stripe customer portal
5. `ai-query` - Main AI query handler
6. `parse-document` - Document content extraction
7. Others (see `supabase/functions/` directory)

**Deployment Command:**
```bash
npx supabase functions deploy <function-name>
```

**Runtime:** Deno with TypeScript

### Frontend Routes

**Public Routes:**
- `/` - Landing page
- `/auth` - Authentication
- `/terms`, `/privacy`, `/disclaimer`, `/data-policy`, `/acceptable-use` - Legal pages

**Protected Routes (Authentication Required):**
- `/dashboard` - Main dashboard
- `/support` - Support tickets
- `/conversations` - AI assistant
- `/documents` - Document management
- `/knowledge` - Knowledge bases
- `/settings` - User settings
- `/settings/billing` - Billing & subscriptions
- `/admin` - Admin dashboard
- `/admin/support-tickets` - Admin ticket management

### Stripe Integration

**Approach:** Session-based verification (no webhooks)

**Flow:**
1. User clicks "Choose Plan" on `/settings/billing`
2. `create-subscription` Edge Function creates Stripe Checkout session
3. User completes payment on Stripe
4. Stripe redirects to `/settings/billing?session_id={CHECKOUT_SESSION_ID}`
5. `verify-checkout-session` Edge Function verifies and saves subscription
6. User sees subscription activated

**Configuration:**
- Price IDs: `src/lib/stripe-config.ts`
- Trial period: 14 days
- Plans: starter, pro, business

**Webhook Status:**
- ❌ Abandoned due to signature verification issues
- ✅ Session verification works reliably
- ⚠️ Webhooks may be needed later for renewals/cancellations

### Storage

**Supabase Storage Buckets:**
- `assets` - Public assets (hero images, logos)
  - URL pattern: `https://fskwutnoxbbflzqrphro.supabase.co/storage/v1/object/public/assets/`

**Hero Image:**
- Filename: `Hero AI.png`
- Full URL: `https://fskwutnoxbbflzqrphro.supabase.co/storage/v1/object/public/assets/Hero%20AI.png`

---

## Pending Tasks

### Critical

1. **Run Support Tickets Database Migration**
   - **File:** `supabase/migrations/20251023000000_support_tickets.sql`
   - **Method:** Manual execution in Supabase Dashboard → SQL Editor
   - **Reason:** Local/remote migration sync issues
   - **Status:** SQL file ready, needs execution
   - **Steps:**
     1. Go to Supabase Dashboard
     2. Navigate to SQL Editor
     3. Copy entire contents of `20251023000000_support_tickets.sql`
     4. Execute SQL
     5. Verify `support_tickets` table exists

### Optional / Future Enhancements

2. **Stripe Webhook Implementation**
   - **Purpose:** Handle subscription renewals, cancellations, payment failures
   - **Current:** Session-based verification works for initial signup
   - **Future:** May need webhooks for ongoing subscription management

3. **Enhanced Support Ticket Features**
   - File attachments
   - Email notifications to users when admin responds
   - Ticket escalation system
   - SLA tracking
   - Canned responses for admins

4. **Landing Page Analytics**
   - Track conversion rates
   - Monitor user engagement
   - A/B testing for pricing/messaging

5. **Document Viewer Enhancements**
   - PDF preview support
   - Syntax highlighting for code documents
   - Export to PDF/DOCX
   - Version history

---

## Important Notes

### Migration Sync Issue

**Problem:**
- Local migrations directory has different versions than remote database
- `npx supabase db push` fails due to mismatch

**Solution:**
- Use Supabase Dashboard SQL Editor for manual migration execution
- Alternative: Run `supabase db pull` to sync local with remote (may overwrite local changes)

**Prevention:**
- Always pull latest migrations before creating new ones
- Consider using Supabase Dashboard for migrations in production

### Theme System

**Public Pages (Landing, Legal):**
- Always display in light theme
- Forced via `ThemeProvider.tsx`
- Route check: `window.location.pathname`

**Authenticated Pages:**
- Respect user theme preference
- Stored in `localStorage` as `aiqueryhub-theme`
- Options: light, dark, system, pure-light, magic-blue, classic-dark

### Rate Limiting

**Current Implementation:**
- 100 queries/hour across all tiers
- No monthly limits enforced
- Purpose: Abuse prevention

**Database Schema:**
- Has monthly limits (200/1000/unlimited) in migrations
- NOT enforced in actual code
- `stripe-config.ts` shows `queriesPerDay: -1` (unlimited)

**Important:** Landing page now reflects actual implementation (no monthly limits advertised)

---

## Git Commits Reference

### Session Commits (Latest First)

1. **c491ceb** - "feat: Improve document viewer formatting and UI"
   - Stripped markdown formatting from viewer
   - Changed to modern sans-serif font
   - Removed Edit button from document cards

2. **c5af98a** - "feat: Make hero image the main background"
   - Increased image opacity to 90%
   - Updated text to white with drop shadows
   - Hero image now dominates section

3. **774715d** - "fix: Increase hero image opacity for better visibility"
   - Changed opacity from 20% to 30%
   - Reduced gradient overlay

4. **d49ee67** - "feat: Add hero background image to landing page"
   - Added AI-themed background image
   - Set initial opacity and gradient

5. **b0c468e** - "feat: Add in-app support ticket system"
   - Complete support ticket implementation
   - User and admin interfaces
   - Edge Function deployment

6. **4a63511** - "fix: Update pricing plan features to match actual implementation"
   - Removed unimplemented features from landing page
   - Aligned with actual system capabilities

### Key Files Changed

**Support System:**
- `src/pages/Support.tsx` (new)
- `src/pages/AdminSupportTickets.tsx` (new)
- `src/components/AppSidebar.tsx` (added Support link)
- `src/pages/Admin.tsx` (added Support Tickets card)
- `src/App.tsx` (added routes)
- `supabase/functions/submit-support-ticket/index.ts` (new)
- `supabase/migrations/20251023000000_support_tickets.sql` (new)

**Landing Page:**
- `src/pages/Landing.tsx` (hero image, pricing updates)

**Document Viewer:**
- `src/components/DocumentViewerModal.tsx` (markdown cleaner, font updates)
- `src/components/DocumentCard.tsx` (removed Edit button)

---

## Next Steps

### Immediate (This Week)

1. ✅ **Execute Support Tickets Migration**
   - Run SQL in Supabase Dashboard
   - Test ticket creation/viewing

2. ✅ **Test Support System**
   - Create test ticket as user
   - Respond as admin
   - Verify status updates work

3. ✅ **Monitor Hero Image Loading**
   - Check loading performance
   - Verify cache-busting works
   - Optimize image size if needed

4. ✅ **User Acceptance Testing**
   - Test document viewer with various document types
   - Verify markdown cleaning works correctly
   - Check font readability across devices

### Short Term (Next 2 Weeks)

1. **Implement Email Notifications**
   - Send email when admin responds to ticket
   - Weekly digest of open tickets for admins
   - Use Supabase Edge Functions + Resend/SendGrid

2. **Add Support Metrics Dashboard**
   - Average response time
   - Tickets by category/status
   - Admin performance metrics
   - Display in Admin Dashboard

3. **Enhance Document Search**
   - Full-text search within documents
   - Filter by category/tags
   - Sort by relevance

4. **Mobile Optimization**
   - Test hero image on mobile devices
   - Responsive support ticket forms
   - Document viewer mobile UX

### Long Term (Next Month)

1. **Stripe Webhook Implementation**
   - Debug signature verification
   - Implement webhook handlers
   - Handle subscription lifecycle events

2. **Advanced Support Features**
   - File attachments
   - Ticket merging/splitting
   - Canned responses library
   - Knowledge base integration (auto-suggest articles)

3. **Analytics Integration**
   - Google Analytics for landing page
   - Mixpanel/Amplitude for user behavior
   - Conversion funnel tracking

4. **Performance Optimization**
   - Lazy loading for document viewer
   - Image optimization (WebP format)
   - Code splitting for faster initial load

---

## Contact & Resources

### Documentation
- **Project Root:** `/Users/thabonel/Code/aiqueryhub`
- **This Document:** `docs/handover.md`
- **Main README:** `CLAUDE.md`

### Key URLs
- **GitHub:** https://github.com/Thabonel/drive-flow-ai-know
- **Supabase Dashboard:** https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro
- **Production URL:** [Add when deployed]

### Development Commands

```bash
# Frontend
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Lint code

# Supabase
npx supabase functions deploy <name>  # Deploy Edge Function
npx supabase db push                  # Push migrations (if sync issues resolved)
npx supabase db pull                  # Pull remote schema

# Git
git status
git add .
git commit -m "message"
git push
```

### Environment Variables

**Frontend (.env):**
```
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

**Supabase Edge Functions:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `OPENROUTER_API_KEY`
- `LOVABLE_API_KEY`

---

## Appendix

### A. Support Ticket Database Schema

```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  admin_response TEXT,
  admin_id UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
```

### B. Markdown Cleaning Function

```typescript
const cleanMarkdown = (text: string): string => {
  if (!text) return '';

  return text
    .replace(/^[\-_*]{3,}\s*$/gm, '')           // Remove horizontal rules
    .replace(/^#{1,6}\s+/gm, '')                 // Remove headers
    .replace(/(\*\*|__)(.*?)\1/g, '$2')          // Remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2')             // Remove italic
    .replace(/`([^`]+)`/g, '$1')                 // Remove inline code
    .replace(/```[\s\S]*?```/g, '')              // Remove code blocks
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')    // Remove links
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')   // Remove images
    .replace(/^>\s+/gm, '')                      // Remove blockquotes
    .replace(/\n{3,}/g, '\n\n')                  // Clean blank lines
    .trim();
};
```

### C. Stripe Session Verification Flow

```typescript
// 1. Create checkout session
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  success_url: `${origin}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/settings/billing?canceled=true`,
  subscription_data: {
    trial_period_days: 14,
    metadata: { user_id, plan_type }
  }
});

// 2. User completes payment, redirects with session_id

// 3. Verify session
const session = await stripe.checkout.sessions.retrieve(session_id, {
  expand: ['subscription', 'customer'],
});

// 4. Save to database
await supabase
  .from("subscriptions")
  .upsert({
    user_id,
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    plan_type: subscription.metadata.plan_type,
    status: subscription.status,
    // ... timestamps
  });
```

---

**End of Handover Document**

---

*Generated: October 23, 2025*
*Project: AI Query Hub*
*Repository: https://github.com/Thabonel/drive-flow-ai-know*
*Supabase Project: fskwutnoxbbflzqrphro*
