import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VideoRequest {
  image_url?: string;          // URL of still image to animate
  image_data?: string;         // Base64 encoded image data (alternative to URL)
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
      image_data,
      motion_bucket_id = 80,  // Subtle movement (default 127 is too much)
      fps = 8,                 // Slow playback: 25 frames / 8 fps = ~3 seconds
      seed
    }: VideoRequest = await req.json();

    if (!image_url && !image_data) {
      throw new Error('Either image_url or image_data is required');
    }

    const falKey = Deno.env.get('FAL_API_KEY');
    if (!falKey) {
      throw new Error('FAL_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // If we have base64 data, upload to storage first to get a public URL
    let finalImageUrl = image_url;
    if (!finalImageUrl && image_data) {
      console.log('Uploading base64 image to storage...');

      // Convert base64 to blob
      const imageBytes = Uint8Array.from(atob(image_data), c => c.charCodeAt(0));
      const imageBlob = new Blob([imageBytes], { type: 'image/png' });

      const imageName = `svd-source-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('pitch-deck-videos')
        .upload(imageName, imageBlob, {
          contentType: 'image/png',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('pitch-deck-videos')
        .getPublicUrl(imageName);

      finalImageUrl = publicUrl;
      console.log('Image uploaded:', finalImageUrl);
    }

    console.log('Generating subtle animation with SVD Turbo:', {
      image_url: finalImageUrl!.substring(0, 50) + '...',
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
        image_url: finalImageUrl,
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
