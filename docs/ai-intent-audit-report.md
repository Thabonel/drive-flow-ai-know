# AI INTENT AUDIT REPORT
**AI Query Hub Strategic Analysis**
*Generated: February 25, 2026*

## Executive Summary
Analysis of 72+ Edge Functions reveals a sophisticated AI platform with extensive automation assumptions. The system makes implicit intent decisions at 14 critical interaction points, with 4 high-risk auto-execution patterns that bypass user confirmation.

---

## USER-FACING AI INTERACTIONS INVENTORY

### 1. CONVERSATIONAL CHAT INTERFACE
**Component**: `ConversationChat.tsx` (1,900+ lines)
**Trigger**: Text input in chat interface

**System Assumptions**:
- User wants web search automatically injected for time-sensitive queries
- Interactive options (checkboxes) should appear without being requested
- Task classification accuracy is sufficient for auto-execution
- Conversation context is always relevant for subsequent queries

**Available Context**:
- Full conversation history (unlimited)
- Selected knowledge bases and documents
- User timezone and preferences
- Google Drive/cloud storage (if connected)
- Local document index (if enabled)
- Image OCR results (Claude Vision)

**Missing Intent Data**:
- **Urgency level** - "Schedule meeting" could be urgent or exploratory
- **Scope preference** - User might want draft vs final calendar events
- **Automation tolerance** - Some users prefer manual confirmation
- **Context boundaries** - When to include/exclude certain document types

---

### 2. AUTOMATIC TASK ORCHESTRATION
**Functions**: `agent-translate` → `agent-orchestrator` → sub-agents
**Trigger**: Intent classification detects executable tasks

**System Assumptions**:
- Calendar tasks should execute immediately (`calendar` intent)
- Briefing requests want structured executive format (`briefing` intent)
- Analysis requests mean "analyze recent data" (`analysis` intent)
- Users accept AI-chosen task decomposition without review

**Available Context**:
- User calendar events (Google Calendar API)
- Email history and tasks
- Document content and metadata
- Previous sub-agent execution results
- Timeline structure and preferences

**Missing Intent Data**:
- **Execution timing** - "Schedule meeting" now vs later vs tentative
- **Task granularity** - User preference for detailed vs high-level breakdown
- **Confirmation threshold** - Which task types need explicit approval
- **Rollback expectations** - How to undo automated actions

---

### 3. DOCUMENT INTELLIGENCE SYSTEM
**Components**: Local indexing + cloud sync + AI analysis
**Trigger**: Document upload or query about documents

**System Assumptions**:
- Users want automatic content extraction and summarization
- AI can correctly identify document relevance without guidance
- Privacy-first: local documents preferred over cloud transmission
- Summary length and detail level are appropriate for user needs

**Available Context**:
- Full document text or AI-generated summaries
- File metadata (type, size, creation date, author)
- Knowledge base categorization
- User's document interaction history
- Related document connections (embedding similarity)

**Missing Intent Data**:
- **Query scope** - Search within specific documents vs all documents
- **Detail level** - Summary vs full content vs specific sections
- **Relevance criteria** - What makes a document "relevant" to this user
- **Privacy boundaries** - Which documents should never be AI-processed

---

### 4. WEB SEARCH AUTO-INJECTION
**Function**: `ai-query` with automatic search triggers
**Trigger**: Keywords indicating need for current information

**System Assumptions**:
- Time-sensitive keywords ("current", "latest", "today") = need fresh data
- Product queries automatically warrant price comparison
- Australian users prefer AU-specific retail results
- Search result relevance ranking is acceptable

**Available Context**:
- Query text analysis
- User location/timezone inference
- Search API results (Brave, RapidAPI, Australian retail)
- Previous search patterns

**Missing Intent Data**:
- **Search preference** - Web vs internal documents vs specific sources
- **Freshness requirements** - How "current" is current enough
- **Geographic scope** - Local vs global results preference
- **Verification needs** - When users want multiple sources vs single answers

---

### 5. INTERACTIVE OPTIONS GENERATION
**System**: Automatic checkbox rendering for multi-choice responses
**Trigger**: AI response contains numbered/bulleted lists

**System Assumptions**:
- Lists with 2+ items warrant interactive selection
- Users prefer checkboxes over re-typing their choices
- Multiple selections are usually acceptable
- No confirmation needed before processing selections

**Available Context**:
- AI response content analysis
- Previous user interaction patterns with options
- Conversation context for option relevance

**Missing Intent Data**:
- **Selection type** - Single vs multiple choice preference
- **Option exhaustiveness** - Whether list is complete or just examples
- **Decision timeline** - Immediate selection vs "let me think about it"
- **Option modification** - Can users edit/add to provided options

---

## KEY AUTOMATION FLOWS

### Flow 1: Instant Task Execution
```
User: "Schedule a meeting tomorrow at 2pm with John"
  ↓
AI Intent: calendar_event | auto_execute: true
  ↓
Frontend: Doesn't show "Run as Task" button
  ↓
Backend: calendar-sub-agent immediately invoked
  ↓
Result: Event created (user sees status: "Processing 1 task(s)...")
```

### Flow 2: Interactive Options
```
User: "Which of these marketing strategies should I pursue?"
AI Response: "1. Organic growth  2. Paid ads  3. Influencer partnerships"
  ↓
UI Detection: parseClarifyingOptions() succeeds
  ↓
Frontend: Renders 3 checkboxes automatically
  ↓
User selects → message sent with selections
  ↓
No confirmation step, no "are you sure?"
```

### Flow 3: Web Search Injection
```
User: "What's the current Bitcoin price in Australia?"
  ↓
AI Query Function detects:
  - Keywords: "current", "price"
  - Location: "Australia"
  ↓
AUTOMATICALLY calls: Australian retail search + RapidAPI
  ↓
Results injected into Claude context BEFORE user sees response
  ↓
User sees AI response WITH web search results (didn't request search)
```

### Flow 4: Document Extraction & Scheduling
```
User: AI suggests "You should schedule these meetings from your emails"
  ↓
User clicks "Add to Timeline"
  ↓
extract-timeline-items function runs
  ↓
AI extracts: dates, titles, durations (no user confirmation)
  ↓
Dialog shows extracted items with defaults
  ↓
User clicks "Schedule" → items added to timeline
  ↓
Automatic weekly spacing if no dates extracted
```

---

## INTENT ASSUMPTION CATEGORIES

### Category A: Task Interpretation
- "Create 3 marketing graphics" → Assumes user wants image generation NOW
- "Analyze my sales" → Assumes user means last 30 days, not all-time
- "Brief me" → Assumes user wants structured executive summary format

### Category B: Scope Assumptions
- Document search returns top-5 results (assumes good ranking)
- Daily brief includes "priority meetings" (AI decides priority)
- Calendar event auto-creates with 1-hour default duration
- Task extraction uses 9 AM default start time

### Category C: Preferences Assumed
- Web search freshness: "today" queries get past-day filtering
- Australian users: Retail search favors AU retailers
- Document indexing: Local docs are preferred over cloud (privacy)
- Task decomposition: 3-8 subtasks is "optimal"

### Category D: Automation Assumptions
- Instant tasks (calendar, brief) execute without confirmation
- Sub-agents run until completion or timeout
- Extracted tasks are added to timeline (not just suggested)
- Conversation summarization happens automatically

---

## CRITICAL RISK AREAS

| Risk Area | What System Assumes | What Could Go Wrong |
|-----------|-------------------|---------------------|
| **Auto-Calendar** | "Schedule X" = create immediately | User meant tentative/draft only |
| **Task Extraction** | All mentioned items are tasks | Context-dependent remarks extracted as tasks |
| **Intent Classification** | Single clear intent per message | User asks multi-part question → only one auto-executes |
| **Web Search** | Time-sensitive keywords = need fresh data | User checking historical data interpreted as "current" |
| **Document Ranking** | Top results are most relevant | Search quality assumptions not validated |
| **Sub-agent Scope** | Agent should complete autonomously | Agent makes decisions user would delegate |
| **Decomposition** | 2+ hours justifies auto-breakdown | User might prefer task as-is |

---

## EXPLICIT CONFIRMATIONS THAT EXIST

**User Must Explicitly Approve:**
1. "Run as Task" button in conversation (optional execution)
2. "Add to Timeline" button (optional timeline addition)
3. "Generate AI Plan" button (optional planning)
4. Document upload/connection (explicit action)
5. Knowledge base selection (explicit choice)

**These bypass confirmation:**
1. Auto-executed tasks (calendar, brief, analysis)
2. Clarifying questions (rendered automatically)
3. Web search injection (happens silently)
4. Document parsing (happens automatically)
5. Task extraction (suggested with defaults)

---

## RECOMMENDATIONS

### 1. Implement Intent Confidence Scoring
```typescript
interface IntentConfidence {
  userExplicitness: number     // How clearly user stated intent
  contextRelevance: number     // How well context supports interpretation
  automationRisk: number       // Risk level of automated action
  reversibilityScore: number   // How easily action can be undone
}
```

### 2. Add Missing Intent Data Collection
- **Urgency indicators**: "urgent", "when convenient", "draft"
- **Scope preferences**: "detailed breakdown" vs "keep simple"
- **Automation tolerance**: User setting for confirmation thresholds
- **Context boundaries**: Which docs/sources to include/exclude

### 3. Improve Intent Disambiguation
- Ask clarifying questions when confidence < threshold
- Show preview of interpreted intent before execution
- Allow users to refine intent interpretation
- Learn from user corrections and preferences

### 4. Strengthen Rollback Capabilities
- Undo functionality for all automated actions
- Edit-in-place for generated content
- Version history for AI decisions
- Clear time limits for rollback availability

This audit reveals a system that makes sophisticated assumptions about user intent at every level, with automation happening at points where users may not explicitly expect it. The key is balancing intelligent assistance with user agency and control.