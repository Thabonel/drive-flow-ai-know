# PRD — Pitch Deck Presentation Mode Enhancements

**Status:** Draft
**Created:** 2025-12-30
**Owner:** AI Agent

---

## 1) Context & Goals

### Problem Statement
The current pitch deck presentation mode has several UX friction points:
1. **Scrollbar visibility** - Scrollbars appear on slide content during full-screen presentation, breaking immersion
2. **Scroll position not reset** - When advancing slides, previous scroll position persists, causing content to appear cut off
3. **No presentation settings** - Users cannot configure auto-scroll or animation preferences without code changes
4. **No auto-scroll mode** - Manual navigation only, no hands-free presentation option
5. **Static slides** - No visual animations to engage audiences during presentation
6. **Single-frame generation** - AI only generates one image per slide, limiting animation possibilities

### Auto-Scroll Feature Clarification
**IMPORTANT**: This PRD addresses **two distinct auto-scroll features**:

1. **Content Auto-Scroll** (Phase 1 focus):
   - Automatically scrolls long text/content WITHIN a single slide at readable pace
   - Use case: Slides with bullet lists or paragraphs that exceed viewport height
   - Behavior: Smooth vertical scroll from top to bottom, then advance to next slide
   - Speed: Calibrated for reading comprehension (e.g., 50-100px/second)

2. **Slide Auto-Advance** (Phase 3):
   - Automatically advances to the NEXT SLIDE after a time interval
   - Use case: Hands-free demos, kiosk mode, automated presentations
   - Behavior: Fixed interval (slow: 5s, medium: 3s, fast: 2s), then jump to next slide
   - Speed: User-configurable via presentation settings

**Implementation Priority**: Content auto-scroll is PRIMARY (fixes current UX issue). Slide auto-advance is SECONDARY (nice-to-have enhancement).

### Who Is This For
- **Primary**: Business professionals presenting pitch decks to investors, clients, or stakeholders
- **Secondary**: Sales teams, educators, and anyone delivering presentations via AI Query Hub

### Why Now
- Recent button styling fixes show focus on presentation mode polish
- Anti-AI aesthetic guidelines demonstrate commitment to professional presentation quality
- Presentation mode is a differentiating feature for the platform

### In-Scope Goals
✅ **Phase 1**: Hide scrollbars and reset scroll position on slide changes (core UX fixes)
✅ **Phase 2**: Create presentation settings UI for user preferences
✅ **Phase 3**: Implement auto-scroll mode with configurable speed and pause-on-hover
✅ **Phase 4**: Add visual animations (minimal CSS, standard scroll-sync, expressive multi-frame)
✅ **Phase 5**: Update AI deck generation to create animation frames for expressive mode

### Out-of-Scope / Non-Goals
❌ Video export functionality
❌ Live audience polling/interaction features
❌ Multi-presenter collaboration during presentation
❌ Recording/replay functionality
❌ Third-party integrations (PowerPoint, Google Slides import/export enhancements)
❌ Mobile/tablet presentation mode (focus on desktop/projector experience)

---

## 2) Current State (Repo-informed)

### Existing Components

**Frontend (`src/pages/PitchDeck.tsx`):**
- **Preview Mode** (lines 1828-1920): Full-screen with START button overlay, navigation controls visible
- **Full Presentation Mode** (lines 1922-2009): Clean full-screen with minimal keyboard hints
- **Split-Screen Notes Mode** (lines 1925-1971): 70% slide / 30% speaker notes
- Current slide rendering at lines 1836-1862 (Preview), 1974-2000 (Presentation)

**Presenter View (`src/components/PresenterView.tsx`):**
- Dual-window mode with current slide (60%), next slide preview (40%), speaker notes
- Navigation controls at lines 197-220
- Timer and slide counter at lines 110-117

**Database (`supabase/migrations/20251219000000_create_pitch_decks_table.sql`):**
- `pitch_decks` table stores deck configuration and JSONB `deck_data`
- No dedicated `presentation_settings` table (will need to add)

**State Management:**
- Presentation state managed via `usePresentationMode()` context
- Slide navigation via `currentSlideIndex` state (line 65)
- Timer tracked via `presentationStartTime` and `elapsedSeconds` (lines 67-68)

### Current Scroll Behavior Issue
**Location**: Lines 1929-1999 (Full Presentation Mode)
- Content wrapped in `overflow-y-auto` divs (lines 1974, 1995)
- No scrollbar hiding CSS
- No scroll position reset logic on slide change

### Identified Risks
1. **Performance**: Auto-scroll intervals may impact battery life on laptops
2. **Animation overhead**: Multi-frame animations increase AI generation cost (Phase 5)
3. **State persistence**: Presentation settings need durable storage (localStorage vs database)
4. **Browser compatibility**: CSS scrollbar hiding varies across browsers

### Assumptions
- ASSUMPTION: Users will primarily use presentation mode on modern Chrome/Firefox/Safari
  - Verification: Check browser analytics in production
- ASSUMPTION: Content auto-scroll speed should default to 75px/second for readability
  - Verification: User testing with sample long-form slides
- ASSUMPTION: Slide auto-advance speed should default to "medium" (3 seconds per slide)
  - Verification: A/B test with sample decks
- ASSUMPTION: Animation frames will be separate slides in deck_data structure
  - Verification: Review with product owner if this affects slide numbering UX

### Visual Generation Guidelines
**Reference**: Anti-AI Aesthetic Guidelines (implemented in `supabase/functions/generate-pitch-deck/index.ts` lines 407-433)

When generating multi-frame animations (Phase 5), all image generation must adhere to:
- **NEVER** use purple, violet, indigo, or gold/bronze colors
- **NEVER** suggest purple-to-blue gradients or neon colors
- **PREFER** warm earth tones, classic navy, forest green, terracotta, or brand-specific colors
- **AVOID** generic stock photo concepts and AI-typical visual tropes

These constraints are enforced in the AI generation prompt to ensure professional, non-AI-looking visuals.

---

## 3) User Stories (Few, sharp)

1. **As a presenter**, I want scrollbars hidden during full-screen presentation, so that the visual experience is clean and professional.

2. **As a presenter**, I want each slide to start at the top when I navigate to it, so that the full content is visible without manual scrolling.

3. **As a presenter with long slides**, I want content to auto-scroll smoothly within the slide at a readable pace, so that audiences can read all content without me manually scrolling.

4. **As a presenter doing hands-free demos**, I want slides to auto-advance after a configurable time interval, so that I can walk away from the keyboard during automated presentations.

5. **As a presenter**, I want to pause auto-scroll (both content and slide advance) by hovering my mouse, so that I can spend extra time on important slides without exiting auto-scroll mode.

6. **As a visual storyteller**, I want to choose between minimal, standard, or expressive animation styles, so that my pitch deck matches my presentation energy level.

7. **As a content creator**, I want the AI to generate multi-frame animation sequences for key slides, so that complex ideas can be revealed progressively during presentation.

8. **As a repeat user**, I want my presentation settings saved across sessions, so that I don't reconfigure auto-scroll speed every time.

---

### Keyboard Shortcuts Reference

| Key | Action | Context |
|-----|--------|---------|
| **Space** | Pause/Resume auto-scroll OR advance to next slide (manual mode) | Presentation mode |
| **S** | Open presentation settings dialog | Presentation mode |
| **ESC** | Exit presentation mode | Presentation mode |
| **Arrow Left** | Previous slide (manual navigation) | Presentation mode |
| **Arrow Right** | Next slide (manual navigation) | Presentation mode |
| **Home** | Jump to first slide | Presentation mode |
| **End** | Jump to last slide | Presentation mode |
| **N** | Toggle split-screen notes view | Full presentation mode |
| **PageUp** | Previous slide (alternative) | Presentation mode |
| **PageDown** | Next slide (alternative) | Presentation mode |

**Note**: These shortcuts are already implemented (see PitchDeck.tsx lines 152-231). Phase 2 will surface them in a help overlay accessible via '?' key.

---

## 4) Success Criteria (Verifiable)

### Phase 1: Core UX Fixes
- [ ] Scrollbars completely hidden in full-screen presentation mode (all browsers)
- [ ] Scroll position resets to top (scrollTop = 0) on every slide change
- [ ] No layout shift or visual jank when resetting scroll position
- [ ] Works in both Preview Mode and Full Presentation Mode

### Phase 2: Settings UI
- [ ] Settings icon/button accessible from presentation controls (not obtrusive)
- [ ] Settings dialog contains: content auto-scroll toggle, slide auto-advance toggle, animation style selector, speed controls
- [ ] Settings persist in localStorage (or database if user authenticated)
- [ ] Settings dialog accessible via keyboard shortcut ('S' key)
- [ ] Help overlay accessible via '?' key showing keyboard shortcuts table
- [ ] Settings apply immediately on save without page refresh

### Phase 3: Auto-Scroll Mode

**Content Auto-Scroll** (priority):
- [ ] Content scrolls smoothly within slide at readable pace (default: 75px/second)
- [ ] Scrolling pauses at bottom of content, waits 2s, then advances to next slide
- [ ] Speed configurable in settings (slow: 50px/s, medium: 75px/s, fast: 100px/s)
- [ ] Only activates on slides where content exceeds viewport height
- [ ] Hovering mouse pauses content scroll (visual indicator shows "Paused")

**Slide Auto-Advance** (secondary):
- [ ] Slides auto-advance at configured interval (slow: 5s, medium: 3s, fast: 2s)
- [ ] Progress indicator shows time until next slide (circular countdown)
- [ ] Hovering mouse pauses slide advance (visual indicator shows "Paused")
- [ ] Mouse leave resumes auto-advance from remaining time
- [ ] ESC key exits auto-scroll mode (returns to manual navigation)
- [ ] Auto-advance respects slide count (stops at last slide, optionally loops)

### Phase 4: Visual Animations
- [ ] **Minimal**: Subtle fade-in transitions (CSS only, 300-500ms duration)
- [ ] **Standard**: Content reveals synchronized with scroll progress (scroll-linked animations)
- [ ] **Expressive**: Multi-frame animations play in sequence (frame rate: 1-2s per frame)
- [ ] Animations do not cause performance issues (60fps target)
- [ ] Animations can be disabled mid-presentation (fallback to static slides)

### Phase 5: AI Animation Frame Generation
- [ ] AI generates 2-5 frames per slide for expressive mode (configurable)
- [ ] Frames represent progressive build-up (e.g., chart bars adding incrementally)
- [ ] Frame order preserved in deck_data JSONB structure
- [ ] Frames distinguishable from main slides in UI (e.g., slide 3.1, 3.2, 3.3)
- [ ] Fallback to single frame if generation fails

### Edge Cases
- [ ] Content auto-scroll skips slides with short content (no overflow)
- [ ] Slide auto-advance and content auto-scroll work together (content scrolls first, then slide advances)
- [ ] Settings UI works when no deck is loaded (shows defaults)
- [ ] Animation performance degrades gracefully on low-end devices
- [ ] Multi-frame slides render correctly in Presenter View (show all frames or current frame?)
- [ ] Share links include presentation settings as URL params (optional)
- [ ] Keyboard navigation (arrow keys) overrides auto-scroll temporarily

### Performance Constraints
- [ ] Full-screen presentation mode loads in < 1s (time-to-interactive)
- [ ] Auto-scroll timer accuracy within ±200ms
- [ ] Animation frame transitions maintain 60fps
- [ ] Settings dialog opens in < 100ms

### UX Constraints
- [ ] Presentation controls remain accessible during auto-scroll
- [ ] Visual feedback for all user interactions (hover, click, pause)
- [ ] Keyboard shortcuts documented in UI (tooltip or help overlay)

---

## 5) Test Plan (Design BEFORE build)

### Required Test Categories

**Unit Tests** (Phase 1, 2, 3, 4):
- Scroll position reset logic
- Auto-scroll interval timing
- Settings persistence (localStorage read/write)
- Animation frame sequencing

**Integration Tests** (Phase 2, 3, 4, 5):
- Settings UI integration with presentation mode state
- Auto-scroll pause/resume on mouse events
- Animation style switching mid-presentation
- AI generation of multi-frame slides

**E2E Tests** (All Phases):
- Full presentation flow: generate deck → configure settings → start presentation → auto-scroll through slides
- Keyboard navigation during auto-scroll
- Settings persistence across page reload

### Concrete Test Cases Mapped to Success Criteria

| Test Case | Success Criteria | Type | Priority |
|-----------|-----------------|------|----------|
| **TC-P1-01**: Verify scrollbars hidden in Chrome, Firefox, Safari | Phase 1: Scrollbars hidden | Manual | P0 |
| **TC-P1-02**: Navigate slides, verify scrollTop = 0 each time | Phase 1: Scroll resets | Integration | P0 |
| **TC-P2-01**: Open settings dialog via 'S' key | Phase 2: Keyboard shortcut | E2E | P1 |
| **TC-P2-02**: Save settings, reload page, verify settings loaded | Phase 2: Settings persist | Integration | P0 |
| **TC-P3-01**: Enable auto-scroll, measure interval accuracy | Phase 3: Timer accuracy | Unit | P0 |
| **TC-P3-02**: Hover during auto-scroll, verify pause indicator | Phase 3: Pause on hover | Integration | P1 |
| **TC-P4-01**: Switch animation styles, verify CSS classes applied | Phase 4: Animation switching | Integration | P2 |
| **TC-P4-02**: Measure frame rate during expressive animations | Phase 4: 60fps target | Performance | P1 |
| **TC-P5-01**: Generate deck with expressive mode, verify frames | Phase 5: Multi-frame generation | E2E | P2 |
| **TC-P5-02**: Verify frame numbering in deck_data JSONB | Phase 5: Frame structure | Integration | P2 |

### What to Mock vs Integrate

**Mock:**
- AI Edge Function responses (use fixture data for multi-frame generation tests)
- Supabase database (use in-memory store for settings tests)
- Browser timers (use fake timers for auto-scroll interval tests)

**Integrate:**
- React component rendering (use React Testing Library)
- CSS animations (use real DOM, measure performance)
- localStorage (use real browser API, clear between tests)

### Test Data/Fixtures

**Fixture: `test/fixtures/sample-pitch-deck.json`**
```json
{
  "title": "Test Pitch Deck",
  "subtitle": "For Automated Testing",
  "slides": [
    { "slideNumber": 1, "title": "Short Slide", "content": "Minimal content" },
    { "slideNumber": 2, "title": "Long Slide", "content": "Lorem ipsum... (2000+ chars)" },
    { "slideNumber": 3, "title": "Image Slide", "imageData": "data:image/png;base64,..." }
  ]
}
```

**Fixture: `test/fixtures/multi-frame-slide.json`**
```json
{
  "slideNumber": 4,
  "frames": [
    { "frameNumber": 1, "imageData": "..." },
    { "frameNumber": 2, "imageData": "..." },
    { "frameNumber": 3, "imageData": "..." }
  ]
}
```

### Deterministic Integration Suite

**Phase 1 Integration Test:**
```typescript
describe('Scroll Position Reset', () => {
  it('resets scrollTop to 0 when navigating to next slide', () => {
    // 1. Render presentation mode with long slide
    // 2. Scroll to bottom of slide
    // 3. Click Next button
    // 4. Assert scrollTop === 0 on new slide
  });
});
```

**Phase 3 Integration Test:**
```typescript
describe('Auto-Scroll Pause on Hover', () => {
  it('pauses auto-scroll when mouse enters slide area', () => {
    // 1. Enable auto-scroll (3s interval)
    // 2. Wait 1.5s, hover mouse over slide
    // 3. Assert "Paused" indicator visible
    // 4. Wait 3s, assert slide has NOT advanced
    // 5. Mouse leave
    // 6. Assert slide advances after remaining 1.5s
  });
});
```

---

## 6) Implementation Plan (Small slices)

### Phase 1: Core UX Fixes (Hide Scrollbar, Reset Scroll)

**Slice 1.1: Hide scrollbars via CSS**
- **What changes**: Add CSS to hide scrollbars in presentation mode containers
- **Tests to add FIRST**:
  - Manual test: Open presentation mode, verify no scrollbar visible
  - Visual regression test (optional): Screenshot before/after
- **Commands**: `npm run dev` → manual test
- **Expected output**: Scrollbar hidden, content still scrollable via keyboard/wheel
- **Commit**: `feat(pitch-deck): hide scrollbars in presentation mode`

**Slice 1.2: Add scroll reset logic to slide navigation**
- **What changes**: In `handleNextSlide` and `handlePreviousSlide`, add `scrollTop = 0`
- **Tests to add FIRST**:
  - Unit test: Mock slide navigation, verify scroll reset called
  - Integration test: Render presentation, scroll slide, navigate, assert scrollTop === 0
- **Commands**: `npm test` → run unit tests
- **Expected output**: Tests pass, scroll position resets
- **Commit**: `feat(pitch-deck): reset scroll position on slide change`

**Slice 1.3: Apply scroll reset to keyboard navigation**
- **What changes**: Add scroll reset to `ArrowRight`, `ArrowLeft`, `Home`, `End` handlers
- **Tests to add FIRST**:
  - Integration test: Simulate keyboard events, verify scroll resets
- **Commands**: `npm test`
- **Expected output**: All navigation methods reset scroll
- **Commit**: `feat(pitch-deck): reset scroll on keyboard navigation`

---

### Phase 2: Presentation Settings UI

**Slice 2.1: Create PresentationSettings component**
- **What changes**: New component `src/components/PresentationSettings.tsx`
- **Tests to add FIRST**:
  - Unit test: Render component, verify default values displayed
- **Commands**: `npm run dev` → verify UI renders
- **Expected output**: Settings dialog with toggle, selectors, sliders (non-functional)
- **Commit**: `feat(pitch-deck): add presentation settings UI component`

**Slice 2.2: Integrate settings component with PitchDeck page**
- **What changes**: Add settings button to presentation controls, manage dialog state
- **Tests to add FIRST**:
  - Integration test: Click settings button, verify dialog opens
  - Integration test: Press 'S' key, verify dialog opens
- **Commands**: `npm test`
- **Expected output**: Settings accessible via button and keyboard
- **Commit**: `feat(pitch-deck): integrate settings dialog into presentation mode`

**Slice 2.3: Implement settings persistence (localStorage)**
- **What changes**: Add `usePresentationSettings` hook for read/write to localStorage
- **Tests to add FIRST**:
  - Unit test: Save settings, verify localStorage updated
  - Integration test: Save settings, reload component, verify settings loaded
- **Commands**: `npm test`
- **Expected output**: Settings persist across sessions
- **Commit**: `feat(pitch-deck): persist presentation settings in localStorage`

**Slice 2.4: Wire settings to presentation state**
- **What changes**: Connect settings values to presentation mode behavior (prepare for Phase 3)
- **Tests to add FIRST**:
  - Integration test: Change setting, verify state updates in parent component
- **Commands**: `npm test`
- **Expected output**: Settings changes propagate to presentation logic
- **Commit**: `feat(pitch-deck): connect settings to presentation state`

**Slice 2.5: Add keyboard shortcuts help overlay**
- **What changes**: Create help overlay component showing keyboard shortcuts table (from User Stories section)
- **Tests to add FIRST**:
  - Integration test: Press '?' key, verify help overlay appears
  - Integration test: Press ESC or click outside, verify overlay closes
- **Commands**: `npm test`
- **Expected output**: Help overlay displays keyboard shortcuts reference table
- **Commit**: `feat(pitch-deck): add keyboard shortcuts help overlay`

---

### Phase 3: Auto-Scroll Mode

**Slice 3.1: Implement content auto-scroll (within slides)**
- **What changes**: Add `useContentAutoScroll` hook with smooth scrolling logic (scrollBy)
- **Tests to add FIRST**:
  - Unit test: Enable content auto-scroll, verify scrollBy called at correct rate
  - Integration test: Verify scrolling pauses at bottom, then advances slide
- **Commands**: `npm test` (use fake timers)
- **Expected output**: Content scrolls smoothly at 75px/second, advances when complete
- **Commit**: `feat(pitch-deck): implement content auto-scroll within slides`

**Slice 3.2: Implement slide auto-advance (between slides)**
- **What changes**: Add `useSlideAutoAdvance` hook with setInterval logic
- **Tests to add FIRST**:
  - Unit test: Enable slide auto-advance, verify interval set with correct delay
  - Unit test: Disable auto-advance, verify interval cleared
- **Commands**: `npm test` (use fake timers)
- **Expected output**: Slides advance automatically at configured interval
- **Commit**: `feat(pitch-deck): implement slide auto-advance timer`

**Slice 3.3: Add pause-on-hover functionality**
- **What changes**: Add mouse enter/leave handlers to pause/resume both auto-scroll types
- **Tests to add FIRST**:
  - Integration test: Hover during content scroll, verify pause
  - Integration test: Hover during slide advance, verify pause
  - Integration test: Mouse leave, verify resume
- **Commands**: `npm test`
- **Expected output**: Both auto-scroll types pause on hover, resume on leave
- **Commit**: `feat(pitch-deck): add pause-on-hover for auto-scroll`

**Slice 3.4: Create progress indicators**
- **What changes**: Add content scroll progress bar (linear) and slide advance countdown (circular)
- **Tests to add FIRST**:
  - Visual test: Verify both progress indicators animate smoothly
  - Unit test: Verify progress calculations accurate
- **Commands**: `npm run dev` → manual test
- **Expected output**: Visual feedback for both auto-scroll types
- **Commit**: `feat(pitch-deck): add auto-scroll progress indicators`

**Slice 3.5: Add visual "Paused" indicator**
- **What changes**: Show "Paused" badge when mouse hovered
- **Tests to add FIRST**:
  - Integration test: Hover, verify badge appears
- **Commands**: `npm test`
- **Expected output**: Clear visual feedback for pause state
- **Commit**: `feat(pitch-deck): add pause indicator for auto-scroll`

---

### Phase 4: Visual Animations

**Slice 4.1: Add animation style selector to settings**
- **What changes**: Extend `PresentationSettings` with radio group for animation styles
- **Tests to add FIRST**:
  - Unit test: Select animation style, verify state updates
- **Commands**: `npm test`
- **Expected output**: Animation style persists in settings
- **Commit**: `feat(pitch-deck): add animation style selector to settings`

**Slice 4.2: Implement minimal CSS animations**
- **What changes**: Add CSS transitions for fade-in (opacity 0 → 1)
- **Tests to add FIRST**:
  - Visual test: Switch to minimal mode, verify fade-in on slide change
- **Commands**: `npm run dev` → manual test
- **Expected output**: Subtle fade-in animation (300-500ms)
- **Commit**: `feat(pitch-deck): add minimal CSS fade-in animations`

**Slice 4.3: Implement standard scroll-linked animations**
- **What changes**: Use CSS `animation-timeline: scroll()` for progressive reveals
- **Tests to add FIRST**:
  - Visual test: Scroll slide, verify elements reveal progressively
  - Performance test: Measure frame rate (should maintain 60fps)
- **Commands**: `npm run dev` → manual test with Chrome DevTools Performance
- **Expected output**: Elements reveal as user scrolls
- **Commit**: `feat(pitch-deck): add standard scroll-linked animations`

**Slice 4.4: Implement expressive multi-frame animations**
- **What changes**: Sequence through frames in `deck_data.slides[x].frames` array
- **Tests to add FIRST**:
  - Integration test: Load multi-frame slide, verify frames advance automatically
  - Unit test: Verify frame timing logic
- **Commands**: `npm test`
- **Expected output**: Frames play in sequence (1-2s per frame)
- **Commit**: `feat(pitch-deck): add expressive multi-frame animations`

**Slice 4.5: Add animation disable toggle**
- **What changes**: Add "Disable animations" option in settings, fallback to static
- **Tests to add FIRST**:
  - Integration test: Disable animations mid-presentation, verify fallback
- **Commands**: `npm test`
- **Expected output**: Static slides when disabled
- **Commit**: `feat(pitch-deck): add animation disable toggle`

---

### Phase 5: AI Animation Frame Generation

**Slice 5.1: Extend AI prompt for multi-frame generation**
- **What changes**: Update `generate-pitch-deck/index.ts` to request frames when expressive mode
- **Tests to add FIRST**:
  - Unit test: Verify prompt includes frame count parameter
  - Mock test: Mock Claude API, verify response includes frames array
- **Commands**: Test with Supabase Functions locally
- **Expected output**: AI prompt requests frames, mock returns expected structure
- **Commit**: `feat(pitch-deck): extend AI prompt for multi-frame generation`

**Slice 5.2: Add frame generation logic to Edge Function**
- **What changes**: Generate 2-5 frames per slide, store in `slide.frames` array
- **Tests to add FIRST**:
  - Integration test: Call Edge Function with expressive mode, verify frames in response
- **Commands**: `npx supabase functions deploy generate-pitch-deck --no-verify-jwt`
- **Expected output**: Edge Function returns multi-frame slides
- **Commit**: `feat(pitch-deck): implement multi-frame generation in Edge Function`

**Slice 5.3: Update deck_data schema to support frames**
- **What changes**: Add `frames` field to Slide interface in `presentationStorage.ts`
- **Tests to add FIRST**:
  - Type test: Verify TypeScript compiles with new schema
- **Commands**: `npm run build`
- **Expected output**: No TypeScript errors
- **Commit**: `feat(pitch-deck): update deck schema to support animation frames`

**Slice 5.4: Update frontend to render multi-frame slides**
- **What changes**: Modify slide rendering logic to handle frame arrays
- **Tests to add FIRST**:
  - Integration test: Load deck with frames, verify frames render correctly
- **Commands**: `npm test`
- **Expected output**: Frames display in sequence during presentation
- **Commit**: `feat(pitch-deck): render multi-frame slides in presentation mode`

**Slice 5.5: Add frame count configuration to settings**
- **What changes**: Add "Frame count" slider (2-5) to expressive animation settings
- **Tests to add FIRST**:
  - Integration test: Adjust frame count, generate deck, verify frame count matches
- **Commands**: `npm test`
- **Expected output**: User can control frame count
- **Commit**: `feat(pitch-deck): add frame count configuration to settings`

---

## 7) Git Workflow Rules (Enforced)

### Branch Naming
- Feature branch: `feature/pitch-deck-presentation-enhancements`
- Phase branches (optional): `feature/pitch-deck-phase-1-scroll-fixes`

### Commit Cadence
- **Commit after every slice** (see Implementation Plan above)
- Each commit must include working tests (or manual test evidence)
- Commit messages follow format: `<type>(scope): <description>`
  - Types: `feat`, `fix`, `test`, `refactor`, `docs`
  - Scope: `pitch-deck`, `presentation-settings`, `auto-scroll`, `animations`

### Commit Message Format
```
<type>(scope): <description>

[optional body explaining why, not what]

[optional footer: closes #123]
```

Examples:
```
feat(pitch-deck): hide scrollbars in presentation mode

Applied CSS to hide scrollbars while maintaining keyboard scroll functionality.
Tested in Chrome, Firefox, Safari.

Closes #456
```

### After Each Slice
1. **Run targeted tests**: `npm test -- <test-file-pattern>`
2. **Run fast regression**: `npm run lint && npm run build`
3. **Manual smoke test**: Open dev server, verify feature works

### After Every 3-5 Slices
1. **Run full test suite**: `npm test`
2. **Check bundle size**: `npm run build && ls -lh dist/`
3. **Visual regression check**: Compare presentation mode screenshots (manual)

### If a Change Breaks Prior Feature
1. **Revert immediately**: `git revert <commit-hash>`
2. **OR fix immediately**: Create hotfix commit before proceeding
3. **Do NOT proceed** to next slice until regression fixed

---

## 8) Commands (Repo-specific)

### Install
```bash
npm install
```

### Development Server
```bash
npm run dev
# Runs on http://[::]:8080
```

### Unit Tests
```bash
npm test
# Note: No formal test suite exists yet - will need to set up Jest/Vitest
```

### Lint/Typecheck
```bash
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript type checking
```

### Build
```bash
npm run build         # Production build (includes TypeScript compilation)
npm run build:dev     # Development build
```

### Preview Production Build
```bash
npm run preview
```

### Supabase Edge Functions (Phase 5)
```bash
# Test locally
npx supabase functions serve generate-pitch-deck

# Deploy
npx supabase functions deploy generate-pitch-deck
```

### How to Discover Commands
- Check `package.json` "scripts" section
- For Supabase: `npx supabase --help`

---

## 9) Observability / Logging (If applicable)

### Console Logging
Add structured logging for debugging presentation mode issues:

**Phase 1:**
```javascript
console.log('[PresentationMode] Scroll reset:', {
  slideIndex: currentSlideIndex,
  scrollTop: slideRef.current.scrollTop
});
```

**Phase 3:**
```javascript
console.log('[AutoScroll] State change:', {
  enabled: autoScrollEnabled,
  speed: autoScrollSpeed,
  paused: isPaused
});
```

**Phase 5:**
```javascript
console.log('[AI Generation] Multi-frame request:', {
  slideNumber,
  frameCount,
  animationStyle
});
```

### Smoke Test Verification
1. Open presentation mode
2. Check browser console for logs
3. Verify:
   - No errors
   - Scroll reset logs appear on navigation
   - Auto-scroll state changes logged
   - Settings persistence logs show read/write

### Performance Monitoring (Phase 4)
```javascript
performance.mark('animation-start');
// ... animation logic
performance.mark('animation-end');
performance.measure('animation-duration', 'animation-start', 'animation-end');
console.log('Animation performance:', performance.getEntriesByName('animation-duration'));
```

---

## 10) Rollout / Migration Plan (If applicable)

### Feature Flags
**Not required** - All features are additive and backwards-compatible.

Optional: Use localStorage flag for beta testing:
```javascript
const enablePresentationEnhancements = localStorage.getItem('beta:presentation-v2') === 'true';
```

### Database Migrations
**Phase 2**: Optional migration to add `presentation_settings` table (if moving from localStorage to database):
```sql
CREATE TABLE IF NOT EXISTS user_presentation_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  auto_scroll_enabled BOOLEAN DEFAULT FALSE,
  auto_scroll_speed TEXT DEFAULT 'medium', -- slow, medium, fast
  animation_style TEXT DEFAULT 'minimal', -- none, minimal, standard, expressive
  frame_count INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Phase 5**: Extend `pitch_decks.deck_data` JSONB to include `frames` arrays (no migration needed - JSONB is flexible):
```json
{
  "slides": [
    {
      "slideNumber": 1,
      "frames": [
        { "frameNumber": 1, "imageData": "..." },
        { "frameNumber": 2, "imageData": "..." }
      ]
    }
  ]
}
```

### Safe Rollout Steps
1. **Phase 1**: Deploy scroll fixes (zero-risk, pure improvement)
2. **Phase 2**: Deploy settings UI (default to disabled, user opt-in)
3. **Phase 3**: Deploy auto-scroll (default to manual, user opt-in)
4. **Phase 4**: Deploy animations (default to "none", user opt-in)
5. **Phase 5**: Deploy AI multi-frame (behind "expressive" animation style)

### Rollback Plan
**If critical bug discovered:**
1. Revert feature flag (if using beta flag)
2. OR revert git commits back to stable baseline
3. OR deploy hotfix that disables feature via settings default

**Data rollback:**
- Phase 1-4: No data changes, safe to rollback
- Phase 5: If bad frames generated, user can regenerate deck

---

## 11) Agent Notes (Leave space for recursion)

### Session Log
*(Agent fills this during execution)*

**Example format:**
```
[2025-12-30 14:30] Phase 1 Slice 1.1 started - Adding scrollbar hiding CSS
[2025-12-30 14:45] Phase 1 Slice 1.1 complete - Tested in Chrome, Firefox, Safari
[2025-12-30 15:00] Phase 1 Slice 1.2 started - Implementing scroll reset logic
```

---

### Decisions
*(Agent documents key decisions made during implementation)*

**Example format:**
| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| Use localStorage for settings | Faster access, no auth required | Database (requires user account) |
| Default auto-scroll speed: 3s | Matches standard presentation timing | 2s (too fast), 5s (too slow) |

---

### Open Questions
*(Agent lists TBD items discovered during implementation)*

**Example format:**
- [ ] Should multi-frame slides count as one slide or multiple in progress indicator?
- [ ] Should auto-scroll loop back to first slide or stop at end?
- [ ] Should animation frames be accessible in Presenter View (dual-window mode)?

---

### Regression Checklist
*(Agent lists tests/features to re-run after changes)*

**After Phase 1:**
- [ ] Manual navigation still works (keyboard, buttons)
- [ ] Presenter View navigation unaffected
- [ ] Slide content renders correctly (no layout shift)

**After Phase 2:**
- [ ] Existing presentation mode loads without settings UI
- [ ] Settings do not interfere with keyboard navigation

**After Phase 3:**
- [ ] Manual navigation works while auto-scroll disabled
- [ ] ESC key still exits presentation mode

**After Phase 4:**
- [ ] Static slides (no animations) still render correctly
- [ ] Performance acceptable on low-end devices

**After Phase 5:**
- [ ] Decks generated without expressive mode unchanged
- [ ] Existing saved decks load correctly (backwards compatibility)

---

## End of PRD

**Next Steps:**
1. Review PRD with product owner (if applicable)
2. Set up test framework (Jest/Vitest) if not already configured
3. Create feature branch: `git checkout -b feature/pitch-deck-presentation-enhancements`
4. Begin Phase 1 Slice 1.1 implementation

---

**Document Metadata:**
- **Total Slices**: 23 (5 phases: P1=3, P2=5, P3=5, P4=5, P5=5)
- **Estimated Effort**: 2-3 weeks (full-time)
- **Risk Level**: Low-Medium (mostly additive features)
- **Dependencies**: None (all features independent)
