import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  style?: 'photorealistic' | 'illustration' | 'diagram' | 'chart' | 'icon';
  negativePrompt?: string;
}

interface ImageGenerationResponse {
  imageUrl?: string;
  imageData?: string; // base64 encoded image
  error?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, aspectRatio = '16:9', style = 'illustration', negativePrompt }: ImageGenerationRequest = await req.json();

    console.log('Generating image with Gemini:', { prompt, aspectRatio, style });

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Enhanced prompt based on style
    let enhancedPrompt = prompt;
    switch (style) {
      case 'photorealistic':
        enhancedPrompt = `Photorealistic, high-quality, detailed: ${prompt}`;
        break;
      case 'illustration':
        enhancedPrompt = `Professional illustration, clean, modern design: ${prompt}`;
        break;
      case 'diagram':
        enhancedPrompt = `Clean technical diagram, minimalist, professional: ${prompt}`;
        break;
      case 'chart':
        enhancedPrompt = `Data visualization, professional chart, clean design: ${prompt}`;
        break;
      case 'icon':
        enhancedPrompt = `Simple icon, minimal design, clean lines: ${prompt}`;
        break;
    }

    // Use Gemini's Imagen 3 model for image generation
    // Note: Gemini API for image generation uses the generativelanguage API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: enhancedPrompt,
            negativePrompt: negativePrompt || 'blurry, low quality, distorted',
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio,
            safetyFilterLevel: 'block_some',
            personGeneration: 'allow_adult',
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);

      // Fallback: Return a placeholder or error
      throw new Error(`Image generation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Extract the generated image
    const imageData = result.predictions?.[0]?.bytesBase64Encoded;

    if (!imageData) {
      throw new Error('No image data returned from API');
    }

    console.log('Image generated successfully');

    return new Response(
      JSON.stringify({
        imageData: imageData,
        prompt: enhancedPrompt,
      } as ImageGenerationResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Image generation error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } as ImageGenerationResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
