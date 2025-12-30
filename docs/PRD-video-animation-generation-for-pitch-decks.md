# PRD — Video Animation Generation for Pitch Decks

**Status:** Draft
**Created:** 2025-12-30
**Owner:** AI Agent

---

## 1) Context & Goals

### Problem Statement

The current pitch deck generator creates **static image frames** that cycle at fixed intervals (1.5s per frame), which:
1. **Lacks true motion** - Charts don't grow, diagrams don't build, illustrations don't come to life
2. **Feels choppy** - Switching between 2-5 static frames doesn't create smooth animations
3. **Misses the Capsule standard** - Modern AI tools (Capsule, built on Gemini) generate actual animated content that scrolls and moves cinematically
4. **Limited engagement** - Static frames fail to capture attention during presentations the way smooth video animations do

User feedback: *"I created an amazing deck but there was no animations"* after selecting "Expressive" mode with 2-3 frames.

### What is Capsule-Style Animation?

**Capsule** (reference from user transcript) is a storytelling tool that generates **live, animated images** as you scroll through content:
- **Video clips** (3-5 seconds each) that auto-play continuously
- **Smooth motion**: Charts grow from 0→100, diagrams build piece-by-piece, scenes transition fluidly
- **Scroll-synced**: Animations play as content is revealed
- **AI-generated**: Uses foundation models (Gemini "Nano Banana Pro") to create video from text prompts

**Our Goal**: Replicate this experience for pitch deck presentations - replace static image frames with AI-generated video clips.

### Who Is This For

- **Primary**: Business professionals presenting pitch decks who want engaging, modern presentations
- **Secondary**: Sales teams, marketers, educators using AI Query Hub for visual storytelling
- **Competitive**: Users comparing our platform to Capsule, Gamma.app, Beautiful.ai

### Why Now

1. **Video generation APIs are production-ready** - Runway Gen-3, Pika 2.0, Stability AI Video launched in 2024-2025
2. **User expectation shift** - Capsule demonstrated that static slides feel outdated compared to video
3. **Differentiation** - This positions AI Query Hub as a cutting-edge presentation platform
4. **Foundation in place** - We already have animation infrastructure (`useFrameAnimation`, `animationStyle` setting, Edge Function generation pipeline)

### In-Scope Goals

✅ **Phase 1**: Research and select video generation API (Runway vs Pika vs Stability AI)
✅ **Phase 2**: Create `generate-video` Edge Function with prompt enhancement and design system enforcement
✅ **Phase 3**: Update `generate-pitch-deck` to call video API when `animationStyle === 'expressive'`
✅ **Phase 4**: Frontend video playback with auto-play, loop, and mute controls
✅ **Phase 5**: Cost optimization - caching, progressive generation, fallback to static images
✅ **Phase 6**: Database schema update to store video URLs/data alongside image data

### Out-of-Scope / Non-Goals

❌ Video editing/post-processing (use API output as-is)
❌ User-uploaded videos (only AI-generated)
❌ Real-time video generation during presentation (pre-generate at deck creation)
❌ Interactive video controls during presentation (simple auto-play only)
❌ Video transcoding/format conversion (rely on API output format)
❌ Slide transition effects between videos (videos replace frames, not slides)

---

## 2) Current State (Repo-informed)

### Existing Architecture

**Frontend** (`src/pages/PitchDeck.tsx`):
- Lines 71-72: `animationStyle` state already accepts `'expressive'` option
- Lines 226-232: `useFrameAnimation` hook cycles through static frames at 1500ms intervals
- Lines 587-590: `animationStyle` sent to `generate-pitch-deck` Edge Function
- Lines 1974-2000: Presentation mode renders `<img>` tags with frame images

**Backend** (`supabase/functions/generate-pitch-deck/index.ts`):
- Lines 236-237: Receives `animationStyle` parameter
- Line 241: `const generateFrames = animationStyle === 'expressive' && frameCount >= 2 && frameCount <= 5`
- Lines 471-488: Animation frame generation instructions added to prompt
- Lines 622-638: Generates 2-5 static images via `generate-image` Edge Function

**Image Generation** (`supabase/functions/generate-image/index.ts`):
- Uses **Gemini 3 Pro Image** API (aka "Nano Banana Pro" from user transcript)
- Lines 83-143: Generates single static images with design system enforcement
- Returns base64-encoded image data

**Database** (`supabase/migrations/20251219000000_create_pitch_decks_table.sql`):
- Line 15: `deck_data JSONB` stores slide content including `imageData` (base64)
- Lines 37-42: `AnimationFrame` interface has `imageData?: string` field
- No dedicated video storage columns (will need migration)

### Key Files to Modify

| File | Changes Required | Lines |
|------|------------------|-------|
| `supabase/functions/generate-video/index.ts` | **NEW FILE** - Video generation Edge Function | N/A |
| `supabase/functions/generate-pitch-deck/index.ts` | Replace `generate-image` call with `generate-video` when expressive | 622-638 |
| `src/pages/PitchDeck.tsx` | Replace `<img>` with `<video>` for expressive mode slides | 1974-2000 |
| `src/hooks/useFrameAnimation.ts` | Adapt for video playback (or deprecate for expressive mode) | All |
| `supabase/migrations/YYYYMMDD_add_video_support.sql` | Add `video_url` column to pitch_decks table | N/A |

### Identified Risks

1. **COST** - Video generation is 10-100x more expensive than images
   - Runway Gen-3: ~$0.05/second = $0.15-$0.25 per 3-5s clip
   - 10-slide deck = $1.50-$2.50 per generation
   - Mitigation: Caching, progressive generation (only changed slides), fallback to static
2. **LATENCY** - Videos take 30s-2min to generate
   - Risk: User waits 5-20 minutes for full deck
   - Mitigation: Background generation, progress indicators, partial deck availability
3. **FILE SIZE** - Videos are 1-10MB each (vs 100-500KB images)
   - Risk: Slow loading, bandwidth costs, storage costs
   - Mitigation: Supabase Storage CDN, lazy loading, compression
4. **API RELIABILITY** - Video APIs have lower uptime than image APIs
   - Risk: Generation failures leave slides without visuals
   - Mitigation: Automatic fallback to static image generation

### Assumptions

- **ASSUMPTION**: Users will tolerate 5-10 min generation time for video-powered decks (verify: add estimated time warning in UI)
- **ASSUMPTION**: Supabase Storage can handle 50-100MB video files per deck (verify: check storage limits)
- **ASSUMPTION**: Video APIs return browser-compatible formats (MP4/WebM) (verify: check API docs)
- **ASSUMPTION**: Auto-play videos won't trigger browser auto-play blocking (verify: test with `muted` attribute)

---

## 3) User Stories

1. **As a startup founder**, I want my pitch deck to have smooth animated charts, so that investors stay engaged during my 10-slide funding pitch.

2. **As a sales rep**, I want product feature diagrams to build piece-by-piece like a video, so that prospects understand our value proposition visually.

3. **As a marketing manager**, I want expressive mode to generate cinematic visuals without manual video editing, so that I can create professional decks in minutes instead of hours.

4. **As a presenter**, I want videos to auto-play and loop during my presentation, so that I don't have to manually control animations.

5. **As a cost-conscious user**, I want the system to fall back to static images if video generation fails or costs too much, so that my deck is always deliverable.

6. **As a returning user**, I want to re-generate only changed slides (not the whole deck), so that iterating on my pitch doesn't cost $2-5 every time.

7. **As a viewer of a shared deck**, I want videos to load quickly and play smoothly, so that the presentation doesn't stutter or buffer.

---

## 4) Success Criteria (Verifiable)

### Functional Requirements

✅ **Video Generation**
- [ ] When `animationStyle === 'expressive'`, Edge Function generates 3-5s video clips instead of static images
- [ ] Videos show smooth motion (charts growing, diagrams building, scenes transitioning)
- [ ] Video generation respects ANTI-AI AESTHETIC GUIDELINES (no purple, no gold, earth tones)

✅ **Presentation Playback**
- [ ] Videos auto-play when slide is displayed in presentation mode
- [ ] Videos loop seamlessly without pausing
- [ ] Videos are muted by default (browser auto-play requirement)
- [ ] User can unmute videos via keyboard shortcut or UI control

✅ **Fallback & Error Handling**
- [ ] If video API fails, system automatically generates static image as fallback
- [ ] If video generation times out (>5min), user is notified and offered static image option
- [ ] Existing decks with static frames continue to work unchanged

✅ **Cost Optimization**
- [ ] System caches generated videos by prompt hash to avoid regenerating identical content
- [ ] Revision mode only regenerates videos for changed slides
- [ ] User sees estimated cost ($1.50-$2.50) before generating expressive deck

✅ **Performance**
- [ ] Videos load within 2 seconds on 10Mbps connection
- [ ] Video file sizes are <5MB per clip (compress if needed)
- [ ] Presentation mode doesn't stutter when switching between video slides

### Edge Cases

- [ ] **No video API key configured**: System falls back to static images with warning
- [ ] **User cancels generation mid-way**: Partial deck saved with mix of videos and placeholders
- [ ] **Browser doesn't support video format**: Show error message with download link
- [ ] **Network interruption during video load**: Retry logic with 3 attempts before fallback

### Definition of Done

- [ ] E2E test: Generate 3-slide deck with expressive mode → verify 3 videos generated
- [ ] E2E test: Present deck with videos → verify auto-play, loop, smooth playback
- [ ] E2E test: Trigger video API failure → verify fallback to static images
- [ ] Manual smoke test: Present 10-slide video deck on projector → no stuttering
- [ ] Cost validation: Log actual API costs for 10-slide deck generation
- [ ] Documentation: Update CLAUDE.md with video generation details

---

## 5) Test Plan (Design BEFORE build)

### Test Categories

#### Unit Tests
- `generate-video/index.ts`: Test prompt enhancement, error handling, response parsing
- `useVideoPlayback.ts` (new hook): Test play/pause/loop logic, state management

#### Integration Tests
- `generate-pitch-deck` → `generate-video` pipeline: Verify video URLs returned in deck data
- Database storage: Verify video URLs saved and retrieved correctly
- Supabase Storage: Upload and retrieve video files

#### E2E Tests (Playwright)
1. **Happy Path**: Generate expressive deck → verify videos play in presentation
2. **Fallback Path**: Mock video API failure → verify static images generated
3. **Cost Warning**: Select expressive → verify cost estimate modal shown
4. **Revision Mode**: Change 1 slide → verify only 1 video regenerated

### Test Cases Mapped to Success Criteria

| Success Criterion | Test Case | Expected Outcome | Test Type |
|-------------------|-----------|------------------|-----------|
| Videos auto-play in presentation | Load video slide → enter presentation mode | Video starts playing automatically | E2E |
| Videos loop seamlessly | Watch video reach end | Video restarts without pause | E2E |
| Fallback to static images | Mock video API 500 error | Deck generated with static images instead | Integration |
| Cost estimate shown | Click "Generate" with expressive | Modal shows "$1.50-$2.50 estimated cost" | E2E |
| Videos cached by prompt | Generate same deck twice | Second generation skips video API calls | Integration |
| Only changed slides regenerated | Revise slide 3 → regenerate | Only slide 3 video API called | Integration |

### Mock Strategy

- **Video API responses**: Mock successful video generation (return dummy base64 video data)
- **Video API failures**: Mock 500 errors, timeouts, invalid responses
- **Supabase Storage**: Mock upload/download operations (use in-memory storage)
- **Cost calculation**: Mock API pricing to test cost estimation logic

### Test Data / Fixtures

```typescript
// test/fixtures/videoApiResponses.ts
export const mockVideoSuccess = {
  video_url: "https://storage.supabase.co/videos/test.mp4",
  duration_seconds: 4.2,
  format: "mp4",
  size_bytes: 2_500_000,
};

export const mockVideoError = {
  error: "Video generation timed out after 300s",
  fallback_image_url: "https://storage.supabase.co/images/fallback.png",
};

// test/fixtures/pitchDecks.ts
export const expressiveDeckConfig = {
  topic: "AI-powered knowledge management",
  numberOfSlides: 3,
  animationStyle: 'expressive',
  style: 'professional',
  includeImages: true,
};
```

---

## 6) Implementation Plan (Small slices)

### **Slice 1: Research & API Selection**
**What changes**: Document video API comparison (Runway vs Pika vs Stability AI)
**Tests**: N/A (research only)
**Commands**: Manual API testing with curl/Postman
**Expected output**: Decision documented in `/docs/VIDEO_API_COMPARISON.md`
**Commit**: `docs: Compare video generation APIs for expressive mode`

---

### **Slice 2: Create `generate-video` Edge Function (Stub)**
**What changes**: New file `supabase/functions/generate-video/index.ts` with CORS headers, auth check, stub response
**Tests**: Add integration test that calls function → verify 200 response
**Commands**:
```bash
npx supabase functions deploy generate-video
curl -X POST [function-url] -H "Authorization: Bearer [token]" -d '{"prompt": "test"}'
```
**Expected output**: `{ "status": "stub", "message": "Video generation not implemented" }`
**Commit**: `feat(video): Create generate-video Edge Function stub`

---

### **Slice 3: Implement Video API Integration**
**What changes**: In `generate-video/index.ts`, add actual API call to selected provider (Runway/Pika/Stability)
**Tests**: Mock video API → verify request format, response parsing
**Commands**:
```bash
npm run test -- generate-video.test.ts
npx supabase functions deploy generate-video
```
**Expected output**: Test passes, function returns `{ video_url, duration, format }`
**Commit**: `feat(video): Integrate [API_NAME] for video generation`

---

### **Slice 4: Add Design System Enforcement to Video Prompts**
**What changes**: Copy `DESIGN_SYSTEM_PROMPT` from `generate-image` → prepend to video prompts
**Tests**: Unit test that prompt includes "earth tones", "no purple", "no gold"
**Commands**: `npm run test -- generate-video.test.ts`
**Expected output**: Test passes, sample video request logged with design guidelines
**Commit**: `feat(video): Enforce ANTI-AI aesthetic in video prompts`

---

### **Slice 5: Database Migration for Video URLs**
**What changes**: New migration `supabase/migrations/YYYYMMDD_add_video_support.sql`
Add columns:
```sql
ALTER TABLE pitch_decks ADD COLUMN video_urls JSONB;
-- Structure: { "slide1": "https://...", "slide2": "https://..." }
```
**Tests**: Integration test → insert pitch deck with video URLs → retrieve → verify data
**Commands**:
```bash
npx supabase migration new add_video_support
npx supabase db push
```
**Expected output**: Migration applied, column exists
**Commit**: `feat(db): Add video URL storage to pitch_decks table`

---

### **Slice 6: Update `generate-pitch-deck` to Call `generate-video`**
**What changes**: In `generate-pitch-deck/index.ts` lines 622-638, replace:
```typescript
// OLD:
const imageData = await generateImage(visualPrompt);
// NEW:
const videoUrl = animationStyle === 'expressive'
  ? await generateVideo(visualPrompt)
  : await generateImage(visualPrompt);
```
**Tests**: Integration test → generate deck with `animationStyle: 'expressive'` → verify video URLs in response
**Commands**:
```bash
npm run test -- generate-pitch-deck.test.ts
npx supabase functions deploy generate-pitch-deck
```
**Expected output**: Test passes, response includes `videoUrl` instead of `imageData` for expressive slides
**Commit**: `feat(deck): Use video generation for expressive animation mode`

---

### **Slice 7: Frontend - Render `<video>` Instead of `<img>` for Expressive Slides**
**What changes**: In `src/pages/PitchDeck.tsx` lines 1974-2000:
```tsx
{slide.videoUrl ? (
  <video
    src={slide.videoUrl}
    autoPlay
    loop
    muted
    className="w-full h-full object-cover"
  />
) : (
  <img src={slide.imageData} className="w-full h-full object-contain" />
)}
```
**Tests**: E2E test → load expressive deck → verify `<video>` element present, auto-playing
**Commands**:
```bash
npm run test:e2e -- pitch-deck-video.spec.ts
npm run dev
```
**Expected output**: Video plays in presentation mode
**Commit**: `feat(ui): Render videos for expressive mode slides`

---

### **Slice 8: Cost Estimation Modal**
**What changes**: Add modal before generation when `animationStyle === 'expressive'`:
```tsx
<AlertDialog>
  <AlertDialogTitle>Expressive Mode Cost Estimate</AlertDialogTitle>
  <AlertDialogDescription>
    Generating {numberOfSlides} video-powered slides will cost approximately
    ${(numberOfSlides * 0.20).toFixed(2)} (video generation costs).
    Continue?
  </AlertDialogDescription>
  <AlertDialogAction onClick={confirmGenerate}>Generate</AlertDialogAction>
  <AlertDialogCancel>Cancel</AlertDialogCancel>
</AlertDialog>
```
**Tests**: E2E test → select expressive → click generate → verify modal shows
**Commands**: `npm run test:e2e`
**Expected output**: Modal displays correct cost estimate
**Commit**: `feat(ui): Add cost warning for expressive video generation`

---

### **Slice 9: Error Handling & Fallback to Static Images**
**What changes**: In `generate-pitch-deck`, wrap video generation in try-catch → fallback to image:
```typescript
let mediaUrl;
try {
  if (animationStyle === 'expressive') {
    mediaUrl = await generateVideo(visualPrompt);
  } else {
    throw new Error('Use image fallback');
  }
} catch (error) {
  console.warn('Video generation failed, using static image:', error);
  mediaUrl = await generateImage(visualPrompt);
}
```
**Tests**: Integration test → mock video API failure → verify image generated instead
**Commands**: `npm run test -- generate-pitch-deck.test.ts`
**Expected output**: Test passes, deck has static images when video fails
**Commit**: `feat(deck): Auto-fallback to static images on video API failure`

---

### **Slice 10: Video Caching by Prompt Hash**
**What changes**: Before generating video, check cache:
```typescript
const promptHash = hashString(visualPrompt);
const cached = await supabase
  .from('video_cache')
  .select('video_url')
  .eq('prompt_hash', promptHash)
  .single();

if (cached) return cached.video_url;

// Generate new video, then cache it
const videoUrl = await generateVideoAPI(visualPrompt);
await supabase.from('video_cache').insert({
  prompt_hash: promptHash,
  video_url: videoUrl,
  created_at: new Date()
});
```
**Tests**: Integration test → generate same deck twice → verify second call skips API
**Commands**: `npm run test`
**Expected output**: Test passes, logs show "Using cached video"
**Commit**: `perf(video): Add prompt-based caching to reduce API costs`

---

### **Slice 11: Progressive Generation (Only Changed Slides)**
**What changes**: In revision mode, compare old/new slide content → only regenerate videos for changed slides
**Tests**: Integration test → revise slide 3 → verify only slide 3 video API called
**Commands**: `npm run test`
**Expected output**: Test passes, 9/10 videos reused from cache
**Commit**: `perf(deck): Regenerate only changed slides in revision mode`

---

### **Slice 12: Update TypeScript Types**
**What changes**: Update interfaces:
```typescript
interface Slide {
  slideNumber: number;
  title: string;
  content: string;
  visualType?: string;
  visualPrompt?: string;
  imageData?: string;  // Keep for fallback
  videoUrl?: string;   // NEW: For expressive mode
  videoDuration?: number; // NEW: Duration in seconds
  notes?: string;
}
```
**Tests**: TypeScript compilation → no errors
**Commands**: `npm run build`
**Expected output**: Build succeeds
**Commit**: `refactor(types): Add video fields to Slide interface`

---

### **Slice 13: E2E Smoke Test**
**What changes**: Create comprehensive E2E test:
```typescript
test('Generate and present video-powered pitch deck', async ({ page }) => {
  // 1. Navigate to pitch deck generator
  await page.goto('/pitch-deck');

  // 2. Configure expressive mode
  await page.selectOption('[name="animationStyle"]', 'expressive');
  await page.fill('[name="topic"]', 'AI Knowledge Management');
  await page.fill('[name="numberOfSlides"]', '3');

  // 3. Accept cost estimate
  await page.click('button:has-text("Generate")');
  await page.click('button:has-text("Continue")'); // Cost modal

  // 4. Wait for generation (up to 10min)
  await page.waitForSelector('.deck-ready', { timeout: 600_000 });

  // 5. Enter presentation mode
  await page.click('button:has-text("Present")');

  // 6. Verify videos playing
  const videos = page.locator('video[autoplay][loop][muted]');
  await expect(videos).toHaveCount(3);

  // 7. Check video is actually playing
  const isPlaying = await page.evaluate(() => {
    const video = document.querySelector('video');
    return !video.paused && !video.ended;
  });
  expect(isPlaying).toBe(true);
});
```
**Tests**: Run E2E test
**Commands**: `npm run test:e2e`
**Expected output**: Test passes end-to-end
**Commit**: `test(e2e): Add comprehensive video deck generation test`

---

### **Slice 14: Documentation Update**
**What changes**: Update `CLAUDE.md` and create `docs/VIDEO_GENERATION.md`:
```markdown
## Video Generation for Pitch Decks

### Overview
Expressive animation mode generates 3-5 second video clips for each slide instead of static images.

### API Provider
[Runway Gen-3 / Pika 2.0 / Stability AI Video] - see VIDEO_API_COMPARISON.md

### Cost
- ~$0.20 per video (3-5s)
- ~$2.00 for 10-slide deck
- Cached videos reused to minimize cost

### Fallback
If video generation fails, system automatically falls back to static image generation.

### Configuration
Set `animationStyle: 'expressive'` in deck config to enable video generation.
```
**Tests**: N/A
**Commands**: Manual review
**Expected output**: Documentation complete
**Commit**: `docs: Add video generation guide for pitch decks`

---

## 7) Git Workflow Rules (Enforced)

### Branch Naming
```
feature/video-animation-generation
```

### Commit Cadence
- **After every slice** (14 commits expected)
- Each commit must be atomic and buildable

### Commit Message Format
```
<type>(<scope>): <description>

Types: feat, fix, refactor, test, docs, perf, chore
Scopes: video, deck, ui, db, e2e
Example: feat(video): Integrate Runway Gen-3 API for video generation
```

### Testing & Regression

**After each slice:**
```bash
npm run lint           # Check code style
npm run build          # Verify TypeScript compiles
npm run test           # Run unit/integration tests for changed files
```

**After every 3 slices:**
```bash
npm run test           # Full test suite
npm run test:e2e       # E2E regression tests
```

**If a test fails:**
- Revert commit OR fix immediately before proceeding
- Do not proceed with next slice until tests pass

---

## 8) Commands (Repo-specific)

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev  # Runs on http://localhost:8080
```

### Tests
```bash
# Unit & Integration
npm run test

# E2E (Playwright)
npm run test:e2e

# Watch mode during development
npm run test -- --watch
```

### Build & Typecheck
```bash
npm run build          # Production build
npm run build:dev      # Development build
npm run lint           # ESLint check
```

### Supabase
```bash
# Deploy Edge Function
npx supabase functions deploy generate-video

# Run migration
npx supabase migration new add_video_support
npx supabase db push

# Generate types
npm run types:generate
```

### Verify Deployment
```bash
# Test Edge Function
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/generate-video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Growing bar chart showing revenue increase", "duration": 4}'
```

---

## 9) Observability / Logging

### Required Logs

**Edge Function (`generate-video/index.ts`):**
```typescript
console.log('Video generation request:', {
  prompt_length: prompt.length,
  requested_duration: duration,
  user_id: user.id
});

console.log('Video API call:', {
  provider: 'runway',
  prompt_hash: hash(prompt),
  cache_hit: isCached
});

console.log('Video generated:', {
  video_url: videoUrl,
  duration_actual: result.duration,
  file_size_mb: result.size / 1_000_000,
  cost_usd: calculateCost(result.duration)
});

console.error('Video generation failed:', {
  error: error.message,
  fallback_used: 'static_image'
});
```

**Frontend (`PitchDeck.tsx`):**
```typescript
// On video load
console.log('Video loaded:', { slide_number: slideNumber, video_url: videoUrl });

// On video play
console.log('Video playing:', { slide_number: slideNumber, duration: video.duration });

// On video error
console.error('Video playback error:', { slide_number: slideNumber, error: event });
```

### Metrics to Track
- **Video generation success rate** (% of successful API calls)
- **Average generation time** (seconds from request to video URL)
- **Cache hit rate** (% of videos served from cache vs generated)
- **Cost per deck** (total API cost for 10-slide deck)
- **Video file size distribution** (MB per video)

### Smoke Test Verification
```bash
# 1. Generate expressive deck via UI
# 2. Check Supabase logs for video generation events
npx supabase functions logs generate-video

# 3. Verify video stored in Supabase Storage
npx supabase storage ls pitch-deck-videos

# 4. Check database for video URLs
psql -h db.fskwutnoxbbflzqrphro.supabase.co -U postgres -c \
  "SELECT id, title, deck_data->'slides'->0->'videoUrl' FROM pitch_decks WHERE id = '[deck_id]';"
```

---

## 10) Rollout / Migration Plan

### Feature Flag
```typescript
// src/lib/featureFlags.ts
export const ENABLE_VIDEO_GENERATION =
  Deno.env.get('ENABLE_VIDEO_GENERATION') === 'true' || false;

// Use in generate-pitch-deck
if (animationStyle === 'expressive' && ENABLE_VIDEO_GENERATION) {
  videoUrl = await generateVideo(prompt);
} else {
  imageData = await generateImage(prompt);
}
```

### Rollout Phases

**Phase 1: Internal Testing (Week 1)**
- Enable for admin users only (`user_id IN ['admin1', 'admin2']`)
- Monitor logs for errors, costs, generation times
- Collect feedback on video quality

**Phase 2: Beta Users (Week 2)**
- Enable for 10% of users via feature flag
- A/B test: expressive (video) vs expressive (static frames)
- Measure engagement metrics (presentation time, slide views)

**Phase 3: General Availability (Week 3)**
- Enable for all users
- Add cost warning modal (already in Slice 8)
- Monitor API costs, optimize caching

### Data Migration
**Not required** - existing decks with static frames continue to work. New decks can opt into video generation via `animationStyle` setting.

### Backward Compatibility
```typescript
// Render logic supports both formats
{slide.videoUrl ? (
  <video src={slide.videoUrl} autoPlay loop muted />
) : slide.imageData ? (
  <img src={`data:image/png;base64,${slide.imageData}`} />
) : (
  <div>No visual</div>
)}
```

### Rollback Plan
If critical issues arise:
1. Set `ENABLE_VIDEO_GENERATION=false` environment variable
2. System automatically falls back to static image generation
3. No user data loss (videos stored separately from images)
4. Investigate issue, fix, redeploy

---

## 11) Agent Notes (Leave space for recursion)

### Session Log
```
[YYYY-MM-DD HH:MM] - PRD created, ready for implementation
[YYYY-MM-DD HH:MM] - Slice 1 complete: API research done, Runway Gen-3 selected
[YYYY-MM-DD HH:MM] - Slice 2 complete: Edge Function stub deployed
...
```

### Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|-------------------------|
| Use Runway Gen-3 API | Best video quality, 4K output, ~$0.05/sec pricing | Pika (slower), Stability AI (lower quality) |
| Store video URLs (not base64) | Videos too large for JSONB (5-10MB vs 500KB images) | Base64 in deck_data (rejected: DB bloat) |
| Fallback to static images | Ensures deck always deliverable even if API down | Fail generation entirely (rejected: bad UX) |
| Cache by prompt hash | Reduces costs for identical content across decks | No caching (rejected: expensive), cache by user (rejected: less reuse) |

### Open Questions
- [ ] **Q**: What video format does Runway Gen-3 return? (MP4, WebM, MOV?)
  **A**: TBD - verify in Slice 3 API integration

- [ ] **Q**: Should we compress videos server-side to reduce file size?
  **A**: TBD - test file sizes first, add compression if >5MB average

- [ ] **Q**: How long should videos cache? (1 day, 1 week, forever?)
  **A**: TBD - start with 30 days, monitor storage costs

### Regression Checklist

After implementing video generation, verify these existing features still work:

- [ ] **Static image generation** (`animationStyle: 'none'/'minimal'/'standard'`)
- [ ] **Presentation mode navigation** (arrow keys, click controls)
- [ ] **Presenter view** (dual-window mode with notes)
- [ ] **Deck saving** (video URLs persist in database)
- [ ] **Deck loading** (videos load and play on deck open)
- [ ] **Deck sharing** (public video decks accessible via share link)
- [ ] **Export to PowerPoint** (videos replaced with static thumbnail? TBD)

---

## Appendix A: Video API Comparison

| API | Pricing | Quality | Latency | Output Format | Best For |
|-----|---------|---------|---------|---------------|----------|
| **Runway Gen-3** | $0.05/sec | Excellent (4K) | 30-60s | MP4, WebM | High-quality presentations |
| **Pika 2.0** | $0.03/sec | Good (1080p) | 60-120s | MP4 | Budget-conscious projects |
| **Stability AI Video** | $0.02/sec | Fair (720p) | 20-40s | MP4 | Rapid iteration/testing |

**Recommendation**: Start with Runway Gen-3 for quality, evaluate cost after 100 generations, consider Pika if costs exceed $500/month.

---

## Appendix B: Cost Analysis

### Estimated Costs (per deck)

| Deck Size | Videos | Cost (Runway) | Cost (Pika) | Cost (Stability) |
|-----------|--------|---------------|-------------|------------------|
| 5 slides | 5 | $1.25 | $0.75 | $0.50 |
| 10 slides | 10 | $2.50 | $1.50 | $1.00 |
| 15 slides | 15 | $3.75 | $2.25 | $1.50 |

**Assumptions**:
- 5 seconds per video
- Runway: $0.05/sec = $0.25/video
- Pika: $0.03/sec = $0.15/video
- Stability: $0.02/sec = $0.10/video

### Cost Optimization Strategies

1. **Caching** - Reuse videos for identical prompts (est. 30% reduction)
2. **Progressive generation** - Only regenerate changed slides (est. 80% reduction on revisions)
3. **Batch discounts** - Negotiate pricing for >10,000 videos/month (est. 20% reduction)
4. **Hybrid mode** - Use videos for key slides (cover, closing), static for content slides (est. 60% reduction)

### Break-Even Analysis

If 1000 users generate 1 deck/month @ 10 slides:
- **Current (static)**: 10,000 images × $0.01 = $100/month
- **Video (Runway)**: 10,000 videos × $0.25 = $2,500/month
- **Video (Pika)**: 10,000 videos × $0.15 = $1,500/month

**Monetization**: Charge $5/month premium for video decks → break-even at 500 users.

---

**END OF PRD**
