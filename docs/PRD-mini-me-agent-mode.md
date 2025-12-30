# PRD — Mini-Me Agent Mode: Autonomous Personal Chief of Staff

**Status:** Draft
**Created:** 2025-12-31
**Owner:** AI Agent

---

## 1) Context & Goals

### Problem Statement
The current AI assistant in AI Query Hub operates in **reactive "Human Assistant" mode**—users must explicitly prompt it for every action. This creates friction for busy professionals who think in streams of consciousness, not structured prompts. Users need an **autonomous "Mini-Me" agent** that:
- Translates unstructured thoughts/ramblings into actionable tasks
- Orchestrates specialized sub-agents to execute work autonomously
- Maintains persistent memory to avoid "agent amnesia"
- Runs continuously in the background (always-on)
- Provides visual transparency of ongoing work

### Who It's For
- **Power users** who want AI that works alongside them 24/7
- **Executives** who need a digital Chief of Staff
- **Knowledge workers** who think in fragments and need task translation
- **Users** who prefer autonomous execution over reactive Q&A

### Why Now
- 2025+ hardware supports perpetual background agents (efficient chips)
- Model Context Protocol (MCP) enables secure local file access
- Autonomous computer use APIs (Anthropic Computer Use) are mature
- User demand for "always-on" AI assistants is growing
- Competitive landscape (Capsule, Notion AI, etc.) moving toward autonomous agents

### In-Scope Goals
✅ **Mode Toggle**: Switch between "Human Assistant" (reactive) and "Agent Assistant" (autonomous) modes
✅ **Translation Layer**: Convert unstructured user input (voice/text ramblings) into structured task lists
✅ **Task Orchestration Engine**: Farm tasks to specialized sub-agents (calendar, briefing, analysis)
✅ **Persistent Memory System**: External notepad + working memory to solve agent amnesia
✅ **Perpetual Run-Loop**: Always-on background operation (not just request/response)
✅ **MCP Integration**: Secure access to local files via Model Context Protocol
✅ **Autonomous Computer Use**: Screen manipulation, browser automation (where applicable)
✅ **Sub-Agent Spinning**: Dynamically create micro-agents for specific tasks
✅ **Right Pane UI**: Always-visible panel showing agent status and sub-agent activity
✅ **Visual Transparency**: Real-time view of what agents are doing

### Out-of-Scope / Non-Goals
❌ **Full computer automation** (e.g., don't replace OS-level window management)
❌ **Voice-first interface** (can add later, start with text-based translation layer)
❌ **Mobile app support** in v1 (focus on desktop right pane experience)
❌ **Multi-user agent collaboration** (single-user autonomous agent only)
❌ **Agent training/fine-tuning** (use existing Claude models)
❌ **Financial transactions** (agents can't make purchases autonomously)
❌ **Breaking existing Human Assistant mode** (must coexist with new Agent mode)

---

## 2) Current State (Repo-informed)

### Existing Architecture

**Frontend (React + TypeScript + Vite):**
- `src/components/AIAssistantSidebar.tsx` - Current reactive AI sidebar with quick tools
- `src/components/AIQueryInput.tsx` - User query input component
- `src/hooks/useUserSettings.ts` - Manages model preferences (anthropic/openrouter/ollama)
- `src/lib/ai.ts` - Core AI query function (`callLLM`)
- `src/pages/` - Various pages (Dashboard, Timeline, etc.)

**Backend (Supabase Edge Functions):**
- `supabase/functions/ai-query/index.ts` - Main AI query handler (Claude Opus 4.5 primary)
- `supabase/functions/_shared/models.ts` - Centralized model configuration
- Other functions: `claude-document-processor`, `ai-document-analysis`, etc.

**Database (PostgreSQL via Supabase):**
- `user_settings` - Stores `model_preference` (will add `agent_mode` here)
- `tasks` - Task management with priority, tags, planned duration
- `daily_planning_sessions` - Session tracking for planning workflows
- `ai_query_history` - Historical AI interactions
- No current tables for: agent_sessions, agent_memory, sub_agents

**Key Patterns:**
- RLS policies on all tables (user_id enforcement)
- React Query for client-side caching
- Supabase client for database operations
- Edge Functions for serverless AI operations
- localStorage for offline mode and preferences

### Likely Change Areas

**Frontend:**
- `src/components/ai/AgentPanel.tsx` (NEW) - Right pane UI for agent status
- `src/components/ai/AgentModeToggle.tsx` (NEW) - Switch between modes
- `src/components/ai/SubAgentCard.tsx` (NEW) - Visual card for each sub-agent
- `src/hooks/useAgentMode.ts` (NEW) - Agent mode state management
- `src/hooks/useAgentSession.ts` (NEW) - Perpetual session management
- `src/hooks/useSubAgents.ts` (NEW) - Sub-agent orchestration
- `src/App.tsx` - Add right pane layout for agent mode
- `src/pages/Settings.tsx` - Add agent mode toggle UI

**Backend:**
- `supabase/functions/agent-translate/index.ts` (NEW) - Translation layer
- `supabase/functions/agent-orchestrator/index.ts` (NEW) - Task executor
- `supabase/functions/agent-persist/index.ts` (NEW) - Memory persistence
- `supabase/functions/sub-agents/calendar/index.ts` (NEW) - Calendar agent
- `supabase/functions/sub-agents/briefing/index.ts` (NEW) - Briefing agent
- `supabase/functions/sub-agents/analysis/index.ts` (NEW) - Analysis agent

**Database:**
- New migration: `20250101_add_agent_mode.sql`
  - Add `agent_mode` to `user_settings` (boolean, default false)
  - Create `agent_sessions` table (session_id, user_id, started_at, status)
  - Create `agent_memory` table (session_id, memory_type, content, timestamp)
  - Create `sub_agents` table (agent_id, agent_type, status, task_data, parent_session_id)
  - Create `agent_tasks` table (task_id, session_id, original_input, structured_output, status)

### Risks / Unknowns / Assumptions

**RISK:** Perpetual background agent may consume excessive API tokens
- **Mitigation:** Implement idle detection (stop after 30min inactivity), configurable max budget

**RISK:** MCP integration complexity (local file access security)
- **Mitigation:** Start with read-only MCP access, expand to write after v1

**RISK:** Browser automation (autonomous computer use) may be blocked by CSP/CORS
- **Mitigation:** Use Supabase Edge Functions for external interactions, limit client-side automation

**ASSUMPTION:** Users will enable agent mode explicitly (not default)
- **Verification:** Add clear onboarding modal explaining capabilities/limits

**ASSUMPTION:** Users have modern browsers supporting Web Workers for background tasks
- **Verification:** Check browser compatibility, degrade gracefully

**UNKNOWN:** How to handle conflicting sub-agents (e.g., two agents modifying same calendar)
- **Plan:** Implement task queue with mutex locks per resource type

---

## 3) User Stories

**US-1: Mode Toggle**
As a **power user**, I want to **toggle between Human Assistant and Agent Assistant modes** so that I can **choose when I want reactive vs autonomous behavior**.

**US-2: Thought Translation**
As a **busy executive**, I want to **dump unstructured thoughts into the agent** so that **it automatically converts them into actionable tasks without me having to format prompts**.

**US-3: Autonomous Task Execution**
As a **knowledge worker**, I want the **agent to automatically execute tasks in the background** so that **I don't have to manually trigger every step**.

**US-4: Sub-Agent Visibility**
As a **user**, I want to **see real-time status of all sub-agents in a right pane** so that **I know what work is happening and can intervene if needed**.

**US-5: Persistent Memory**
As a **user**, I want the **agent to remember its goals across sessions** so that **it doesn't lose context when I close my browser**.

**US-6: Calendar Integration**
As a **user with a busy schedule**, I want a **Calendar Agent to autonomously schedule/reschedule meetings based on my priorities** so that **my calendar reflects my actual work**.

**US-7: Daily Briefing**
As a **user starting my day**, I want the **Briefing Agent to automatically prepare summaries of upcoming meetings/tasks** so that **I'm always prepared**.

---

## 4) Success Criteria (Verifiable)

### Core Functionality (Must-Have)

✅ **SC-0: Sub-Agent Coordination (Resource Management)**
- Resource locks prevent conflicting operations (max 1 calendar write at a time)
- Priority queue implemented: P0 (user-initiated) > P1 (time-sensitive) > P2 (background)
- Timeout/retry logic per agent type: Calendar (30s, 2 retries), Briefing (60s, 1 retry), Analysis (90s, 0 retries)
- Task queue handles waiting gracefully (no crashes if resource locked)

✅ **SC-1: Mode Toggle Works**
- User can switch between "Human Assistant" and "Agent Assistant" via Settings page
- Mode preference persists in database (`user_settings.agent_mode`)
- UI updates immediately upon mode change (right pane appears/disappears)

✅ **SC-2: Translation Layer Functions**
- User can enter unstructured text (e.g., "need to prep for investor meeting tomorrow and analyze Q4 revenue")
- Agent translates into structured tasks within 5 seconds
- Structured tasks appear in agent memory table with correct fields (title, description, priority)

✅ **SC-3: Task Orchestration Works**
- Agent creates at least 3 sub-agents: Calendar, Briefing, Analysis
- Each sub-agent has distinct task queue
- Sub-agents execute tasks autonomously (without user clicking "run")
- Tasks complete successfully with visible status updates

✅ **SC-4: Persistent Memory**
- Agent writes goals to `agent_memory` table on creation
- Memory persists across browser refresh
- Agent resumes from last checkpoint (doesn't restart from scratch)

✅ **SC-5: Right Pane UI Displays Status**
- Right pane visible when agent mode enabled
- Shows: current session status, active sub-agents (count + names), recent tasks
- Updates in real-time (uses Supabase Realtime subscriptions)
- User can collapse/expand pane

✅ **SC-6: Calendar Agent Works**
- Can read user's calendar events (via Google Calendar integration)
- Can create/update/delete calendar events
- Respects user's working hours and availability
- Logs all actions to agent memory

✅ **SC-7: Briefing Agent Works**
- Generates daily briefing at user-configured time (default 8am)
- Briefing includes: upcoming meetings, pending tasks, deadlines
- Stores briefing in `agent_memory` for retrieval

### Edge Cases (Should Handle)

✅ **SC-8: Handles API Failures Gracefully**
- If Claude API fails, agent retries 3x with exponential backoff
- After retries, agent pauses sub-agent and logs error
- User sees error notification in right pane

✅ **SC-9: Handles Conflicting Sub-Agents**
- If two sub-agents try to modify same resource (e.g., calendar event), second agent waits
- Task queue implements mutex locks per resource
- No race conditions or duplicate calendar events

✅ **SC-10: Handles Idle Sessions**
- If user inactive for 30 minutes, agent enters "standby" mode
- Standby mode stops new task creation, keeps memory alive
- Agent resumes when user returns

### Performance/UX Constraints

✅ **SC-11: Translation Layer < 5s**
- Thought → structured tasks conversion completes in < 5 seconds (95th percentile)

✅ **SC-12: Sub-Agent Spawn < 2s**
- Creating new sub-agent takes < 2 seconds

✅ **SC-13: Right Pane Responsive**
- UI updates within 500ms of sub-agent status change
- No layout shift when pane appears

✅ **SC-14: Token Budget Respected**
- Agent tracks cumulative API token usage per session
- Stops creating new tasks if budget exceeded (configurable, default 100k tokens/day)

✅ **SC-15: Cost Efficiency (Always-On Economics)**
- Idle mode activates after 5 minutes of inactivity (no API calls during idle)
- Wake triggers: User activity OR scheduled task (e.g., 8am briefing)
- Use Claude Haiku (CHEAP model) for "should I act?" decision checks
- Estimated cost < $10/user/month in production
- Cost breakdown logged per session (tokens used by agent type)

### Definition of Done

✅ All 15 success criteria verified via tests or smoke test
✅ No breaking changes to existing Human Assistant mode
✅ Documentation updated (user guide + architecture doc)
✅ Migration scripts run successfully on dev/staging
✅ No TypeScript errors
✅ No console errors in production build

---

## 5) Test Plan (Design BEFORE Build)

### Test Categories

**Unit Tests** (via Vitest):
- `src/hooks/useAgentMode.test.ts` - Mode toggle logic
- `src/hooks/useSubAgents.test.ts` - Sub-agent orchestration
- `src/lib/agentTranslation.test.ts` - Thought translation logic
- `src/lib/taskQueue.test.ts` - Task queue + mutex

**Integration Tests** (via Playwright):
- `tests/agent-mode-toggle.spec.ts` - Mode switching E2E
- `tests/agent-translation.spec.ts` - Unstructured input → structured tasks
- `tests/sub-agent-execution.spec.ts` - Sub-agents complete tasks
- `tests/agent-persistence.spec.ts` - Memory persists across sessions

**E2E Smoke Test**:
- `tests/mini-me-smoke-test.spec.ts` - Full workflow from mode toggle to task completion

### Concrete Test Cases

**TC-1: Mode Toggle (Maps to SC-1)**
- **Setup:** User logged in, on Settings page
- **Action:** Click "Enable Agent Mode" toggle
- **Assert:** `user_settings.agent_mode = true` in database
- **Assert:** Right pane appears with "Agent Mode: Active" header
- **Action:** Toggle off
- **Assert:** `user_settings.agent_mode = false`, right pane disappears

**TC-2: Translation Layer (Maps to SC-2)**
- **Setup:** Agent mode enabled, user in agent input field
- **Action:** Enter "tomorrow 10am meeting with Sarah about Q1 planning, need to analyze revenue trends first"
- **Assert:** Agent creates 2 tasks in `agent_tasks`:
  - Task 1: "Schedule meeting with Sarah - Q1 planning" (Calendar Agent)
  - Task 2: "Analyze Q1 revenue trends" (Analysis Agent)
- **Assert:** Translation completes in < 5s

**TC-3: Sub-Agent Spawning (Maps to SC-3, SC-12)**
- **Setup:** Agent has 2 tasks from TC-2
- **Action:** Agent orchestrator runs (automatic)
- **Assert:** 2 sub-agents created in `sub_agents` table (Calendar, Analysis)
- **Assert:** Each sub-agent has status "active"
- **Assert:** Creation time < 2s per agent

**TC-4: Calendar Agent Execution (Maps to SC-6)**
- **Setup:** Calendar sub-agent active with task "Schedule meeting with Sarah"
- **Mock:** Google Calendar API returns available slots
- **Action:** Sub-agent executes task
- **Assert:** New calendar event created for "tomorrow 10am"
- **Assert:** Event has correct title, attendees (Sarah)
- **Assert:** Action logged in `agent_memory`

**TC-5: Persistent Memory (Maps to SC-4)**
- **Setup:** Agent session with 3 tasks (1 completed, 2 pending)
- **Action:** User closes browser
- **Action:** User opens browser 1 hour later
- **Assert:** Agent resumes session (same session_id)
- **Assert:** Completed task still marked complete
- **Assert:** Pending tasks still in queue

**TC-6: Right Pane Updates (Maps to SC-5, SC-13)**
- **Setup:** Agent mode active with 2 sub-agents running
- **Action:** Sub-agent completes task
- **Assert:** Right pane updates within 500ms (uses Supabase Realtime)
- **Assert:** Completed task shows checkmark icon
- **Assert:** Sub-agent count decrements (2 → 1)

**TC-7: API Failure Retry (Maps to SC-8)**
- **Setup:** Agent trying to call Claude API
- **Mock:** API returns 503 error
- **Action:** Agent retry logic triggers
- **Assert:** Agent retries 3x with backoff (1s, 2s, 4s)
- **Mock:** API succeeds on retry #3
- **Assert:** Task completes successfully

**TC-8: Idle Detection (Maps to SC-10)**
- **Setup:** Agent active with 1 sub-agent running
- **Action:** User inactive for 30 minutes (mock time)
- **Assert:** Agent enters "standby" mode
- **Assert:** Sub-agent pauses (status = "paused")
- **Action:** User clicks anywhere in app
- **Assert:** Agent resumes (status = "active")

**TC-9: Token Budget Enforcement (Maps to SC-14)**
- **Setup:** Agent with token budget = 1000 tokens
- **Mock:** Each task consumes 500 tokens
- **Action:** Agent processes 2 tasks (total 1000 tokens)
- **Action:** User submits 3rd task
- **Assert:** Agent rejects task with message "Daily token budget exceeded"
- **Assert:** Task not added to queue

**TC-10: Conflicting Sub-Agents (Maps to SC-9)**
- **Setup:** 2 Calendar Agents trying to modify same event
- **Action:** Agent 1 locks calendar resource
- **Action:** Agent 2 attempts to modify (should wait)
- **Assert:** Agent 2 waits until Agent 1 releases lock
- **Assert:** No duplicate events created
- **Assert:** Both agents complete successfully (sequential)

### What to Mock vs Integrate

**Mock:**
- External APIs (Google Calendar, Claude API) in unit tests
- Supabase Realtime in unit tests (use fake subscription)
- setTimeout/setInterval for perpetual loop (use fake timers)

**Integrate:**
- Supabase client (real database queries in integration tests)
- React Query (real cache behavior)
- Browser storage (localStorage, IndexedDB)

### Test Data/Fixtures

**Fixtures:**
- `tests/fixtures/sample-thoughts.json` - Unstructured user input examples
- `tests/fixtures/sample-tasks.json` - Expected structured task outputs
- `tests/fixtures/sample-calendar-events.json` - Mock calendar data
- `tests/fixtures/sample-agent-memory.json` - Memory snapshots

**Test Database:**
- Use Supabase local development instance (`npx supabase start`)
- Seed with test user: `test-agent@example.com` / `TestPass123!`
- Reset database before each E2E test run

---

## 6) Implementation Plan (Small Slices)

### Sub-Agent Coordination & Resource Management

Before implementation, understand the coordination rules:

**Resource Locks:**
- **Calendar:** Max 1 write operation at a time (read operations unlimited)
- **Files (via MCP):** Read-only in v1 (no write locks needed)
- **Token Budget:** Shared pool with per-agent quotas (Calendar: 30%, Briefing: 40%, Analysis: 30%)

**Priority Queue (3 Levels):**
- **P0 (User-Initiated):** User explicitly triggers task (e.g., "schedule this now")
- **P1 (Time-Sensitive):** Scheduled tasks with deadlines (e.g., daily briefing at 8am)
- **P2 (Background):** Analysis, proactive insights (runs when idle)

**Timeout/Retry per Agent Type:**
| Agent Type | Timeout | Retries | Retry Delay | Failure Behavior |
|------------|---------|---------|-------------|------------------|
| Calendar   | 30s     | 2       | 1s, 2s      | Notify user, log error |
| Briefing   | 60s     | 1       | 2s          | Skip briefing, retry tomorrow |
| Analysis   | 90s     | 0       | N/A         | Defer to next idle period |

**Conflict Resolution Example:**
1. Calendar Agent starts: "Create meeting with Sarah" (acquires calendar lock)
2. Analysis Agent tries: "Read calendar to analyze utilization" (waits - read is fine)
3. User triggers: "Schedule urgent meeting" (P0 priority - Calendar Agent pauses current task)

---

### Slice 1: Database Schema + User Settings Toggle

**What Changes:**
- Create migration: `supabase/migrations/20250101_add_agent_mode.sql`
- Add `agent_mode BOOLEAN DEFAULT false` to `user_settings`
- Create 4 new tables: `agent_sessions`, `agent_memory`, `sub_agents`, `agent_tasks`

**Tests to Add FIRST:**
- Write migration test: `tests/migrations/agent-mode.test.ts`
- Verify tables created with correct columns
- Verify RLS policies applied

**Commands:**
```bash
# 1. Create migration file
touch supabase/migrations/20250101_add_agent_mode.sql

# 2. Write schema (see Migration SQL below)

# 3. Apply migration locally
npx supabase db reset

# 4. Verify tables exist
npx supabase db dump --data-only | grep "agent_"

# 5. Run migration test
npm test tests/migrations/agent-mode.test.ts
```

**Expected Output:**
- Migration applies without errors
- 4 new tables visible in Supabase Studio
- RLS policies prevent cross-user access

**Commit:** `feat: Add agent mode database schema (Slice 1)`

---

### Slice 2: Frontend Mode Toggle UI

**What Changes:**
- Update `src/hooks/useUserSettings.ts` to include `agentMode` getter/setter
- Create `src/components/ai/AgentModeToggle.tsx` - Switch component
- Add toggle to `src/pages/Settings.tsx`

**Tests to Add FIRST:**
- Write unit test: `tests/hooks/useUserSettings.test.ts`
- Test: Toggle on → `agent_mode = true` saved to database
- Test: Toggle off → `agent_mode = false`

**Commands:**
```bash
# 1. Update useUserSettings hook
# 2. Create AgentModeToggle component
# 3. Add to Settings page
npm run dev
# 4. Manual test: Toggle on/off, verify database update
# 5. Run unit tests
npm test tests/hooks/useUserSettings.test.ts
```

**Expected Output:**
- Toggle visible in Settings page
- Clicking toggle updates database within 1s
- No TypeScript errors

**Commit:** `feat: Add agent mode toggle to Settings (Slice 2)`

---

### Slice 2.5: Approval Gates & Suggest Mode (User Trust/Control)

**What Changes:**
- Add `agent_approval_mode` enum to `user_settings`: 'suggest' | 'auto' (default: 'suggest')
- Create `src/components/ai/ApprovalModal.tsx` - Modal for high-risk action approval
- Define high-risk actions: calendar writes, email sends (future), file deletes (future)
- Update agent orchestrator to check approval mode before executing

**High-Risk Action Flow:**
```typescript
// In agent orchestrator
if (isHighRiskAction(task) && user.approval_mode === 'suggest') {
  // Show approval modal
  const approved = await showApprovalModal({
    agent: task.agent_type,
    action: task.description,
    details: task.task_data
  });

  if (!approved) {
    // Log rejection, agent learns from it
    await logRejection(task.id, 'user_rejected');
    return;
  }
}

// Execute task (auto mode or approved)
await executeTask(task);
```

**Approval Modal UI:**
```
┌─────────────────────────────────────┐
│ 🤖 Agent Approval Required          │
├─────────────────────────────────────┤
│ Calendar Agent wants to:            │
│                                     │
│ "Schedule meeting with Sarah        │
│  tomorrow at 10am (30 minutes)"     │
│                                     │
│ Details:                            │
│ • Attendees: sarah@example.com      │
│ • Conflict: None                    │
│ • Reason: User request              │
│                                     │
│ ☐ Always approve calendar events    │
│                                     │
│ [Reject]           [Approve] ✓      │
└─────────────────────────────────────┘
```

**Tests to Add FIRST:**
- Write unit test: `tests/approval-gates.test.ts`
- Test: High-risk action in 'suggest' mode → modal appears
- Test: User approves → task executes
- Test: User rejects → task cancelled, logged
- Test: 'auto' mode → no modal, immediate execution

**Commands:**
```bash
# 1. Add approval_mode column to user_settings
# 2. Create ApprovalModal component
# 3. Update orchestrator to check approval
npm run dev
# 4. Test: Enable agent mode, trigger calendar task
# 5. Verify modal appears before execution
npm test tests/approval-gates.test.ts
```

**Expected Output:**
- New column in database: `approval_mode TEXT DEFAULT 'suggest'`
- Modal appears for high-risk actions in suggest mode
- User can approve/reject with one click
- "Always approve" checkbox updates user preference

**Commit:** `feat: Add approval gates and suggest mode for user control (Slice 2.5)`

---

### Slice 3: Right Pane UI Layout (No Backend Logic)

**What Changes:**
- Create `src/components/ai/AgentPanel.tsx` - Right pane container
- Update `src/App.tsx` to conditionally render right pane if agent mode enabled
- Add Tailwind classes for pane width (320px fixed, collapsible)

**Tests to Add FIRST:**
- Write integration test: `tests/agent-panel-ui.spec.ts`
- Test: Agent mode on → pane visible
- Test: Agent mode off → pane hidden
- Test: Collapse/expand button works

**Commands:**
```bash
# 1. Create AgentPanel component (static content for now)
# 2. Update App.tsx layout
npm run dev
# 3. Enable agent mode via Settings
# 4. Verify right pane appears
npm test tests/agent-panel-ui.spec.ts
```

**Expected Output:**
- Right pane visible when agent mode on
- Pane contains: "Agent Mode: Active" header, placeholder content
- Pane width = 320px, doesn't shift main content

**Commit:** `feat: Add agent right pane UI layout (Slice 3)`

---

### Slice 4: Translation Layer Edge Function

**What Changes:**
- Create `supabase/functions/agent-translate/index.ts`
- Accept: `{ unstructured_input: string, user_id: string }`
- Return: `{ tasks: Array<{ title, description, agent_type, priority }> }`
- Use Claude Opus 4.5 with structured output prompt

**Tests to Add FIRST:**
- Write E2E test: `tests/agent-translation.spec.ts`
- Input: "tomorrow 10am meet Sarah, analyze Q1 revenue"
- Expected output: 2 tasks (calendar + analysis)

**Commands:**
```bash
# 1. Create Edge Function
mkdir -p supabase/functions/agent-translate
touch supabase/functions/agent-translate/index.ts

# 2. Implement translation logic (see code below)

# 3. Deploy locally
npx supabase functions serve agent-translate

# 4. Test via curl
curl -X POST http://localhost:54321/functions/v1/agent-translate \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"unstructured_input": "tomorrow 10am meet Sarah"}'

# 5. Run E2E test
npm test tests/agent-translation.spec.ts
```

**Expected Output:**
- Function returns structured tasks JSON
- Translation completes in < 5s
- Tasks have correct agent_type assignments

**Commit:** `feat: Implement agent translation layer (Slice 4)`

---

### Slice 5: Agent Session Management (Backend)

**What Changes:**
- Create `src/hooks/useAgentSession.ts`
- On agent mode enable → create `agent_sessions` row
- Implement heartbeat (POST to `/agent-persist` every 30s to update `last_active_at`)
- On browser close → mark session as "paused"

**Tests to Add FIRST:**
- Write unit test: `tests/hooks/useAgentSession.test.ts`
- Test: Session created when mode toggled on
- Test: Heartbeat updates `last_active_at` every 30s
- Test: Session paused on unmount

**Commands:**
```bash
# 1. Create useAgentSession hook
# 2. Add to AgentPanel component
npm run dev
# 3. Enable agent mode, verify session created in database
# 4. Wait 30s, verify heartbeat updates timestamp
npm test tests/hooks/useAgentSession.test.ts
```

**Expected Output:**
- New row in `agent_sessions` table when mode enabled
- `last_active_at` updates every 30s
- Session marked "paused" on browser close

**Commit:** `feat: Add agent session management (Slice 5)`

---

### Slice 6: Sub-Agent Orchestrator (Basic)

**What Changes:**
- Create `supabase/functions/agent-orchestrator/index.ts`
- Read pending tasks from `agent_tasks`
- For each task, create sub-agent row in `sub_agents` table
- Assign task to appropriate agent type (calendar/briefing/analysis)

**Tests to Add FIRST:**
- Write integration test: `tests/sub-agent-orchestrator.spec.ts`
- Setup: 2 pending tasks in database
- Action: Call orchestrator
- Assert: 2 sub-agents created

**Commands:**
```bash
# 1. Create orchestrator function
# 2. Deploy locally
npx supabase functions serve agent-orchestrator

# 3. Insert test tasks via SQL
# 4. Call orchestrator
curl -X POST http://localhost:54321/functions/v1/agent-orchestrator

# 5. Verify sub-agents created
npm test tests/sub-agent-orchestrator.spec.ts
```

**Expected Output:**
- Sub-agents created for each task
- Agent types correctly assigned
- Sub-agents have status "pending"

**Commit:** `feat: Implement basic sub-agent orchestrator (Slice 6)`

---

### Slice 7: Calendar Sub-Agent (Read-Only)

**What Changes:**
- Create `supabase/functions/sub-agents/calendar/index.ts`
- Read user's Google Calendar events (use existing `useGoogleCalendar` hook patterns)
- Store events in `agent_memory` for context

**Tests to Add FIRST:**
- Write integration test: `tests/calendar-agent.spec.ts`
- Mock: Google Calendar API returns 3 events
- Action: Calendar agent executes
- Assert: 3 events stored in `agent_memory`

**Commands:**
```bash
# 1. Create calendar agent function
# 2. Deploy locally
npx supabase functions serve

# 3. Test with mock calendar data
npm test tests/calendar-agent.spec.ts
```

**Expected Output:**
- Agent reads calendar events successfully
- Events stored in memory with correct schema
- No errors if calendar API fails (graceful fallback)

**Commit:** `feat: Add calendar sub-agent (read-only) (Slice 7)`

---

### Slice 8: Calendar Sub-Agent (Write - Create Events)

**What Changes:**
- Extend calendar agent to create events via Google Calendar API
- Implement task: "Schedule meeting with [person] at [time]"
- Validate time slot availability before creating event

**Tests to Add FIRST:**
- Write integration test: `tests/calendar-agent-create.spec.ts`
- Setup: Task "Schedule meeting with Sarah tomorrow 10am"
- Mock: Calendar API confirms slot available
- Action: Agent executes
- Assert: Event created in calendar

**Commands:**
```bash
# 1. Update calendar agent function
# 2. Test locally with mock API
npm test tests/calendar-agent-create.spec.ts
```

**Expected Output:**
- Event created with correct title, time, attendees
- Action logged in `agent_memory`
- Error handling if slot unavailable

**Commit:** `feat: Calendar agent can create events (Slice 8)`

---

### Slice 9: Briefing Sub-Agent

**What Changes:**
- Create `supabase/functions/sub-agents/briefing/index.ts`
- Generate daily briefing at 8am (configurable)
- Include: upcoming meetings (from calendar), pending tasks (from `tasks`), deadlines
- Use Claude to summarize into 3-5 bullet points

**Tests to Add FIRST:**
- Write integration test: `tests/briefing-agent.spec.ts`
- Setup: 2 meetings today, 3 pending tasks
- Action: Briefing agent runs
- Assert: Briefing generated with 5 bullet points
- Assert: Briefing stored in `agent_memory`

**Commands:**
```bash
# 1. Create briefing agent function
# 2. Test with sample data
npm test tests/briefing-agent.spec.ts
```

**Expected Output:**
- Briefing generated in < 10s
- Contains accurate meeting/task info
- Formatted as markdown list

**Commit:** `feat: Add briefing sub-agent (Slice 9)`

---

### Slice 10: Analysis Sub-Agent (Basic)

**What Changes:**
- Create `supabase/functions/sub-agents/analysis/index.ts`
- Handle task: "Analyze [metric] for [time period]"
- Query relevant data from database (tasks, revenue, etc.)
- Use Claude to generate insights

**Tests to Add FIRST:**
- Write integration test: `tests/analysis-agent.spec.ts`
- Setup: Task "Analyze task completion rate for December"
- Mock: Database returns 20 tasks (15 completed, 5 pending)
- Action: Agent executes
- Assert: Insight "75% completion rate, recommend prioritizing 5 pending tasks"

**Commands:**
```bash
# 1. Create analysis agent function
# 2. Test with sample data
npm test tests/analysis-agent.spec.ts
```

**Expected Output:**
- Analysis completes in < 15s
- Insights accurate based on data
- Stored in `agent_memory`

**Commit:** `feat: Add analysis sub-agent (Slice 10)`

---

### Slice 11: Right Pane Real-Time Updates

**What Changes:**
- Update `AgentPanel.tsx` to use Supabase Realtime subscriptions
- Subscribe to `sub_agents` table changes
- Display: sub-agent count, status icons, recent task completions

**Tests to Add FIRST:**
- Write integration test: `tests/agent-panel-realtime.spec.ts`
- Setup: Agent panel visible
- Action: Sub-agent status changes (pending → active → completed)
- Assert: UI updates within 500ms

**Commands:**
```bash
# 1. Add Realtime subscription to AgentPanel
# 2. Test locally
npm run dev
# 3. Manually change sub-agent status in database
# 4. Verify UI updates
npm test tests/agent-panel-realtime.spec.ts
```

**Expected Output:**
- Panel updates immediately when sub-agent status changes
- No layout shift during updates
- Shows correct sub-agent count

**Commit:** `feat: Add real-time updates to agent panel (Slice 11)`

---

### Slice 12: Persistent Memory Checkpoint/Resume

**What Changes:**
- Update `useAgentSession.ts` to save checkpoint every 5 minutes
- Checkpoint includes: current tasks, sub-agent states, goals
- On session resume, load last checkpoint from `agent_memory`

**Tests to Add FIRST:**
- Write integration test: `tests/agent-persistence.spec.ts`
- Setup: Active session with 3 tasks
- Action: Close browser, reopen 10 minutes later
- Assert: Session resumes from last checkpoint
- Assert: Pending tasks still in queue

**Commands:**
```bash
# 1. Implement checkpoint logic
# 2. Test locally
npm run dev
# 3. Enable agent mode, wait 5 min, close browser
# 4. Reopen, verify session resumed
npm test tests/agent-persistence.spec.ts
```

**Expected Output:**
- Checkpoint saved every 5 minutes
- Session resumes with correct state
- No lost tasks or sub-agents

**Commit:** `feat: Add persistent memory checkpoints (Slice 12)`

---

### Slice 13: Idle Detection & Standby Mode

**What Changes:**
- Add idle detection to `useAgentSession.ts`
- If no user activity for 30 minutes → pause sub-agents, enter standby
- On activity detected → resume sub-agents

**Tests to Add FIRST:**
- Write unit test: `tests/agent-idle-detection.test.ts`
- Mock: User inactive for 30 minutes
- Assert: Agent enters standby mode
- Mock: User clicks anywhere
- Assert: Agent resumes

**Commands:**
```bash
# 1. Implement idle detection
# 2. Use mock timers for testing
npm test tests/agent-idle-detection.test.ts
```

**Expected Output:**
- Agent pauses after 30 min idle
- Agent resumes on user activity
- No tasks lost during standby

**Commit:** `feat: Add idle detection and standby mode (Slice 13)`

---

### Slice 14: Token Budget Enforcement

**What Changes:**
- Add token tracking to `agent_sessions` table (column: `tokens_used`)
- After each AI call, increment `tokens_used`
- If budget exceeded (default 100k/day), reject new tasks

**Tests to Add FIRST:**
- Write unit test: `tests/agent-token-budget.test.ts`
- Setup: Session with 99k tokens used
- Action: Submit task requiring 2k tokens
- Assert: Task rejected with error message

**Commands:**
```bash
# 1. Add token tracking to Edge Functions
# 2. Update orchestrator to check budget
npm test tests/agent-token-budget.test.ts
```

**Expected Output:**
- Token usage tracked accurately
- Budget enforcement prevents runaway costs
- User notified when budget exceeded

**Commit:** `feat: Add token budget enforcement (Slice 14)`

---

### Slice 15: MCP Integration with Fallback Strategy

**What Changes:**
- Install MCP client library: `npm install @modelcontextprotocol/client`
- Create `src/lib/mcpClient.ts` - MCP connection manager with fallback
- Sub-agents can request file contents via MCP (read-only for v1)
- Implement graceful degradation if MCP unavailable

**MCP Fallback Strategy:**
```typescript
// src/lib/mcpClient.ts
export async function getFileContents(path: string): Promise<string> {
  try {
    // Primary: MCP stdio connection
    const mcpClient = await connectMCP();
    return await mcpClient.readFile(path);
  } catch (mcpError) {
    console.warn('MCP unavailable, falling back to manual upload', mcpError);

    // Fallback 1: Show file upload dialog
    try {
      return await showFileUploadDialog({
        message: `Agent needs ${path}. Please upload or paste contents.`,
        acceptedTypes: ['.csv', '.txt', '.json', '.md'],
        maxSize: 10 * 1024 * 1024 // 10MB
      });
    } catch (uploadError) {
      console.error('Manual upload failed', uploadError);

      // Fallback 2: Agent logs limitation, continues without file
      await logAgentEvent({
        type: 'file_access_failed',
        path,
        error: uploadError,
        fallback: 'continuing_without_file'
      });

      throw new Error(`Unable to access ${path}. MCP unavailable and manual upload failed.`);
    }
  }
}
```

**Degraded Mode Behavior:**
- Analysis Agent: Skip file-based analysis, use available data only
- Briefing Agent: Continue without file context
- User notified: "Agent couldn't access local files. Upload manually?"

**Tests to Add FIRST:**
- Write integration test: `tests/mcp-file-access.spec.ts`
- **Test 1:** MCP available → file contents returned
- **Test 2:** MCP unavailable → fallback to manual upload
- **Test 3:** Both fail → agent continues gracefully, logs error
- Assert: Write operations rejected (read-only mode)

**Commands:**
```bash
# 1. Install MCP client
npm install @modelcontextprotocol/client

# 2. Implement MCP client with fallback
# 3. Test with sample file
npm test tests/mcp-file-access.spec.ts

# 4. Test fallback: Kill MCP server, verify manual upload works
# 5. Test degraded mode: Reject upload, verify agent continues
```

**Expected Output:**
- Agents can read local files via MCP (primary)
- Manual upload works if MCP fails (fallback 1)
- Agent continues without file if both fail (fallback 2)
- Write operations blocked (v1 limitation)
- No file path traversal vulnerabilities

**Commit:** `feat: Add MCP integration with fallback strategy (Slice 15)`

---

### Slice 16: Cost Tracking & Idle Mode

**What Changes:**
- Add cost tracking to `agent_sessions` table
- Implement idle detection (5 minutes inactivity)
- Use Claude Haiku for "should I act?" checks (90% cheaper than Opus)
- Add cost dashboard to right pane

**Cost Tracking Schema:**
```sql
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cost_tracking JSONB DEFAULT '{
  "tokens_opus": 0,
  "tokens_sonnet": 0,
  "tokens_haiku": 0,
  "estimated_cost_usd": 0.0,
  "last_cost_update": null
}'::jsonb;
```

**Idle Mode Logic:**
```typescript
// After 5 minutes of no user activity
if (Date.now() - lastUserActivity > 5 * 60 * 1000) {
  await setAgentMode('idle');
  // Stop all background tasks, keep memory alive
  pauseAllSubAgents();
}

// Wake triggers
onUserActivity(() => setAgentMode('active'));
onScheduledTask(() => setAgentMode('active')); // e.g., 8am briefing
```

**Smart Model Selection:**
```typescript
// Use CHEAP model for lightweight checks
const shouldAct = await callLLM({
  model: CLAUDE_MODELS.CHEAP, // Haiku
  prompt: "Should I create a briefing based on these events? Yes/No",
  maxTokens: 10
});

// Use PRIMARY model only for actual work
if (shouldAct === 'Yes') {
  const briefing = await callLLM({
    model: CLAUDE_MODELS.PRIMARY, // Opus
    prompt: "Generate detailed briefing...",
    maxTokens: 2000
  });
}
```

**Tests to Add FIRST:**
- Write unit test: `tests/cost-tracking.test.ts`
- Test: Idle mode activates after 5 min
- Test: Wake on user activity
- Test: Cost tracked per model tier
- Test: Monthly cost < $10/user (simulated 30 days)

**Commands:**
```bash
# 1. Add cost tracking schema
# 2. Implement idle detection
# 3. Add model-tier selection logic
npm test tests/cost-tracking.test.ts
```

**Expected Output:**
- Idle mode reduces API calls to 0 during inactivity
- Wake on user activity or scheduled tasks
- Estimated monthly cost: $5-10/user (not $130/month)
- Cost breakdown visible in right pane

**Commit:** `feat: Add cost tracking and idle mode for economic viability (Slice 16)`

---

### Slice 17: E2E Smoke Test

**What Changes:**
- Create comprehensive E2E test: `tests/mini-me-smoke-test.spec.ts`
- Test full workflow: Enable mode → Enter thought → Translate → Sub-agents execute → View in panel

**Tests to Add FIRST:**
- This IS the test :)

**Commands:**
```bash
# 1. Write comprehensive E2E test
# 2. Run full test suite
npm test tests/mini-me-smoke-test.spec.ts
```

**Expected Output:**
- All 15+ success criteria verified
- Test passes in < 2 minutes
- No errors in console
- Cost under target ($10/user/month simulated)

**Commit:** `test: Add Mini-Me E2E smoke test (Slice 17)`

---

### Slice 18: Documentation & User Guide

**What Changes:**
- Create `docs/MINI_ME_USER_GUIDE.md` - User-facing documentation
- Create `docs/MINI_ME_ARCHITECTURE.md` - Technical architecture doc
- Update `CLAUDE.md` with agent mode patterns

**Commands:**
```bash
# 1. Write user guide (420+ lines)
# 2. Write architecture doc (300+ lines)
# 3. Update CLAUDE.md
git add docs/
git commit -m "docs: Add Mini-Me Agent Mode documentation (Slice 17)"
```

**Expected Output:**
- User guide covers: setup, usage, troubleshooting
- Architecture doc covers: data flow, Edge Functions, database schema
- No broken links in docs

**Commit:** `docs: Add Mini-Me Agent Mode documentation (Slice 18)`

---

## 7) Git Workflow Rules (Enforced)

### Branch Naming
- **Feature branch:** `feature/mini-me-agent-mode`
- **Slice branches:** `feature/mini-me-slice-{number}-{name}` (e.g., `feature/mini-me-slice-1-database-schema`)

### Commit Cadence
- **Commit after every slice** (18 total commits expected)
- **Never skip tests** - tests must pass before commit
- **Atomic commits** - each commit fully functional, no partial slices

### Commit Message Format
```
<type>: <description> (Slice <number>)

<optional body>

<optional footer>
```

**Types:** `feat`, `fix`, `test`, `docs`, `refactor`, `chore`

**Examples:**
- `feat: Add agent mode database schema (Slice 1)`
- `test: Add E2E smoke test for agent mode (Slice 16)`
- `docs: Add Mini-Me user guide (Slice 17)`

### After Each Slice

1. **Run targeted tests:**
   ```bash
   npm test tests/{slice-specific-tests}
   ```

2. **Run fast regression subset:**
   ```bash
   npm test tests/smoke-tests/
   ```

3. **Verify no TypeScript errors:**
   ```bash
   npm run lint
   ```

4. **Commit if all green:**
   ```bash
   git add .
   git commit -m "feat: Description (Slice N)"
   ```

### After Every 3-5 Slices

1. **Run full test suite:**
   ```bash
   npm test
   ```

2. **Run build:**
   ```bash
   npm run build
   ```

3. **Verify no console errors:**
   ```bash
   npm run preview
   # Open browser, check console
   ```

### If Change Breaks Prior Feature

1. **Immediately revert commit:**
   ```bash
   git revert HEAD
   ```

2. **Or fix forward:**
   - Identify broken test
   - Fix issue
   - Re-run all tests
   - Commit fix separately

3. **Do NOT proceed to next slice until fixed**

---

## 8) Commands (Repo-specific)

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
# Runs on http://localhost:8080
```

### Unit Tests
```bash
# Not yet configured - will add Vitest in Slice 1
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm test
```

### Integration Tests (Playwright)
```bash
# Already installed
npx playwright test
npx playwright test --headed  # with browser visible
npx playwright test --debug   # with debugger
```

### Lint & Typecheck
```bash
npm run lint
npx tsc --noEmit
```

### Build
```bash
npm run build          # Production build
npm run build:dev      # Development build
```

### Preview Production Build
```bash
npm run preview
# Open http://localhost:4173
```

### Supabase Local Development
```bash
npx supabase start         # Start local Supabase
npx supabase stop          # Stop local Supabase
npx supabase db reset      # Reset database + apply migrations
npx supabase functions serve  # Run Edge Functions locally
```

### Deploy Edge Functions
```bash
npx supabase functions deploy agent-translate
npx supabase functions deploy agent-orchestrator
npx supabase functions deploy sub-agents/calendar
npx supabase functions deploy sub-agents/briefing
npx supabase functions deploy sub-agents/analysis
```

### Database Migrations
```bash
# Create new migration
npx supabase migration new add_agent_mode

# Apply migrations locally
npx supabase db reset

# Apply migrations to production
npx supabase db push
```

### Generate TypeScript Types
```bash
npm run types:generate
# Generates src/integrations/supabase/types.ts
```

---

## 9) Observability / Logging (If Applicable)

### Edge Function Logs
- **View logs in Supabase Dashboard:** Functions → agent-translate → Logs
- **Key log events:**
  - `Translation started: { user_id, input_length }`
  - `Translation completed: { task_count, duration_ms }`
  - `Sub-agent spawned: { agent_type, task_id }`
  - `Sub-agent completed: { agent_id, status, duration_ms }`
  - `Token budget check: { session_id, tokens_used, budget_remaining }`
  - `Error: { error_message, stack_trace }`

### Database Audit Logs
- **Track agent actions in `agent_memory`:**
  - `memory_type = 'action_log'`
  - `content = JSON { action: 'calendar_event_created', details: {...} }`
  - `timestamp = NOW()`

### Frontend Monitoring
- **Console logs for debugging (remove in production):**
  ```typescript
  console.log('[AgentPanel] Sub-agent status changed:', { agent_id, new_status });
  ```

- **Error tracking (optional - add Sentry later):**
  ```typescript
  try {
    await callAgentAPI();
  } catch (error) {
    console.error('[Agent] API call failed:', error);
    // TODO: Send to Sentry
  }
  ```

### Performance Metrics
- **Track in `agent_sessions` table:**
  - `avg_translation_time_ms`
  - `total_tasks_completed`
  - `total_tokens_used`
  - `sub_agent_spawn_time_ms`

### Smoke Test Verification
- **Run smoke test to verify:**
  ```bash
  npm test tests/mini-me-smoke-test.spec.ts
  # Should complete in < 2 minutes
  # Should verify all 14 success criteria
  ```

---

## 10) Rollout / Migration Plan (If Applicable)

### Feature Flag Strategy
- **Use `user_settings.agent_mode` as feature flag**
- **Default:** `false` (all users start in Human Assistant mode)
- **Gradual rollout:**
  1. Week 1: Internal testing only (dev team accounts)
  2. Week 2: Beta testers (10-20 power users)
  3. Week 3: Public opt-in (all users can enable via Settings)

### Database Migration (Zero Downtime)
1. **Create new tables** (Slice 1 migration)
   - No impact on existing users (new tables only)
2. **Add `agent_mode` column to `user_settings`**
   - Default `false` prevents any user from accidentally entering agent mode
3. **Deploy Edge Functions**
   - Deploy with `--no-verify-jwt` for testing, then remove flag
4. **Enable for internal team:**
   ```sql
   UPDATE user_settings SET agent_mode = true WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@aiqueryhub.com');
   ```

### Data Compatibility
- **No breaking changes to existing data:**
  - `tasks` table unchanged (agent can read/write existing tasks)
  - `ai_query_history` unchanged (agent queries logged separately)
  - `user_settings` backward compatible (new column with default)

### Safe Rollout Steps
1. **Deploy migration to staging:**
   ```bash
   npx supabase db push --project-ref staging-project-id
   ```

2. **Deploy Edge Functions to staging:**
   ```bash
   npx supabase functions deploy --project-ref staging-project-id
   ```

3. **Run smoke test on staging:**
   ```bash
   TEST_ENV=staging npm test tests/mini-me-smoke-test.spec.ts
   ```

4. **If smoke test passes, deploy to production:**
   ```bash
   npx supabase db push
   npx supabase functions deploy
   ```

5. **Monitor logs for errors:**
   ```bash
   npx supabase functions logs agent-orchestrator --tail
   ```

### Rollback Plan
- **If critical bug found:**
  1. **Disable agent mode for all users:**
     ```sql
     UPDATE user_settings SET agent_mode = false WHERE agent_mode = true;
     ```
  2. **Revert Edge Function deployments:**
     ```bash
     # Revert to previous version
     npx supabase functions deploy agent-orchestrator@{previous-version}
     ```
  3. **Investigate issue in staging**
  4. **Fix + redeploy when ready**

- **If database migration fails:**
  1. **Revert migration:**
     ```sql
     DROP TABLE IF EXISTS agent_sessions, agent_memory, sub_agents, agent_tasks;
     ALTER TABLE user_settings DROP COLUMN agent_mode, DROP COLUMN approval_mode;
     ```
  2. **Restore from backup if needed:**
     ```bash
     npx supabase db restore --project-ref prod-id --backup-id {backup-id}
     ```

- **If costs exceed targets ($10/user/month):**
  1. **Force all users to idle mode:**
     ```sql
     UPDATE agent_sessions SET status = 'paused' WHERE status = 'active';
     ```
  2. **Reduce token budgets:**
     ```sql
     -- Lower daily budget from 100k to 50k tokens
     UPDATE agent_sessions SET tokens_budget = 50000;
     ```
  3. **Analyze cost drivers, optimize prompts**
  4. **Re-enable gradually once optimized**

---

## 11) Agent Notes (Leave Space for Recursion)

### Session Log
*Agent will fill this during implementation:*

```
[2025-12-31 10:00] Slice 1 started: Database schema creation
[2025-12-31 10:15] Slice 1 completed: Migration applied successfully
[2025-12-31 10:20] Slice 2 started: Frontend mode toggle
...
```

### Decisions
*Agent will document key technical decisions:*

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Use `agent_sessions` table for state | Persistent across browser refresh, survives crashes | localStorage (loses state on browser data clear), IndexedDB (more complex) |
| Perpetual loop via Web Worker | Doesn't block main thread, can run in background | setInterval (blocks main thread), Service Worker (overkill for this use case) |
| MCP read-only in v1 | Security risk with write access, read is sufficient for most use cases | Full read/write (added in v2), no file access (limits analysis agent) |

### Open Questions
*Agent will track unresolved items:*

- [ ] How to handle sub-agent conflicts when modifying same resource? (Resolved in Slice 6: mutex locks)
- [ ] Should briefing agent run at fixed time (8am) or on-demand? (Decision: configurable via user settings)
- [ ] MCP server URL for local file access? (Decision: use MCP stdio connection, not HTTP)

### Regression Checklist
*Agent will list tests to re-run after changes:*

- [ ] Human Assistant mode still works (no breaking changes)
- [ ] AI query functionality intact
- [ ] Calendar integration still functional
- [ ] Task management not affected
- [ ] User settings saving/loading works
- [ ] Authentication still secure (RLS policies enforced)

---

## Appendix: Migration SQL

**File:** `supabase/migrations/20250101_add_agent_mode.sql`

```sql
-- Add agent_mode to user_settings
ALTER TABLE user_settings
ADD COLUMN agent_mode BOOLEAN DEFAULT false NOT NULL;

-- Create agent_sessions table
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session lifecycle
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),

  -- Session metrics
  tokens_used INTEGER DEFAULT 0 NOT NULL,
  tasks_completed INTEGER DEFAULT 0 NOT NULL,
  sub_agents_spawned INTEGER DEFAULT 0 NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create agent_memory table (external notepad)
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Memory content
  memory_type TEXT NOT NULL CHECK (memory_type IN ('goal', 'checkpoint', 'action_log', 'briefing', 'insight')),
  content JSONB NOT NULL,

  -- Metadata
  importance INTEGER DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create sub_agents table
CREATE TABLE sub_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Agent details
  agent_type TEXT NOT NULL CHECK (agent_type IN ('calendar', 'briefing', 'analysis')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'failed')),

  -- Task data
  task_data JSONB NOT NULL,
  result_data JSONB,
  error_message TEXT,

  -- Metrics
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create agent_tasks table
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Task details
  original_input TEXT NOT NULL,
  structured_output JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed')),

  -- Assignment
  assigned_agent_id UUID REFERENCES sub_agents(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can manage their own agent sessions"
ON agent_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent memory"
ON agent_memory FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sub-agents"
ON sub_agents FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent tasks"
ON agent_tasks FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX idx_agent_memory_session_id ON agent_memory(session_id);
CREATE INDEX idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX idx_sub_agents_session_id ON sub_agents(session_id);
CREATE INDEX idx_sub_agents_status ON sub_agents(status);
CREATE INDEX idx_agent_tasks_session_id ON agent_tasks(session_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);

-- Triggers for updated_at
CREATE TRIGGER update_agent_sessions_updated_at
BEFORE UPDATE ON agent_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_agents_updated_at
BEFORE UPDATE ON sub_agents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tasks_updated_at
BEFORE UPDATE ON agent_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## Appendix: Sample Translation Layer Prompt

**Edge Function:** `supabase/functions/agent-translate/index.ts`

**Prompt Template:**
```typescript
const TRANSLATION_PROMPT = `You are a Personal Chief of Staff assistant. Your job is to translate unstructured thoughts into structured, actionable tasks.

User Input (unstructured): "${unstructuredInput}"

Analyze the input and extract discrete tasks. For each task, determine:
1. Title (concise, actionable)
2. Description (detailed, specific)
3. Agent Type (calendar, briefing, or analysis)
4. Priority (1-5, where 5 = urgent)
5. Estimated Duration (minutes)

Return JSON array:
[
  {
    "title": "Schedule meeting with Sarah",
    "description": "Book 30-minute meeting tomorrow at 10am to discuss Q1 planning",
    "agent_type": "calendar",
    "priority": 4,
    "estimated_duration": 30
  },
  {
    "title": "Analyze Q1 revenue trends",
    "description": "Review revenue data for Q1 and identify key trends before meeting",
    "agent_type": "analysis",
    "priority": 3,
    "estimated_duration": 45
  }
]

Guidelines:
- Be specific (include times, names, metrics)
- Prioritize based on urgency + importance
- Break complex tasks into smaller sub-tasks
- Assign appropriate agent types
- If input is unclear, make reasonable assumptions

Output ONLY valid JSON array, no commentary.`;
```

---

## Appendix: UI Wireframe (Right Pane)

```
┌─────────────────────────────────────┐
│ AI Query Hub              [Settings]│
├─────────────────────────┬───────────┤
│                         │ AGENT     │
│   Main Content Area     │ MODE      │
│   (Dashboard, Timeline, │ ─────────  │
│    Documents, etc.)     │ Status:   │
│                         │ ● Active  │
│                         │           │
│                         │ Session:  │
│                         │ 2h 14m    │
│                         │           │
│                         │ Sub-Agents│
│                         │ ────────── │
│                         │ 📅 Calendar│
│                         │    ✓ Active│
│                         │    2 tasks │
│                         │           │
│                         │ 📊 Analysis│
│                         │    ⏳ Running│
│                         │    1 task  │
│                         │           │
│                         │ 📝 Briefing│
│                         │    ○ Idle  │
│                         │    0 tasks │
│                         │           │
│                         │ Recent:   │
│                         │ ────────── │
│                         │ ✓ Meeting │
│                         │   scheduled│
│                         │   (2m ago) │
│                         │           │
│                         │ ✓ Briefing│
│                         │   generated│
│                         │   (15m ago)│
│                         │           │
│                         │ [Collapse]│
└─────────────────────────┴───────────┘
```

---

**End of PRD**

**Next Steps:**
1. Review PRD with stakeholders
2. Approve PRD before implementation
3. Create feature branch: `feature/mini-me-agent-mode`
4. Begin Slice 1: Database schema migration
