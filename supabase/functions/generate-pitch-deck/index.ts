import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CLAUDE_MODELS } from '../_shared/models.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PitchDeckRequest {
  topic: string;
  targetAudience?: string;
  numberOfSlides?: number;
  style?: 'professional' | 'creative' | 'minimal' | 'bold';
  includeImages?: boolean;
  selectedDocumentIds?: string[];
  revisionRequest?: string;
  currentDeck?: PitchDeckResponse;
  slideNumber?: number;
}

interface Slide {
  slideNumber: number;
  title: string;
  content: string;
  visualType?: 'chart' | 'diagram' | 'illustration' | 'icon' | 'photo' | 'none';
  visualPrompt?: string;
  imageData?: string;
  notes?: string;
}

interface PitchDeckResponse {
  title: string;
  subtitle: string;
  slides: Slide[];
  totalSlides: number;
}

/**
 * Get style-specific guidance for pitch deck generation
 */
function getStyleGuidance(style: string): string {
  const styleGuide: Record<string, string> = {
    professional: 'Use formal language, data-driven arguments, structured layouts. Emphasize credibility and authority. Include statistics and metrics where possible.',
    creative: 'Use storytelling, bold visuals, innovative metaphors. Emphasize differentiation and vision. Be memorable and engaging.',
    minimal: 'Use extreme clarity, white space, key messages only. Emphasize simplicity and focus. One core idea per slide.',
    bold: 'Use strong statements, confident language, striking visuals. Emphasize strength and conviction. Be direct and assertive.'
  };
  return styleGuide[style] || styleGuide.professional;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      topic,
      targetAudience = 'general business audience',
      numberOfSlides = 10,
      style = 'professional',
      includeImages = true,
      selectedDocumentIds,
      revisionRequest,
      currentDeck,
      slideNumber
    }: PitchDeckRequest = await req.json();

    const isRevision = !!revisionRequest && !!currentDeck;
    console.log('Generating pitch deck:', {
      topic,
      numberOfSlides,
      style,
      selectedDocs: selectedDocumentIds?.length || 0,
      isRevision,
      targetSlide: slideNumber
    });

    // Fetch selected documents if provided
    let documentContext = '';

    if (selectedDocumentIds && selectedDocumentIds.length > 0) {
      console.log(`Fetching ${selectedDocumentIds.length} selected documents...`);

      const { data: selectedDocs, error: docsError } = await supabase
        .from('knowledge_documents')
        .select('*')
        .in('id', selectedDocumentIds);

      if (docsError) {
        console.error('Error fetching documents:', docsError);
      } else if (selectedDocs && selectedDocs.length > 0) {
        // Build context from selected documents
        documentContext = selectedDocs
          .map(doc => {
            const content = doc.content || doc.ai_summary || '';
            return `### Document: ${doc.title}\nCategory: ${doc.category || 'General'}\n\n${content}`;
          })
          .join('\n\n---\n\n');

        console.log(`Built context from ${selectedDocs.length} documents (${documentContext.length} chars)`);
      }
    }

    // Step 1: Use Claude to generate pitch deck structure and content
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    let structurePrompt = '';

    if (isRevision && currentDeck) {
      // Revision mode
      const currentDeckJSON = JSON.stringify(currentDeck, null, 2);

      if (slideNumber) {
        // Single slide revision
        const targetSlide = currentDeck.slides.find(s => s.slideNumber === slideNumber);
        structurePrompt = `You are an expert pitch deck consultant. The user has requested a revision to slide ${slideNumber} of their pitch deck.

## Current Slide ${slideNumber}:
${JSON.stringify(targetSlide, null, 2)}

## Revision Request:
${revisionRequest}

## Instructions:
Revise ONLY slide ${slideNumber} based on the user's request. Keep the same slide structure but update the content, title, visual elements, and speaker notes as needed.

Return the COMPLETE deck with all slides, but with slide ${slideNumber} revised according to the request. Keep all other slides exactly as they are.

${documentContext ? `\n## Available Source Documents:\n\n${documentContext}\n\n` : ''}

## Current Full Deck:
${currentDeckJSON}`;
      } else {
        // Full deck revision
        structurePrompt = `You are an expert pitch deck consultant. The user has requested revisions to their pitch deck.

## Current Pitch Deck:
${currentDeckJSON}

## Revision Request:
${revisionRequest}

## Instructions:
Revise the pitch deck based on the user's request. This could involve:
- Modifying content across multiple slides
- Changing the tone or style
- Adding or removing information
- Restructuring slides
- Updating visuals

Maintain the same number of slides (${currentDeck.totalSlides}) unless the user specifically requests otherwise.

${documentContext ? `\n## Available Source Documents:\n\n${documentContext}\n\n` : ''}`;
      }
    } else {
      // New generation mode
      structurePrompt = `You are an expert pitch deck consultant. ${
        documentContext
          ? `Using the source documents provided below, create a comprehensive ${numberOfSlides}-slide pitch deck.`
          : `Create a comprehensive ${numberOfSlides}-slide pitch deck about: "${topic}"`
      }

Target audience: ${targetAudience}
Style: ${style} - ${getStyleGuidance(style)}

${documentContext ? `\n## Source Documents\n\n${documentContext}\n\n` : ''}

## Pitch Deck Structure Guidelines

**Opening Slide (Slide 1):**
- Strong hook that captures attention immediately
- Clear value proposition in 1-2 sentences
- Visual: Compelling hero image or brand visual

**Problem/Opportunity Slides (typically 2-3 slides):**
- Articulate the pain point or market opportunity
- Use data and statistics${documentContext ? ' from source documents' : ''} where possible
- Make the problem tangible and urgent
- Visual: Relevant diagram or chart showing the problem

**Solution Slides (typically 3-5 slides):**
- Explain how your solution addresses the problem
- Highlight unique differentiators (not just features)
- Focus on benefits and outcomes, not technical details
- Visual: Product screenshots, diagrams, or illustrations

**Proof/Traction Slides (typically 2-3 slides):**
- Include metrics, case studies, testimonials${documentContext ? ' from documents' : ''}
- Show credibility and momentum
- Visual: Charts, graphs, or customer logos

**Closing Slide (Final slide):**
- Clear call-to-action (what should audience do next?)
- Memorable closing statement
- Visual: Inspiring or aspirational image

## Content Guidelines

- Each slide should have 3-4 bullet points maximum
- Each bullet point should be 10-15 words maximum
- Use clear, concise language - avoid jargon unless audience-specific
- Lead with benefits, not features
- Use active voice and strong verbs
- Include specific data points and metrics where available${documentContext ? ' from source documents' : ''}

## Visual Recommendations

- Match visual type to content purpose:
  - Data → chart or graph
  - Process/workflow → diagram
  - Concept/idea → illustration
  - Credibility/trust → photo or icon
- Visual prompts should be specific and aligned with slide content
- Avoid generic stock photo concepts

${documentContext
  ? 'Extract key metrics, data points, and credible facts from the source documents provided. Use this information to make the pitch persuasive and credible.'
  : 'Research and create compelling content for the pitch deck based on the topic.'
}`;
    }

    structurePrompt += `

For each slide, provide:
1. Slide number
2. Title (clear, engaging)
3. Content (bullet points, key messages${documentContext ? ' - use information from source documents' : ''})
4. Visual recommendation (what type of visual would enhance this slide: chart, diagram, illustration, icon, photo, or none)
5. Visual prompt (if a visual is needed, describe what should be shown)
6. Speaker notes (what the presenter should say${documentContext ? ' - reference source documents where relevant' : ''})

Return the response in this exact JSON format:
{
  "title": "Main pitch deck title",
  "subtitle": "Compelling subtitle",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide title",
      "content": "Bullet points and key messages",
      "visualType": "illustration",
      "visualPrompt": "Description of what to illustrate",
      "notes": "Speaker notes"
    }
  ]
}

Make it compelling, data-driven where appropriate (especially if source documents contain data), and visually engaging.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODELS.PRIMARY,
        max_tokens: 16384,
        messages: [{
          role: 'user',
          content: structurePrompt
        }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeResult = await claudeResponse.json();
    const claudeContent = claudeResult.content[0].text;

    // Extract JSON from Claude's response
    const jsonMatch = claudeContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse pitch deck structure from Claude response');
    }

    const pitchDeckStructure: PitchDeckResponse = JSON.parse(jsonMatch[0]);

    // Step 2: Generate images for slides that need them (if requested)
    if (includeImages) {
      console.log('Generating images for slides in parallel...');

      // Generate all images in parallel to avoid timeout
      const imagePromises = pitchDeckStructure.slides.map(async (slide) => {
        // For revisions, preserve existing images unless the slide was modified
        const shouldGenerateImage = slide.visualType && slide.visualType !== 'none' && slide.visualPrompt;
        const isRevisedSlide = isRevision && slideNumber ? slide.slideNumber === slideNumber : true;

        // If revision and not the target slide, try to preserve existing image
        if (isRevision && !isRevisedSlide && currentDeck) {
          const existingSlide = currentDeck.slides.find(s => s.slideNumber === slide.slideNumber);
          if (existingSlide?.imageData) {
            slide.imageData = existingSlide.imageData;
            console.log(`Preserved existing image for slide ${slide.slideNumber}`);
            return;
          }
        }

        if (shouldGenerateImage) {
          try {
            // Call the generate-image function
            const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: slide.visualPrompt,
                style: slide.visualType,
                aspectRatio: '16:9'
              })
            });

            if (imageResponse.ok) {
              const imageResult = await imageResponse.json();
              slide.imageData = imageResult.imageData;
              console.log(`Image generated for slide ${slide.slideNumber}`);
            } else {
              console.warn(`Failed to generate image for slide ${slide.slideNumber}`);
            }
          } catch (imageError) {
            console.error(`Error generating image for slide ${slide.slideNumber}:`, imageError);
            // Continue without the image
          }
        }
      });

      // Wait for all images to complete
      await Promise.all(imagePromises);
      console.log('All images generated');
    }

    console.log('Pitch deck generated successfully');

    return new Response(
      JSON.stringify(pitchDeckStructure),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Pitch deck generation error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
