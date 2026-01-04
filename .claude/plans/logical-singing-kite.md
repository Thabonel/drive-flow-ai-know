# Fix generate-video-falai for Subtle Image Animation

## Problem
The pitch deck generates still images but `generate-video-falai` doesn't animate them because it uses Mochi-v1 (text-to-video, no image input).

## Goal
Add **subtle element animation** to still images:
- Character turns head slightly
- Truck does a short drive then stops
- Hints of movement from specific elements
- ~3 seconds, slow and deliberate
- Fast generation (~10-30 seconds, not minutes)

## Solution
Use **Stable Video Diffusion Turbo** (`fal-ai/fast-svd-lcm`):
- **Fast**: ~10-30 second generation (uses only 4 steps)
- **Cheap**: $0.075 per video
- **25 frames** at 8 fps = ~3 second video
- **Subtle motion control**: `motion_bucket_id` 75-100 for deliberate movement

---

## Implementation

### File to Modify
`supabase/functions/generate-video-falai/index.ts`

### New Code (from fal.ai official docs)

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

---

## Integration with Pitch Deck Generator

### File to Modify
`supabase/functions/generate-pitch-deck/index.ts` (around line 1310)

### Changes

```typescript
// BEFORE (line 1310):
const videoResponse = await fetch(`${supabaseUrl}/functions/v1/generate-video`, {
  ...
  body: JSON.stringify({
    prompt: visualPrompt,
    duration: 4,
    ...
  }),
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

---

## Motion Control Guide

| motion_bucket_id | Effect |
|------------------|--------|
| 50-75 | Very subtle (slight breathing, micro-movements) |
| 75-100 | Subtle (head turn, gentle sway) - **RECOMMENDED** |
| 100-127 | Moderate (walking, reaching) |
| 127-180 | Active (running, dancing) |
| 180-255 | Dramatic (fast action) |

**For pitch decks**: Use 75-100 for sophisticated, professional animation.

---

## Comparison

| Model | Generation Time | Cost | Motion Quality |
|-------|-----------------|------|----------------|
| **SVD Turbo** | 10-30 sec | $0.075 | Subtle, element-based |
| Kling v2.1 | 2-5 min | $0.45 | Cinematic, dramatic |
| Mochi (current) | 30-60 sec | ~$0.10 | Text-only, no image |

---

## Deployment Steps

1. Deploy updated `generate-video-falai` function
2. Update `generate-pitch-deck` to pass `image_url` instead of `prompt`
3. Ensure `FAL_API_KEY` is set in Supabase secrets
4. Test with pitch deck - should see subtle animations

---

## Sources
- [SVD Turbo API](https://fal.ai/models/fal-ai/fast-svd-lcm/api)
- [Stable Video Diffusion](https://fal.ai/models/fal-ai/stable-video)
