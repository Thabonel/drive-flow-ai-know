/**
 * Async Video Generation Service
 *
 * This service runs independently in Docker and handles:
 * 1. Receiving video generation requests
 * 2. Calling Fal.ai API for video generation
 * 3. Uploading videos to Supabase Storage
 * 4. Updating pitch deck slides in the database
 *
 * Runs without timeout limits (unlike Edge Functions)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PORT = parseInt(Deno.env.get('PORT') || '8080');

interface VideoRequest {
  deckId: string;
  slideNumber: number;
  prompt: string;
  resolution?: '540p' | '720p' | '1080p';
}

interface VideoResponse {
  success: boolean;
  videoUrl?: string;
  duration?: number;
  error?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function generateVideo(request: VideoRequest): Promise<VideoResponse> {
  const { prompt, resolution = '540p', deckId, slideNumber } = request;

  try {
    console.log(`[${deckId}] Generating video for slide ${slideNumber}...`);

    // Call Fal.ai API
    const falResponse = await fetch('https://fal.run/fal-ai/mochi-v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${Deno.env.get('FAL_KEY')}`,
      },
      body: JSON.stringify({
        prompt,
        duration: 8,
        resolution,
        enable_prompt_expansion: true,
      }),
    });

    if (!falResponse.ok) {
      const errorData = await falResponse.text();
      throw new Error(`Fal.ai API error: ${falResponse.status} - ${errorData}`);
    }

    const videoData = await falResponse.json();
    const videoUrl = videoData.video.url;
    const duration = videoData.duration || 8;

    console.log(`[${deckId}] Video generated, downloading...`);

    // Download video from Fal.ai
    const videoBlob = await fetch(videoUrl).then(r => r.blob());

    // Upload to Supabase Storage
    const fileName = `${deckId}-slide-${slideNumber}.mp4`;
    const { data, error } = await supabase.storage
      .from('pitch-deck-videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('pitch-deck-videos')
      .getPublicUrl(fileName);

    console.log(`[${deckId}] Video uploaded to: ${publicUrl}`);

    // Update pitch deck in database
    // TODO: Update the slides array in pitch_decks table
    // For now, just return the video URL

    return {
      success: true,
      videoUrl: publicUrl,
      duration,
    };
  } catch (error) {
    console.error(`[${deckId}] Video generation error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (url.pathname === '/health') {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'video-generation' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Video generation endpoint
  if (url.pathname === '/generate' && req.method === 'POST') {
    try {
      const request: VideoRequest = await req.json();

      // Validate request
      if (!request.deckId || !request.slideNumber || !request.prompt) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: deckId, slideNumber, prompt' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const result = await generateVideo(request);

      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response('Not Found', { status: 404 });
};

console.log(`🎬 Video Generation Service starting on port ${PORT}...`);
serve(handler, { port: PORT });
