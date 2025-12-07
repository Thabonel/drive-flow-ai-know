# Timeline Fixes Handover - December 8, 2025

## Summary

This session fixed critical issues with timeline item updates, particularly the "Mark as Done" functionality that was failing with 404 errors.

---

## Issues Fixed

### 1. Auto-Parked Items Causing 404 Errors

**Problem:** When a logjam item was 8+ hours overdue, the auto-park logic would move it to `timeline_parked_items`. If a user had the action menu open during this time and clicked "Mark as Done", it would fail with a 404 error because the item no longer existed in `timeline_items`.

**Solution:** Updated `updateItem` function in `TimelineContext.tsx` to:
- Use `.maybeSingle()` instead of `.single()` to handle null responses gracefully
- Detect 404/PGRST116 error codes and treat them as "item not found"
- Show helpful toast: "Item no longer available - This item was moved to Parked Items"
- Return boolean success indicator so callers can decide whether to show success toast

**Files Changed:**
- `src/contexts/TimelineContext.tsx` - `updateItem`, `completeItem`, `rescheduleItem` functions

**Commits:**
- `fd91bdb` - fix: Handle auto-parked items gracefully in updateItem
- `1ab60b7` - fix: Prevent duplicate/conflicting toasts on auto-parked items
- `eceb7fa` - fix: Handle 404 errors in updateItem for edge cases

---

### 2. Missing `time_tracking` Table

**Problem:** A trigger `track_task_completion()` was trying to insert into `time_tracking` table when items were marked as complete, but the table didn't exist.

**Solution:** Created the table:

```sql
CREATE TABLE public.time_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID,
  task_title TEXT,
  task_type TEXT,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  day_of_week INTEGER,
  hour_of_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE time_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time tracking" ON time_tracking
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own time tracking" ON time_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

### 3. Trigger Function with Empty Search Path

**Problem:** The `track_task_completion()` function had `SET search_path TO ''` (empty), which prevented it from finding the `time_tracking` table even after it was created.

**Solution:** Recreated the function with proper search path:

```sql
DROP FUNCTION IF EXISTS public.track_task_completion() CASCADE;

CREATE OR REPLACE FUNCTION public.track_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  duration_minutes INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    start_time := NEW.start_time;

    IF NEW.completed_at IS NOT NULL AND start_time IS NOT NULL THEN
      duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - start_time)) / 60;

      IF duration_minutes >= 1 AND duration_minutes <= 720 THEN
        INSERT INTO public.time_tracking (
          user_id, task_id, task_title, task_type,
          estimated_duration_minutes, actual_duration_minutes,
          completed_at, day_of_week, hour_of_day
        ) VALUES (
          NEW.user_id, NEW.id, NEW.title,
          CASE WHEN NEW.is_meeting THEN 'meeting' ELSE 'work' END,
          NEW.planned_duration_minutes, duration_minutes,
          NEW.completed_at,
          EXTRACT(DOW FROM NEW.completed_at),
          EXTRACT(HOUR FROM NEW.completed_at)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_completion
  AFTER UPDATE ON public.timeline_items
  FOR EACH ROW
  EXECUTE FUNCTION public.track_task_completion();
```

---

## Architecture Notes

### Auto-Park Flow

1. `tick` function runs every animation frame in `TimelineContext`
2. Checks if items are 8+ hours overdue via `shouldBeAutoPark()`
3. If overdue:
   - Inserts into `timeline_parked_items`
   - Deletes from `timeline_items`
   - Shows toast notification
4. Race condition can occur if user has action menu open during auto-park

### updateItem Pattern

```typescript
const updateItem = useCallback(async (itemId: string, updates: Partial<TimelineItem>): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('timeline_items')
      .update(updates)
      .eq('id', itemId)
      .eq('user_id', user?.id || '')
      .select()
      .maybeSingle();

    // Handle "no rows found" errors (404, PGRST116) - item was auto-parked
    if (error) {
      const isNotFoundError = error.code === 'PGRST116' ||
                              error.code === '404' ||
                              (error as any).status === 404;

      if (isNotFoundError) {
        // Item was auto-parked - handle gracefully
        setItems(prev => prev.filter(item => item.id !== itemId));
        toast({ title: 'Item no longer available', description: 'This item was moved to Parked Items' });
        await fetchParkedItems();
        return false;
      }
      throw error;
    }

    if (!data) {
      // Same handling for null data
      return false;
    }

    setItems(prev => prev.map(item => item.id === itemId ? { ...item, ...data } : item));
    return true;
  } catch (error) {
    // Show error toast
    return false;
  }
}, [user, toast, fetchItems, fetchParkedItems]);
```

---

## Memory Graph Entities Created

The following entities were saved to the memory MCP server:

1. **TimelineContext_AutoPark_Fix** (BugFix)
   - Details of the 404 error fix
   - Root cause analysis
   - Solution implementation

2. **Timeline_AutoPark_Logic** (Architecture)
   - How auto-parking works
   - Trigger conditions (8+ hours overdue)
   - Database tables involved

3. **Supabase_MaybeSingle_Pattern** (CodePattern)
   - When to use `.maybeSingle()` vs `.single()`
   - Pattern for handling potentially missing rows

---

## Database Tables Summary

### Timeline Tables
- `timeline_items` - Active timeline items
- `timeline_parked_items` - Auto-parked/manually parked items
- `timeline_settings` - User preferences (zoom, lock, etc.)
- `timeline_layers` - Timeline lanes/tracks
- `time_tracking` - Completion tracking for analytics

### Key Relationships
- All tables have `user_id` FK with RLS policies
- `track_task_completion` trigger fires on `timeline_items` UPDATE

---

## Testing Checklist

- [ ] Add a new timeline item
- [ ] Mark item as done (should complete and track)
- [ ] Let item go to logjam (1+ hour overdue)
- [ ] Mark logjam item as done
- [ ] Let item auto-park (8+ hours overdue)
- [ ] Try to interact with auto-parked item (should show graceful message)
- [ ] Check `time_tracking` table has records

---

## Known Issues / Future Work

1. **Pre-push hook syntax error** - The git pre-push hook has a syntax error but doesn't block pushes
2. **Chunk size warning** - Build output is >500KB, consider code splitting
3. **Plan-to-Timeline feature** - Partially implemented (see `PLAN_TO_TIMELINE_FEATURE.md`)

---

## Contact

For questions about this work, reference:
- This handover document
- Memory graph entities (search for "TimelineContext_AutoPark_Fix")
- Git commits: `fd91bdb`, `1ab60b7`, `eceb7fa`
