# Feature Specification: Plan to Timeline

## Overview

Convert user-created project plans into scheduled timeline items, with AI handling intelligent placement while **strictly respecting user-defined durations**.

### Core Principle

> **AI does NOT estimate time. AI only schedules.**
>
> Users know their own pace. When a user says "Phase 1: 1 hour", the system uses 1 hour - not 4 weeks. The AI's role is to find optimal slots, sequence tasks logically, and avoid conflicts.

---

## User Journey

### Step 1: User Creates a Plan

User writes a plan in any format (markdown, document, or structured input):

```markdown
# Launch App Plan

## Phase 1: Setup PWA (1 hour)
- Add manifest.json
- Configure service worker
- Test installation

## Phase 2: Mobile View (3 hours)
- Create MobileTimeline component
- Add swipe gestures
- Test on devices

## Phase 3: Testing (2 hours)
- Cross-browser testing
- Fix bugs
- Deploy
```

### Step 2: User Initiates "Add Plan to Timeline"

User clicks "Schedule Plan" and specifies:
- **Start date**: When to begin (e.g., "Tomorrow")
- **Working hours**: Their available time (e.g., 9am-5pm)
- **Max hours per day**: How much to allocate daily (e.g., 4 hours)

### Step 3: AI Schedules (Does NOT Estimate)

AI reads the plan and:
1. **Extracts tasks with USER-PROVIDED durations**
2. **Sequences tasks** respecting dependencies (Phase 1 before Phase 2)
3. **Places tasks** in available slots across days
4. **Avoids conflicts** with existing calendar items
5. **Shows preview** before applying

### Step 4: User Reviews and Applies

User sees the proposed schedule:
```
Monday Dec 9:
  9:00 AM - 10:00 AM: Phase 1: Setup PWA (1h)
  10:00 AM - 1:00 PM: Phase 2: Mobile View (3h)

Tuesday Dec 10:
  9:00 AM - 11:00 AM: Phase 3: Testing (2h)
```

User can adjust, then clicks "Apply to Timeline".

---

## Plan Format Specification

### Option A: Markdown with Duration Tags

```markdown
# Project Name

## Task Title [duration: 2h]
Description of the task

## Another Task [duration: 45m]
More details

## Sub-project
### Subtask 1 [duration: 30m]
### Subtask 2 [duration: 1h 30m]
```

**Duration formats accepted:**
- `30m` or `30 min` or `30 minutes`
- `2h` or `2 hours` or `2hr`
- `1h 30m` or `1.5h` or `90m`
- `1d` or `1 day` (converts to user's max hours/day)

### Option B: Structured JSON/YAML

```yaml
name: Launch App Plan
tasks:
  - title: Setup PWA
    duration: 60  # minutes
    depends_on: null

  - title: Mobile View
    duration: 180
    depends_on: Setup PWA

  - title: Testing
    duration: 120
    depends_on: Mobile View
```

### Option C: Natural Language (AI Extracts)

```
I need to launch my app. First, I'll spend about an hour setting up the PWA.
Then I need 3 hours for the mobile view. Finally, 2 hours of testing.
```

AI parses this but **only extracts durations the user explicitly stated**. If no duration given, AI asks user to specify (does NOT guess).

---

## Technical Design

### Database Schema

```sql
-- New table for project plans
CREATE TABLE project_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan metadata
  title TEXT NOT NULL,
  description TEXT,
  source_content TEXT,           -- Original markdown/text
  source_type TEXT DEFAULT 'markdown',  -- 'markdown', 'json', 'natural'

  -- Parsed structure (AI extracts, user validates)
  parsed_tasks JSONB NOT NULL DEFAULT '[]',

  -- Scheduling preferences
  target_start_date DATE,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '17:00',
  max_hours_per_day INTEGER DEFAULT 6,
  skip_weekends BOOLEAN DEFAULT true,

  -- State
  status TEXT DEFAULT 'draft',  -- 'draft', 'scheduled', 'in_progress', 'completed'
  scheduled_at TIMESTAMPTZ,

  -- Tracking
  total_duration_minutes INTEGER,  -- Sum of all task durations
  estimated_end_date DATE,         -- Calculated based on constraints

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link plan tasks to timeline items
ALTER TABLE timeline_items ADD COLUMN plan_id UUID REFERENCES project_plans(id);
ALTER TABLE timeline_items ADD COLUMN plan_task_index INTEGER;  -- Which task in plan
```

### Parsed Task Structure

```typescript
interface PlanTask {
  index: number;              // Order in plan
  title: string;              // Task name
  description?: string;       // Optional details
  duration_minutes: number;   // USER-PROVIDED duration
  depends_on?: number[];      // Indices of prerequisite tasks

  // Scheduling (filled by AI)
  scheduled_date?: string;    // YYYY-MM-DD
  scheduled_start?: string;   // HH:MM
  timeline_item_id?: string;  // After applied to timeline

  // User can mark as flexible
  is_flexible: boolean;       // Can be moved if conflicts

  // Metadata
  color?: string;
  layer_id?: string;
}
```

### AI's Role (Scheduling Only)

```typescript
interface SchedulePlanRequest {
  tasks: PlanTask[];              // Tasks with USER durations
  start_date: string;             // When to begin
  working_hours: {
    start: string;                // "09:00"
    end: string;                  // "17:00"
  };
  max_hours_per_day: number;      // e.g., 6
  skip_weekends: boolean;
  existing_items: TimelineItem[]; // Current calendar
}

interface SchedulePlanResponse {
  scheduled_tasks: Array<{
    task_index: number;
    date: string;                 // YYYY-MM-DD
    start_time: string;           // HH:MM
    end_time: string;             // HH:MM (calculated from USER duration)
    reasoning: string;            // Why placed here
  }>;
  total_days: number;
  warnings: string[];             // e.g., "Conflict with meeting on Dec 10"
}
```

### AI Prompt (Scheduling Only)

```typescript
const PLAN_SCHEDULING_PROMPT = `
You are a scheduling assistant. Your job is to place tasks into time slots.

CRITICAL RULES:
1. NEVER change task durations. Use EXACTLY the duration provided.
2. NEVER estimate how long something will take. That's not your job.
3. Only decide WHEN to schedule tasks, not HOW LONG they take.

Given:
- Tasks with their durations (set by user)
- Working hours constraint
- Maximum hours per day
- Existing calendar items

Your job:
- Place tasks in chronological order respecting dependencies
- Avoid conflicts with existing items
- Respect working hours boundaries
- Spread across days if needed (respecting max hours/day)
- Explain why you placed each task where you did

Output format:
{
  "scheduled_tasks": [
    {
      "task_index": 0,
      "date": "2024-12-09",
      "start_time": "09:00",
      "reasoning": "First task, placed at start of working day"
    }
  ],
  "warnings": []
}
`;
```

---

## UI Components

### 1. Plan Creator/Editor

```
┌─────────────────────────────────────────────────────────────┐
│  Create New Plan                                        [X] │
├─────────────────────────────────────────────────────────────┤
│  Plan Title: [Launch App Project          ]                 │
│                                                             │
│  Enter your plan (include durations):                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ## Phase 1: Setup PWA [duration: 1h]                    ││
│  │ - Add manifest.json                                     ││
│  │ - Configure service worker                              ││
│  │                                                         ││
│  │ ## Phase 2: Mobile View [duration: 3h]                  ││
│  │ - Create MobileTimeline component                       ││
│  │ - Add swipe gestures                                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Parse Plan]                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Parsed Tasks Review

```
┌─────────────────────────────────────────────────────────────┐
│  Review Parsed Tasks                                        │
├─────────────────────────────────────────────────────────────┤
│  ✓ Phase 1: Setup PWA                           1h    [Edit]│
│  ✓ Phase 2: Mobile View                         3h    [Edit]│
│  ✓ Phase 3: Testing                             2h    [Edit]│
│  ──────────────────────────────────────────────────────────│
│  Total: 6 hours                                             │
│                                                             │
│  ⚠️ "Deploy to production" has no duration specified        │
│     [Add Duration: _____ minutes]                           │
│                                                             │
│  [Back]                              [Schedule These Tasks] │
└─────────────────────────────────────────────────────────────┘
```

### 3. Scheduling Options

```
┌─────────────────────────────────────────────────────────────┐
│  Schedule Plan                                              │
├─────────────────────────────────────────────────────────────┤
│  Start Date:        [Dec 9, 2024      ] 📅                  │
│                                                             │
│  Working Hours:     [09:00] to [17:00]                      │
│                                                             │
│  Max Hours/Day:     [4    ] hours                           │
│                     (Total: 6h = ~2 days at this pace)      │
│                                                             │
│  ☑ Skip weekends                                            │
│  ☑ Avoid existing meetings                                  │
│  ☐ Allow splitting tasks across days                        │
│                                                             │
│  [Cancel]                              [Generate Schedule]  │
└─────────────────────────────────────────────────────────────┘
```

### 4. Schedule Preview

```
┌─────────────────────────────────────────────────────────────┐
│  Proposed Schedule                                    [Edit]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 Monday, Dec 9                                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 9:00 AM   Phase 1: Setup PWA                      1h   ││
│  │ 10:00 AM  Phase 2: Mobile View (part 1)           3h   ││
│  │ 1:00 PM   [Lunch - existing]                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  📅 Tuesday, Dec 10                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 9:00 AM   Phase 3: Testing                        2h   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ⚠️ Note: Moved Phase 2 earlier to avoid conflict with      │
│     your 2pm meeting on Dec 9                               │
│                                                             │
│  [Back]                              [Apply to Timeline]    │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (3-4 days)

1. **Database migration** - Create `project_plans` table
2. **Plan parser** - Extract tasks and durations from markdown
3. **Scheduling algorithm** - Place tasks in slots (no AI first)

### Phase 2: Basic UI (2-3 days)

1. **PlanCreator component** - Text input for plan
2. **ParsedTasksReview component** - Validate extracted tasks
3. **SchedulePreview component** - Show proposed timeline

### Phase 3: AI Scheduling (2-3 days)

1. **Edge function** - `schedule-plan` for AI scheduling
2. **Conflict detection** - Find overlaps with existing items
3. **Smart placement** - Optimize based on preferences

### Phase 4: Polish (2-3 days)

1. **Edit schedule** - Drag to adjust proposed times
2. **Save as template** - Reuse plan structure
3. **Progress tracking** - Mark plan tasks complete

---

## Key Differentiator

Most tools either:
- Let you manually schedule everything (tedious)
- Have AI estimate everything (unrealistic)

This feature does something different:
- **User provides realistic durations** (they know their pace)
- **AI handles the scheduling puzzle** (optimal placement)
- **Result**: Realistic timelines that actually work

---

## Example: Your Improvement Plan

Taking `TIMELINE_IMPROVEMENT_PLAN.md`:

**Your durations (extracted):**
- Phase 1: Mobile PWA - "4 weeks" → You said "1 hour" → Use 1 hour
- Phase 2: Calendar Sync - 2 weeks → You specify actual hours
- etc.

**You would input:**
```markdown
# Timeline Improvements

## PWA Setup [duration: 1h]
Add manifest and service worker

## Mobile List View [duration: 4h]
Create simplified mobile timeline

## Calendar Export [duration: 3h]
Two-way Google Calendar sync

## Testing [duration: 2h]
Cross-browser and mobile testing
```

**AI schedules (your durations, its placement):**
```
Dec 9:  9:00-10:00  PWA Setup (1h)
        10:00-2:00  Mobile List View (4h)
Dec 10: 9:00-12:00  Calendar Export (3h)
        1:00-3:00   Testing (2h)
```

Total: 10 hours of work, scheduled across 2 days.

---

## Open Questions

1. **How to handle missing durations?**
   - Option A: Require all tasks have durations (validation error)
   - Option B: Ask user to fill in missing ones
   - Option C: Use a default (e.g., 1 hour) with warning

   **Recommendation**: Option B - explicit is better than assumed

2. **How to handle very long tasks?**
   - If task > max_hours_per_day, should it auto-split?
   - Or show warning and let user decide?

   **Recommendation**: Show warning, let user split manually

3. **Should plans be editable after scheduling?**
   - If user changes duration, re-schedule affected tasks?
   - Or just update the single item?

   **Recommendation**: Update single item, offer "re-schedule remaining"

---

## Success Metrics

- Users can schedule a 10-task plan in < 2 minutes
- 90%+ of scheduled tasks keep their original time slots (no need to adjust)
- Zero complaints about "AI gave unrealistic estimates"
