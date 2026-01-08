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

TYPOGRAPHY - AVOID:
- Em dashes, emojis, sparkles ✨
- Excessive bold, ALL CAPS
- Generic icon-heavy layouts

TYPOGRAPHY - USE:
- Clean fonts with personality
- Simple hyphens instead of em dashes
- Natural sentence structure
- Human-written text, not marketing templates

DESIGN STYLE - AVOID:
- Floating geometric shapes, abstract blobs
- Glossy plastic surfaces
- Perfect symmetry, sterile layouts
- Generic "modern startup" aesthetic
- Cookie-cutter card grids
- Aurora/gradient mesh backgrounds
- "3 features in boxes" templates

DESIGN STYLE - USE:
- Organic imperfections that feel human
- Asymmetrical layouts with intentional hierarchy
- Texture: paper grain, subtle noise, natural materials
- Hand-drawn or sketch elements where appropriate
- Thoughtful white space
- Unique compositions, not template patterns
- Photography-inspired: natural lighting, depth, realistic shadows

PRINCIPLES:
- Design as if created by a skilled human designer, not AI
- Prioritize warmth, authenticity, personality over "sleek modern"
- Choose less obvious, less trendy options
- Every choice should feel intentional, not default
- Avoid template library aesthetics
`;

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
      console.error('GEMINI_API_KEY is not set. Image generation requires a Gemini API key.');
      return new Response(
        JSON.stringify({
          error: 'Image generation is not available. Please configure GEMINI_API_KEY in your Supabase Edge Functions secrets to enable visual content.',
          missingConfig: 'GEMINI_API_KEY'
        } as ImageGenerationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503, // Service Unavailable
        }
      );
    }

    // Default negative prompt to avoid common issues
    const defaultNegativePrompt = "blurry, low quality, distorted, watermark, text overlay, stock photo cliche, generic, amateur";
    const finalNegativePrompt = negativePrompt || defaultNegativePrompt;

    // Enhanced prompt based on style with design system enforcement
    let enhancedPrompt = prompt;
    switch (style) {
      case 'photorealistic':
        enhancedPrompt = `Photorealistic, high-quality, detailed: ${prompt}`;
        break;
      case 'illustration':
        enhancedPrompt = `Professional illustration, clean, human-crafted design (not generic AI style): ${prompt}`;
        break;
      case 'diagram':
        enhancedPrompt = `Clean technical diagram, minimalist, professional, human-designed: ${prompt}`;
        break;
      case 'chart':
        enhancedPrompt = `Data visualization, professional chart, clean human-crafted design: ${prompt}`;
        break;
      case 'icon':
        enhancedPrompt = `Simple icon, minimal design, clean lines, human-crafted: ${prompt}`;
        break;
    }

    // Prepend design system guidelines
    enhancedPrompt = DESIGN_SYSTEM_PROMPT + '\n\n' + enhancedPrompt;

    // Append negative prompt guidance
    enhancedPrompt += `\n\nAvoid: ${finalNegativePrompt}`;

    // Use Gemini 2.0 Flash Experimental for image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: enhancedPrompt }
            ]
          }],
          generationConfig: {
            responseModalities: ["image", "text"]
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

    // Extract the generated image - search through parts to find one with inlineData
    const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    const imageData = imagePart?.inlineData?.data;

    if (!imageData) {
      console.error('Unexpected response format:', JSON.stringify(result).substring(0, 500));
      throw new Error('No image data returned from API. The model may not support image generation for this prompt.');
    }

    console.log('Image generated successfully with Gemini 2.0 Flash');

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
