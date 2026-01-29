# PRD — Google Sheets Integration

**Status:** Draft
**Created:** 2026-01-29
**Owner:** AI Agent

## 1) Context & Goals

### Problem Statement
AI Query Hub currently supports Google Docs integration and can parse/display spreadsheet files, but lacks bidirectional Google Sheets integration. Users cannot directly connect, query, or modify their live Google Sheets through the AI assistant, creating a significant gap in productivity workflows.

### Target Users
- Knowledge workers who maintain data in Google Sheets
- Business analysts who need AI insights from spreadsheet data
- Teams using Sheets for tracking and need AI assistance
- Users who want conversational data manipulation

### Why Now
- Existing Google OAuth infrastructure is complete
- Spreadsheet parsing/display is already implemented
- AI chat interface has tool calling capabilities
- Competitive gap vs Claude-in-Excel

### In-Scope Goals
- ✅ Read data from user's Google Sheets via AI chat commands
- ✅ Write/update data to Google Sheets through conversational interface
- ✅ Create new sheets with AI assistance
- ✅ List and browse user's Google Sheets
- ✅ Analyze sheet data (summaries, insights, trends)
- ✅ Query specific ranges and return structured JSON
- ✅ Handle authentication token refresh automatically

### Out-of-Scope / Non-Goals
- ❌ Building spreadsheet editor UI (use Google's embed)
- ❌ Excel formula parsing/evaluation
- ❌ Offline mode (API-only)
- ❌ Real-time collaborative editing
- ❌ Advanced charting (beyond existing SpreadsheetViewer)
- ❌ Macro/script execution

## 2) Current State (Repo-informed)

### Existing Infrastructure
**Google OAuth System:**
- `src/hooks/useGoogleDrive.ts` - Complete OAuth token management
- `supabase/functions/store-google-tokens/` - Token storage with refresh
- `user_google_tokens` table - Encrypted token persistence
- Current scope: `https://www.googleapis.com/auth/drive.readonly`

**Spreadsheet Capabilities:**
- `src/components/SpreadsheetViewer.tsx` - Full-featured sheet display
- `supabase/functions/parse-document/` - Excel/CSV parsing (XLSX, XLS, CSV)
- Existing `SpreadsheetData` interface with sheets, formulas, charts

**AI Integration:**
- `supabase/functions/ai-query/` - Main AI handler with tool calling
- Document context retrieval system
- AI tool registry pattern established

**Database Schema:**
- `knowledge_documents` - Document storage with metadata
- `google_drive_folders` - Folder tracking
- `sync_jobs` - Background processing jobs

### Target File Locations
**New Files:**
- `src/hooks/useGoogleSheets.ts` (copy useGoogleDrive pattern)
- `src/pages/GoogleSheets.tsx` (copy GoogleDrive.tsx)
- `src/components/GoogleSheetsAuthCard.tsx`
- `src/components/GoogleSheetsPicker.tsx`
- `supabase/functions/google-sheets-sync/` (copy google-drive-sync)
- `supabase/functions/google-sheets-api/` (CRUD operations)

**Modified Files:**
- `src/App.tsx` (add /google-sheets route)
- `src/components/AppSidebar.tsx` (add navigation)
- OAuth scope update (add spreadsheets permission)

### Risks & Assumptions
**ASSUMPTION:** Google Sheets API rate limits (100 requests/100 seconds/user) sufficient for typical usage
**ASSUMPTION:** Users will primarily work with sheets <1000 rows for performance
**RISK:** Token refresh failures could break mid-conversation
**RISK:** Large sheet operations might timeout Edge Functions (10s limit)

## 3) User Stories

**Story 1:** As a data analyst, I want to ask "Summarize my Q1 Budget sheet" and get insights from my Google Sheet, so I can quickly understand trends without manually reviewing data.

**Story 2:** As a project manager, I want to say "Add a new task to my Project Tracker: 'Review designs', Due: 2026-02-15, Owner: Sarah" and have it automatically append to my Google Sheet, so I can maintain my tracker through conversation.

**Story 3:** As a business owner, I want to ask "What's the total revenue from my Sales sheet for January?" and get a calculated answer, so I can get quick insights without opening the sheet.

**Story 4:** As a team lead, I want to create a new sheet called "Team Goals 2026" with columns for Goal, Owner, Due Date, Status through AI chat, so I can set up tracking sheets conversationally.

**Story 5:** As a researcher, I want to query "Show me all survey responses where satisfaction > 8" from my Data sheet and get filtered results, so I can analyze specific segments quickly.

## 4) Success Criteria (Verifiable)

### Functional Requirements
- [ ] **Authentication:** User can connect Google Sheets with single OAuth flow (reuses Drive auth + new scope)
- [ ] **List Sheets:** AI can retrieve and display user's Google Sheets list with names and metadata
- [ ] **Read Data:** AI can read specific sheet ranges (e.g., "A1:E10") and return structured JSON
- [ ] **Write Data:** AI can append rows or update specific cells in user's sheets
- [ ] **Create Sheets:** AI can create new Google Sheets with specified structure
- [ ] **Query Data:** AI can filter/search sheet data based on natural language criteria
- [ ] **Error Handling:** Graceful handling of permission denied, rate limits, invalid ranges

### Performance Requirements
- [ ] **Response Time:** Sheet read operations complete within 5 seconds
- [ ] **Rate Limiting:** Handle Google's 100 requests/100s limit with queuing/backoff
- [ ] **Token Refresh:** Automatic token refresh without user intervention
- [ ] **Large Data:** Sheets with 1000+ rows load with pagination/streaming

### UX Requirements
- [ ] **Sheet Selection:** Users can select specific sheets in AI chat (dropdown picker)
- [ ] **Data Preview:** Sheet data displays in chat using existing SpreadsheetViewer
- [ ] **Edit Confirmation:** Write operations show "Successfully updated [Sheet Name]" confirmation
- [ ] **Connection Status:** Users see clear connected/disconnected state in UI

### Edge Cases
- [ ] **Empty Sheets:** Handle sheets with no data gracefully
- [ ] **Permission Changes:** Detect when sheet access is revoked and prompt re-auth
- [ ] **Concurrent Edits:** Handle cases where sheet is modified externally during AI operation
- [ ] **Invalid Ranges:** Clear error messages for malformed cell ranges (e.g., "ZZ999:AA1000")

## 5) Test Plan (Design BEFORE build)

### Unit Tests (src/hooks/useGoogleSheets.test.ts)
```typescript
describe('useGoogleSheets', () => {
  test('should detect valid Sheets token in session')
  test('should store provider token via edge function')
  test('should refresh expired tokens automatically')
  test('should handle OAuth errors gracefully')
  test('should clear tokens from URL after auth')
})
```

### Integration Tests (AI Tool Functions)
```typescript
describe('Sheets AI Tools', () => {
  test('listSheets() returns user sheets with metadata')
  test('readSheet() handles valid range A1:C10')
  test('writeSheet() appends row to existing sheet')
  test('createSheet() creates sheet with headers')
  test('querySheet() filters data by criteria')
  test('handles rate limit with 429 retry')
  test('handles invalid range errors gracefully')
})
```

### Edge Function Tests (supabase/functions/google-sheets-api/)
```typescript
describe('google-sheets-api', () => {
  test('requires valid JWT authentication')
  test('validates sheet_id parameter')
  test('handles Google API 403 permissions error')
  test('handles Google API 404 not found')
  test('returns structured error responses')
  test('respects 10s function timeout')
})
```

### E2E Smoke Tests
1. **OAuth Flow:** Connect Google Sheets → verify token stored → disconnect → verify token cleared
2. **Read Test:** Connect → ask "List my sheets" → verify sheets appear → select one → verify data loads
3. **Write Test:** Connect → ask "Add test data to [sheet]" → verify data appears in Google Sheets
4. **Error Test:** Revoke permissions in Google → try to read sheet → verify re-auth prompt

### Test Data Requirements
```json
{
  "test_sheet": {
    "name": "AI Test Sheet",
    "data": [
      ["Name", "Age", "City"],
      ["John", 25, "New York"],
      ["Jane", 30, "Los Angeles"]
    ]
  }
}
```

### Mock Strategy
- **Unit Tests:** Mock Google APIs responses with MSW
- **Integration Tests:** Use test Google account with dedicated test sheets
- **E2E Tests:** Isolated test environment with predictable data

## 6) Implementation Plan (Small slices)

### Phase 1: Extend OAuth & Backend (Slices 1-4)

**Slice 1: Extend OAuth Scope**
- a) Update `src/hooks/useGoogleDrive.ts` scope to include `https://www.googleapis.com/auth/spreadsheets`
- b) Add unit tests for scope validation
- c) Run: `npm test -- useGoogleDrive`
- d) Expected: Tests pass, OAuth requests new scope on next auth
- e) Commit: "extend oauth scope for google sheets access"

**Slice 2: Create Google Sheets API Edge Function**
- a) Copy `supabase/functions/google-drive-sync/` to `google-sheets-api/`
- b) Implement basic CRUD operations (list, read, write, create)
- c) Add tests: `supabase functions deploy google-sheets-api --verify`
- d) Expected: Function deploys, returns 401 without auth
- e) Commit: "add google-sheets-api edge function"

**Slice 3: Database Schema for Sheets**
- a) Create migration for `google_sheets_files` table (optional - can reuse `knowledge_documents`)
- b) Add RLS policies for user isolation
- c) Run: `npx supabase db reset --local`
- d) Expected: Migration applies cleanly
- e) Commit: "add database schema for google sheets tracking"

**Slice 4: Backend Integration Testing**
- a) Test OAuth flow with new scope using Postman/curl
- b) Verify google-sheets-api can list user's sheets
- c) Test CRUD operations with real Google account
- d) Expected: All API endpoints work with valid token
- e) Commit: "verify backend google sheets integration"

### Phase 2: Frontend Integration (Slices 5-8)

**Slice 5: Create useGoogleSheets Hook**
- a) Copy `src/hooks/useGoogleDrive.ts` to `useGoogleSheets.ts`
- b) Adapt for Sheets API calls (list, read, write methods)
- c) Add unit tests: `npm test -- useGoogleSheets`
- d) Expected: Hook methods work with mocked API
- e) Commit: "add useGoogleSheets react hook"

**Slice 6: Google Sheets Page UI**
- a) Copy `src/pages/GoogleDrive.tsx` to `GoogleSheets.tsx`
- b) Update for Sheets-specific UI (show sheet names, row counts)
- c) Add routing in `src/App.tsx`
- d) Test: `npm run dev` → navigate to `/google-sheets`
- e) Expected: Page loads, shows auth state
- e) Commit: "add google sheets page with auth ui"

**Slice 7: Sheet Picker Component**
- a) Create `src/components/GoogleSheetsPicker.tsx`
- b) Dropdown component for selecting sheets in AI chat
- c) Integration with AI chat interface
- d) Test: Select sheet → verify context passed to AI
- e) Expected: Sheet selection works in chat
- f) Commit: "add sheet picker for ai chat"

**Slice 8: Frontend Integration Testing**
- a) Test full OAuth flow: connect → list sheets → select → disconnect
- b) Verify sheets display using existing SpreadsheetViewer
- c) Test error states: no sheets, auth failures
- d) Expected: Complete frontend flow works
- e) Commit: "complete frontend google sheets integration"

### Phase 3: AI Tools Integration (Slices 9-12)

**Slice 9: AI Tool Registry Setup**
- a) Add sheets tools to `supabase/functions/ai-query/index.ts`
- b) Implement `listSheets`, `readSheet` tools
- c) Test: Ask AI "List my Google Sheets"
- d) Expected: AI returns user's sheets list
- e) Commit: "add basic ai tools for google sheets"

**Slice 10: Read/Query Operations**
- a) Implement `querySheet`, `analyzeSheet` AI tools
- b) Add natural language filtering capabilities
- c) Test: "Show me data from Budget sheet where amount > 1000"
- d) Expected: AI returns filtered results
- e) Commit: "add sheet querying ai tools"

**Slice 11: Write Operations**
- a) Implement `writeSheet`, `appendToSheet`, `updateCell` tools
- b) Add data validation and error handling
- c) Test: "Add new expense: Office supplies, $150 to Budget sheet"
- d) Expected: Data appears in Google Sheet
- e) Commit: "add sheet writing ai tools"

**Slice 12: Create Sheet Operation**
- a) Implement `createSheet` AI tool with header support
- b) Add template generation capabilities
- c) Test: "Create a new project tracker with columns: Task, Owner, Due Date"
- d) Expected: New sheet created in Google Drive
- e) Commit: "add sheet creation ai tool"

### Phase 4: Polish & Error Handling (Slices 13-15)

**Slice 13: Rate Limiting & Performance**
- a) Add request queuing for Google API rate limits
- b) Implement pagination for large sheets
- c) Add performance monitoring
- d) Test: Rapid-fire requests → verify queuing works
- e) Expected: No rate limit errors
- f) Commit: "add rate limiting and performance optimizations"

**Slice 14: Error Recovery & UX**
- a) Add retry logic for transient failures
- b) Improve error messages for users
- c) Add connection status indicators
- d) Test: Various failure scenarios
- e) Expected: Graceful error handling
- f) Commit: "improve error handling and user experience"

**Slice 15: Documentation & Deployment**
- a) Update README with Sheets integration guide
- b) Add API documentation
- c) Deploy to production environment
- d) Run smoke tests on production
- e) Expected: Feature ready for users
- f) Commit: "complete google sheets integration with docs"

## 7) Git Workflow Rules (Enforced)

### Branch Naming
- Feature branch: `feature/google-sheets-integration`
- Slice branches: `feature/google-sheets-slice-N` (optional for complex slices)

### Commit Cadence
- **Commit after every slice** (15 total commits minimum)
- **Atomic commits**: Each commit represents working state
- **No WIP commits**: Every commit should pass basic tests

### Commit Message Format
```
<type>: <description>

<body describing what changed and why>
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

**Examples:**
- `feat: extend oauth scope for google sheets access`
- `feat: add google-sheets-api edge function with crud operations`
- `test: add integration tests for sheets ai tools`

### Testing After Each Slice
**Targeted Tests (run after each slice):**
```bash
# Frontend changes
npm test -- <changed-file>
npm run lint
npm run build:dev

# Backend changes
supabase functions deploy <function-name> --verify
curl -X POST [function-url] # basic smoke test
```

**Regression Tests (run after every 3-5 slices):**
```bash
npm test
npm run build
npm run dev # manual smoke test
supabase functions deploy --verify-all
```

### Rollback Rules
- **If any slice breaks existing functionality**: Immediately revert or fix before proceeding
- **If tests fail**: Do not proceed to next slice
- **If function deploy fails**: Fix deployment issues before continuing
- **Broken main branch**: Stop all work, fix main first

## 8) Commands (Repo-specific)

### Installation & Setup
```bash
# Install dependencies
npm install

# Start dev server (http://[::]:8080)
npm run dev

# Generate TypeScript types from Supabase
npm run types:generate
```

### Testing Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test -- useGoogleSheets

# Run with watch mode
npm run test -- --watch

# Lint & type checking
npm run lint
npx tsc --noEmit
```

### Build Commands
```bash
# Development build
npm run build:dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Supabase Commands
```bash
# Deploy single function
npx supabase functions deploy google-sheets-api

# Deploy all functions
npx supabase functions deploy

# View function logs
npx supabase functions logs google-sheets-api --follow

# Local Supabase reset
npx supabase db reset --local
```

### API Testing Commands
```bash
# Test authentication
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/google-sheets-api \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'

# Test sheet reading
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/google-sheets-api \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action": "read", "sheet_id": "SHEET_ID", "range": "A1:E10"}'
```

## 9) Observability / Logging

### Required Logs
**Edge Function Logs:**
```typescript
console.log(`[google-sheets-api] ${action} request for user ${user.id}`);
console.log(`[google-sheets-api] Processing sheet ${sheet_id}, range ${range}`);
console.error(`[google-sheets-api] Google API error: ${error.status} - ${error.message}`);
```

**Frontend Logs:**
```typescript
console.log(`[useGoogleSheets] Connected to Google Sheets`);
console.log(`[useGoogleSheets] Loaded ${sheets.length} sheets`);
console.error(`[useGoogleSheets] Authentication failed: ${error.message}`);
```

### Metrics to Track
- **OAuth Success Rate**: % of successful Google auth flows
- **API Response Times**: Sheet read/write operation latency
- **Error Rates**: Rate limit hits, auth failures, API errors
- **Usage Patterns**: Most accessed sheets, common operations

### Verification Commands
```bash
# View function logs
npx supabase functions logs google-sheets-api --follow

# Check browser console during development
# Open Developer Tools → Console tab

# Monitor API responses in Network tab
# Look for google-sheets-api calls and response times
```

### Smoke Test Verification
1. **Auth Flow:** Check console for OAuth token storage success
2. **API Calls:** Verify 200 responses for sheet operations
3. **Error Handling:** Confirm error logs don't contain sensitive data
4. **Performance:** Sheet reads complete within 5s (check Network tab)

## 10) Rollout / Migration Plan

### Feature Flags
**Environment Variables (Supabase Dashboard):**
- `ENABLE_GOOGLE_SHEETS=true` - Master feature toggle
- `GOOGLE_SHEETS_RATE_LIMIT=100` - Requests per 100s per user
- `GOOGLE_SHEETS_MAX_ROWS=1000` - Max rows to process per operation

### Deployment Phases

**Phase A: Backend Only (Week 1)**
- Deploy Edge Functions with feature flag disabled
- Verify function deployment and basic authentication
- Test with internal Google account only
- **Rollback:** Set `ENABLE_GOOGLE_SHEETS=false`

**Phase B: Internal Testing (Week 2)**
- Enable for internal users only (user ID whitelist)
- Test complete OAuth → Read → Write flow
- Monitor performance and error rates
- **Rollback:** Remove user IDs from whitelist

**Phase C: Limited Beta (Week 3)**
- Enable for 10% of users with Google Drive connected
- Monitor usage patterns and error rates
- Collect user feedback
- **Rollback:** Reduce percentage to 0%

**Phase D: Full Rollout (Week 4)**
- Enable for all users
- Monitor system metrics for 48 hours
- **Rollback:** Set percentage back to 10%

### Data Compatibility
**No data migration required** - feature is purely additive:
- Reuses existing `user_google_tokens` table
- OAuth scopes are non-breaking (additive)
- No changes to existing Google Drive functionality

### Rollback Plan
**Immediate Rollback (< 5 minutes):**
1. Set `ENABLE_GOOGLE_SHEETS=false` in Supabase Dashboard
2. Verify feature disappears from UI
3. Monitor for reduced error rates

**Full Rollback (< 30 minutes):**
1. Revert frontend deployment to previous version
2. Remove google-sheets-api Edge Function
3. Revert OAuth scope changes
4. Clear any Google Sheets data from knowledge_documents table

**Rollback Success Criteria:**
- Zero impact on existing Google Drive functionality
- No authentication disruption for existing users
- Clean error handling for users who had Sheets enabled

## 11) Agent Notes (Leave space for recursion)

### Session Log
*(AI agent will fill this during implementation)*
- **2026-01-29 15:30**: PRD created, ready for implementation
- *(future entries will be added by implementing agent)*

### Decisions
*(AI agent will document key decisions made during implementation)*
- **Decision**: TBD
- **Rationale**: TBD
- **Alternatives**: TBD

### Open Questions
*(AI agent will track unresolved items)*
- **Q**: Should we store sheet metadata in database or fetch live each time?
- **A**: TBD
- **Q**: How to handle sheets with 10k+ rows performance-wise?
- **A**: TBD
- **Q**: Should we support collaborative editing conflict resolution?
- **A**: Out of scope for v1

### Regression Checklist
*(AI agent will verify these after major changes)*
- [ ] Existing Google Drive integration still works
- [ ] Document upload/analysis functionality unaffected
- [ ] AI query responses maintain quality
- [ ] Authentication flows remain stable
- [ ] No new security vulnerabilities introduced
- [ ] Performance of existing features maintained
- [ ] UI/UX consistency with existing design system

---

**Total Estimated Effort**: 15 implementation slices across 4 phases
**Success Metrics**: Functional OAuth + CRUD operations + AI integration
**Risk Level**: Medium (leverages existing patterns, well-defined scope)