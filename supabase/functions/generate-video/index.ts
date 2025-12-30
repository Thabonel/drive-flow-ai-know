import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoGenerationRequest {
  prompt: string;
  duration?: number; // seconds (default: 4)
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  resolution?: '720p' | '1080p' | '4k';
  negativePrompt?: string;
}

interface VideoGenerationResponse {
  videoUrl?: string;
  videoData?: string; // base64 encoded video (fallback)
  duration?: number;
  resolution?: string;
  fileSizeMb?: number;
  cached?: boolean; // Whether video was served from cache
  error?: string;
}

// Design system guidelines for human-crafted aesthetic
const DESIGN_SYSTEM_PROMPT = `
DESIGN GUIDELINES - STRICT REQUIREMENTS:

COLORS - AVOID:
- Purple, violet, indigo, lavender tones
- Gold, metallic gold, champagne accents
- Purple-to-blue or pink-to-purple gradients
- Neon or glowing effects
- Typical tech startup palette (indigo-500, violet gradients on dark)

COLORS - USE:
- Warm earth tones: terracotta, warm browns, sage greens, olive, rust, cream
- Classic professional: navy blue, charcoal gray, forest green, burgundy
- Natural palettes: stone, sand, moss, sky blue, coral
- Monochromatic with one thoughtful accent
- Muted, desaturated tones over bright saturated

ANIMATION STYLE - AVOID:
- Generic corporate motion graphics templates
- Overly smooth/perfect animations (robotic feel)
- Cookie-cutter transitions
- Flashy effects for the sake of flash

ANIMATION STYLE - USE:
- Organic, purposeful motion that enhances understanding
- Human-paced reveals (not too fast, not too slow)
- Subtle imperfections that feel intentional
- Motion that guides the eye naturally

PRINCIPLES:
- Design as if created by a skilled human designer, not AI
- Prioritize warmth, authenticity, personality over "sleek modern"
- Choose less obvious, less trendy options
- Every choice should feel intentional, not default
- Avoid template library aesthetics
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      prompt,
      duration = 4,
      aspectRatio = '16:9',
      resolution = '1080p',
      negativePrompt
    }: VideoGenerationRequest = await req.json();

    console.log('Video generation request:', {
      user_id: user.id,
      prompt_length: prompt.length,
      duration,
      aspectRatio,
      resolution
    });

    // Get Runway API key
    const runwayApiKey = Deno.env.get('RUNWAY_API_KEY');
    if (!runwayApiKey) {
      throw new Error('RUNWAY_API_KEY not configured');
    }

    // Enhance prompt with design system guidelines
    const enhancedPrompt = DESIGN_SYSTEM_PROMPT + '\n\n' + prompt;

    // Default negative prompt to enforce design system
    const defaultNegativePrompt = 'purple colors, violet tones, gold accents, neon effects, glossy surfaces, generic corporate templates, blurry, low quality, distorted, watermark, text overlay';
    const finalNegativePrompt = negativePrompt
      ? `${negativePrompt}, ${defaultNegativePrompt}`
      : defaultNegativePrompt;

    // Create cache key from prompt hash (include duration, aspectRatio, resolution for uniqueness)
    const cacheKey = `${enhancedPrompt}|${duration}|${aspectRatio}|${resolution}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(cacheKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const promptHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('Checking video cache:', { prompt_hash: promptHash });

    // Check cache for existing video
    const { data: cachedVideo, error: cacheError } = await supabase
      .from('video_cache')
      .select('*')
      .eq('prompt_hash', promptHash)
      .maybeSingle();

    if (cachedVideo && !cacheError) {
      console.log('Cache HIT - returning cached video:', {
        video_url: cachedVideo.video_url,
        use_count: cachedVideo.use_count + 1,
        age_days: Math.floor((Date.now() - new Date(cachedVideo.created_at).getTime()) / (1000 * 60 * 60 * 24))
      });

      // Update cache usage statistics
      await supabase.rpc('update_video_cache_usage', { cache_id: cachedVideo.id });

      return new Response(
        JSON.stringify({
          videoUrl: cachedVideo.video_url,
          duration: cachedVideo.duration_seconds || duration,
          resolution: cachedVideo.resolution || resolution,
          fileSizeMb: cachedVideo.file_size_mb,
          cached: true,
        } as VideoGenerationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('Cache MISS - generating new video');

    // Prepare video generation request
    const runwayRequest = {
      prompt: enhancedPrompt,
      duration: duration,
      aspect_ratio: aspectRatio,
      resolution: resolution === '4k' ? '2160p' : resolution,
      negative_prompt: finalNegativePrompt,
    };

    console.log('Calling Runway Gen-3 API:', {
      duration: runwayRequest.duration,
      aspect_ratio: runwayRequest.aspect_ratio,
      resolution: runwayRequest.resolution
    });

    // Call Runway Gen-3 API
    const runwayResponse = await fetch('https://api.runwayml.com/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(runwayRequest)
    });

    if (!runwayResponse.ok) {
      const errorText = await runwayResponse.text();
      console.error('Runway API error:', errorText);
      throw new Error(`Video generation failed: ${runwayResponse.status} - ${errorText}`);
    }

    const runwayResult = await runwayResponse.json();

    // Runway returns a generation ID, need to poll for completion
    const generationId = runwayResult.id;
    console.log('Video generation started:', { generation_id: generationId });

    // Poll for completion (max 5 minutes)
    let videoUrl: string | undefined;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5s intervals

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(`https://api.runwayml.com/v1/generations/${generationId}`, {
        headers: {
          'Authorization': `Bearer ${runwayApiKey}`,
        }
      });

      if (!statusResponse.ok) {
        console.error('Failed to check generation status');
        attempts++;
        continue;
      }

      const status = await statusResponse.json();

      if (status.status === 'completed') {
        videoUrl = status.video_url;
        console.log('Video generation completed:', {
          video_url: videoUrl,
          duration_actual: status.duration,
          file_size_mb: status.file_size_mb
        });
        break;
      } else if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`);
      }

      console.log(`Generation in progress (attempt ${attempts + 1}/${maxAttempts}):`, status.status);
      attempts++;
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out after 5 minutes');
    }

    // Store in cache for future reuse
    console.log('Storing video in cache:', { prompt_hash: promptHash });
    const { error: cacheInsertError } = await supabase
      .from('video_cache')
      .insert({
        prompt_hash: promptHash,
        prompt_text: prompt.substring(0, 500), // Store first 500 chars for debugging
        video_url: videoUrl,
        duration_seconds: runwayResult.duration || duration,
        file_size_mb: runwayResult.file_size_mb,
        resolution: resolution,
      });

    if (cacheInsertError) {
      console.error('Failed to cache video (non-fatal):', cacheInsertError);
      // Don't throw - caching is optional
    } else {
      console.log('Video cached successfully');
    }

    return new Response(
      JSON.stringify({
        videoUrl: videoUrl,
        duration: runwayResult.duration || duration,
        resolution: resolution,
        fileSizeMb: runwayResult.file_size_mb,
        cached: false,
      } as VideoGenerationResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Video generation error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } as VideoGenerationResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
