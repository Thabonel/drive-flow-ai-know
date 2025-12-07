# AIQueryHub Pre-Launch Testing Checklist

## How Solopreneurs Test Before Launch

Based on research from indie hacker communities and SaaS testing experts:

### Key Strategies

1. **Dogfooding** - Use your own product daily. You're your first customer.
2. **Critical Path Focus** - Don't test everything equally. Focus on flows that make or break the product.
3. **Automate Ruthlessly** - Your time is limited. Use tools like BugBug, Cypress, or Playwright.
4. **Build in Public** - Share your journey, get beta testers for free.
5. **6-8 Week Community Engagement** - Start building audience before launch.

### Recommended Tools for Solo Developers

| Tool | Use Case | Why |
|------|----------|-----|
| **BugBug** | E2E testing | Low-code, Chrome extension, fast |
| **Cypress** | E2E testing | Developer-friendly, great DX |
| **Postman** | API testing | Easy to use, shareable collections |
| **Sentry** | Error tracking | Catch production errors |
| **LogRocket** | Session replay | See what users actually do |

---

## Critical Paths to Test First

These are the flows that determine if users convert or churn:

### 1. Onboarding Flow (HIGHEST PRIORITY)
- [ ] Sign up with email/password
- [ ] Verify email confirmation works
- [ ] First-time user sees welcome/tutorial
- [ ] User can complete ONE valuable action in <5 minutes
- [ ] OAuth flows work (Google, Microsoft)

### 2. Core Value Proposition
- [ ] Upload a document successfully
- [ ] Ask AI a question about the document
- [ ] Get a useful, accurate response
- [ ] Save/export the response

### 3. Payment Flow
- [ ] View pricing page
- [ ] Click subscribe button
- [ ] Complete Stripe checkout
- [ ] Redirect to success page
- [ ] Subscription status reflects correctly
- [ ] Access premium features after payment

---

## Complete Feature Testing Checklist

### TIER 1: Must Work Perfectly (Test First)

#### Authentication
- [ ] Email/password signup
- [ ] Email/password login
- [ ] Password reset flow
- [ ] Google OAuth login
- [ ] Microsoft OAuth login
- [ ] Session persistence (refresh page, still logged in)
- [ ] Logout works
- [ ] Protected routes redirect to login
- [ ] Auth pages redirect to dashboard if logged in

#### AI Query System
- [ ] Type question in AI input
- [ ] Submit and see loading state
- [ ] Receive AI response
- [ ] Response shows document sources
- [ ] Query specific knowledge base
- [ ] Copy response text
- [ ] Error handling for failed queries
- [ ] Offline mode toggle (if using Ollama)

#### Document Management
- [ ] Upload document via file picker
- [ ] Drag and drop upload
- [ ] Support PDF files
- [ ] Support DOCX files
- [ ] Support TXT/MD files
- [ ] View document in modal
- [ ] Search documents by title
- [ ] Delete document with confirmation
- [ ] Generate AI summary for document

#### Knowledge Bases
- [ ] Create new knowledge base
- [ ] Add documents to KB
- [ ] Edit KB title/description
- [ ] Delete KB with confirmation
- [ ] Query KB specifically
- [ ] View KB document count

#### Timeline (Task Management)
- [ ] Create new task
- [ ] Edit task details
- [ ] Mark task as done
- [ ] Delete task
- [ ] Drag to reorder tasks
- [ ] View tasks by date
- [ ] Task appears after creation
- [ ] Completed task visual change

---

### TIER 2: Important Features (Test Second)

#### Google Drive Integration
- [ ] Connect Google Drive (OAuth)
- [ ] See "Connected" status
- [ ] Select folders to sync
- [ ] Sync folder successfully
- [ ] Documents appear after sync
- [ ] Disconnect Google Drive
- [ ] Reconnect works

#### Google Calendar Integration
- [ ] Connect Google Calendar
- [ ] See calendar events in timeline
- [ ] Event details display correctly
- [ ] Sync updates from calendar

#### Daily Planning
- [ ] Open daily planning flow
- [ ] Progress through all steps
- [ ] Add tasks during planning
- [ ] Complete planning (confetti!)
- [ ] Streak counter updates
- [ ] Snooze functionality works

#### Booking Links
- [ ] Create booking link
- [ ] Set availability hours
- [ ] Copy shareable link
- [ ] Public booking page loads
- [ ] Available slots display correctly
- [ ] Book a meeting successfully
- [ ] Confirmation displays

#### Email-to-Task
- [ ] View unique email address
- [ ] Copy email address
- [ ] Forward email to address
- [ ] Task extracted from email
- [ ] Confirm task creation

#### Conversations
- [ ] Save conversation
- [ ] View conversation history
- [ ] Delete conversation
- [ ] Search conversations

#### Settings
- [ ] Update profile name
- [ ] Change theme
- [ ] Theme persists after refresh
- [ ] View connected services

---

### TIER 3: Secondary Features (Test Third)

#### Team Features
- [ ] Create team
- [ ] Invite member
- [ ] Accept invitation
- [ ] View shared documents
- [ ] Change member role
- [ ] Remove member

#### Billing
- [ ] View current plan
- [ ] Access billing portal
- [ ] View invoices
- [ ] Upgrade plan
- [ ] Downgrade plan

#### AI Time Intelligence
- [ ] See AI time estimate on new task
- [ ] View confidence badge
- [ ] Complete task and log time
- [ ] Accuracy updates over time

#### Daily Brief
- [ ] Generate daily brief
- [ ] View schedule summary
- [ ] See priorities

#### Support
- [ ] Submit feedback
- [ ] Create support ticket
- [ ] View ticket status

---

### TIER 4: Nice-to-Have (Test If Time)

- [ ] Microsoft 365 integration
- [ ] S3 storage connector
- [ ] Audio transcription
- [ ] Document visualization
- [ ] Admin dashboard
- [ ] Enterprise features
- [ ] Keyboard shortcuts
- [ ] Data export

---

## Cross-Platform Testing

### Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Devices
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768px width)
- [ ] Mobile (375px width)

### Themes
- [ ] Light mode - all features visible
- [ ] Dark mode - all features visible
- [ ] No contrast issues
- [ ] No text cut-off

---

## Integration Testing

### API Endpoints to Verify
```bash
# Test these manually or with Postman

# AI Query
POST /functions/v1/ai-query

# Document Processing
POST /functions/v1/parse-document
POST /functions/v1/claude-document-processor

# Google Integrations
POST /functions/v1/google-drive-sync
POST /functions/v1/google-calendar-sync

# Payments
POST /functions/v1/create-subscription
POST /functions/v1/verify-checkout-session
```

### Database Tables to Verify Have Data
```sql
-- Run these in Supabase SQL Editor
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM knowledge_documents;
SELECT COUNT(*) FROM knowledge_bases;
SELECT COUNT(*) FROM timeline_items;
SELECT COUNT(*) FROM timeline_layers;
SELECT COUNT(*) FROM ai_query_history;
SELECT COUNT(*) FROM conversations;
```

---

## Error Scenarios to Test

### Network Errors
- [ ] Slow connection (use Chrome DevTools throttling)
- [ ] Offline mode behavior
- [ ] API timeout handling
- [ ] Retry mechanisms

### User Errors
- [ ] Empty form submissions
- [ ] Invalid email format
- [ ] Very long text inputs
- [ ] Special characters in inputs
- [ ] Duplicate submissions (double-click)

### Edge Cases
- [ ] No documents uploaded yet
- [ ] No knowledge bases created
- [ ] Empty timeline
- [ ] First-time user experience
- [ ] User with 1000+ documents (if possible)

---

## Security Testing

### Authentication
- [ ] Cannot access protected routes without login
- [ ] Cannot access other user's data
- [ ] Session expires appropriately
- [ ] Password requirements enforced

### Data Access
- [ ] RLS policies block cross-user access
- [ ] API keys not exposed in frontend
- [ ] No sensitive data in console logs

### Input Validation
- [ ] XSS prevention (try `<script>alert('xss')</script>`)
- [ ] SQL injection prevention
- [ ] File upload restrictions

---

## Performance Testing

### Page Load Times (Target: <3 seconds)
- [ ] Dashboard
- [ ] Documents page
- [ ] Timeline page
- [ ] Settings page

### API Response Times (Target: <2 seconds)
- [ ] AI query response
- [ ] Document upload
- [ ] Knowledge base creation

### Stress Testing
- [ ] 10 concurrent users (simulate with multiple tabs)
- [ ] Large file upload (10MB+)
- [ ] Many documents in list (100+)

---

## Pre-Launch Final Checklist

### One Week Before
- [ ] All TIER 1 features passing
- [ ] All TIER 2 features passing
- [ ] Payment flow tested with real card
- [ ] Error tracking enabled (Sentry/LogRocket)
- [ ] Analytics enabled
- [ ] Backup strategy confirmed

### Day Before
- [ ] Fresh signup test (new email)
- [ ] Complete user journey test
- [ ] Payment test (use Stripe test mode)
- [ ] Mobile responsive check
- [ ] Load landing page from incognito

### Launch Day
- [ ] Monitor error tracking
- [ ] Watch for failed payments
- [ ] Be ready to hotfix
- [ ] Have rollback plan

---

## Dogfooding Commitment

Use AIQueryHub daily for:
- [ ] Managing your own tasks
- [ ] Storing your own documents
- [ ] Querying your knowledge bases
- [ ] Planning your day
- [ ] Booking meetings

**Goal**: Use every feature yourself before asking others to pay for it.

---

## Beta Tester Recruitment

### Where to Find Beta Testers
1. **Indie Hackers** - Post in relevant groups
2. **Twitter/X** - Build in public, share progress
3. **Reddit** - r/SaaS, r/startups, relevant niche subs
4. **Product Hunt** - Upcoming page
5. **Your network** - Friends, colleagues who fit ICP

### What to Ask Beta Testers
1. Did you complete onboarding? Where did you get stuck?
2. What was your first "aha moment"?
3. What's confusing?
4. Would you pay for this? Why/why not?
5. What's missing?

---

## Resources

- [Ultimate Startup Launch Checklist](https://www.indiehackers.com/post/ultimate-startup-launch-checklist-for-solopreneurs-in-2023-a4067cf1b8)
- [How to Validate Your Micro-SaaS](https://www.indiehackers.com/post/how-i-validated-my-micro-saas-idea-quickly-and-you-can-too-53decf45b9)
- [SaaS Testing Best Practices](https://www.frugaltesting.com/blog/best-qa-practices-for-saas-testing)
- [Dogfooding Guide](https://www.testdevlab.com/blog/dogfooding-a-quick-guide-to-internal-beta-testing)
