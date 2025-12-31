import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, resolution = '540p' } = await req.json();

    console.log('Generating video with Fal.ai Mochi-1:', { prompt, resolution });

    // Verify FAL_KEY is set
    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY environment variable is not set');
    }
    console.log('FAL_KEY is set (length:', falKey.length, ')');

    // Call Fal.ai API with Mochi-1 model
    // Documentation: https://fal.ai/models/fal-ai/mochi-v1/api
    const falResponse = await fetch(
      'https://fal.run/fal-ai/mochi-v1',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${falKey}`,
        },
        body: JSON.stringify({
          prompt,
          duration: 8, // 8 seconds
          resolution, // '540p', '720p', or '1080p'
          enable_prompt_expansion: true, // Enhance prompt for better results
        }),
      }
    );

    if (!falResponse.ok) {
      const errorData = await falResponse.text();
      throw new Error(`Fal.ai API error: ${falResponse.status} - ${errorData}`);
    }

    const videoData = await falResponse.json();

    // Fal.ai returns: { video: { url: string }, duration: number }
    const videoUrl = videoData.video.url;
    const duration = videoData.duration || 8;

    // Download video from Fal.ai
    const videoBlob = await fetch(videoUrl).then(r => r.blob());

    // Upload to Supabase Storage for permanence
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const fileName = `falai-${Date.now()}.mp4`;
    const { data, error } = await supabase.storage
      .from('pitch-deck-videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('pitch-deck-videos')
      .getPublicUrl(fileName);

    console.log('Video generated successfully:', publicUrl);

    return new Response(
      JSON.stringify({
        videoUrl: publicUrl,
        duration,
        provider: 'fal.ai',
        model: 'mochi-v1'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fal.ai generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
