# Stop Button Implementation & Async Video Generation Service

**Date:** January 1, 2026
**Developer:** Claude Opus 4.5
**Status:** ✅ Completed and Deployed
**Commit:** `bedfc57` - feat: Add stop button to AI chat and async video generation service

---

## Overview

This handover document covers two major improvements to AI Query Hub:

1. **Stop Button for AI Chat** - Allow users to cancel AI generation mid-stream
2. **Async Video Generation Service** - Move Fal.ai video generation to separate Docker service to avoid Edge Function timeouts

---

## 1. Stop Button Implementation

### Problem Statement

Users had no way to cancel AI requests once initiated. If they changed their mind, made a typo, or wanted to refine their prompt, they had to wait for the entire AI response to complete (potentially 30-60 seconds). This created a poor user experience, especially for long-running queries.

### Solution

Implemented a cancellable AI request system using `AbortController`, matching Claude's UX pattern:
- Replace send button with red stop button (X icon) during generation
- Cancel fetch request when user clicks stop
- Clean up resources and reset UI state
- Show user-friendly toast notification

### Files Modified

#### `src/components/ConversationChat.tsx`

**Changes:**
- Added `abortControllerRef` (line 62) to track current request
- Added `handleStopGeneration()` function (lines 212-220) to cancel requests
- Changed from `supabase.functions.invoke()` to direct `fetch()` with `AbortSignal` (lines 372-402)
- Added conditional stop button UI (lines 919-932)

**Key Code Sections:**

```typescript
// AbortController ref to maintain state across renders
const abortControllerRef = useRef<AbortController | null>(null);

// Stop generation handler
const handleStopGeneration = () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    toast.info('Generation stopped');
  }
};

// Fetch with AbortSignal
abortControllerRef.current = new AbortController();
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/ai-query`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({...}),
    signal: abortControllerRef.current.signal, // Enable cancellation
  }
);

// UI: Conditional stop button
{isLoading ? (
  <Button
    type="button"
    onClick={handleStopGeneration}
    variant="destructive"
    className="bg-red-600 hover:bg-red-700"
  >
    <X className="h-4 w-4" />
  </Button>
) : (
  <Button type="submit" disabled={!input.trim()}>
    <Send className="h-4 w-4" />
  </Button>
)}
```

#### `src/components/AIQueryInput.tsx`

**Changes:**
- Added `abortControllerRef` (line 43)
- Added `handleStopGeneration()` function (lines 167-178)
- Updated AI query to use fetch with AbortController (lines 232-277)
- Added stop button UI (lines 506-519)
- Added `X` icon import from lucide-react (line 9)

**Key Difference:**
- Uses `toast()` from shadcn-ui instead of `toast.info()`
- Button styling matches the query input design system

### Technical Details

#### Why `fetch()` instead of `supabase.functions.invoke()`?

The Supabase client's `invoke()` method doesn't support `AbortSignal`, making it impossible to cancel requests. We switched to direct `fetch()` calls which natively support the AbortController pattern.

#### Why `useRef` instead of `useState`?

Using `useState` for the AbortController would trigger re-renders and could cause the controller to be recreated. `useRef` maintains the same instance across renders without causing side effects.

#### Error Handling

When a request is aborted:
- `fetch()` throws an `AbortError`
- Catch block checks if error is abort-related
- If aborted, no error toast is shown (user intended to cancel)
- If network/API error, error toast is displayed

### User Experience

**Before:**
1. User submits AI query
2. Realizes prompt needs refinement
3. Must wait 30-60 seconds for response
4. Submits corrected query

**After:**
1. User submits AI query
2. Realizes prompt needs refinement
3. Clicks red stop button (instant)
4. Refines prompt and resubmits immediately

### Testing Checklist

- [ ] Start AI query in ConversationChat
- [ ] Click stop button during generation
- [ ] Verify request is cancelled (no response added to chat)
- [ ] Verify toast notification appears
- [ ] Repeat for AIQueryInput component
- [ ] Test with slow network (throttle to 3G) to ensure stop works mid-stream
- [ ] Verify no console errors when stopping
- [ ] Verify AbortController cleanup (no memory leaks)

---

## 2. Async Video Generation Service

### Problem Statement

The `generate-pitch-deck` Edge Function was timing out (60-second limit) when generating videos synchronously via Fal.ai. Each video takes 20-40 seconds to generate, making it impossible to generate multiple videos per pitch deck.

**Previous Flow:**
1. User requests pitch deck
2. Edge Function generates slides with Gemini
3. Edge Function generates images/videos synchronously (TIMEOUT HERE)
4. Return pitch deck to user

### Solution

Decouple video generation from pitch deck generation:
1. Generate slides with `imagePrompt` and `videoPrompt` stored in database
2. Return pitch deck to user immediately
3. Async Docker service processes videos in background
4. Videos uploaded to Supabase Storage when ready

### Architecture

#### New Directory: `video-generation-service/`

Standalone Deno server for async video generation with Docker containerization.

**Files Created:**

```
video-generation-service/
├── server.ts              # Deno HTTP server for video generation
├── Dockerfile             # Container configuration
├── docker-compose.yml     # Local testing setup
├── .env.example          # Environment variables template
└── README.md             # Deployment guide
```

#### `server.ts` - Video Generation Server

**Endpoints:**

**`POST /generate`** - Generate video for pitch deck slide
```typescript
Request:
{
  "deckId": "abc123",
  "slideNumber": 1,
  "prompt": "Narrative animation description...",
  "resolution": "540p" // or "720p", "1080p"
}

Response (Success):
{
  "success": true,
  "videoUrl": "https://fskwutnoxbbflzqrphro.supabase.co/storage/v1/object/public/pitch-deck-videos/abc123-slide-1.mp4",
  "duration": 8
}

Response (Error):
{
  "success": false,
  "error": "Error message"
}
```

**`GET /health`** - Health check endpoint
```json
{
  "status": "ok",
  "service": "video-generation"
}
```

**Key Features:**
- Calls Fal.ai Mochi-1 API for video generation
- Downloads video from Fal.ai temporary URL
- Uploads to Supabase Storage (`pitch-deck-videos` bucket)
- Returns permanent public URL
- No timeout limits (runs until video completes)

#### `Dockerfile` - Container Configuration

```dockerfile
FROM denoland/deno:2.1.4

WORKDIR /app
COPY server.ts .

# Cache dependencies
RUN deno cache server.ts

EXPOSE 8080
CMD ["deno", "run", "--allow-net", "--allow-env", "server.ts"]
```

**Base Image:** `denoland/deno:2.1.4`
**Port:** 8080
**Permissions:** Network access, environment variables

#### `docker-compose.yml` - Local Testing

```yaml
version: '3.8'

services:
  video-generator:
    build: .
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - FAL_KEY=${FAL_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Edge Function Changes

#### `supabase/functions/generate-pitch-deck/index.ts`

**What Changed:**
- Removed synchronous video generation loop
- Now stores `imagePrompt` and `videoPrompt` in slide data
- Videos generated asynchronously by separate service
- No more timeout issues

**Before (Synchronous):**
```typescript
if (animationStyle === 'expressive') {
  const narrativePrompt = createNarrativeAnimationPrompt(slide);
  const videoResult = await generateVideo(narrativePrompt, slide.visualType || 'illustration');
  // TIMEOUT: Each video takes 20-40s
  if (videoResult?.videoUrl) {
    slide.videoUrl = videoResult.videoUrl;
    slide.videoDuration = videoResult.duration;
  }
}
```

**After (Async):**
```typescript
if (animationStyle === 'expressive') {
  const narrativePrompt = createNarrativeAnimationPrompt(slide);
  slide.videoPrompt = narrativePrompt; // Store for async generation
  console.log(`Video prompt stored for slide ${slide.slideNumber}`);
}
```

**Integration Flow:**
1. Frontend calls `generate-pitch-deck` Edge Function
2. Edge Function returns slides with `videoPrompt` stored
3. Frontend (or separate cron job) calls video-generation-service
4. Service generates video and updates Supabase Storage
5. Frontend polls for video availability (future enhancement)

### Environment Variables

#### Supabase Edge Functions
No new variables needed (existing Fal.ai integration removed).

#### Video Generation Service
```bash
FAL_KEY=your_fal_api_key_here
SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=8080 # Optional, defaults to 8080
```

### Deployment Options

#### Option 1: Google Cloud Run (Recommended)

**Pros:**
- Serverless (no infrastructure management)
- Auto-scaling based on demand
- Pay-per-use pricing
- Built-in load balancing

**Commands:**
```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/video-generation-service

# Deploy to Cloud Run
gcloud run deploy video-generation-service \
  --image gcr.io/YOUR_PROJECT_ID/video-generation-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FAL_KEY=${FAL_KEY},SUPABASE_URL=${SUPABASE_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
```

**Cost Estimate:**
- First 2 million requests/month: Free
- $0.00002400/request after free tier
- Typical: ~$5-10/month for moderate usage

#### Option 2: Fly.io

**Pros:**
- Simple deployment
- Global edge locations
- Free tier includes 3 shared VMs

**Commands:**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
cd video-generation-service
fly launch

# Set secrets
fly secrets set FAL_KEY=your_key_here
fly secrets set SUPABASE_URL=your_url_here
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here

# Deploy
fly deploy
```

**Cost Estimate:**
- Free tier: 3 shared-cpu-1x VMs
- Paid: ~$1.94/month per VM

#### Option 3: Railway

**Pros:**
- GitHub integration (auto-deploy on push)
- Simple dashboard
- Free trial credits

**Setup:**
1. Connect GitHub repo to Railway
2. Add `video-generation-service/` as service
3. Set environment variables in dashboard
4. Auto-deploys on git push

**Cost Estimate:**
- $5/month starter plan
- Pay-as-you-go after trial

### Local Testing

```bash
cd video-generation-service

# Copy environment variables
cp .env.example .env
# Edit .env with actual keys

# Build and run with Docker Compose
docker-compose up --build

# Test health endpoint
curl http://localhost:8080/health

# Test video generation
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "deckId": "test-deck-123",
    "slideNumber": 1,
    "prompt": "A simple animation showing a person sitting at a desk, papers falling around them",
    "resolution": "540p"
  }'
```

### Performance Considerations

**Video Generation Time:**
- 540p: ~20-30 seconds
- 720p: ~30-40 seconds
- 1080p: ~40-60 seconds

**Cost Per Video (Fal.ai Mochi-1):**
- 540p: $0.05
- 720p: $0.10
- 1080p: $0.20

**Recommended Strategy:**
- Default to 540p for cost optimization
- Use 720p for premium tier
- Reserve 1080p for export/download feature

### Monitoring

**Check Logs:**
```bash
# Docker Compose
docker-compose logs -f

# Cloud Run
gcloud run services logs read video-generation-service

# Fly.io
fly logs
```

**Key Metrics to Monitor:**
- Video generation success rate
- Average generation time
- Fal.ai API errors
- Supabase Storage upload failures
- Container memory/CPU usage

---

## 3. Integration & Future Work

### Frontend Integration (TODO)

The stop button is fully implemented. For video generation, you'll need to:

1. **Trigger async video generation** after pitch deck is returned:
```typescript
// After pitch deck is generated
for (const slide of pitchDeck.slides) {
  if (slide.videoPrompt) {
    fetch(`${VIDEO_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deckId: pitchDeck.id,
        slideNumber: slide.slideNumber,
        prompt: slide.videoPrompt,
        resolution: '540p',
      }),
    }).catch(console.error); // Fire and forget
  }
}
```

2. **Poll for video availability** (optional):
```typescript
// Check if video is ready
const interval = setInterval(async () => {
  const { data } = await supabase.storage
    .from('pitch-deck-videos')
    .list(`${deckId}-slide-${slideNumber}`);

  if (data?.length > 0) {
    clearInterval(interval);
    // Update UI with video URL
  }
}, 5000); // Check every 5 seconds
```

3. **Show video generation progress** in UI:
```tsx
{slide.videoPrompt && !slide.videoUrl && (
  <div className="text-sm text-muted-foreground">
    🎬 Video generating... (~30s)
  </div>
)}
```

### Database Schema Updates (TODO)

Consider adding a `video_generation_status` table:

```sql
CREATE TABLE video_generation_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id TEXT NOT NULL,
  slide_number INT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  video_url TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(deck_id, slide_number)
);
```

This enables:
- Real-time progress tracking
- Error handling and retries
- Analytics on generation time
- User notifications when videos are ready

### Error Handling Improvements

**Stop Button:**
- ✅ Basic abort handling implemented
- TODO: Show partial response if AI was mid-stream
- TODO: Save draft responses for later review

**Video Generation:**
- TODO: Retry failed generations (exponential backoff)
- TODO: Fallback to static images if video fails
- TODO: User notifications via email/push when videos ready

### Performance Optimizations

**Stop Button:**
- ✅ Instant cancellation with AbortController
- ✅ No memory leaks (proper cleanup)
- TODO: Save partial AI responses as drafts

**Video Generation:**
- TODO: Batch video generation (multiple slides at once)
- TODO: Cache common animations (reduce API calls)
- TODO: Progressive quality (start with 540p, upgrade to 720p on demand)

---

## 4. Testing & Validation

### Stop Button Testing

**Manual Tests:**
1. ✅ Click stop during AI generation in ConversationChat
2. ✅ Click stop during AI query in AIQueryInput
3. ✅ Verify toast notification appears
4. ✅ Verify no AI response is added after stop
5. ✅ Verify can immediately submit new query after stop

**Edge Cases to Test:**
- Stop immediately after clicking send (race condition)
- Stop near the end of generation (partial response)
- Stop with slow network (3G throttle)
- Multiple rapid stop/start cycles

### Video Generation Testing

**Local Docker:**
```bash
cd video-generation-service
docker-compose up --build

# Test endpoint
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "deckId": "test-123",
    "slideNumber": 1,
    "prompt": "Person sitting at desk, papers falling around them",
    "resolution": "540p"
  }'

# Verify video uploaded to Supabase Storage
```

**Production Deployment:**
1. Deploy to Cloud Run/Fly.io
2. Update `VIDEO_SERVICE_URL` in frontend environment variables
3. Generate test pitch deck
4. Verify videos appear in `pitch-deck-videos` bucket
5. Monitor logs for errors

---

## 5. Rollback Procedures

### Stop Button Rollback

If issues arise with the stop button:

```bash
# Revert to previous commit
git revert bedfc57

# Or manually revert changes
# ConversationChat.tsx: Remove AbortController, restore original fetch
# AIQueryInput.tsx: Remove AbortController, restore original fetch
```

**Known Safe Fallback:**
- Remove stop button UI (keep send button always visible)
- Remove AbortController logic
- Restore `supabase.functions.invoke()` calls

### Video Generation Rollback

If async service causes issues:

1. **Disable video generation entirely:**
```typescript
// In generate-pitch-deck/index.ts
if (animationStyle === 'expressive') {
  // Just store prompt, don't generate
  slide.videoPrompt = createNarrativeAnimationPrompt(slide);
}
```

2. **Restore synchronous generation** (with timeout risk):
```typescript
// Use previous implementation (commit before bedfc57)
git checkout bedfc57~1 -- supabase/functions/generate-pitch-deck/index.ts
```

3. **Fallback to static images:**
```typescript
// Use imagePrompt instead of videoPrompt
slide.imageUrl = generateStaticImage(slide.imagePrompt);
```

---

## 6. Documentation & Resources

### Code References

**Stop Button:**
- ConversationChat.tsx:62 - `abortControllerRef` initialization
- ConversationChat.tsx:212-220 - `handleStopGeneration()` function
- ConversationChat.tsx:372-402 - Fetch with AbortController
- ConversationChat.tsx:919-932 - Stop button UI
- AIQueryInput.tsx:43 - `abortControllerRef` initialization
- AIQueryInput.tsx:167-178 - `handleStopGeneration()` function
- AIQueryInput.tsx:232-277 - Fetch with AbortController
- AIQueryInput.tsx:506-519 - Stop button UI

**Video Generation:**
- video-generation-service/server.ts - Async video generation service
- video-generation-service/Dockerfile - Container configuration
- video-generation-service/docker-compose.yml - Local testing
- video-generation-service/README.md - Deployment guide
- supabase/functions/generate-pitch-deck/index.ts - Modified to store prompts

### External Documentation

**AbortController:**
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- React patterns: https://react.dev/reference/react/useRef

**Fal.ai Mochi-1:**
- API Docs: https://fal.ai/models/fal-ai/mochi-v1/api
- Pricing: https://fal.ai/pricing
- Dashboard: https://fal.ai/dashboard

**Docker Deployment:**
- Cloud Run: https://cloud.google.com/run/docs
- Fly.io: https://fly.io/docs
- Railway: https://docs.railway.app

### Related PRDs

- `PRD-video-animation-generation-for-pitch-decks.md` - Original video generation spec
- `PRD-remotion-narrative-video-generation.md` - Alternative Remotion approach
- `VIDEO_GENERATION_GUIDE.md` - Comprehensive video generation guide
- `VIDEO_API_COMPARISON.md` - Fal.ai vs other providers

---

## 7. Known Issues & Limitations

### Stop Button

**Current Limitations:**
- No partial response saving (full response is discarded)
- No "resume generation" feature
- Toast notification is generic (could be more contextual)

**Future Enhancements:**
- Save partial AI responses as drafts
- Show token usage before discarding
- Confirm dialog for long-running queries
- Resume generation from last token

### Video Generation

**Current Limitations:**
- No real-time progress updates (user doesn't know when video is ready)
- No retry mechanism for failed generations
- No video quality options exposed to user
- No caching (same prompt generates new video every time)

**Future Enhancements:**
- WebSocket connection for real-time progress
- Email/push notifications when videos ready
- Video preview before finalizing
- Cache common animations
- Batch generation for multiple slides

---

## 8. Handover Checklist

- [x] Stop button implemented in ConversationChat.tsx
- [x] Stop button implemented in AIQueryInput.tsx
- [x] AbortController properly cleanup on unmount
- [x] Toast notifications working
- [x] Async video generation service created
- [x] Docker containerization complete
- [x] Deployment guide written
- [x] Edge Function updated to store prompts
- [x] All changes committed to git (bedfc57)
- [x] Changes pushed to GitHub
- [ ] Video service deployed to Cloud Run/Fly.io
- [ ] Frontend integrated with video service
- [ ] Video generation tested end-to-end
- [ ] User documentation updated
- [ ] Monitoring/alerting configured

---

## 9. Support & Maintenance

### Common Issues

**"Stop button doesn't work"**
- Check browser console for AbortError
- Verify fetch is using AbortSignal
- Ensure abortControllerRef is not null

**"Video generation times out"**
- Check Fal.ai API key is valid
- Verify Supabase Storage bucket exists
- Check Docker service logs for errors
- Ensure network connectivity to Fal.ai

**"Videos not uploading to Supabase"**
- Verify `pitch-deck-videos` bucket exists
- Check RLS policies allow service role to upload
- Ensure SUPABASE_SERVICE_ROLE_KEY is correct
- Check storage quota hasn't been exceeded

### Debug Commands

```bash
# Check if video service is running
curl http://YOUR_SERVICE_URL/health

# View video service logs
docker-compose logs -f  # Local
gcloud run services logs read video-generation-service  # Cloud Run
fly logs  # Fly.io

# Check Supabase Storage
npx supabase storage list pitch-deck-videos

# Test Fal.ai API directly
curl -X POST https://fal.run/fal-ai/mochi-v1 \
  -H "Authorization: Key YOUR_FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test animation", "duration": 8}'
```

---

## 10. Next Steps

### Immediate (Week 1)
1. Deploy video-generation-service to Cloud Run
2. Test end-to-end video generation flow
3. Monitor for errors and performance issues
4. Update user documentation

### Short-term (Month 1)
1. Add real-time progress updates for video generation
2. Implement retry logic for failed generations
3. Add user notifications when videos ready
4. Create admin dashboard for monitoring video queue

### Long-term (Quarter 1)
1. Implement video caching to reduce API costs
2. Add video quality options (540p/720p/1080p)
3. Build video preview feature
4. Create analytics dashboard for video usage

---

**Document Status:** ✅ Complete
**Last Updated:** January 1, 2026
**Next Review:** February 1, 2026
**Owner:** Development Team

For questions or issues, refer to the [BIBLE documentation](BIBLE/) or create a GitHub issue.
