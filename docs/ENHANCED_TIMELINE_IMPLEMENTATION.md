# Enhanced Timeline Manager - Implementation Guide

This document provides complete implementation guidance for the Enhanced Timeline Manager with "Me" timeline, magnetic timeline logic, templates, and AI assistant features.

---

## ✅ COMPLETED

### Phase 0: Database Schema (100% Complete)
- ✅ Migration 1: New tables (templates, goals, goal_items, ai_sessions)
- ✅ Migration 2: "Me" timeline setup with auto-creation for all users
- ✅ Migration 3: 20 system default templates seeded
- ✅ TypeScript types updated in `src/lib/timelineUtils.ts`
- ✅ All RLS policies, indexes, and triggers configured
- ✅ Helper functions for goal calculation and magnetic validation

**Deployed**: Migrations committed at `12dcba0`

---

## 🚀 IMPLEMENTATION ROADMAP

### PHASE 1: Core Magnetic Timeline Logic

#### Priority 1: useMagneticTimeline Hook
**File**: `src/hooks/useMagneticTimeline.ts`

**Purpose**: Handles all magnetic timeline operations where items must snap together with no gaps

**Key Functions Needed**:
```typescript
// Enforces no gaps - items snap together
magneticSnap(draggedItem, allItems, dropPosition)

// Ensures timeline = exactly 1440 minutes
validateTimelineContinuity(layerId)

// Proportionally shrinks flexible items when overflow occurs
compressFlexibleItems(overflow, affectedItems)

// Handles reordering via drag-drop
reorderItems(fromIndex, toIndex, layerId)

// Finds items affected by a change (ripple effect)
getRippleAffectedItems(changedItem, allItems)

// Calculates insertion point and affected items
calculateInsertion(dragPosition, existingItems)
```

**State Management**:
- Track dragging state
- Preview insertions before commit
- Handle optimistic UI updates with rollback
- Maintain 24-hour constraint validation

**Implementation Steps**:
1. Create magnetic item positioning algorithm
2. Implement gap detection and auto-snap
3. Add compression logic for flexible items
4. Build ripple effect calculator
5. Add optimistic UI with Supabase sync

---

### PHASE 2: Magnetic Timeline Component

####Priority 2: MagneticTimeline Component
**File**: `src/components/timeline/MagneticTimeline.tsx`

**Extends**: TimelineCanvas with magnetic-specific behavior

**New Features**:
1. **Visual Indicators**:
   - Insertion preview line (glowing blue line between items)
   - Compression animation when items shrink
   - Red pulsing when timeline > 24 hours
   - Lock icons on locked items

2. **Drag Modes**:
   - **Edge drag** (resize): Grab left/right edge to change duration
   - **Center drag** (reorder): Grab middle to move position in sequence
   - **No position drag**: Magnetic timeline doesn't allow free positioning

3. **Time Labels**:
   - Start/end times on each item
   - Total duration display at bottom
   - "⚠️ 24:30 (30m over)" warning if exceeds 24h

4. **Animations**:
   - Smooth 300ms transitions using `transform: translateX()`
   - `requestAnimationFrame` for 60fps performance
   - Stagger animations when multiple items affected

**Implementation**:
```typescript
// Pseudo-code structure
const MagneticTimeline = () => {
  const { items, compressFlexibleItems, reorderItems } = useMagneticTimeline();
  const [dragMode, setDragMode] = useState<'resize' | 'reorder' | null>(null);
  const [insertionPreview, setInsertionPreview] = useState<number | null>(null);

  const handleDragStart = (item, mode) => {
    setDragMode(mode);
    // Show ghost image
  };

  const handleDrag = (e) => {
    if (dragMode === 'reorder') {
      // Calculate insertion point
      // Show preview line
    } else {
      // Calculate new duration
      // Check if exceeds 24h
    }
  };

  const handleDrop = async () => {
    if (exceedsLimit) {
      // Show compression modal
    } else {
      // Commit change
    }
  };

  return (
    <svg>
      {/* Items with smooth animations */}
      {/* Insertion preview line */}
      {/* Total duration indicator */}
    </svg>
  );
};
```

---

### PHASE 3: Toolbox & Drag-and-Drop

#### Priority 3: TimelineToolbox Component
**File**: `src/components/timeline/TimelineToolbox.tsx`

**Features**:
1. Collapsible sidebar (default open)
2. Category sections (Rest, Meals, Work, Personal, etc.)
3. Search/filter templates
4. Drag to timeline to create items

**Layout**:
```
┌─────────────────────┐
│ 🔍 Search templates │
├─────────────────────┤
│ 😴 REST             │
│ ├─ Sleep (9h) 🌙   │
│ └─ Break (15m) ☕  │
├─────────────────────┤
│ 🍽️ MEALS           │
│ ├─ Breakfast (30m) │
│ ├─ Lunch (45m)     │
│ └─ Dinner (60m)    │
├─────────────────────┤
│ 💼 WORK             │
│ ├─ Work Block (4h) │
│ └─ Meeting (1h)    │
└─────────────────────┘
```

**Drag Implementation**:
```typescript
const TimelineTemplateItem = ({ template }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('template', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
    // Create ghost image
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 p-2 cursor-move hover:bg-blue-50"
    >
      <Icon name={template.icon} size={16} />
      <span>{template.name}</span>
      <span className="text-sm text-gray-500">({formatDuration(template.duration_minutes)})</span>
    </div>
  );
};
```

#### Priority 4: Drop Zone Integration
**Updates**: `MagneticTimeline.tsx`

**Drop Logic**:
```typescript
const handleDrop = async (e) => {
  const template = JSON.parse(e.dataTransfer.getData('template'));
  const dropPosition = calculateDropPosition(e.clientX);

  // Calculate if this would exceed 24h
  const totalDuration = currentItems.reduce((sum, item) => sum + item.duration_minutes, 0);
  const newTotal = totalDuration + template.duration_minutes;

  if (newTotal > 1440) {
    // Show compression modal
    const result = await showCompressionModal({
      overflow: newTotal - 1440,
      newItem: template,
      flexibleItems: items.filter(i => i.is_flexible)
    });

    if (result.action === 'compress') {
      await compressAndInsert(template, dropPosition, result.compressionMap);
    } else if (result.action === 'manual') {
      // Let user manually adjust
    } else {
      // Cancel
      return;
    }
  } else {
    // Insert directly
    await insertFromTemplate(template, dropPosition);
  }
};
```

**Compression Modal**:
```typescript
const CompressionModal = ({ overflow, newItem, flexibleItems, onConfirm, onCancel }) => {
  // Show which items will be compressed and by how much
  // Preview the compression visually
  // Offer 3 options: Auto-compress, Manual adjust, Cancel
};
```

---

### PHASE 4: Blade Tool

#### Priority 5: Blade Toolbar
**File**: `src/components/timeline/BladeToolbar.tsx`

**Tools**:
- 👆 Pointer (default)
- 🔪 Blade (split items)
- 🔍 Zoom (fit/zoom timeline)

**Blade Tool Workflow**:
1. Select blade tool → cursor changes to knife icon
2. Hover over item → show cut line preview at mouse position
3. Click → execute split:
   - Original item duration = start → cut point
   - New item = cut point → original end
   - Link via `parent_item_id`
   - Prompt for new segment name

**Implementation**:
```typescript
const splitItemAtPosition = async (item, clickPosition) => {
  const splitMinutes = calculateMinutesFromPosition(clickPosition);

  // Update original item
  await updateItem(item.id, {
    duration_minutes: splitMinutes,
    original_duration: item.duration_minutes // Store for potential merge
  });

  // Create new item from split point
  const newStartTime = addMinutes(item.start_time, splitMinutes);
  const newItem = await createItem({
    ...item,
    start_time: newStartTime,
    duration_minutes: item.duration_minutes - splitMinutes,
    parent_item_id: item.id,
    title: `${item.title} (Part 2)` // User can rename
  });

  return { original: item, new: newItem };
};
```

**Merge Function** (for undo):
```typescript
const mergeSplitItems = async (parent, child) => {
  if (parent.id !== child.parent_item_id) {
    throw new Error('Items not linked');
  }

  // Restore original duration
  await updateItem(parent.id, {
    duration_minutes: parent.original_duration || (parent.duration_minutes + child.duration_minutes),
    original_duration: null
  });

  // Delete child item
  await deleteItem(child.id);
};
```

---

### PHASE 5: Item Details Modal

#### Priority 6: ItemDetailsModal Component
**File**: `src/components/timeline/ItemDetailsModal.tsx`

**Opens on**: Double-click item

**Sections**:
1. **Basic Info**:
   - Title (editable input)
   - Duration (hours/minutes inputs)
   - Color picker
   - Category dropdown

2. **Magnetic Settings**:
   - 🔒 Locked Time toggle (prevents move/resize)
   - 🔄 Flexible toggle (allows compression)
   - Priority slider (affects compression order)

3. **Advanced**:
   - Notes/description textarea
   - Link to goal (dropdown of active goals)
   - Recurring options (if from template)
   - Created from template: [Template Name]

4. **Actions**:
   - **Auto-Fit** button
   - **Split** button (opens blade mode)
   - **Delete** button
   - **Save** / **Cancel**

**Auto-Fit Feature**:
```typescript
const handleAutoFit = async () => {
  // Calculate needed compression
  const currentTotal = sumDurations(allItems);
  const target = 1440;
  const overflow = currentTotal - target;

  if (overflow <= 0) {
    toast.info('Timeline already fits perfectly!');
    return;
  }

  // Show preview modal
  const compressionPlan = calculateOptimalCompression(allItems, overflow);

  const confirmed = await showCompressionPreview({
    plan: compressionPlan,
    totalShrink: overflow,
    affectedItems: compressionPlan.map(p => p.item)
  });

  if (confirmed) {
    await applyCompression(compressionPlan);
    animateCompression(compressionPlan);
  }
};
```

**Compression Algorithm**:
```typescript
const calculateOptimalCompression = (items, targetReduction) => {
  const flexibleItems = items.filter(i => i.is_flexible && !i.is_locked_time);
  const totalFlexible = flexibleItems.reduce((sum, i) => sum + i.duration_minutes, 0);

  // Proportional compression
  return flexibleItems.map(item => ({
    item,
    originalDuration: item.duration_minutes,
    newDuration: Math.floor(item.duration_minutes * (1 - targetReduction / totalFlexible)),
    reduction: item.duration_minutes - Math.floor(item.duration_minutes * (1 - targetReduction / totalFlexible))
  }));
};
```

---

### PHASE 6: AI Assistant

#### Priority 7: useAIAssistant Hook
**File**: `src/hooks/useAIAssistant.ts`

**Purpose**: Monitor timeline for unhealthy patterns and provide suggestions

**Detection Patterns**:
```typescript
const analyzeTimeline = (items) => {
  const issues = [];

  // Detect work blocks >4hrs without breaks
  const workBlocks = findConsecutiveItems(items, { category: 'work' });
  workBlocks.forEach(block => {
    if (block.totalMinutes > 240) { // 4 hours
      issues.push({
        type: 'work-overload',
        severity: 'medium',
        message: 'You have a 4+ hour work block without a break',
        suggestion: 'Consider adding a 15-minute break every 90-120 minutes',
        action: () => insertBreakItems(block)
      });
    }
  });

  // Detect sleep <7 hours
  const sleepItem = items.find(i => i.template_id === SLEEP_TEMPLATE_ID);
  if (sleepItem && sleepItem.duration_minutes < 420) { // 7 hours
    issues.push({
      type: 'insufficient-sleep',
      severity: 'high',
      message: `Only ${formatDuration(sleepItem.duration_minutes)} of sleep scheduled`,
      suggestion: 'Aim for 7-9 hours of sleep for optimal health',
      action: () => extendSleep(sleepItem, 480) // 8 hours
    });
  }

  // Detect no leisure time
  const leisureTime = items
    .filter(i => ['personal', 'social', 'learning'].includes(i.category))
    .reduce((sum, i) => sum + i.duration_minutes, 0);

  if (leisureTime < 120) { // <2 hours
    issues.push({
      type: 'no-leisure',
      severity: 'medium',
      message: 'Very little personal time scheduled',
      suggestion: 'Schedule at least 2 hours for hobbies, family, or relaxation',
      action: () => suggestLeisureActivities()
    });
  }

  // Detect skipped meals
  const mealTemplates = [BREAKFAST_ID, LUNCH_ID, DINNER_ID];
  const missedMeals = mealTemplates.filter(id =>
    !items.some(item => item.template_id === id)
  );

  if (missedMeals.length > 0) {
    issues.push({
      type: 'skipped-meals',
      severity: 'medium',
      message: `Missing ${missedMeals.length} meal(s) in your schedule`,
      suggestion: 'Regular meals are important for energy and focus',
      action: () => suggestMealTimes(missedMeals)
    });
  }

  return issues;
};
```

**Optimize Day Feature**:
```typescript
const optimizeDay = async (items) => {
  // Call AI query function
  const { data, error } = await supabase.functions.invoke('ai-query', {
    body: {
      query: `Analyze this daily schedule and suggest improvements for better work-life balance and health: ${JSON.stringify(items)}`,
      knowledge_base_id: null,
      context: 'timeline-optimization'
    }
  });

  if (error) throw error;

  // Parse AI response and apply suggestions
  const suggestions = parseAISuggestions(data.response);

  // Store in timeline_ai_sessions
  await supabase.from('timeline_ai_sessions').insert({
    user_id: user.id,
    session_type: 'optimize',
    input_prompt: JSON.stringify(items),
    ai_response: data.response,
    items_created: suggestions.itemsToCreate.length,
    items_modified: suggestions.itemsToModify.length,
    success: true
  });

  return suggestions;
};
```

#### Priority 8: AIAssistantTooltip Component
**File**: `src/components/timeline/AIAssistantTooltip.tsx`

**Appearance**:
- Small tooltip above problematic items
- Gentle fade-in animation
- Dismissible with X button
- "Tell me more" expands explanation
- "Apply suggestion" executes the fix

**Example**:
```tsx
const AIAssistantTooltip = ({ issue, onDismiss, onApply }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute z-50 p-3 bg-white border border-blue-200 rounded-lg shadow-lg max-w-xs animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{issue.message}</p>
          {expanded && (
            <p className="text-xs text-gray-600 mt-1">{issue.suggestion}</p>
          )}
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Tell me more
          </button>
        )}
        <button
          onClick={onApply}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
        >
          Apply suggestion
        </button>
      </div>
    </div>
  );
};
```

---

## 📦 DEPENDENCY REQUIREMENTS

### NPM Packages Needed
```bash
npm install lucide-react  # Already installed for icons
# No additional packages needed - using native HTML5 drag-and-drop
```

### Lucide Icons Used
- moon (sleep)
- sun (morning routine)
- coffee (breakfast, break)
- utensils (lunch)
- pizza (dinner)
- dumbbell (exercise)
- briefcase (work)
- car (commute)
- gamepad (leisure)
- book-open (reading)
- users (meeting)
- sparkles (meditation, AI)
- mail (email)
- heart (family)
- clipboard-list (preparation)
- graduation-cap (study)
- palette (hobby)
- home (chores)
- shopping-cart (errands)
- x (close)

---

## 🎯 IMPLEMENTATION ORDER

### Week 1: Core Magnetic Timeline
1. ✅ Database migrations
2. ✅ TypeScript types
3. ⏳ useMagneticTimeline hook
4. ⏳ MagneticTimeline component
5. ⏳ Basic testing

### Week 2: Toolbox & Drag-Drop
6. ⏳ TimelineToolbox component
7. ⏳ Drag-and-drop integration
8. ⏳ Compression modal
9. ⏳ Template management UI

### Week 3: Advanced Features
10. ⏳ Blade tool
11. ⏳ Item details modal
12. ⏳ Auto-fit algorithm
13. ⏳ Split/merge functionality

### Week 4: AI & Polish
14. ⏳ useAIAssistant hook
15. ⏳ AIAssistantTooltip component
16. ⏳ Optimize day feature
17. ⏳ Performance optimization
18. ⏳ Final testing

---

## 🧪 TESTING CHECKLIST

### Magnetic Timeline
- [ ] Items snap together with no gaps
- [ ] Total duration always displays correctly
- [ ] Red pulsing when > 24 hours
- [ ] Compression algorithm distributes proportionally
- [ ] Locked items cannot be moved/resized
- [ ] Flexible items compress as expected
- [ ] Animations run at 60fps
- [ ] Database sync works correctly

### Toolbox
- [ ] All 20 system templates display
- [ ] Search/filter works
- [ ] Drag creates ghost image
- [ ] Drop zones highlight
- [ ] Items created with correct defaults
- [ ] Category sections expand/collapse

### Blade Tool
- [ ] Cut line preview shows at mouse position
- [ ] Split creates two linked items
- [ ] Merge restores original duration
- [ ] Parent-child relationship maintained

### Item Details
- [ ] All fields editable
- [ ] Auto-fit calculates correctly
- [ ] Compression preview accurate
- [ ] Changes saved to database

### AI Assistant
- [ ] Detects work overload
- [ ] Detects insufficient sleep
- [ ] Detects skipped meals
- [ ] Detects lack of leisure
- [ ] Suggestions are helpful and actionable
- [ ] Optimize day provides meaningful improvements

---

## 📚 API REFERENCE

### Database Functions Available

```sql
-- Create item from template
SELECT create_item_from_template(
  user_id UUID,
  layer_id UUID,
  template_id UUID,
  start_time TIMESTAMPTZ,
  custom_title TEXT DEFAULT NULL
);

-- Validate magnetic timeline
SELECT validate_magnetic_timeline_continuity(layer_id UUID);

-- Calculate goal hours
SELECT calculate_goal_hours_completed(goal_id UUID);
```

### Supabase Queries

```typescript
// Fetch templates by category
const { data: templates } = await supabase
  .from('timeline_templates')
  .select('*')
  .eq('category', 'meal')
  .eq('is_system_default', true);

// Fetch user's Me timeline
const { data: meTimeline } = await supabase
  .from('timeline_layers')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_primary_timeline', true)
  .single();

// Fetch items for magnetic timeline
const { data: items } = await supabase
  .from('timeline_items')
  .select('*')
  .eq('layer_id', layerId)
  .neq('status', 'parked')
  .order('start_time', { ascending: true });
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: Items not snapping together
**Solution**: Ensure `timeline_type = 'magnetic'` on the layer

### Issue: Compression not working
**Solution**: Check that items have `is_flexible = true` and `is_locked_time = false`

### Issue: Template drag not working
**Solution**: Verify `draggable=true` and `onDragStart` handler set

### Issue: 24-hour validation failing
**Solution**: Run `validate_magnetic_timeline_continuity(layer_id)` to diagnose

### Issue: AI suggestions not appearing
**Solution**: Check console for errors, verify `ai-query` function is deployed

---

## 🔗 RESOURCES

- **Lucide Icons**: https://lucide.dev/icons/
- **HTML5 Drag and Drop**: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
- **React requestAnimationFrame**: https://react.dev/reference/react-dom/flushSync

---

This implementation guide provides the complete roadmap for building the Enhanced Timeline Manager. Each component is designed to work together while remaining modular and testable.
