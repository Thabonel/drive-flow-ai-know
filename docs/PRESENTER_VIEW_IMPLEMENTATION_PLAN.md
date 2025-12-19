# Dual-Display Presenter View - Implementation Plan

## Overview
Add professional dual-display presenter mode to PitchDeck where presenter sees controls/notes on laptop while audience sees clean slides on external display.

## User Requirements
- **Two modes**: Keep existing "Start Presentation" (single-view) + add "Start Presenter View" (dual-display)
- **Presenter view shows**: Current slide, next slide preview, speaker notes, timer, controls
- **Audience view shows**: Clean fullscreen slides only (no UI), uses Fullscreen API
- **Single display**: Ask user which view to show on their screen

## Architecture Decision
- Separate route `/presentation-audience/:sessionId` for audience view
- BroadcastChannel API for real-time sync (localStorage fallback for older browsers)
- Session ID prevents conflicts between multiple presentations

---

## Implementation Steps

### Phase 1: Core Infrastructure (30%)

#### 1. Create Presentation Sync Utility
**File**: `src/lib/presentationSync.ts` (NEW - 150 lines)

**Purpose**: Cross-window communication with BroadcastChannel + localStorage fallback

**Key exports**:
```typescript
interface PresentationState {
  sessionId: string;
  currentSlideIndex: number;
  presentationStartTime: number;
  isActive: boolean;
}

type PresentationMessage =
  | { type: 'SLIDE_CHANGE'; index: number }
  | { type: 'EXIT_PRESENTATION'; sessionId: string }
  | { type: 'SYNC_STATE'; state: PresentationState };

export const createPresentationSync = (sessionId: string, isPresenter: boolean)
export const generateSessionId = () => crypto.randomUUID()
```

**Implementation**:
- Feature detect BroadcastChannel: `'BroadcastChannel' in window`
- Channel name: `presentation-sync-${sessionId}`
- Fallback to localStorage + storage events for Safari < 15.4
- Heartbeat every 2 seconds to detect presenter window close

#### 2. Create Audience View Page
**File**: `src/pages/PresentationAudience.tsx` (NEW - 120 lines)

**Purpose**: Minimal fullscreen slide renderer

**Key features**:
- Load presentation data from localStorage
- Subscribe to PresentationSync for slide changes
- Auto-request fullscreen on mount (with fallback)
- Auto-close when presenter exits
- No UI chrome (clean slides only)

**Data flow**:
1. Read `presentation-data-${sessionId}` from localStorage (set by presenter)
2. Listen for SLIDE_CHANGE messages
3. Update currentSlideIndex and re-render slide

#### 3. Add Route
**File**: `src/App.tsx` (MODIFY - add 1 route)

```tsx
import PresentationAudience from "./pages/PresentationAudience";

<Route
  path="/presentation-audience/:sessionId"
  element={<PresentationAudience />}
/>
```

---

### Phase 2: Presenter View Component (30%)

#### 4. Create Presenter View Component
**File**: `src/components/PresenterView.tsx` (NEW - 200 lines)

**Layout**:
```
┌────────────────────────────────────────────┐
│  Timer: 12:34    Slide 5/12      [Exit]   │  Header
├──────────────────┬─────────────────────────┤
│  CURRENT SLIDE   │   NEXT PREVIEW         │  Main
│  (60% width)     │   (40% width)          │  (Grid)
├──────────────────┴─────────────────────────┤
│  SPEAKER NOTES (always visible, scrollable)│  Notes
├────────────────────────────────────────────┤
│  [← Previous]         [Next →]             │  Controls
└────────────────────────────────────────────┘
```

**Props**:
- `pitchDeck`: PitchDeck
- `currentSlideIndex`: number
- `onSlideChange`: (index: number) => void
- `onExit`: () => void
- `presentationStartTime`: number

**Features**:
- Timer updates every 1000ms
- Keyboard navigation (arrows, ESC)
- Button refs for keyboard delegation
- Extract SlideRenderer for code reuse

---

### Phase 3: Integration (25%)

#### 5. Update PitchDeck.tsx
**File**: `src/pages/PitchDeck.tsx` (MODIFY - multiple sections)

**New state**:
```tsx
const [presenterSessionId, setPresenterSessionId] = useState<string | null>(null);
const [audienceWindow, setAudienceWindow] = useState<Window | null>(null);
const [showDisplayDialog, setShowDisplayDialog] = useState(false);
```

**New function - handleStartPresenterView()**:
```tsx
1. Validate pitchDeck exists
2. Generate sessionId with crypto.randomUUID()
3. Store presentation data in localStorage
4. Detect multiple displays (heuristic: screen.availWidth > window.innerWidth * 1.5)
5. If single display: Show dialog asking user which view to show
6. If multiple displays: Open audience window with hints for external placement
7. Initialize presentation state and broadcast SYNC_STATE
```

**Update navigation handlers**:
```tsx
handleNextSlide() → also broadcast SLIDE_CHANGE if presenterSessionId exists
handlePreviousSlide() → also broadcast SLIDE_CHANGE if presenterSessionId exists
handleExitPresentation() → broadcast EXIT_PRESENTATION, close audience window, cleanup
```

**Update presentation rendering** (around line 1556):
```tsx
{isPresentationMode && pitchDeck && presenterSessionId && (
  // Presenter view mode (dual-window)
  <PresenterView ... />
)}

{isPresentationMode && pitchDeck && !presenterSessionId && (
  // Keep existing single-view fullscreen mode unchanged
  <div ref={presentationRef} className="fixed inset-0 bg-black z-50">
    {/* Existing code */}
  </div>
)}
```

#### 6. Add UI Elements
**File**: `src/pages/PitchDeck.tsx` (add to existing button section around line 1324)

**Add button** (after "Start Presentation"):
```tsx
<Button
  onClick={handleStartPresenterView}
  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
  size="lg"
>
  <Eye className="h-5 w-5 mr-2" />
  Start Presenter View
</Button>
```

**Add display choice dialog**:
```tsx
{showDisplayDialog && (
  <Dialog> {/* Show modal asking: Presenter View or Audience View? */} </Dialog>
)}
```

---

### Phase 4: Edge Cases (10%)

#### 7. Handle Edge Cases

**Popup blocker**:
- Detect: `if (!newWindow || newWindow.closed)`
- Show error toast with instructions
- Provide "Enable Popups" dialog

**Audience window closed early**:
- Check every 1 second if `audienceWindow.closed`
- Show toast with "Reopen" action button

**Fullscreen denied**:
- Catch error in requestFullscreen()
- Fallback to CSS fullscreen
- Show toast: "Press F11 for fullscreen"

**BroadcastChannel unavailable**:
- Feature detect in presentationSync.ts
- Auto-fallback to localStorage + storage events

---

### Phase 5: Polish (5%)

#### 8. Final touches

**Update help text**:
- Add info about presenter view mode
- Explain dual-display setup

**Testing**:
- Test on multiple displays
- Test single display mode
- Test all edge cases
- Verify backward compatibility (existing "Start Presentation" unchanged)

---

## Critical Files Summary

### Files to CREATE (3 new):
1. `src/lib/presentationSync.ts` - Cross-window communication
2. `src/pages/PresentationAudience.tsx` - Clean audience view
3. `src/components/PresenterView.tsx` - Rich presenter interface

### Files to MODIFY (2 existing):
4. `src/pages/PitchDeck.tsx` - Add dual-window orchestration
5. `src/App.tsx` - Add audience route

---

## Implementation Order

**Day 1**: Create infrastructure files (presentationSync.ts, PresentationAudience.tsx, route)
**Day 2**: Create PresenterView.tsx component with layout
**Day 3**: Integrate into PitchDeck.tsx (handlers, state, rendering)
**Day 4**: Add edge case handling (popup blocker, window close, dialogs)
**Day 5**: Testing, polish, documentation

---

## Key Technical Decisions

✅ **BroadcastChannel** (primary) for <50ms sync latency
✅ **localStorage fallback** for Safari < 15.4 compatibility
✅ **Separate route** for clean window.open() integration
✅ **Session ID** prevents multi-presentation conflicts
✅ **Heuristic display detection** (Window Placement API not ready)
✅ **Backward compatible** - existing mode unchanged

---

## Testing Checklist

- [ ] Dual-display: Open both windows, navigate slides, verify sync
- [ ] Single-display: Show dialog, choose view, verify behavior
- [ ] Popup blocker: Block popups, verify error and recovery
- [ ] Window close: Close audience early, verify warning and reopen
- [ ] Fullscreen deny: Deny permission, verify fallback works
- [ ] Backward compat: Use "Start Presentation", verify unchanged
- [ ] Cross-browser: Test Chrome, Firefox, Safari (modern + legacy)

---

**Implementation Complexity**: Medium
**Estimated Time**: 3-5 days
**Risk Level**: Low (backward compatible, graceful fallbacks)
