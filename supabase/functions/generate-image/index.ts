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

    // Use Gemini 3 Pro Image (released Nov 20, 2025)
    // Model: gemini-3-pro-image-preview (aka Nano Banana Pro)
    // Features: 2K/4K output, up to 14 reference images, character consistency
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: enhancedPrompt }
            ]
          }],
          generationConfig: {
            responseModalities: ["image"]
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

    // Extract the generated image from Gemini 3 Pro Image response
    // Response format: { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }
    const imageData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!imageData) {
      console.error('Unexpected response format:', JSON.stringify(result));
      throw new Error('No image data returned from API');
    }

    console.log('Image generated successfully with Gemini 3 Pro Image');

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
