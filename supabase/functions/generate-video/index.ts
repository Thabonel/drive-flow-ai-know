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
  error?: string;
}

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

    // Prepare video generation request
    const runwayRequest = {
      prompt: prompt,
      duration: duration,
      aspect_ratio: aspectRatio,
      resolution: resolution === '4k' ? '2160p' : resolution,
      negative_prompt: negativePrompt || 'blurry, low quality, distorted, watermark, text overlay',
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

    return new Response(
      JSON.stringify({
        videoUrl: videoUrl,
        duration: runwayResult.duration || duration,
        resolution: resolution,
        fileSizeMb: runwayResult.file_size_mb,
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
