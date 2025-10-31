# AI Query Hub - Timeline Feature Technical Specification

**Document Version:** 1.0
**Last Updated:** October 31, 2025
**Author:** Technical Analysis Team
**Purpose:** Comprehensive technical documentation for code review and knowledge transfer

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Design](#3-database-design)
4. [Implementation Details](#4-implementation-details)
5. [Algorithms and Core Logic](#5-algorithms-and-core-logic)
6. [User Interface Design](#6-user-interface-design)
7. [Comparison to Industry Standards](#7-comparison-to-industry-standards)
8. [Technical Recommendations](#8-technical-recommendations)
9. [File Reference Index](#9-file-reference-index)

---

## 1. Executive Summary

### 1.1 Feature Overview

The AI Query Hub timeline system implements **two distinct timeline paradigms** for scheduling and time management:

- **Standard Timeline Manager**: A multi-layer, Google Calendar-style timeline with flexible scheduling, drag-and-drop, and status tracking
- **Magnetic Timeline**: A gap-free, 24-hour daily scheduler with automatic reflow algorithms to maintain continuous coverage

### 1.2 Key Characteristics

**Scale:** ~8,000 lines of TypeScript/React code across 25+ files
**Database:** 12 PostgreSQL tables with Row Level Security (RLS)
**UI Library:** Custom SVG rendering + Shadcn-ui components
**State Management:** React hooks with Supabase real-time sync
**Timeline Visualization:** Custom SVG-based (no external timeline libraries)

### 1.3 Primary Use Cases

1. **Project Management**: Multi-layer timeline for tracking tasks across different contexts
2. **Daily Scheduling**: Gap-free 24-hour timeline for personal time blocking
3. **Goal Planning**: AI-assisted breakdown of long-term goals into scheduled items
4. **Executive Assistant System**: Delegation of schedule management to human assistants

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│                                                              │
│  ┌─────────────────┐           ┌─────────────────┐         │
│  │ TimelineManager │           │ MagneticTimeline│         │
│  │  (Standard)     │           │  (Gap-Free)     │         │
│  └────────┬────────┘           └────────┬────────┘         │
│           │                              │                   │
│           ├──── TimelineCanvas          ├──── TimelineBar   │
│           ├──── TimelineItem            └──── ToolboxPanel  │
│           ├──── TimelineControls                            │
│           ├──── AddItemForm                                 │
│           └──── ParkedItemsPanel                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│                                                              │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────┐│
│  │ useTimeline  │  │useMagneticTimeline│ │useTimelineSync││
│  │    Hook      │  │     Hook          │  │     Hook      ││
│  └──────┬───────┘  └────────┬──────────┘  └───────┬──────┘│
│         │                   │                      │        │
│         ├─ timelineUtils.ts │                      │        │
│         │                   ├─ magneticTimelineUtils.ts    │
│         └───────────────────┴──────────────────────┘        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    DATA LAYER (Supabase)                     │
│                                                              │
│  PostgreSQL Tables:                                          │
│  ├─ timeline_items (standard timeline)                       │
│  ├─ magnetic_timeline_items (gap-free timeline)             │
│  ├─ timeline_layers (multi-layer organization)              │
│  ├─ timeline_settings (user preferences)                    │
│  ├─ timeline_parked_items (deferred items)                  │
│  ├─ timeline_templates (reusable templates)                 │
│  ├─ timeline_goals (goal tracking)                          │
│  ├─ timeline_goal_items (goal-item links)                   │
│  └─ timeline_ai_sessions (AI planning history)              │
│                                                              │
│  Real-time Subscriptions:                                    │
│  └─ Postgres Changes via Supabase Realtime                  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Component Hierarchy

#### Standard Timeline
```
Timeline.tsx (Page)
└── TimelineManager.tsx (407 lines)
    ├── TimelineControls.tsx (zoom, lock, view mode)
    ├── TimelineLayerManager.tsx (layer CRUD)
    ├── ViewModeSwitcher.tsx (day/week/month)
    ├── CompletedItemsToggle.tsx (filter)
    ├── ParkedItemsPanel.tsx (deferred items)
    ├── AIGoalPlanner.tsx (21KB, AI integration)
    └── TimelineCanvas.tsx (397 lines, SVG rendering)
        └── TimelineItem.tsx (305 lines, drag/resize)
            └── ItemActionMenu.tsx (edit/complete/park/delete)
```

#### Magnetic Timeline
```
Timeline.tsx (Page)
└── MagneticTimeline.tsx (235 lines)
    ├── MagneticTimelineBar.tsx (244 lines, horizontal bar)
    └── ToolboxPanel.tsx (4.8KB, template-based creation)
```

### 2.3 Data Flow Pattern

**All operations follow this pattern:**

1. **User Action** → UI Component
2. **Hook Function Call** → Business logic (useTimeline/useMagneticTimeline)
3. **Algorithm Execution** → Reflow, validation, calculation (if needed)
4. **Supabase Update** → Database mutation with RLS enforcement
5. **Optimistic UI Update** → Immediate local state change
6. **Real-time Broadcast** → Other clients notified (if sync enabled)
7. **Toast Notification** → User feedback (success/error)

---

## 3. Database Design

### 3.1 Schema Overview

**12 Tables Total:**
- 2 core timeline tables (standard + magnetic)
- 4 supporting tables (layers, settings, templates, parked)
- 3 advanced feature tables (goals, goal_items, ai_sessions)
- 3 assistant system tables (relationships, documents, document_items)

### 3.2 Core Tables

#### `timeline_layers` (Multi-layer organization)
```sql
CREATE TABLE timeline_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  is_primary_timeline BOOLEAN DEFAULT FALSE,  -- "Me" timeline flag
  timeline_type TEXT CHECK (timeline_type IN ('standard', 'magnetic')) DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_timeline_layers_user_order ON timeline_layers(user_id, sort_order);
CREATE INDEX idx_timeline_layers_type ON timeline_layers(timeline_type);
CREATE UNIQUE INDEX idx_timeline_layers_primary ON timeline_layers(user_id)
  WHERE is_primary_timeline = TRUE;
```

**Key Design Decisions:**
- One "Me" timeline per user (primary_timeline flag)
- Layers can be standard (gap-allowed) or magnetic (gap-free)
- Sort order enables drag-to-reorder functionality
- Visibility toggle for layer filtering

#### `timeline_items` (Standard timeline blocks)
```sql
CREATE TABLE timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layer_id UUID NOT NULL REFERENCES timeline_layers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'logjam', 'completed', 'parked')),
  color TEXT NOT NULL,
  completed_at TIMESTAMPTZ,

  -- Enhanced fields for magnetic timeline compatibility
  is_locked_time BOOLEAN DEFAULT FALSE,
  is_flexible BOOLEAN DEFAULT TRUE,
  parent_item_id UUID REFERENCES timeline_items(id) ON DELETE CASCADE,
  template_id UUID REFERENCES timeline_templates(id) ON DELETE SET NULL,
  original_duration INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (8 total for performance)
CREATE INDEX idx_timeline_items_user_status ON timeline_items(user_id, status);
CREATE INDEX idx_timeline_items_start_time ON timeline_items(start_time);
CREATE INDEX idx_timeline_items_layer ON timeline_items(layer_id);
-- ... 5 more specialized indexes
```

**Status Values:**
- `active`: Ongoing or future item
- `logjam`: Past due, blocking progress (auto-detected)
- `completed`: Finished task
- `parked`: Temporarily removed from timeline

**Design Patterns:**
- Parent-child relationships for sub-tasks
- Template references for reusable items
- Original duration tracking for compression/expansion

#### `magnetic_timeline_items` (Gap-free 24-hour timeline)
```sql
CREATE TABLE magnetic_timeline_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_locked_time BOOLEAN NOT NULL DEFAULT false,  -- Cannot move/compress
  is_flexible BOOLEAN NOT NULL DEFAULT true,       -- Can compress/expand
  original_duration INTEGER,                       -- For restoration
  template_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_magnetic_timeline_items_user_id ON magnetic_timeline_items(user_id);
CREATE INDEX idx_magnetic_timeline_items_start_time ON magnetic_timeline_items(start_time);
CREATE INDEX idx_magnetic_timeline_items_user_start ON magnetic_timeline_items(user_id, start_time);
```

**Key Differences from timeline_items:**
- No `layer_id` (single "Me" timeline)
- No `status` field (always active)
- Must sum to exactly 1440 minutes (24 hours)
- Text ID instead of UUID (compatibility requirement)

#### `timeline_templates` (Reusable item templates)
```sql
CREATE TABLE timeline_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL for system defaults
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  default_start_time TIME,  -- Optional default (e.g., 22:00 for sleep)
  category TEXT NOT NULL CHECK (category IN
    ('rest', 'personal', 'meal', 'health', 'work', 'travel', 'social', 'learning', 'other')),
  color TEXT NOT NULL,
  icon TEXT,  -- Lucide icon name
  is_locked_time BOOLEAN DEFAULT FALSE,
  is_flexible BOOLEAN DEFAULT TRUE,
  is_system_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_template_name UNIQUE(user_id, name)
);
```

**System Templates:** 20 pre-seeded templates including:
- Sleep (9h, locked, inflexible)
- Morning Routine (30m, flexible)
- Breakfast/Lunch/Dinner (30-60m, flexible)
- Exercise, Work Block, Commute, Leisure, etc.

### 3.3 Migration History

**Migration Sequence:**
1. `20251023120000_timeline_manager.sql` - Initial timeline system
2. `20251031000000_enhanced_timeline_manager.sql` - Advanced features (templates, goals, AI)
3. `20251031000001_setup_me_timeline.sql` - Auto-create "Me" timeline for users
4. `20251031000002_seed_timeline_templates.sql` - 20 system templates
5. `20251031035250_create_magnetic_timeline_table.sql` - Separate magnetic table

### 3.4 Row Level Security (RLS)

**All tables have RLS enabled with standard user ownership policies:**

```sql
-- Example for timeline_items
CREATE POLICY "Users can view their own items"
  ON timeline_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items"
  ON timeline_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
  ON timeline_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
  ON timeline_items FOR DELETE
  USING (auth.uid() = user_id);
```

**Special Policies:**

1. **Templates:** Users can view system defaults OR their own templates
2. **Assistant Access:** Assistants can manage executive timelines with `manage_timeline` permission

```sql
-- Assistant policy example
CREATE POLICY "Assistants can view executive magnetic timeline items"
  ON magnetic_timeline_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = magnetic_timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'manage_timeline')::boolean = true
    )
  );
```

### 3.5 Database Functions

**Key Helper Functions:**

```sql
-- Calculate total hours completed for a goal
CREATE FUNCTION calculate_goal_hours_completed(p_goal_id UUID) RETURNS NUMERIC;

-- Validate magnetic timeline totals exactly 24 hours
CREATE FUNCTION validate_magnetic_timeline_continuity(p_layer_id UUID) RETURNS JSONB;

-- Create timeline item from template
CREATE FUNCTION create_item_from_template(
  p_user_id UUID,
  p_layer_id UUID,
  p_template_id UUID,
  p_start_time TIMESTAMPTZ,
  p_custom_title TEXT DEFAULT NULL
) RETURNS UUID;

-- Auto-create "Me" timeline for new users
CREATE FUNCTION create_default_me_timeline() RETURNS TRIGGER;
```

---

## 4. Implementation Details

### 4.1 Technology Stack

**Frontend:**
- React 18.2.0
- TypeScript 5.0+
- Vite 4.5.14 (build tool)
- Tailwind CSS 3.3.0 (styling)

**UI Components:**
- Shadcn-ui (custom Radix UI components)
- Lucide React 0.263.1 (icons)
- Native SVG (timeline canvas)

**Backend:**
- Supabase (PostgreSQL + Auth + Realtime)
- Row Level Security (RLS) for access control
- Edge Functions (for AI integration, not timeline core)

**State Management:**
- React hooks (useState, useEffect, useCallback, useMemo)
- Supabase Realtime subscriptions
- Optimistic UI updates

### 4.2 Custom Hooks

#### `useTimeline` Hook

**File:** `/src/hooks/useTimeline.ts` (442 lines)

**Signature:**
```typescript
function useTimeline(): {
  // State
  items: TimelineItem[];
  settings: TimelineSettings | null;
  parkedItems: ParkedItem[];
  loading: boolean;
  nowTime: Date;
  scrollOffset: number;

  // Setters
  setScrollOffset: (offset: number) => void;

  // Operations
  addItem: (layerId: string, title: string, startTime: string,
            durationMinutes: number, color: string) => Promise<TimelineItem | undefined>;
  updateItem: (itemId: string, updates: Partial<TimelineItem>) => Promise<void>;
  completeItem: (itemId: string) => Promise<void>;
  rescheduleItem: (itemId: string, newStartTime: string, newLayerId?: string) => Promise<void>;
  parkItem: (itemId: string) => Promise<void>;
  restoreParkedItem: (parkedItemId: string, layerId: string, startTime: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  deleteParkedItem: (parkedItemId: string) => Promise<void>;
  updateSettings: (updates: Partial<TimelineSettings>) => Promise<void>;
  refetchItems: () => Promise<void>;
  refetchParkedItems: () => Promise<void>;
}
```

**Key Features:**
- Continuous NOW line updates via `requestAnimationFrame`
- Automatic logjam detection (items past end time)
- Auto-scroll in locked mode
- Optimistic UI updates before database confirmation

**Animation Loop:**
```typescript
const tick = useCallback(() => {
  const now = Date.now();
  const deltaTime = now - lastTickRef.current;
  lastTickRef.current = now;

  setNowTime(new Date());

  // Auto-scroll if locked
  if (settings?.is_locked && scrollOffset < 0) {
    const pixelsToScroll = (deltaTime / 1000 / 3600) * pixelsPerHour;
    setScrollOffset(prev => Math.min(0, prev + pixelsToScroll));
  }

  // Check for logjams
  items.forEach(item => {
    if (shouldBeLogjammed(item, new Date()) && item.status === 'active') {
      updateItem(item.id, { status: 'logjam' });
    }
  });

  animationFrameRef.current = requestAnimationFrame(tick);
}, [settings, scrollOffset, items]);
```

#### `useMagneticTimeline` Hook

**File:** `/src/hooks/useMagneticTimeline.ts` (372 lines)

**Signature:**
```typescript
function useMagneticTimeline(): {
  // State
  items: MagneticTimelineItem[];
  loading: boolean;
  hasFullCoverage: boolean;

  // Operations
  addItem: (title: string, targetMinutes: number, durationMinutes: number,
            color: string, isLocked?: boolean, isFlexible?: boolean)
            => Promise<MagneticTimelineItem | undefined>;
  moveItemTo: (itemId: string, newStartMinutes: number) => Promise<void>;
  resizeItemTo: (itemId: string, newDurationMinutes: number) => Promise<void>;
  splitItem: (itemId: string, splitMinutes: number) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<MagneticTimelineItem>) => Promise<void>;
  manualReflow: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

**Key Features:**
- Automatic gap detection and filling
- Magnetic reflow on every add/move/resize/delete operation
- Default 24-hour timeline initialization for new users
- Validates full 24-hour coverage

**Default Initialization:**
```typescript
if (!data || data.length === 0) {
  const defaultItems = createDefault24HourTimeline(user.id);
  // Creates: Sleep (9h), Morning Routine (3h), Work (8h), Evening (4h)
  await initializeDefaultTimeline(defaultItems);
  setItems(defaultItems);
  setHasFullCoverage(true);
}
```

#### `useTimelineSync` Hook

**File:** `/src/hooks/useTimelineSync.ts` (93 lines)

**Purpose:** Real-time synchronization with Supabase for multi-user/multi-device support

**Implementation:**
```typescript
export function useTimelineSync(callbacks: {
  onItemsChange?: () => void;
  onLayersChange?: () => void;
  onSettingsChange?: () => void;
}) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channels = [
      supabase
        .channel('timeline_items_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'timeline_items',
          filter: `user_id=eq.${user.id}`
        }, callbacks.onItemsChange)
        .subscribe(),

      // Similar for timeline_layers and timeline_settings
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user]);
}
```

**Note:** Only used by standard timeline, not magnetic timeline (single-user use case)

### 4.3 Utility Libraries

#### `timelineUtils.ts` (559 lines)

**Core functions:**

```typescript
// Position calculations
export function calculateItemX(startTime: string, nowTime: Date,
  viewportWidth: number, pixelsPerHour: number, scrollOffset: number): number;

export function calculateItemWidth(durationMinutes: number, pixelsPerHour: number): number;

export function calculateLayerY(layerIndex: number, layerHeight: number,
  headerHeight: number): number;

// Time conversions
export function calculateEndTime(startTime: string, durationMinutes: number): Date;

export function hoursFromNow(timestamp: string, nowTime: Date): number;

export function rescheduleItem(currentStartTime: string, hoursToAdd: number): string;

// Validation
export function shouldBeLogjammed(item: TimelineItem, nowTime: Date): boolean;

export function shouldBeArchived(item: TimelineItem, nowTime: Date,
  autoArchiveHours: number): boolean;

// Time markers
export function generateTimeMarkers(nowTime: Date, viewportWidth: number,
  pixelsPerHour: number, scrollOffset: number, hoursBeforeNow: number,
  hoursAfterNow: number, subdivisionMinutes?: number): TimeMarker[];
```

#### `magneticTimelineUtils.ts` (443 lines)

**Core algorithms:**

```typescript
// Data structures
export interface MagneticTimelineBlock {
  item: MagneticTimelineItem;
  startMinutes: number;
  endMinutes: number;
  isCompressed: boolean;
}

// Gap detection
export function findGaps(blocks: MagneticTimelineBlock[]):
  Array<{ start: number; end: number; duration: number }>;

// Magnetic reflow (gap elimination)
export function applyMagneticReflow(items: MagneticTimelineItem[]): MagneticTimelineItem[];

// Overlap resolution
export function resolveOverlaps(items: MagneticTimelineItem[]): MagneticTimelineItem[];

// Item operations
export function moveItem(items: MagneticTimelineItem[], itemId: string,
  newStartMinutes: number): MagneticTimelineItem[];

export function resizeItem(items: MagneticTimelineItem[], itemId: string,
  newDurationMinutes: number): MagneticTimelineItem[];

export function splitItemAt(items: MagneticTimelineItem[], itemId: string,
  splitMinutesFromMidnight: number): MagneticTimelineItem[];

export function insertItemAtPosition(items: MagneticTimelineItem[],
  newItem: MagneticTimelineItem, targetMinutes: number): MagneticTimelineItem[];

// Validation
export function validateFullCoverage(items: MagneticTimelineItem[]): boolean;

// Time conversions
export function getMinutesFromMidnight(timestamp: string): number;

export function createTimestampFromMinutes(minutesFromMidnight: number,
  baseDate?: Date): string;

// Utilities
export function itemsToBlocks(items: MagneticTimelineItem[]): MagneticTimelineBlock[];

export function blocksToItems(blocks: MagneticTimelineBlock[]): MagneticTimelineItem[];

// Default timeline
export function createDefault24HourTimeline(userId: string): MagneticTimelineItem[];
```

#### `timelineConstants.ts` (115 lines)

**Configuration constants:**

```typescript
// NOW line position
export const NOW_LINE_POSITION = 0.3; // 30% from left

// Zoom levels
export const DEFAULT_PIXELS_PER_HOUR = 100;
export const MIN_PIXELS_PER_HOUR = 20;
export const MAX_PIXELS_PER_HOUR = 300;
export const DEFAULT_LAYER_HEIGHT = 80;
export const ITEM_HEIGHT_RATIO = 0.7;

// View modes
export const VIEW_MODE_CONFIG = {
  day: {
    pixelsPerHour: 200,
    pastHours: 6,
    futureHours: 18,
    subdivisionMinutes: 15
  },
  week: {
    pixelsPerHour: 30,
    pastHours: 24,
    futureHours: 144,
    subdivisionMinutes: 60
  },
  month: {
    pixelsPerHour: 10,
    pastHours: 168,
    futureHours: 552,
    subdivisionMinutes: 360
  }
};

// Thresholds
export const LOGJAM_THRESHOLD_MINUTES = 0;
export const DEFAULT_AUTO_ARCHIVE_HOURS = 24;
export const TIMELINE_HEADER_HEIGHT = 40;

// Colors
export const DEFAULT_ITEM_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];
```

---

## 5. Algorithms and Core Logic

### 5.1 Magnetic Reflow Algorithm

**Purpose:** Maintain gap-free 24-hour timeline coverage by automatically adjusting item positions and durations.

**Strategy:**
1. Keep locked items in place (anchors)
2. Identify all gaps in timeline
3. Fill gaps by shifting non-locked items leftward
4. If gaps remain, expand flexible items proportionally
5. Handle any overlaps by compressing flexible items

**Implementation:**

```typescript
export function applyMagneticReflow(items: MagneticTimelineItem[]): MagneticTimelineItem[] {
  if (items.length === 0) return items;

  let blocks = itemsToBlocks(items);
  blocks.sort((a, b) => a.startMinutes - b.startMinutes);

  // Find all gaps
  const gaps = findGaps(blocks);
  if (gaps.length === 0) {
    return resolveOverlaps(items); // Handle overlaps instead
  }

  // Strategy 1: Fill gaps by shifting non-locked items
  blocks = fillGapsByShifting(blocks, gaps);

  // Strategy 2: If gaps remain, expand flexible items
  const remainingGaps = findGaps(blocks);
  if (remainingGaps.length > 0) {
    blocks = fillGapsByExpanding(blocks, remainingGaps);
  }

  return blocksToItems(blocks);
}
```

**Gap Detection Algorithm:**

```typescript
export function findGaps(blocks: MagneticTimelineBlock[]):
  Array<{ start: number; end: number; duration: number }> {

  const gaps = [];
  const sorted = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes);

  // Check for gap at start (before first item)
  if (sorted.length > 0 && sorted[0].startMinutes > 0) {
    gaps.push({
      start: 0,
      end: sorted[0].startMinutes,
      duration: sorted[0].startMinutes
    });
  }

  // Check for gaps between items
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = sorted[i].endMinutes;
    const nextStart = sorted[i + 1].startMinutes;

    if (nextStart > currentEnd) {
      gaps.push({
        start: currentEnd,
        end: nextStart,
        duration: nextStart - currentEnd
      });
    }
  }

  // Check for gap at end (after last item)
  if (sorted.length > 0 && sorted[sorted.length - 1].endMinutes < 1440) {
    const lastEnd = sorted[sorted.length - 1].endMinutes;
    gaps.push({
      start: lastEnd,
      end: 1440,
      duration: 1440 - lastEnd
    });
  }

  return gaps;
}
```

**Gap Filling by Shifting:**

```typescript
function fillGapsByShifting(
  blocks: MagneticTimelineBlock[],
  gaps: Array<{ start: number; end: number; duration: number }>
): MagneticTimelineBlock[] {
  const result = [...blocks];

  // Process gaps from left to right
  for (const gap of gaps) {
    const blocksAfterGap = result.filter(b => b.startMinutes >= gap.end);

    // Shift all non-locked blocks after this gap leftward
    for (const block of blocksAfterGap) {
      if (!block.item.is_locked_time) {
        block.startMinutes -= gap.duration;
        block.endMinutes -= gap.duration;
        block.item.start_time = createTimestampFromMinutes(block.startMinutes);
      }
    }
  }

  return result;
}
```

**Gap Filling by Expansion:**

```typescript
function fillGapsByExpanding(
  blocks: MagneticTimelineBlock[],
  gaps: Array<{ start: number; end: number; duration: number }>
): MagneticTimelineBlock[] {
  const result = [...blocks];
  const flexibleBlocks = result.filter(b => b.item.is_flexible);

  if (flexibleBlocks.length === 0) {
    return result; // Cannot expand if no flexible items
  }

  // Calculate total gap duration
  const totalGapDuration = gaps.reduce((sum, gap) => sum + gap.duration, 0);

  // Distribute gap duration proportionally among flexible items
  const expansionPerItem = totalGapDuration / flexibleBlocks.length;

  for (const block of flexibleBlocks) {
    // Store original duration if not already stored
    if (!block.item.original_duration) {
      block.item.original_duration = block.item.duration_minutes;
    }

    // Expand duration
    const newDuration = block.item.duration_minutes + expansionPerItem;
    block.item.duration_minutes = Math.round(newDuration);
    block.endMinutes = block.startMinutes + block.item.duration_minutes;
  }

  return result;
}
```

**Complexity Analysis:**
- Gap detection: O(n log n) due to sorting
- Shifting: O(n × g) where g = number of gaps
- Expansion: O(n)
- Overall: O(n log n + n×g) ≈ O(n²) worst case

### 5.2 Logjam Detection

**Purpose:** Automatically identify overdue timeline items and mark them as "logjammed" to alert the user.

**Implementation:**

```typescript
export function shouldBeLogjammed(item: TimelineItem, nowTime: Date): boolean {
  // Don't logjam completed or parked items
  if (item.status === 'completed' || item.status === 'parked') {
    return false;
  }

  const endTime = calculateEndTime(item.start_time, item.duration_minutes);
  const minutesPastEnd = (nowTime.getTime() - endTime.getTime()) / (1000 * 60);

  return minutesPastEnd > LOGJAM_THRESHOLD_MINUTES; // LOGJAM_THRESHOLD_MINUTES = 0
}
```

**Trigger Mechanism:**
- Runs on every animation frame in `useTimeline` hook
- Checks all active items
- Automatically updates item status to 'logjam' in database
- Visual feedback: Red pulsing border + red dot indicator

**Animation Loop Integration:**

```typescript
const tick = useCallback(() => {
  setNowTime(new Date());

  // Check for logjams on every frame
  const now = new Date();
  items.forEach(item => {
    if (shouldBeLogjammed(item, now) && item.status === 'active') {
      updateItem(item.id, { status: 'logjam' }); // Async DB update
    }
  });

  animationFrameRef.current = requestAnimationFrame(tick);
}, [items]);
```

### 5.3 Time Position Calculations

**Standard Timeline Positioning:**

The NOW line is fixed at 30% from the left edge. Items are positioned relative to this line based on their time offset from NOW.

**Formula:**

```typescript
export function calculateItemX(
  startTime: string,
  nowTime: Date,
  viewportWidth: number,
  pixelsPerHour: number,
  scrollOffset: number
): number {
  const startDate = new Date(startTime);

  // Calculate hours from NOW (negative = past, positive = future)
  const hoursFromNow = (startDate.getTime() - nowTime.getTime()) / (1000 * 60 * 60);

  // NOW line position (30% from left)
  const nowLineX = viewportWidth * NOW_LINE_POSITION; // NOW_LINE_POSITION = 0.3

  // Item X = NOW line + (hours offset × pixels per hour) + scroll offset
  return nowLineX + (hoursFromNow * pixelsPerHour) + scrollOffset;
}
```

**Example:**
- Viewport width: 1000px
- NOW line at: 300px (30%)
- Item 3 hours in future: 300 + (3 × 100) = 600px
- Item 2 hours in past: 300 + (-2 × 100) = 100px

**Width Calculation:**

```typescript
export function calculateItemWidth(durationMinutes: number, pixelsPerHour: number): number {
  return (durationMinutes / 60) * pixelsPerHour;
}
```

**Magnetic Timeline Positioning:**

Uses percentage-based positioning for 24-hour bar:

```typescript
// Position as percentage of 1440 minutes (24 hours)
const left = (startMinutes / 1440) * 100; // e.g., 720 minutes = 50%
const width = (durationMinutes / 1440) * 100; // e.g., 60 minutes = 4.17%
```

### 5.4 Blade Tool (Split Algorithm)

**Purpose:** Split a timeline item into two parts at a specific time point.

**Implementation:**

```typescript
export function splitItemAt(
  items: MagneticTimelineItem[],
  itemId: string,
  splitMinutesFromMidnight: number
): MagneticTimelineItem[] {
  const itemToSplit = items.find(i => i.id === itemId);
  if (!itemToSplit) return items;

  const itemStartMinutes = getMinutesFromMidnight(itemToSplit.start_time);
  const itemEndMinutes = itemStartMinutes + itemToSplit.duration_minutes;

  // Validate split is within item bounds
  if (splitMinutesFromMidnight <= itemStartMinutes ||
      splitMinutesFromMidnight >= itemEndMinutes) {
    return items;
  }

  // Calculate durations for both parts
  const firstPartDuration = splitMinutesFromMidnight - itemStartMinutes;
  const secondPartDuration = itemEndMinutes - splitMinutesFromMidnight;

  // Create two new items
  const firstPart: MagneticTimelineItem = {
    ...itemToSplit,
    id: `${itemToSplit.id}_part1`,
    duration_minutes: firstPartDuration,
    title: `${itemToSplit.title} (1/2)`
  };

  const secondPart: MagneticTimelineItem = {
    ...itemToSplit,
    id: `${itemToSplit.id}_part2`,
    start_time: createTimestampFromMinutes(splitMinutesFromMidnight),
    duration_minutes: secondPartDuration,
    title: `${itemToSplit.title} (2/2)`
  };

  // Remove original, add two parts
  const otherItems = items.filter(i => i.id !== itemId);
  return [...otherItems, firstPart, secondPart];
}
```

**User Flow:**
1. Select item by clicking
2. Press 'B' key to activate blade mode
3. Cursor changes to crosshair
4. Click anywhere on the item to split at that position
5. Two new items created, original deleted
6. Automatic reflow triggered to maintain 24-hour coverage

---

## 6. User Interface Design

### 6.1 Visual Components

#### Standard Timeline Canvas

**Rendering Technology:** Native SVG (no external libraries)

**Structure:**
```xml
<svg width="100%" height="calculated">
  <!-- Background layers (alternating colors) -->
  <rect fill="gray-50/gray-900" opacity="0.5" /> <!-- Even layers -->
  <rect fill="white/gray-850" opacity="0.5" />   <!-- Odd layers -->

  <!-- Layer separators (horizontal lines) -->
  <line stroke="gray-300/gray-700" strokeWidth="1" />

  <!-- Time markers (vertical lines) -->
  <g> <!-- Major markers (midnight) -->
    <line stroke="gray-400/gray-600" strokeWidth="2" opacity="0.5" />
    <text>Mon, Jan 1</text>
    <text>14:00</text>
  </g>
  <g> <!-- Minor markers (subdivisions) -->
    <line stroke="gray-300/gray-700" strokeWidth="1" opacity="0.2" />
    <text>15:00</text>
  </g>

  <!-- NOW line (red, fixed at 30% or scrolling) -->
  <line stroke="red" strokeWidth="3" opacity="0.8" />
  <text fill="red">NOW</text>
  <text fill="red">14:32</text>
  <text fill="red">Mon, Jan 1</text>

  <!-- Timeline items (one per item) -->
  <TimelineItem /> <!-- Custom component -->
</svg>
```

**Item Rendering:**
```xml
<g> <!-- Single timeline item -->
  <!-- Main rectangle -->
  <rect
    fill={item.color}
    rx="4" ry="4"
    opacity={dragging ? 0.6 : 1.0}
    stroke={status === 'logjam' ? 'red' : 'none'}
    strokeWidth={status === 'logjam' ? 3 : 0}
  />

  <!-- Title text (truncated if too long) -->
  <text fontSize="14" fontWeight="500">
    {item.title}
  </text>

  <!-- Duration text (only if width > 100px) -->
  <text fontSize="10" opacity="0.7">
    {formatDuration(item.duration_minutes)}
  </text>

  <!-- Resize handle (3 vertical dots on right edge) -->
  <circle fill="white" opacity="0.5" r="2" />
  <circle fill="white" opacity="0.5" r="2" />
  <circle fill="white" opacity="0.5" r="2" />

  <!-- Logjam indicator (pulsing red dot) -->
  {status === 'logjam' && (
    <circle fill="red" r="5" className="animate-pulse" />
  )}

  <!-- Completion checkmark -->
  {status === 'completed' && (
    <g opacity="0.5">
      <circle fill="green" r="12" />
      <path d="checkmark" stroke="white" strokeWidth="2" />
    </g>
  )}
</g>
```

#### Magnetic Timeline Bar

**Rendering Technology:** HTML/CSS with percentage-based positioning

**Structure:**
```tsx
<div className="relative w-full h-24 bg-muted border-2 rounded-lg">
  {/* Current time indicator (red line) */}
  <div style={{ left: `${currentTimePercent}%` }} className="absolute h-full w-0.5 bg-red-500 z-20">
    <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-red-500" />
  </div>

  {/* Timeline items */}
  {items.map(item => {
    const left = (startMinutes / 1440) * 100;
    const width = (durationMinutes / 1440) * 100;

    return (
      <div
        key={item.id}
        style={{
          left: `${left}%`,
          width: `${width}%`,
          backgroundColor: item.color
        }}
        className={cn(
          "absolute top-2 bottom-2 rounded-sm p-1 text-xs truncate",
          selected && "ring-2 ring-primary ring-offset-2",
          item.is_locked_time && "border-2 border-yellow-500",
          isCompressed && "border-2 border-dashed border-orange-500",
          isPast && "opacity-60"
        )}
      >
        {item.is_locked_time && "🔒 "}
        {isCompressed && "⚠️ "}
        {item.title}
      </div>
    );
  })}
</div>
```

### 6.2 User Interactions

#### Drag-and-Drop System

**Implementation:** Native HTML5 drag events (no library)

**Horizontal Drag (Change Time):**
```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  setIsDragging(true);
  setDragStartPos({ x: e.clientX, y: e.clientY });
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging) return;

  const deltaX = e.clientX - dragStartPos.x;
  const deltaY = e.clientY - dragStartPos.y;

  setCurrentDragDelta({ x: deltaX, y: deltaY });
};

const handleMouseUp = async (e: MouseEvent) => {
  if (!isDragging) return;

  // Calculate new time from delta
  const hoursChanged = currentDragDelta.x / pixelsPerHour;
  const newStartTime = addHours(item.start_time, hoursChanged);

  // Calculate new layer from vertical delta
  const layerIndexChange = Math.round(currentDragDelta.y / layerHeight);
  const newLayerId = layers[clamp(currentLayerIndex + layerIndexChange, 0, layers.length - 1)].id;

  // Update in database
  await rescheduleItem(item.id, newStartTime, newLayerId);

  setIsDragging(false);
};
```

**Visual Feedback:**
- Item opacity reduced to 60% during drag
- Blue border (2px) added
- Item follows cursor with delta offset
- Cursor changes to "grabbing"

**Edge-Based Resize (Google Calendar Style):**
```typescript
// 8px wide invisible resize handle on right edge
<rect
  x={displayX + displayWidth - 8}
  y={displayY}
  width={8}
  height={height}
  className="cursor-ew-resize opacity-0 hover:opacity-10"
  onMouseDown={handleResizeStart}
/>

const handleResizeMove = (e: MouseEvent) => {
  const deltaX = e.clientX - resizeStartX;
  const minutesPerPixel = 60 / pixelsPerHour;
  const deltaMinutes = Math.round(deltaX * minutesPerPixel);
  const newDuration = Math.max(15, item.duration_minutes + deltaMinutes); // Min 15 minutes

  setPreviewDuration(newDuration);
};

const handleResizeEnd = async () => {
  await updateItem(item.id, { duration_minutes: previewDuration });
};
```

**Resize Visual Indicators:**
- 3 vertical dots on right edge (white, 50% opacity)
- Cursor changes to `ew-resize` on hover
- Live duration preview during resize

#### Keyboard Shortcuts

**Blade Tool:**
```typescript
useEffect(() => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Blade tool activation with 'B' key
    if (e.key === 'b' || e.key === 'B') {
      if (selectedItemId) {
        setBladeMode(prev => !prev);
      }
    }

    // Escape to cancel
    if (e.key === 'Escape') {
      setBladeMode(false);
      setSelectedItemId(null);
    }
  }, [selectedItemId]);

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleKeyDown]);
```

**Visual Feedback:**
- Cursor changes to crosshair when blade mode active
- Selected item gets primary ring (2px)
- Click position shows split preview line

### 6.3 Component Library

**Shadcn-ui Components Used:**
- Dialog (modals)
- Popover (dropdown menus)
- Button (primary/outline/ghost/destructive variants)
- Input, Label, Select, Slider
- Alert, Separator, Switch

**Example:**
```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Add Timeline Item</DialogTitle>
      <DialogDescription>
        Create a new item in your timeline
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>

      <div>
        <Label htmlFor="duration">Duration (minutes)</Label>
        <Input id="duration" name="duration" type="number" min="15" required />
      </div>

      <div>
        <Label>Color</Label>
        <div className="flex gap-2">
          {DEFAULT_ITEM_COLORS.map(color => (
            <button
              type="button"
              key={color}
              style={{ backgroundColor: color }}
              className="w-8 h-8 rounded-full"
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
      </div>
    </form>

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit">Create Item</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Styling Approach:**
- Tailwind CSS utility classes for 95% of styling
- Inline styles for dynamic values (colors, positions, dimensions)
- Full dark mode support via Tailwind's dark: prefix

### 6.4 View Modes

**Three Preset Configurations:**

```typescript
const VIEW_MODE_CONFIG = {
  day: {
    pixelsPerHour: 200,      // Very detailed
    pastHours: 6,            // Show 6 hours before NOW
    futureHours: 18,         // Show 18 hours after NOW
    subdivisionMinutes: 15   // Time markers every 15 minutes
  },
  week: {
    pixelsPerHour: 30,       // Medium detail
    pastHours: 24,           // Show 1 day before NOW
    futureHours: 144,        // Show 6 days after NOW
    subdivisionMinutes: 60   // Time markers every hour
  },
  month: {
    pixelsPerHour: 10,       // Overview
    pastHours: 168,          // Show 1 week before NOW
    futureHours: 552,        // Show 3 weeks after NOW
    subdivisionMinutes: 360  // Time markers every 6 hours
  }
};
```

**Switching Between Modes:**
```tsx
<ViewModeSwitcher>
  <Button
    variant={viewMode === 'day' ? 'default' : 'outline'}
    onClick={() => setViewMode('day')}
  >
    Day
  </Button>
  <Button
    variant={viewMode === 'week' ? 'default' : 'outline'}
    onClick={() => setViewMode('week')}
  >
    Week
  </Button>
  <Button
    variant={viewMode === 'month' ? 'default' : 'outline'}
    onClick={() => setViewMode('month')}
  >
    Month
  </Button>
</ViewModeSwitcher>
```

---

## 7. Comparison to Industry Standards

### 7.1 Similar Products

**Google Calendar:**
- **Similarity:** Drag-and-drop, edge-based resize, multi-view (day/week/month)
- **Difference:** Google Calendar is event-based, AI Query Hub has continuous timeline with NOW line
- **Reference in code:** `"Drag the right edge to resize duration (like Google Calendar)"`

**Motion (motion.app):**
- **Similarity:** AI-powered scheduling, auto-rescheduling, time blocking
- **Difference:** Motion is task-first, AI Query Hub has dual timeline modes (standard + magnetic)

**Reclaim.ai:**
- **Similarity:** Automatic scheduling, gap filling, flexible vs fixed time blocks
- **Difference:** Reclaim is calendar-first, AI Query Hub has dedicated magnetic timeline with reflow

**Gantt Chart Software (Microsoft Project, Asana):**
- **Similarity:** Multi-layer timeline, dependencies, drag-to-reschedule
- **Difference:** Gantt charts are project-centric with task dependencies, AI Query Hub is time-centric

### 7.2 Timeline Libraries Not Used

**Popular Timeline Libraries:**
- `react-big-calendar` (most popular, 8k+ GitHub stars)
- `fullcalendar` (22k+ stars, enterprise-grade)
- `vis-timeline` (visualization library, 12k+ stars)
- `gantt-schedule-timeline-calendar` (2k+ stars)
- `react-calendar-timeline` (2k+ stars)

**Why Custom Implementation?**

Based on code analysis, likely reasons:
1. **Performance** - Direct SVG manipulation is faster for continuous updates (NOW line animation)
2. **Flexibility** - Full control over drag behavior, magnetic reflow, and custom algorithms
3. **Bundle Size** - Timeline libraries add 100-300KB to bundle
4. **Learning Curve** - Team already knows React + SVG
5. **Unique Requirements** - Magnetic reflow and dual-mode timeline don't match existing libraries

### 7.3 Design Patterns Used

**Container/Presentation Pattern:**
```
TimelineManager (container) → TimelineCanvas (presentation)
MagneticTimeline (container) → MagneticTimelineBar (presentation)
```

**Custom Hook Pattern:**
```
useTimeline() → Encapsulates all standard timeline logic
useMagneticTimeline() → Encapsulates all magnetic timeline logic
useTimelineSync() → Encapsulates real-time synchronization
```

**Optimistic UI Pattern:**
```typescript
// Update local state immediately
setItems(newItems);

// Then sync to database
await supabase.from('timeline_items').update(...)

// Rollback on error
catch (error) {
  setItems(previousItems);
  toast({ variant: 'destructive' });
}
```

**Real-time Subscription Pattern:**
```typescript
// Subscribe to database changes
const channel = supabase.channel('timeline_changes')
  .on('postgres_changes', { table: 'timeline_items' }, callback)
  .subscribe();

// Cleanup on unmount
return () => supabase.removeChannel(channel);
```

### 7.4 Accessibility Considerations

**Current State:**
- ✅ Semantic HTML where applicable (labels, inputs)
- ✅ Keyboard shortcuts (B for blade, Escape to cancel)
- ❌ Limited screen reader support (SVG timeline not narrated)
- ❌ No keyboard navigation for timeline items
- ❌ No ARIA labels on interactive SVG elements

**Industry Standard:**
- Full keyboard navigation (Tab, Arrow keys)
- Screen reader announcements for actions
- ARIA labels and roles on all interactive elements
- Focus indicators on all interactive elements

---

## 8. Technical Recommendations

### 8.1 Performance Optimizations

**Current Issues:**

1. **Animation Loop Overhead**
   - Runs on every requestAnimationFrame (~60 FPS)
   - Checks all items for logjams on every frame
   - Updates database asynchronously for each logjam

   **Recommendation:**
   ```typescript
   // Throttle logjam checks to once per second
   const tick = useCallback(() => {
     setNowTime(new Date());

     const now = Date.now();
     if (now - lastLogjamCheck.current > 1000) {
       checkForLogjams();
       lastLogjamCheck.current = now;
     }

     animationFrameRef.current = requestAnimationFrame(tick);
   }, []);
   ```

2. **Magnetic Reflow O(n²) Complexity**
   - Reflow triggered on every add/move/resize/delete
   - Gap detection sorts items every time
   - Updates all affected items sequentially

   **Recommendation:**
   ```typescript
   // Batch database updates
   const reflowedItems = applyMagneticReflow(items);
   const updates = reflowedItems.map(item => ({
     id: item.id,
     start_time: item.start_time,
     duration_minutes: item.duration_minutes
   }));

   // Single batch update
   await supabase.from('magnetic_timeline_items')
     .upsert(updates);
   ```

3. **Unnecessary Re-renders**
   - Missing `useMemo` for expensive calculations
   - Missing `useCallback` for event handlers (already fixed in recent commits)

   **Recommendation:**
   ```typescript
   // Memoize expensive calculations
   const visibleItems = useMemo(
     () => items.filter(item => isItemVisible(item, scrollOffset, viewportWidth)),
     [items, scrollOffset, viewportWidth]
   );
   ```

### 8.2 Code Quality Improvements

**Current Issues:**

1. **Duplicate Code**
   - Similar CRUD patterns in useTimeline and useMagneticTimeline
   - Similar error handling in all operations

   **Recommendation:**
   ```typescript
   // Generic CRUD helper
   function useSupabaseCRUD<T>(tableName: string) {
     const { toast } = useToast();

     const create = async (data: Partial<T>) => {
       try {
         const { data: created, error } = await supabase
           .from(tableName)
           .insert(data)
           .select()
           .single();

         if (error) throw error;
         toast({ title: 'Success', description: 'Item created' });
         return created;
       } catch (error) {
         toast({ title: 'Error', description: error.message, variant: 'destructive' });
         throw error;
       }
     };

     // Similar for update, delete
     return { create, update, delete };
   }
   ```

2. **Magic Numbers**
   - Hard-coded values in multiple places (e.g., 1440 for minutes in day)

   **Recommendation:**
   ```typescript
   // Centralize in timelineConstants.ts
   export const MINUTES_PER_DAY = 1440;
   export const HOURS_PER_DAY = 24;
   export const LOGJAM_CHECK_INTERVAL_MS = 1000;
   export const MIN_ITEM_DURATION_MINUTES = 15;
   ```

3. **Type Safety**
   - Some functions use `any` type
   - Missing TypeScript strict mode

   **Recommendation:**
   ```typescript
   // Enable in tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true
     }
   }
   ```

### 8.3 Feature Enhancements

**Low-Hanging Fruit:**

1. **Undo/Redo Support**
   ```typescript
   // History stack for undo/redo
   const [history, setHistory] = useState<TimelineItem[][]>([]);
   const [historyIndex, setHistoryIndex] = useState(0);

   const undo = () => {
     if (historyIndex > 0) {
       setItems(history[historyIndex - 1]);
       setHistoryIndex(prev => prev - 1);
     }
   };
   ```

2. **Keyboard Shortcuts**
   ```typescript
   // Common shortcuts
   Ctrl+Z: Undo
   Ctrl+Y: Redo
   Delete: Delete selected item
   D: Duplicate item
   C: Complete item
   P: Park item
   ```

3. **Export Timeline**
   ```typescript
   // Export to iCal format
   const exportToICal = (items: TimelineItem[]) => {
     const events = items.map(item => ({
       summary: item.title,
       start: item.start_time,
       duration: item.duration_minutes,
       description: `Status: ${item.status}`
     }));

     return generateICalFile(events);
   };
   ```

### 8.4 Accessibility Improvements

**High Priority:**

1. **Keyboard Navigation**
   ```typescript
   // Arrow key navigation
   const handleKeyDown = (e: KeyboardEvent) => {
     switch (e.key) {
       case 'ArrowUp':
         selectPreviousItem();
         break;
       case 'ArrowDown':
         selectNextItem();
         break;
       case 'ArrowLeft':
         moveItemBackward(15); // 15 minutes
         break;
       case 'ArrowRight':
         moveItemForward(15);
         break;
     }
   };
   ```

2. **Screen Reader Support**
   ```tsx
   <g role="button" aria-label={`Timeline item: ${item.title}, ${formatDuration(item.duration_minutes)}, ${item.status}`}>
     {/* Item SVG */}
   </g>
   ```

3. **Focus Indicators**
   ```css
   .timeline-item:focus {
     outline: 2px solid var(--primary);
     outline-offset: 2px;
   }
   ```

### 8.5 Testing Recommendations

**Current State:** No tests found in repository

**Recommended Test Coverage:**

1. **Unit Tests (Utilities)**
   ```typescript
   // Test time calculations
   describe('calculateItemX', () => {
     it('should position item at NOW line when startTime equals nowTime', () => {
       const result = calculateItemX('2025-10-31T14:00:00Z', new Date('2025-10-31T14:00:00Z'), 1000, 100, 0);
       expect(result).toBe(300); // 30% of 1000px
     });
   });

   // Test magnetic reflow
   describe('applyMagneticReflow', () => {
     it('should eliminate all gaps', () => {
       const items = [/* items with gaps */];
       const reflowed = applyMagneticReflow(items);
       const gaps = findGaps(itemsToBlocks(reflowed));
       expect(gaps).toHaveLength(0);
     });
   });
   ```

2. **Integration Tests (Hooks)**
   ```typescript
   // Test useTimeline
   describe('useTimeline', () => {
     it('should fetch items on mount', async () => {
       const { result } = renderHook(() => useTimeline());
       await waitFor(() => expect(result.current.loading).toBe(false));
       expect(result.current.items).toBeDefined();
     });
   });
   ```

3. **E2E Tests (User Flows)**
   ```typescript
   // Test drag-and-drop
   test('should reschedule item when dragged', async () => {
     render(<TimelineManager />);
     const item = screen.getByText('Meeting');

     await userEvent.pointer([
       { keys: '[MouseLeft>]', target: item },
       { coords: { x: 100, y: 0 } },
       { keys: '[/MouseLeft]' }
     ]);

     expect(await screen.findByText('Item rescheduled')).toBeInTheDocument();
   });
   ```

---

## 9. File Reference Index

### 9.1 Component Files

**Standard Timeline:**
- `/src/components/timeline/TimelineManager.tsx` (407 lines) - Main orchestrator
- `/src/components/timeline/TimelineCanvas.tsx` (397 lines) - SVG rendering engine
- `/src/components/timeline/TimelineItem.tsx` (305 lines) - Interactive timeline blocks
- `/src/components/timeline/AddItemForm.tsx` (11.4KB) - Item creation/editing modal
- `/src/components/timeline/ItemActionMenu.tsx` - Context menu (edit/complete/park/delete)
- `/src/components/timeline/ParkedItemsPanel.tsx` - Deferred items panel
- `/src/components/timeline/TimelineControls.tsx` - Zoom and view controls
- `/src/components/timeline/TimelineLayerManager.tsx` - Layer management UI
- `/src/components/timeline/ViewModeSwitcher.tsx` - Day/week/month selector
- `/src/components/timeline/CompletedItemsToggle.tsx` - Show/hide completed items
- `/src/components/timeline/AIGoalPlanner.tsx` (21KB) - AI-powered goal planning

**Magnetic Timeline:**
- `/src/components/magnetic-timeline/MagneticTimeline.tsx` (235 lines) - Container component
- `/src/components/magnetic-timeline/MagneticTimelineBar.tsx` (244 lines) - Horizontal 24-hour bar
- `/src/components/magnetic-timeline/ToolboxPanel.tsx` (4.8KB) - Template-based creation

### 9.2 Hook Files

- `/src/hooks/useTimeline.ts` (442 lines) - Standard timeline state management
- `/src/hooks/useMagneticTimeline.ts` (372 lines) - Magnetic timeline state management
- `/src/hooks/useLayers.ts` (192 lines) - Layer CRUD operations
- `/src/hooks/useTimelineSync.ts` (93 lines) - Real-time Supabase synchronization
- `/src/hooks/useAIGoalPlanner.ts` - AI planning integration

### 9.3 Utility Files

- `/src/lib/timelineUtils.ts` (559 lines) - Standard timeline utilities
- `/src/lib/magneticTimelineUtils.ts` (443 lines) - Magnetic timeline algorithms
- `/src/lib/timelineConstants.ts` (115 lines) - Configuration constants

### 9.4 Database Files

**Migrations:**
- `/supabase/migrations/20251023120000_timeline_manager.sql` - Initial schema
- `/supabase/migrations/20251031000000_enhanced_timeline_manager.sql` - Advanced features
- `/supabase/migrations/20251031000001_setup_me_timeline.sql` - Auto-create "Me" timeline
- `/supabase/migrations/20251031000002_seed_timeline_templates.sql` - System templates
- `/supabase/migrations/20251031035250_create_magnetic_timeline_table.sql` - Magnetic timeline

**Types:**
- `/src/integrations/supabase/types.ts` - Auto-generated TypeScript types

### 9.5 Page Files

- `/src/pages/Timeline.tsx` - Main timeline page (combines both timelines)

---

## Appendix A: Glossary

**Magnetic Timeline:** A gap-free, 24-hour timeline that automatically adjusts item positions and durations to maintain continuous coverage.

**Magnetic Reflow:** Algorithm that eliminates gaps by shifting and expanding/compressing timeline items.

**Logjam:** Status for timeline items that are past their end time but not completed, indicating they're blocking progress.

**NOW Line:** Red vertical line in the timeline indicating the current moment in time, fixed at 30% from the left edge.

**Locked Item:** Timeline item that cannot be moved or compressed during magnetic reflow (e.g., sleep, meetings).

**Flexible Item:** Timeline item that can be compressed or expanded during magnetic reflow to fill gaps.

**Parked Item:** Timeline item temporarily removed from the timeline but preserved for future restoration.

**Blade Tool:** Feature for splitting a timeline item into two parts at a specific time point (activated with 'B' key).

**Layer:** Horizontal row in the standard timeline for organizing items by context (work, personal, health, etc.).

**Template:** Reusable timeline item configuration with predefined duration, color, and other attributes.

---

## Appendix B: Migration Path from Other Systems

### From Google Calendar

**Export from Google Calendar:**
1. Export calendar as .ics file
2. Parse .ics file to extract events

**Import to AI Query Hub:**
```typescript
async function importFromGoogleCalendar(icsFile: File) {
  const events = parseICS(icsFile);

  for (const event of events) {
    await addItem(
      defaultLayerId,
      event.summary,
      event.start,
      calculateDuration(event.start, event.end),
      randomColor()
    );
  }
}
```

### From Microsoft Outlook

**Similar process using .ics export**

### From Notion/Todoist/Asana

**CSV Export → Import:**
```typescript
async function importFromCSV(csvFile: File) {
  const rows = parseCSV(csvFile);

  for (const row of rows) {
    await addItem(
      defaultLayerId,
      row.title,
      row.dueDate || new Date().toISOString(),
      row.estimatedMinutes || 60,
      randomColor()
    );
  }
}
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-31 | Technical Analysis Team | Initial comprehensive specification document |

---

**End of Technical Specification**
