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
  errorCode?: 'CONTENT_BLOCKED' | 'API_ERROR' | 'CONFIG_ERROR' | 'UNKNOWN';
  suggestion?: string;
}

// Design system guidelines for human-crafted aesthetic
const DESIGN_SYSTEM_PROMPT = `
DESIGN GUIDELINES - STRICT REQUIREMENTS:

CRITICAL - NO TEXT IN IMAGES:
- DO NOT include any text, words, letters, or numbers in the generated image
- NO titles, labels, captions, watermarks, or any written content
- NO letters or symbols that look like writing
- This is a VISUAL GRAPHIC only - text will be added separately by the application
- Create abstract or symbolic visual representations of concepts
- Focus on shapes, colors, illustrations, icons, and imagery

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

      // Check for specific error types
      if (response.status === 400 && errorText.toLowerCase().includes('safety')) {
        return new Response(
          JSON.stringify({
            error: 'Image generation was blocked due to content guidelines. Try rephrasing the description.',
            errorCode: 'CONTENT_BLOCKED',
            suggestion: 'Remove specific demographic descriptors or sensitive terms and try again.'
          } as ImageGenerationResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      throw new Error(`Image generation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Check for content filtering / safety blocks in response
    const candidate = result.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const safetyRatings = candidate?.safetyRatings;
    const promptFeedback = result.promptFeedback;

    // Check if prompt was blocked
    if (promptFeedback?.blockReason) {
      console.error('Prompt blocked:', promptFeedback.blockReason);
      return new Response(
        JSON.stringify({
          error: 'Image generation was blocked - the description may contain terms that triggered content filters.',
          errorCode: 'CONTENT_BLOCKED',
          suggestion: 'Try rephrasing without specific demographic descriptors (e.g., use "professional" instead of specific characteristics).'
        } as ImageGenerationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check if generation was stopped due to safety
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      console.error('Generation stopped due to safety:', finishReason, safetyRatings);
      return new Response(
        JSON.stringify({
          error: 'Image generation was stopped due to content guidelines.',
          errorCode: 'CONTENT_BLOCKED',
          suggestion: 'Try using more general descriptions. Avoid specific demographic terms or sensitive topics.'
        } as ImageGenerationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Extract the generated image - search through parts to find one with inlineData
    const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
    const imageData = imagePart?.inlineData?.data;

    if (!imageData) {
      console.error('Unexpected response format:', JSON.stringify(result).substring(0, 500));

      // Check if there's a text response that might explain why
      const textPart = candidate?.content?.parts?.find((p: any) => p.text);
      if (textPart?.text) {
        console.log('Model text response:', textPart.text);
      }

      return new Response(
        JSON.stringify({
          error: 'No image was generated. The description may need adjustment.',
          errorCode: 'CONTENT_BLOCKED',
          suggestion: 'Try simplifying the description or removing any potentially sensitive terms.'
        } as ImageGenerationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
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
