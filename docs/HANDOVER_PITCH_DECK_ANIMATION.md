# Pitch Deck Animation - Handover Document

**Date**: 2026-01-02
**Status**: Implementation Ready

---

## Overview

The pitch deck generator creates still images but needs to animate them with subtle element movement (character turns head, truck moves slightly, etc.). Current video generation is broken.

---

## Current State

### Landing Page
**Status**: ✅ Complete and committed (35d8929)
- Reduced features from 14 to 10
- Removed duplicate trust badges
- Removed redundant summary boxes

### Pitch Deck - Gemini Image Fix
**Status**: ⚠️ Local fix, needs commit and deploy

**File**: `supabase/functions/generate-pitch-deck/index.ts`

**Change**: Remove invalid `responseMimeType` at line 612
```diff
generationConfig: {
-  responseModalities: ['image', 'text'],
-  responseMimeType: 'image/png'  // INVALID for Gemini
+  responseModalities: ['image', 'text']
}
```

**Deploy command**:
```bash
git add supabase/functions/generate-pitch-deck/index.ts
git commit -m "fix: Remove invalid responseMimeType from Gemini config"
npx supabase functions deploy generate-pitch-deck
```

### Pitch Deck - Video Animation
**Status**: ❌ Needs implementation

**Problem**: Current `generate-video-falai` uses Mochi-v1 which only accepts text prompts, cannot animate existing images.

**Solution**: Replace with SVD Turbo (Stable Video Diffusion) which:
- Accepts `image_url` parameter
- Fast generation (10-30 seconds)
- Cheap ($0.075 per video)
- Produces ~3 second subtle animations

---

## Implementation Plan

### Step 1: Deploy Gemini Fix
```bash
git add supabase/functions/generate-pitch-deck/index.ts
git commit -m "fix: Remove invalid responseMimeType from Gemini config"
npx supabase functions deploy generate-pitch-deck
```

### Step 2: Rewrite generate-video-falai

**File**: `supabase/functions/generate-video-falai/index.ts`

Replace entire contents with:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VideoRequest {
  image_url: string;           // URL of still image to animate
  motion_bucket_id?: number;   // 1-255, lower = subtle (default 80)
  fps?: number;                // 1-25, lower = slower (default 8)
  seed?: number;               // For reproducibility
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      image_url,
      motion_bucket_id = 80,  // Subtle movement (default 127 is too much)
      fps = 8,                 // Slow playback: 25 frames / 8 fps = ~3 seconds
      seed
    }: VideoRequest = await req.json();

    if (!image_url) {
      throw new Error('image_url is required');
    }

    const falKey = Deno.env.get('FAL_API_KEY');
    if (!falKey) {
      throw new Error('FAL_API_KEY not configured');
    }

    console.log('Generating subtle animation with SVD Turbo:', {
      image_url: image_url.substring(0, 50) + '...',
      motion_bucket_id,
      fps
    });

    // SVD Turbo - synchronous, fast (~10-30 seconds)
    const response = await fetch('https://fal.run/fal-ai/fast-svd-lcm', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url,
        motion_bucket_id,      // 80 = subtle, 127 = default, 200+ = dramatic
        cond_aug: 0.02,        // Low = stays close to original image
        fps,                   // 8 fps = slow, deliberate movement
        steps: 4,              // Turbo mode (fast)
        ...(seed && { seed })
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fal.ai error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const videoUrl = result.video?.url;

    if (!videoUrl) {
      throw new Error('No video URL in response');
    }

    // Download and store in Supabase for permanence
    const videoBlob = await fetch(videoUrl).then(r => r.blob());

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const fileName = `svd-${Date.now()}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('pitch-deck-videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('pitch-deck-videos')
      .getPublicUrl(fileName);

    console.log('Video stored:', publicUrl);

    return new Response(
      JSON.stringify({
        videoUrl: publicUrl,
        duration: Math.round(25 / fps),  // 25 frames / fps
        provider: 'fal.ai',
        model: 'fast-svd-lcm'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Video generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Step 3: Update Pitch Deck Generator to Pass Image URL

**File**: `supabase/functions/generate-pitch-deck/index.ts` (around line 1310)

Change the video generation call:

```typescript
// BEFORE:
const videoResponse = await fetch(`${supabaseUrl}/functions/v1/generate-video`, {
  method: 'POST',
  headers: { 'Authorization': authHeader!, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: visualPrompt,
    duration: 4,
    aspectRatio: '16:9',
    resolution: '1080p',
  }),
  signal: controller.signal
});

// AFTER:
const videoResponse = await fetch(`${supabaseUrl}/functions/v1/generate-video-falai`, {
  method: 'POST',
  headers: { 'Authorization': authHeader!, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image_url: slide.imageData,  // The still image to animate
    motion_bucket_id: 80,        // Subtle movement
    fps: 8,                      // Slow, deliberate (~3 sec video)
  }),
  signal: controller.signal
});
```

### Step 4: Deploy

```bash
npx supabase functions deploy generate-video-falai
npx supabase functions deploy generate-pitch-deck
```

---

## Motion Control Reference

| motion_bucket_id | Effect |
|------------------|--------|
| 50-75 | Very subtle (slight breathing, micro-movements) |
| 75-100 | Subtle (head turn, gentle sway) - **RECOMMENDED** |
| 100-127 | Moderate (walking, reaching) |
| 127-180 | Active (running, dancing) |
| 180-255 | Dramatic (fast action) |

---

## Cost & Performance

| Metric | Value |
|--------|-------|
| Generation time | 10-30 seconds |
| Cost per video | $0.075 |
| Video duration | ~3 seconds (25 frames at 8 fps) |
| Motion type | Subtle element animation |

---

## Environment Variables Required

Ensure `FAL_API_KEY` is set in Supabase:
```bash
npx supabase secrets set FAL_API_KEY=your_key_here
```

---

## Sources

- [SVD Turbo API](https://fal.ai/models/fal-ai/fast-svd-lcm/api)
- [Stable Video Diffusion](https://fal.ai/models/fal-ai/stable-video)
- [fal.ai Documentation](https://docs.fal.ai/)
