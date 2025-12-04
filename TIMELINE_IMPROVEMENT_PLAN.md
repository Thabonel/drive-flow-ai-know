# Timeline Manager Improvement Plan

## Overview

This plan addresses the critical shortcomings identified in the competitive analysis, prioritized by impact on user adoption and retention.

**Timeline:** 12-16 weeks for core improvements
**Goal:** Achieve feature parity with Sunsama while maintaining unique differentiators

---

## Phase 1: Mobile Experience (Weeks 1-4)
**Priority: CRITICAL**
**Impact: Unlocks 80% more usage occasions**

### 1.1 Progressive Web App (PWA) Setup
**Effort:** 3-4 days

```
Tasks:
- [ ] Add manifest.json with app metadata
- [ ] Configure service worker for offline shell
- [ ] Add install prompts for iOS/Android
- [ ] Configure app icons (192x192, 512x512)
- [ ] Set up push notification infrastructure
```

**Files to create/modify:**
- `public/manifest.json`
- `src/service-worker.ts`
- `vite.config.ts` (PWA plugin)

### 1.2 Mobile-Optimized Timeline View
**Effort:** 1-2 weeks

The current SVG canvas won't work on mobile. Create alternative views:

```
Option A: Simplified List View (Recommended)
- Vertical scrolling list of today's items
- Swipe actions (complete, reschedule, park)
- Tap to expand/edit
- NOW indicator as divider line

Option B: Responsive Canvas
- Detect viewport and switch to touch-optimized canvas
- Pinch-to-zoom
- Long-press for context menu
- Higher touch targets (minimum 44px)
```

**Recommended approach:** Option A for speed, with Option B as future enhancement.

**New components:**
```
src/components/timeline/mobile/
├── MobileTimeline.tsx       # Main mobile view
├── MobileTimelineItem.tsx   # Swipeable item card
├── MobileQuickAdd.tsx       # Floating action button
├── MobileNowDivider.tsx     # Visual NOW separator
└── MobileBottomNav.tsx      # Tab navigation
```

### 1.3 Mobile Planning Flow
**Effort:** 1 week

```
Tasks:
- [ ] Responsive DailyPlanningFlow (already modal, needs touch optimization)
- [ ] Simplified 4-step quick planning as default on mobile
- [ ] Large touch targets for all buttons
- [ ] Swipe between planning steps
- [ ] Mobile-optimized EndOfDayShutdown
```

### 1.4 Offline Support
**Effort:** 3-4 days

```
Tasks:
- [ ] Cache current day's items in IndexedDB
- [ ] Queue mutations when offline
- [ ] Sync queue when connection restored
- [ ] Visual indicator for offline mode
- [ ] Conflict resolution strategy (last-write-wins or merge)
```

**Libraries:** `idb` for IndexedDB, `workbox` for service worker

---

## Phase 2: Two-Way Calendar Sync (Weeks 3-5)
**Priority: HIGH**
**Impact: Eliminates dual-system maintenance**

### 2.1 Export to Google Calendar
**Effort:** 1 week

```
Tasks:
- [ ] Create edge function: calendar-export
- [ ] Map timeline items to Google Calendar events
- [ ] Handle create/update/delete sync
- [ ] Store Google event ID on timeline_items table
- [ ] Sync on item change (debounced)
```

**Database changes:**
```sql
ALTER TABLE timeline_items ADD COLUMN google_event_id TEXT;
ALTER TABLE timeline_items ADD COLUMN sync_direction TEXT DEFAULT 'both';
-- 'import_only', 'export_only', 'both', 'none'
```

**Edge function:**
```typescript
// supabase/functions/calendar-export/index.ts
// POST: Create/update Google Calendar event from timeline item
// DELETE: Remove Google Calendar event when timeline item deleted
```

### 2.2 Bidirectional Sync Logic
**Effort:** 3-4 days

```
Sync rules:
1. Timeline item created → Create Google event (if export enabled)
2. Timeline item updated → Update Google event
3. Timeline item deleted → Delete Google event
4. Google event created externally → Import as timeline item (if import enabled)
5. Google event updated externally → Update timeline item
6. Conflict: Google event AND timeline item modified → Last-modified wins

Edge cases:
- Recurring events: Sync only instance modifications
- All-day events: Create as full-day timeline items
- Multi-day events: Split into daily items or single spanning item
```

### 2.3 Sync Settings UI
**Effort:** 2 days

```
New settings:
- [ ] Sync direction per calendar (import/export/both/none)
- [ ] Which layers export to which calendar
- [ ] Sync frequency (real-time, hourly, manual)
- [ ] Conflict resolution preference
```

---

## Phase 3: Intelligent Auto-Scheduling (Weeks 5-8)
**Priority: HIGH**
**Impact: Key differentiator of Motion/Reclaim**

### 3.1 Conflict Detection System
**Effort:** 3-4 days

```typescript
// src/lib/conflictDetection.ts

interface Conflict {
  itemA: TimelineItem;
  itemB: TimelineItem;
  overlapMinutes: number;
  type: 'full' | 'partial';
}

function detectConflicts(items: TimelineItem[]): Conflict[];
function findAvailableSlots(date: Date, duration: number, items: TimelineItem[]): TimeSlot[];
```

### 3.2 Auto-Reschedule Engine
**Effort:** 1-2 weeks

```
When conflict detected:
1. Identify which item is "flexible" (is_flexible: true)
2. Find next available slot that fits duration
3. Propose reschedule with visual preview
4. User confirms or adjusts

Auto-reschedule triggers:
- Calendar event imported that conflicts
- Item manually moved causing conflict
- Meeting extended/added
```

**New component:**
```
src/components/timeline/ConflictResolver.tsx
- Shows conflict visually
- Suggests resolution options
- One-click accept
- Manual adjustment option
```

### 3.3 Smart Scheduling Preferences
**Effort:** 3-4 days

```
User preferences:
- [ ] Preferred working hours (e.g., 9am-6pm)
- [ ] Focus time blocks (no meetings)
- [ ] Buffer between tasks (5-15 min)
- [ ] Maximum meeting density per day
- [ ] Task priority affects scheduling order
```

**Database:**
```sql
ALTER TABLE timeline_settings ADD COLUMN scheduling_preferences JSONB DEFAULT '{
  "work_hours_start": "09:00",
  "work_hours_end": "18:00",
  "buffer_minutes": 5,
  "max_meeting_hours": 6,
  "respect_focus_blocks": true
}';
```

### 3.4 AI-Powered Optimal Scheduling
**Effort:** 1 week

```
Enhance existing AI planning:
- [ ] Auto-invoke when day has unscheduled tasks
- [ ] Consider energy levels (complex tasks in morning)
- [ ] Learn from user's reschedule patterns
- [ ] Batch similar tasks together
- [ ] Respect deadlines when prioritizing
```

---

## Phase 4: Proactive AI Features (Weeks 7-9)
**Priority: MEDIUM-HIGH**
**Impact: Reduces friction, increases feature discovery**

### 4.1 Inline Time Estimates
**Effort:** 3-4 days

```
Current: User clicks "Get AI Estimate" button
Target: Estimate appears automatically as user types title

Implementation:
- Debounced API call (500ms after typing stops)
- Show estimate as subtle suggestion below input
- One-click to accept
- Learn from actual vs estimated over time
```

### 4.2 Automatic Daily Plan Generation
**Effort:** 3-4 days

```
Trigger: User opens Timeline page after planning_time
If no planning session today:
  1. Auto-fetch unscheduled tasks
  2. Generate optimized schedule
  3. Show preview modal: "Here's your suggested day"
  4. One-click to apply or "Let me plan manually"
```

### 4.3 Smart Notifications
**Effort:** 1 week

```
Notification types:
- [ ] "Time to plan your day" (at planning_time)
- [ ] "You have 3 logjammed items" (afternoon check)
- [ ] "Time for shutdown ritual" (at shutdown_time)
- [ ] "Task X is about to start" (5 min before)
- [ ] "You're overcommitted today" (workload > 8h)

Delivery:
- Push notifications (PWA)
- Email digest (optional)
- In-app toast
```

### 4.4 AI Assistant Integration
**Effort:** 3-4 days

```
Add quick commands:
- "Reschedule my afternoon" → AI reorganizes
- "I have a 2-hour meeting at 3pm" → Adds + resolves conflicts
- "What should I work on now?" → Suggests based on priority + energy
- "Clear my tomorrow" → Parks all items for tomorrow
```

---

## Phase 5: Advanced Recurrence (Weeks 8-10)
**Priority: MEDIUM**
**Impact: Power user retention**

### 5.1 RRULE Support
**Effort:** 1 week

```
Install: npm install rrule

New recurrence patterns:
- Every N days/weeks/months
- Specific days of week
- Nth weekday of month (e.g., "2nd Tuesday")
- End after N occurrences or by date
- Exceptions (skip specific dates)
```

**Database:**
```sql
ALTER TABLE timeline_items ADD COLUMN recurrence_rule TEXT;
-- Stores RRULE string: "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20251231"
```

### 5.2 Recurrence UI
**Effort:** 3-4 days

```
New component: RecurrenceEditor.tsx
- Frequency dropdown (daily, weekly, monthly, yearly)
- Interval input (every N...)
- Day picker for weekly
- Month day picker for monthly
- End condition (never, after N, by date)
- Preview of next 5 occurrences
```

### 5.3 Instance vs Series Editing
**Effort:** 3-4 days

```
When editing recurring item, ask:
- "Only this occurrence"
- "This and all future occurrences"
- "All occurrences"

Handle:
- Exception dates storage
- Series rule modification
- Instance overrides
```

---

## Phase 6: Team Collaboration (Weeks 10-14)
**Priority: MEDIUM**
**Impact: Enables team adoption, viral growth**

### 6.1 Team Infrastructure
**Effort:** 1 week

```
Database tables needed:
- teams (id, name, owner_id, settings)
- team_members (team_id, user_id, role, invited_at)
- team_invites (id, team_id, email, token, expires_at)
```

### 6.2 Team Timeline View
**Effort:** 1-2 weeks

```
Features:
- [ ] See team members' availability (busy/free)
- [ ] Shared team layer for collaborative tasks
- [ ] Assign tasks to team members
- [ ] View assigned tasks on your timeline
- [ ] Team workload overview
```

### 6.3 Team Planning
**Effort:** 1 week

```
Features:
- [ ] Team stand-up view (what everyone is working on today)
- [ ] Assign tasks during planning
- [ ] Shared templates for team
- [ ] Team-wide logjam visibility
```

---

## Phase 7: Integrations (Weeks 12-16)
**Priority: LOWER**
**Impact: Reduces friction for existing tool users**

### 7.1 Task Import
**Effort:** 2-3 days each

```
Priority order:
1. Todoist import (large user base)
2. Asana import (team use case)
3. Notion import (knowledge workers)
4. Linear import (developers)
```

### 7.2 API Access
**Effort:** 1 week

```
Public API endpoints:
- GET /api/items - List timeline items
- POST /api/items - Create item
- PATCH /api/items/:id - Update item
- DELETE /api/items/:id - Delete item
- GET /api/today - Today's schedule
- POST /api/quick-add - Natural language task creation
```

### 7.3 Webhook/Zapier
**Effort:** 1 week

```
Events:
- item.created
- item.completed
- item.logjammed
- planning.completed
- shutdown.completed

Zapier integration allows:
- Email → Task
- Slack message → Task
- Calendar event → Auto-import
```

---

## Implementation Priority Matrix

| Phase | Effort | Impact | Priority Score | Start Week |
|-------|--------|--------|----------------|------------|
| 1. Mobile PWA | 4 weeks | Critical | 10/10 | Week 1 |
| 2. Calendar Sync | 2 weeks | High | 8/10 | Week 3 |
| 3. Auto-Schedule | 3 weeks | High | 8/10 | Week 5 |
| 4. Proactive AI | 2 weeks | Medium-High | 7/10 | Week 7 |
| 5. RRULE | 2 weeks | Medium | 5/10 | Week 8 |
| 6. Teams | 4 weeks | Medium | 5/10 | Week 10 |
| 7. Integrations | 3 weeks | Lower | 4/10 | Week 12 |

---

## Quick Wins (Can Do This Week)

These require minimal effort but improve experience:

### 1. PWA Manifest (2 hours)
```json
// public/manifest.json
{
  "name": "AI Query Hub Timeline",
  "short_name": "Timeline",
  "start_url": "/timeline",
  "display": "standalone",
  "theme_color": "#0A2342",
  "background_color": "#ffffff",
  "icons": [...]
}
```

### 2. Add to Home Screen Prompt (1 hour)
```typescript
// Detect if installable, show prompt
if ('serviceWorker' in navigator) {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Show install button
  });
}
```

### 3. Viewport Meta for Mobile (5 minutes)
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

### 4. Auto-Invoke AI Estimate (3 hours)
```typescript
// In AddItemForm, after title input blur:
useEffect(() => {
  if (title.length > 3 && !duration) {
    debouncedFetchEstimate(title);
  }
}, [title]);
```

### 5. Planning Time Notification (2 hours)
```typescript
// Check on Timeline mount
if (isPastPlanningTime && !todaySession) {
  showPlanningPrompt(); // Already exists, just auto-trigger
}
```

---

## Success Metrics

### Phase 1 Success (Mobile)
- [ ] PWA installable on iOS/Android
- [ ] Mobile daily active users > 30% of total
- [ ] Task completion rate same on mobile vs desktop

### Phase 2 Success (Calendar)
- [ ] 80% of users enable two-way sync
- [ ] Zero "forgot to check timeline" complaints
- [ ] Calendar shows accurate availability

### Phase 3 Success (Auto-Schedule)
- [ ] <5% of conflicts require manual resolution
- [ ] Time-to-plan reduced by 50%
- [ ] User satisfaction score > 4/5

### Overall Target
- Feature parity with Sunsama: 12 weeks
- Competitive with Motion (auto-scheduling): 16 weeks
- Mobile experience on par with competitors: 8 weeks

---

## Technical Debt to Address

While implementing new features, fix:

1. **Bundle size** (2MB+ is too large)
   - Code split by route
   - Lazy load timeline components
   - Tree shake unused UI components

2. **Real-time sync reliability**
   - Add retry logic for failed syncs
   - Show sync status indicator
   - Handle reconnection gracefully

3. **Performance at scale**
   - Virtualize item rendering for 100+ items
   - Memoize expensive calculations
   - Profile and optimize re-renders

4. **Error handling**
   - Global error boundary
   - User-friendly error messages
   - Automatic error reporting (Sentry)

---

## Resource Requirements

### If Solo Developer
- Phase 1-3: 8-10 weeks full-time
- Phase 4-7: 6-8 weeks full-time
- Total: ~4 months

### If Small Team (2-3 devs)
- Parallelize: Mobile (dev 1) + Calendar (dev 2)
- Phase 1-3: 4-5 weeks
- Phase 4-7: 4-5 weeks
- Total: ~2 months

### External Dependencies
- Google Calendar API (already have)
- Push notification service (Firebase or OneSignal)
- RRULE library (open source)
- Mobile testing devices

---

## Next Steps

1. **This week:** Implement Quick Wins (PWA manifest, auto-AI estimate)
2. **Next week:** Start Phase 1.2 (Mobile Timeline View design)
3. **Week 3:** Begin Phase 2 parallel to mobile work
4. **Week 5:** Evaluate progress, adjust timeline

Shall I start implementing any of these phases?
