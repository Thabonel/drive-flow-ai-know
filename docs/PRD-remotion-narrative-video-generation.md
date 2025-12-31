# PRD: Remotion-Based Narrative Video Generation for Pitch Decks

**Product**: AI Query Hub - Pitch Deck Generator
**Feature**: Animated Video Storytelling with Remotion
**Version**: 1.0
**Status**: Approved for Implementation
**Last Updated**: December 31, 2024

---

## Executive Summary

Transform static pitch deck slides into narrative animated videos where drawings come to life and tell stories. Each slide becomes a 5-10 second "mini movie" featuring character animation, object physics, and organic growth effects.

**Technical Approach**: Use Remotion (React-based video generation) where Claude generates programmatic animation code (React TSX components) which are rendered server-side to MP4 videos.

**Key Differentiator**: True narrative storytelling with programmatic control over every frame, not simple transitions or external AI video APIs.

---

## Problem Statement

### Current State
- Pitch deck slides are **static PNG images** generated via Claude + DALL-E
- No motion or narrative progression
- Cannot show story evolution (e.g., person reacting to increasing workload)
- Limited engagement compared to animated presentations

### Desired State
- **Narrative animations** where characters move and react
- **Object physics** (papers stacking, boxes moving into position)
- **Organic growth** (money sprouting from blocks like plants)
- **Story progression** that unfolds over 5-10 seconds per slide

### Why Not Use Simple Animations?
❌ **CSS transitions/SVG animations**: Too simple for complex narratives
❌ **External AI video APIs** (Runway, Pika): Expensive, unpredictable results, no programmatic control
❌ **Element entrance effects** (bounce, spring, stagger): These are transitions, not storytelling

✅ **Remotion**: Full programmatic control, Claude can generate code, renders to real MP4 videos

---

## Goals & Success Metrics

### Primary Goals
1. **Enable narrative animation**: Each slide tells a visual story over 5-10 seconds
2. **Claude code generation**: Claude generates valid Remotion TSX components programmatically
3. **Seamless playback**: Videos auto-play in presentation mode with no user action required
4. **Maintain static fallback**: Keep PNG images for accessibility and backward compatibility

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Animation quality** | 90% of slides have smooth, narrative animations | Manual review |
| **Claude code validity** | 95% of generated Remotion components compile without errors | Automated testing |
| **Video rendering time** | <30 seconds per 8-second video | Server monitoring |
| **Video file size** | <5MB per slide | Storage metrics |
| **Playback reliability** | 99% of videos play without buffering | Frontend monitoring |
| **User engagement** | 40% increase in presentation view time | Analytics |

### Non-Goals
- Real-time animation generation (videos are pre-rendered)
- Interactive animations (videos are non-interactive, auto-play only)
- Sound/voiceover (all videos are muted)
- User-customizable animation timing (Claude determines timing)

---

## User Stories

### 1. Pitch Deck Creator
**As a** founder creating a pitch deck
**I want** my slides to have animated storytelling
**So that** investors are more engaged and understand the narrative visually

**Acceptance Criteria**:
- Generate pitch deck with "narrative animation" option enabled
- Each slide automatically gets a 5-10 second animated video
- Video shows story progression (e.g., work piling up → person reacts)
- Static PNG fallback available if video fails to load

### 2. Presenter
**As a** presenter showing my pitch deck
**I want** animations to play automatically when I advance slides
**So that** I can focus on speaking without manually controlling videos

**Acceptance Criteria**:
- Video starts playing when slide appears in presentation mode
- Video loops smoothly (or plays once based on settings)
- Pause/resume works with existing hover controls
- No manual play button required

### 3. Viewer (Accessibility)
**As a** viewer with autoplay disabled or reduced-motion preferences
**I want** to see a static image instead of video
**So that** I can still understand the slide content

**Acceptance Criteria**:
- Static PNG fallback displays if video fails to load
- Respects `prefers-reduced-motion` media query
- Video is muted by default (no unexpected sound)

---

## Technical Approach

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Generates Pitch Deck                               │
│    └─> Claude generates slide content + visual prompt      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Claude Generates Remotion Animation Script              │
│    ├─> Prompt includes: slide title, content, visual desc  │
│    ├─> Claude writes React TSX component                   │
│    └─> Output: Remotion composition code (animationScript) │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Server-Side Video Rendering                             │
│    ├─> render-remotion-video Edge Function                 │
│    ├─> Bundle Remotion project                             │
│    ├─> Render to MP4 (1920x1080, 30fps, H.264)            │
│    └─> Upload to Supabase Storage (pitch-deck-videos)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend Playback                                        │
│    ├─> Slide loads with videoUrl field populated           │
│    ├─> <video> tag auto-plays on slide entry               │
│    ├─> Loops smoothly with existing controls               │
│    └─> Fallback to static PNG if video unavailable         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Animation Code Generation** | Claude Opus 4.5 | Can generate complex React TSX components with timing logic |
| **Video Framework** | Remotion 4.x | React-based video generation with programmatic control |
| **Video Rendering** | @remotion/renderer | Server-side MP4 rendering (headless browser) |
| **Video Storage** | Supabase Storage | CDN-backed file hosting with public URLs |
| **Video Format** | MP4 (H.264 codec) | Universal browser support, efficient compression |
| **Video Specs** | 1920x1080, 30fps, 5-10s | Standard HD quality, smooth motion |

### Why Remotion?

✅ **Programmatic Control**: Full control over every frame via `useCurrentFrame()`, `interpolate()`, `spring()`
✅ **Claude Compatible**: Claude can generate valid React TSX code
✅ **Real Video Output**: Renders to MP4, not just HTML/SVG animations
✅ **Physics & Timing**: Built-in spring physics, easing curves, frame-accurate timing
✅ **Scalable**: Render server-side, cache videos, serve via CDN

### Example: Generated Remotion Component

**User Input (Slide)**:
- **Title**: "Overwhelmed by Client Work → Exponential Growth Path"
- **Content**: Left shows person drowning in work, right shows growth staircase
- **Visual Prompt**: Split-screen with person + papers on left, stacked boxes + money on right

**Claude Generates** (simplified excerpt):
```tsx
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';

export const OverwhelmedToGrowth: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  // Left scene: Overwhelm animation (0-5s)
  const paperCount = Math.min(Math.floor(frame / 15), 10); // Paper piles up every 0.5s
  const personSlump = interpolate(frame, [0, 150], [0, 30], { extrapolateRight: 'clamp' }); // Slumps over 5s

  // Right scene: Growth animation (3-8s)
  const boxesVisible = Math.max(0, Math.min(Math.floor((frame - 90) / 20), 5)); // Boxes stack from frame 90
  const dollarGrowth = spring({
    frame: frame - 120, // Start at 4s
    fps,
    config: { damping: 12, stiffness: 100 }
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#2a2a2a' }}>
      {/* Person slumps down as papers accumulate */}
      <div style={{
        transform: `translate(-50%, ${personSlump}px) rotate(${personSlump}deg)`
      }}>
        {/* SVG person illustration */}
      </div>

      {/* Papers stack up */}
      {Array.from({ length: paperCount }).map((_, i) => (
        <div key={i} style={{ /* stacking animation */ }}>
          {/* Paper SVG */}
        </div>
      ))}

      {/* Boxes appear sequentially */}
      {Array.from({ length: boxesVisible }).map((_, i) => (
        <div key={i} style={{
          transform: `scale(${spring({ frame: frame - (90 + i * 20), fps })})`
        }}>
          {/* Box SVG */}
        </div>
      ))}

      {/* Dollar signs grow organically from boxes */}
      {boxesVisible >= 3 && (
        <span style={{
          transform: `scale(${dollarGrowth}) rotate(${interpolate(dollarGrowth, [0, 1], [0, 360])})`
        }}>$</span>
      )}
    </AbsoluteFill>
  );
};
```

**Rendering Configuration**:
```tsx
export const composition = {
  id: 'overwhelmed-to-growth',
  component: OverwhelmedToGrowth,
  durationInFrames: 240, // 8 seconds @ 30fps
  fps: 30,
  width: 1920,
  height: 1080,
};
```

---

## Data Model Changes

### Slide Interface (src/pages/PitchDeck.tsx)

**Before**:
```typescript
interface Slide {
  slideNumber: number;
  title: string;
  content: string;
  visualType?: string;
  visualPrompt?: string;
  imageData?: string;         // Static PNG (base64 data URL)
  videoUrl?: string;          // Video URL (if available)
  videoDuration?: number;     // Video duration in seconds
  videoFileSizeMb?: number;   // Video file size
  notes?: string;
  frames?: AnimationFrame[];
}
```

**After** (NEW FIELD):
```typescript
interface Slide {
  // ... existing fields ...
  animationScript?: string;   // NEW: Remotion TSX code for animated video
}
```

### Storage Requirements

**New Supabase Storage Bucket**: `pitch-deck-videos`
- **Purpose**: Store rendered MP4 video files
- **Access**: Public read (for presentation playback)
- **Lifecycle**: Videos cached indefinitely (delete when deck is deleted)
- **File naming**: `{pitchDeckId}-slide-{slideNumber}.mp4`

---

## Implementation Plan

### Phase 1: Infrastructure Setup ✅ COMPLETED
**Goal**: Install dependencies and update data model

1. **Install Remotion** ✅
   ```bash
   npm install remotion @remotion/renderer @remotion/cli
   ```

2. **Update Slide Interface** ✅
   - Added `animationScript?: string` field to Slide interface in `src/pages/PitchDeck.tsx`

3. **Create Storage Bucket** (PENDING)
   - Create `pitch-deck-videos` bucket in Supabase dashboard
   - Set public read permissions
   - Configure CORS for video playback

### Phase 2: Claude Animation Script Generation (CURRENT)
**Goal**: Modify generate-pitch-deck to output Remotion TSX code

1. **Update generate-pitch-deck Edge Function**
   - File: `supabase/functions/generate-pitch-deck/index.ts`
   - Add new prompt section after slide content generation
   - Extract Remotion TSX code from Claude's response
   - Store in `animationScript` field

**Prompt Template**:
```typescript
const animationPrompt = `You are an expert motion graphics designer using Remotion (React for video).

Generate a Remotion composition component for this slide that creates a narrative animation.

**Slide content:**
Title: "${slide.title}"
Content: "${slide.content}"
Visual description: "${slide.visualPrompt}"

**Requirements:**
1. Export a React component that uses Remotion's API
2. Use useCurrentFrame(), interpolate(), spring() for timing
3. Duration: 5-10 seconds @ 30fps (150-300 frames)
4. Include character animation, object movement, organic growth as needed
5. Tell a visual story that unfolds over time

**Example elements to animate:**
- Characters moving, reacting (position, rotation, opacity)
- Objects appearing, stacking, falling (scale, translateY, physics)
- Growth effects (scale with spring, organic emergence)
- Network connections, flow lines (strokeDasharray, path animation)

Return ONLY the TSX code for the composition component, starting with imports.`;
```

2. **Extract and Validate Code**
   - Parse Claude response to extract TSX code block
   - Basic syntax validation (imports, component export)
   - Store raw code in `animationScript` field

### Phase 3: Video Rendering Pipeline
**Goal**: Render Remotion components to MP4 videos

1. **Create render-remotion-video Edge Function**
   - File: `supabase/functions/render-remotion-video/index.ts` (NEW)
   - Input: `{ animationScript, slideId, compositionConfig }`
   - Process:
     1. Write animation script to temp file
     2. Bundle Remotion project
     3. Render video to MP4 (H.264, 1920x1080, 30fps)
     4. Upload to Supabase Storage (`pitch-deck-videos/{slideId}.mp4`)
     5. Return public URL
     6. Cleanup temp files

**Implementation Notes**:
- **Deno Compatibility**: Remotion renderer may require Node.js environment
  - **Option A**: Use Deno-compatible bundler (if available)
  - **Option B**: Deploy as Docker container with Node.js
  - **Recommendation**: Start with Option A, fallback to Option B if needed
- **Rendering Time**: 10-30 seconds per 8-second video (monitor and optimize)
- **Resource Limits**: May need to increase Edge Function timeout/memory

2. **Trigger Video Rendering from generate-pitch-deck**
   - After generating all slides with `animationScript`
   - Call `render-remotion-video` Edge Function for each slide (async)
   - Store returned `videoUrl` in slide data
   - Update `videoDuration` field

### Phase 4: Frontend Integration (MINIMAL CHANGES)
**Goal**: Enable video playback in presentation mode

**Current State**: Frontend already supports video playback!
- File: `src/pages/PitchDeck.tsx` (lines 2266-2274)
- Logic: If `videoUrl` exists, render `<video>` tag, else render `<img>` tag

**Required Changes**: NONE (video rendering will work automatically)

**Optional Enhancements**:
- Add loading indicator while video is rendering
- Show progress bar for video playback
- Add "Re-render video" button if animation script changes
- Respect `prefers-reduced-motion` media query (show static image instead)

### Phase 5: Testing & Optimization
**Goal**: Ensure reliability, performance, and quality

1. **Remotion Script Generation Testing**
   - Generate 10 different slide types
   - Verify TSX code compiles without errors (95% target)
   - Check animation timing is realistic (5-10s)
   - Validate Remotion API usage (`useCurrentFrame`, `interpolate`, `spring`)

2. **Video Rendering Pipeline Testing**
   - Monitor rendering time per video (<30s target)
   - Verify MP4 output quality (1920x1080, 30fps, smooth playback)
   - Check file sizes (<5MB target)
   - Test Supabase Storage upload reliability
   - Confirm public URLs are accessible

3. **Playback Testing**
   - Video auto-plays on slide entry in presentation mode
   - Loops smoothly without buffering
   - Pause/resume controls work correctly
   - Fallback to static PNG if video unavailable
   - Test on multiple browsers (Chrome, Safari, Firefox)

4. **Performance Optimization**
   - Parallelize video rendering (render multiple slides concurrently)
   - Implement video caching (don't re-render unchanged slides)
   - Optimize H.264 encoding settings (balance quality vs. file size)
   - Add CDN caching headers for faster delivery

5. **Accessibility Testing**
   - Verify static PNG fallback works
   - Test `prefers-reduced-motion` support
   - Ensure all videos are muted
   - Check video controls are accessible (keyboard navigation)

---

## Testing Strategy

### Unit Tests
- **Claude Prompt Validation**: Test that animation prompts include all required fields
- **Code Extraction**: Test TSX code block parsing from Claude responses
- **Storage Upload**: Test Supabase Storage upload with mock MP4 files

### Integration Tests
- **End-to-End Video Generation**:
  1. Generate pitch deck with animation enabled
  2. Verify `animationScript` field is populated for each slide
  3. Trigger video rendering
  4. Confirm `videoUrl` is stored in slide data
  5. Test video playback in presentation mode

### Manual QA Checklist
- [ ] Generate pitch deck with 5 slides
- [ ] Verify each slide has unique animated narrative
- [ ] Check video quality (smooth motion, no artifacts)
- [ ] Test auto-play in presentation mode
- [ ] Verify video loops correctly
- [ ] Test static PNG fallback (disable JavaScript)
- [ ] Check video file sizes (<5MB each)
- [ ] Test on multiple devices (desktop, tablet, mobile)
- [ ] Verify accessibility (prefers-reduced-motion, muted audio)

### Performance Benchmarks
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Video rendering time | <30s per video | Server logs |
| Video file size | <5MB per video | Storage metrics |
| Playback startup time | <1s | Browser performance API |
| Video buffering | 0 rebuffers | Browser network logs |
| Claude code generation | <10s per slide | Edge Function logs |

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Claude generates invalid TSX code** | Medium | High | - Add code validation step<br>- Implement retry logic with error feedback<br>- Maintain static PNG fallback |
| **Remotion incompatible with Deno** | Medium | High | - Test Deno compatibility early<br>- Fallback to Docker container with Node.js<br>- Consider alternative rendering services |
| **Video rendering too slow (>30s)** | Low | Medium | - Parallelize rendering across slides<br>- Optimize Remotion config (lower FPS, resolution)<br>- Cache rendered videos |
| **Video file sizes too large (>5MB)** | Low | Medium | - Optimize H.264 encoding settings<br>- Reduce video duration to 5s<br>- Lower bitrate/resolution if needed |
| **Storage costs exceed budget** | Low | Medium | - Monitor Supabase Storage usage<br>- Implement video cleanup for deleted decks<br>- Consider video compression |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Animations don't match user expectations** | Medium | Medium | - Provide "Re-generate animation" button<br>- Allow users to disable animations<br>- Iterate on Claude prompts based on feedback |
| **Videos don't autoplay (browser policies)** | Low | Low | - Ensure videos are muted (required for autoplay)<br>- Fallback to static image with play button<br>- Test across browsers |
| **Accessibility concerns (motion sickness)** | Low | Medium | - Respect `prefers-reduced-motion`<br>- Provide static fallback option<br>- Add animation disable setting |

---

## Open Questions & Decisions

### Decision Log

| Decision | Options Considered | Selected | Rationale |
|----------|-------------------|----------|-----------|
| **Video generation method** | 1. External AI APIs (Runway, Pika)<br>2. Remotion (React-based)<br>3. SVG animations<br>4. Lottie animations | **Remotion** | Full programmatic control, Claude can generate code, real MP4 output |
| **Rendering location** | 1. Client-side (browser)<br>2. Server-side (Edge Function)<br>3. Third-party service | **Server-side** | Consistent rendering, no client performance impact, caching |
| **Video format** | 1. MP4 (H.264)<br>2. WebM (VP9)<br>3. GIF | **MP4 (H.264)** | Universal browser support, good compression, efficient |
| **Animation duration** | 1. 3-5 seconds<br>2. 5-10 seconds<br>3. 10-15 seconds | **5-10 seconds** | Long enough for narrative, short enough for attention span |
| **Fallback strategy** | 1. Static PNG only<br>2. Animated GIF<br>3. SVG animation | **Static PNG** | Lightweight, already generated, accessible |

### Open Questions

1. **Q**: Should users be able to customize animation timing/style?
   - **A**: Not in MVP. Claude determines optimal timing based on slide content.

2. **Q**: How do we handle animation re-generation if slide content changes?
   - **A**: Automatically re-generate animation script when slide content is edited. Cache previous video until new one is ready.

3. **Q**: Should videos play once or loop?
   - **A**: Loop by default in presentation mode. Add setting for "play once" mode.

4. **Q**: What if Remotion rendering fails for a slide?
   - **A**: Fallback to static PNG. Log error for debugging. Optionally show "Re-generate video" button.

5. **Q**: Should we support custom Remotion compositions (user-uploaded)?
   - **A**: Not in MVP. Future enhancement: allow advanced users to provide custom animation templates.

---

## Success Criteria

### Launch Criteria (MVP)
- [ ] Generate pitch deck with narrative animations enabled
- [ ] Claude generates valid Remotion TSX code for 95% of slides
- [ ] Videos render successfully within 30 seconds per slide
- [ ] Videos auto-play in presentation mode with smooth looping
- [ ] Static PNG fallback works if video unavailable
- [ ] Video file sizes average <5MB per slide
- [ ] No critical bugs or rendering failures

### Post-Launch Metrics (30 Days)
- [ ] 60% of new pitch decks use narrative animation feature
- [ ] Average video rendering time <25 seconds
- [ ] <5% of videos fail to render (fallback to PNG)
- [ ] User satisfaction score >4.5/5 for animation quality
- [ ] Storage costs within budget (<$50/month for 100 decks)

### Future Enhancements
- **Custom Animation Templates**: Allow users to define animation patterns
- **Interactive Animations**: Add clickable elements within videos
- **Voiceover Integration**: Auto-generate narration for slides
- **Animation Timeline Editor**: Visual tool to adjust timing
- **Performance Mode**: Generate lower-quality videos for faster rendering
- **Animation Library**: Pre-built animation patterns for common slide types

---

## Timeline & Milestones

### Phase 1: Infrastructure ✅ COMPLETED (Dec 31, 2024)
- [x] Install Remotion dependencies
- [x] Update Slide interface with `animationScript` field
- [ ] Create `pitch-deck-videos` storage bucket

### Phase 2: Claude Generation (Jan 1-3, 2025)
- [ ] Update `generate-pitch-deck` prompt for Remotion code
- [ ] Implement TSX code extraction and validation
- [ ] Test Claude generation with 10+ slide variations

### Phase 3: Video Rendering (Jan 4-7, 2025)
- [ ] Create `render-remotion-video` Edge Function
- [ ] Implement Remotion bundling and rendering
- [ ] Setup Supabase Storage upload pipeline
- [ ] Test end-to-end video generation

### Phase 4: Integration Testing (Jan 8-10, 2025)
- [ ] Test video playback in presentation mode
- [ ] Verify auto-play and looping behavior
- [ ] Test static PNG fallback
- [ ] Performance testing and optimization

### Phase 5: Launch (Jan 11, 2025)
- [ ] Deploy to production
- [ ] Monitor rendering performance and costs
- [ ] Gather user feedback
- [ ] Iterate on animation quality

---

## Appendix

### References
- [Remotion Documentation](https://www.remotion.dev/docs)
- [Remotion Renderer API](https://www.remotion.dev/docs/renderer)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [HTML5 Video Autoplay Policies](https://developer.chrome.com/blog/autoplay/)

### Related Documents
- Implementation Plan: `/Users/thabonel/.claude/plans/stateless-snuggling-forest.md`
- Previous PRD (External APIs): `docs/PRD-video-animation-generation-for-pitch-decks.md`

### Technical Specifications

**Remotion Composition Config**:
```typescript
{
  id: string;              // Unique composition ID
  component: React.FC;     // Remotion component
  durationInFrames: number; // 150-300 frames (5-10s @ 30fps)
  fps: 30;                 // Frame rate
  width: 1920;             // Video width (1080p)
  height: 1080;            // Video height (1080p)
}
```

**Video Rendering Options**:
```typescript
{
  codec: 'h264',           // H.264 codec for MP4
  outputLocation: string,  // Temp file path
  serveUrl: string,        // Bundled Remotion project URL
  composition: Composition, // Remotion composition object
}
```

**Supabase Storage Upload**:
```typescript
supabase.storage
  .from('pitch-deck-videos')
  .upload(`${pitchDeckId}-slide-${slideNumber}.mp4`, videoFile, {
    contentType: 'video/mp4',
    cacheControl: '3600', // Cache for 1 hour
    upsert: true,         // Overwrite if exists
  });
```

---

**Document Version History**:
- v1.0 (Dec 31, 2024): Initial PRD created based on approved Remotion approach
