import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CLAUDE_MODELS } from '../_shared/models.ts';

// @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface PitchDeckRequest {
  topic: string;
  targetAudience?: string;
  numberOfSlides?: number;
  autoSlideCount?: boolean;  // NEW: Enable AI-determined count
  style?: 'professional' | 'creative' | 'minimal' | 'bold';
  includeImages?: boolean;
  selectedDocumentIds?: string[];
  revisionRequest?: string;
  currentDeck?: PitchDeckResponse;
  slideNumber?: number;
  // Animation frame generation options (Phase 5)
  animationStyle?: 'none' | 'minimal' | 'standard' | 'expressive';
  frameCount?: number;  // 2-5 frames per slide for expressive mode
  // Remotion narrative animation (Phase 7)
  enableRemotionAnimation?: boolean;  // Generate Remotion TSX code for animated videos
  // Async mode for progressive streaming (Phase 8)
  async?: boolean;  // Return job_id immediately, process in background
  // Direct file upload content (no Documents save required)
  uploadedContent?: string;
  // Custom instructions for formatting/style
  customInstructions?: string;
  // Brand guidelines document IDs
  brandDocIds?: string[];
  // Deck purpose: presenter (with notes) vs audience (self-contained)
  deckPurpose?: 'presenter' | 'audience';
  // Enable SVD video animation of still images
  animateSlides?: boolean;
  // User-specified presentation title (if provided, use this instead of AI-generating)
  presentationTitle?: string;
}

interface AnimationFrame {
  frameNumber: number;
  description: string;
  visualPrompt: string;
  imageData?: string;
}

interface Slide {
  slideNumber: number;
  title: string;
  content: string;
  visualType?: 'chart' | 'diagram' | 'illustration' | 'icon' | 'photo' | 'none';
  visualPrompt?: string;
  imageData?: string;
  notes?: string;
  // Animation frames for expressive mode (Phase 5)
  frames?: AnimationFrame[];
  // Video support for expressive mode (Phase 6)
  videoUrl?: string;
  videoDuration?: number;
  videoFileSizeMb?: number;
  videoPrompt?: string;  // Narrative prompt for async video generation
  imagePrompt?: string;  // Visual prompt for async image generation
  // Remotion narrative animation (Phase 7)
  animationScript?: string;  // React TSX code for Remotion video generation
  // Error handling
  imageGenerationFailed?: boolean;  // Flag when image generation failed (previous image preserved)
}

interface PitchDeckResponse {
  title: string;
  subtitle: string;
  slides: Slide[];
  totalSlides: number;
}

/**
 * Get style-specific guidance for pitch deck generation
 * Expanded with detailed tone, language, and structural guidance
 */
function getStyleGuidance(style: string): string {
  const styleGuide: Record<string, string> = {
    professional: `PROFESSIONAL STYLE - Corporate Excellence
TONE: Authoritative, trustworthy, measured, confident without being aggressive.
LANGUAGE:
- Use formal but accessible language
- Lead with data, statistics, and concrete metrics
- Include industry terminology appropriately
- Cite sources and evidence
- Use phrases like "research indicates", "data shows", "proven results"
STRUCTURE:
- Clear hierarchy: headline, supporting points, evidence
- Logical flow from problem to solution
- Include ROI calculations and projections
- End with clear next steps
AVOID: Hyperbole, unsubstantiated claims, overly casual language.`,

    creative: `CREATIVE STYLE - Bold & Memorable
TONE: Energetic, visionary, provocative, emotionally engaging.
LANGUAGE:
- Use vivid storytelling and narrative arcs
- Employ unexpected metaphors and analogies
- Ask rhetorical questions that challenge assumptions
- Use punchy, memorable phrases that stick
- Embrace bold claims: "revolutionary", "game-changing", "breakthrough"
- Create tension and resolution in your narrative
STRUCTURE:
- Open with a hook that surprises or intrigues
- Build emotional momentum through the deck
- Use contrast and juxtaposition for impact
- End with a vision that inspires action
EMBRACE: Unconventional approaches, creative risks, memorable language.
THIS STYLE INTENTIONALLY uses bold, innovative, visionary language - do NOT tone it down.`,

    minimal: `MINIMAL STYLE - Maximum Clarity
TONE: Clean, focused, zen-like calm, confident simplicity.
LANGUAGE:
- One powerful idea per slide
- Short, declarative sentences
- Remove all filler words and hedging
- Every word must earn its place
- Use white space as a design element
- Let silence speak
STRUCTURE:
- Strip to essential elements only
- Maximum 3 bullet points per slide
- Prefer single statements over lists
- Use numbers and icons sparingly but effectively
AVOID: Complexity, dense text, unnecessary elaboration.`,

    bold: `BOLD STYLE - Confident & Direct
TONE: Strong, assertive, unapologetic, commanding presence.
LANGUAGE:
- Make definitive statements, not suggestions
- Use active voice exclusively
- Lead with your strongest claims
- Challenge the status quo directly
- Use power words: "dominate", "transform", "lead", "own"
- No hedging, no qualifiers, no apologies
STRUCTURE:
- Open with your biggest claim
- Back it up with undeniable evidence
- Anticipate and crush objections
- Close with a compelling call to action
EMBRACE: Confidence, directness, competitive positioning.
THIS STYLE INTENTIONALLY uses strong, assertive language - do NOT soften it.`
  };
  return styleGuide[style] || styleGuide.professional;
}

/**
 * Get anti-AI aesthetic guidelines that are conditional based on style
 * Creative and Bold styles get relaxed guidelines to allow more expressive language
 */
function getAntiAIGuidelines(style: string): string {
  // For creative and bold styles, we relax the language constraints
  // since those styles intentionally use "bold", "innovative", "revolutionary" etc.
  const isExpressiveStyle = style === 'creative' || style === 'bold';

  if (isExpressiveStyle) {
    return `## WRITING QUALITY GUIDELINES

**Writing Quality:**
- NEVER use em dashes (—). Use commas or periods instead
- Write in direct, engaging language. Vary sentence lengths for rhythm
- Avoid clichéd openings like "In today's digital age" or "It's important to note"
- Be specific rather than vague - use concrete examples and numbers

**Visual Constraints:**
- NEVER recommend purple, violet, or indigo as primary colors
- NEVER suggest purple-to-blue gradients
- NEVER use gold or bronze accents
- NEVER recommend neon colors on dark backgrounds
- INSTEAD use: warm neutrals, earth tones, classic navy, forest green, terracotta, or specific brand colors

**Note for ${style.toUpperCase()} style:**
Bold, innovative, and visionary language IS APPROPRIATE for this style.
Do NOT filter out impactful words like "revolutionary", "game-changing", "breakthrough", "transform", or "innovative".
This style should be memorable and provocative.`;
  }

  // For professional and minimal styles, use full anti-AI constraints
  return `## ANTI-AI AESTHETIC GUIDELINES (MANDATORY)

**Writing Constraints:**
- NEVER use em dashes (—). Use commas or periods instead
- AVOID overused AI words: delve, realm, tapestry, unleash, unlock, harness, navigate, embark, journey, elevate, robust, cutting-edge, game-changer, testament, vibrant, bustling, meticulous, paramount, pivotal, seamless, groundbreaking, revolutionize, transformative, unprecedented, beacon, landscape, illuminate, unveil, synergy, paradigm, foster, leverage, empower, holistic, streamline
- AVOID generic phrases: "In today's digital age", "It's important to note", "When it comes to", "In the realm of", "A testament to", "Unlock the secrets", "Designed to enhance"
- Write in direct, conversational language. Short sentences. Active voice
- No lists of three unless essential
- Prefer prose over excessive bullet points

**Visual Constraints:**
- NEVER recommend purple, violet, or indigo as primary colors
- NEVER suggest purple-to-blue gradients
- NEVER use gold or bronze accents
- NEVER recommend neon colors on dark backgrounds
- INSTEAD use: warm neutrals, earth tones, classic navy, forest green, terracotta, or specific brand colors
- Prefer clean whites, subtle grays, and single accent colors

**Typography Guidance:**
- AVOID: Inter, Roboto, Arial, or generic system fonts
- Prefer distinctive fonts appropriate to context (reference real design systems like Apple's minimalism or editorial design standards)
- Use high contrast in weights (300 vs 700, not 400 vs 500)

**Formatting:**
- Minimal headers - let content speak
- Avoid cookie-cutter slide structures
- Each slide should feel intentionally designed, not template-filled`;
}

/**
 * Calculate relevance score between document and topic
 * Higher score = more relevant
 */
function calculateRelevance(doc: any, topic: string): number {
  const docText = `${doc.title} ${doc.content || ''} ${doc.ai_summary || ''}`.toLowerCase();
  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  let score = 0;
  topicWords.forEach(word => {
    const count = (docText.match(new RegExp(word, 'g')) || []).length;
    score += count;
  });

  // Boost score if title matches
  if (doc.title.toLowerCase().includes(topic.toLowerCase().substring(0, 20))) {
    score += 10;
  }

  return score;
}

/**
 * Extract key metrics and numbers from document content
 */
function extractMetrics(content: string): string[] {
  const metrics: string[] = [];

  // Match numbers with context (e.g., "50% growth", "$1M revenue", "10K users")
  const patterns = [
    /(\d+%?\s*(?:percent|growth|increase|decrease|users|customers|revenue|profit))/gi,
    /(\$\d+(?:\.\d+)?(?:[KMB])?(?:\s*(?:million|billion|thousand))?)/gi,
    /(\d+(?:\.\d+)?(?:[KMB])?\s*(?:users|customers|clients|members))/gi
  ];

  patterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    metrics.push(...matches.slice(0, 3)); // Top 3 per pattern
  });

  return [...new Set(metrics)].slice(0, 5); // Return up to 5 unique metrics
}

/**
 * Determine optimal slide count using AI
 * Returns number between 8-15 based on content complexity
 */
async function determineOptimalSlideCount(
  topic: string,
  documentContext: string,
  targetAudience: string,
  anthropicKey: string
): Promise<{ count: number; reasoning: string }> {

  const analysisPrompt = `Analyze this pitch deck topic and recommend the optimal number of slides.

## Topic
${topic}

## Target Audience
${targetAudience}

## Available Context
${documentContext ? `${documentContext.substring(0, 8000)}...` : 'No source documents provided'}

## Guidelines
- Minimum: 8 slides (cover essential story)
- Maximum: 15 slides (respect investor time)
- Standard sections: Problem, Solution, Market, Product, Traction, Competition, Team, Business Model, Financials, Ask
- Consider: topic complexity, data availability, audience sophistication

## Task
Recommend the optimal number of slides (8-15) for this pitch deck.

Return ONLY a JSON object:
{
  "recommendedSlides": <number between 8-15>,
  "reasoning": "<brief explanation in 1-2 sentences>"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODELS.FAST,  // Use fast model for analysis
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: analysisPrompt
      }]
    })
  });

  if (!response.ok) {
    console.warn('Failed to determine slide count, using default 12');
    return { count: 12, reasoning: 'Default count used due to API error' };
  }

  const result = await response.json();
  const content = result.content[0].text;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);

      // Enforce constraints
      const count = Math.max(8, Math.min(15, analysis.recommendedSlides));

      console.log(`AI recommended ${count} slides: ${analysis.reasoning}`);
      return { count, reasoning: analysis.reasoning };
    }
  } catch (error) {
    console.error('Failed to parse slide count recommendation:', error);
  }

  // Fallback to smart default
  return { count: 12, reasoning: 'Standard pitch deck length' };
}

/**
 * Get standardized image generation parameters
 * Enforces 16:9 aspect ratio for all slides
 */
function getStandardImageParams(visualPrompt: string, visualType: string) {
  return {
    prompt: visualPrompt,
    style: visualType,
    aspectRatio: '16:9',  // ENFORCE 16:9 for all slides
    // Negative prompt to avoid common issues
    negativePrompt: 'vertical orientation, portrait mode, non-standard aspect ratio'
  };
}

/**
 * Create narrative animation prompt for video generation
 * Transforms static visual descriptions into animated sequences
 */
function createNarrativeAnimationPrompt(slide: Slide): string {
  const basePrompt = slide.visualPrompt || '';

  // Parse the slide content to identify animatable elements
  const hasCharacter = basePrompt.toLowerCase().includes('person') ||
                      basePrompt.toLowerCase().includes('people') ||
                      basePrompt.toLowerCase().includes('character') ||
                      basePrompt.toLowerCase().includes('team');

  const hasObjects = basePrompt.toLowerCase().includes('box') ||
                    basePrompt.toLowerCase().includes('stack') ||
                    basePrompt.toLowerCase().includes('paper') ||
                    basePrompt.toLowerCase().includes('document') ||
                    basePrompt.toLowerCase().includes('block');

  const hasGrowth = basePrompt.toLowerCase().includes('growth') ||
                   basePrompt.toLowerCase().includes('increase') ||
                   basePrompt.toLowerCase().includes('rise') ||
                   basePrompt.toLowerCase().includes('money') ||
                   basePrompt.toLowerCase().includes('revenue');

  const hasTransformation = basePrompt.toLowerCase().includes('before') && basePrompt.toLowerCase().includes('after') ||
                           basePrompt.toLowerCase().includes('transform') ||
                           basePrompt.toLowerCase().includes('change');

  // Build narrative animation instructions
  let animationInstructions = '';

  if (hasTransformation) {
    animationInstructions = `
NARRATIVE ANIMATION SEQUENCE (5-8 seconds):
- Start: Show the "before" state clearly established
- Middle (2-4s): Gradual transformation with visible progression
- End: "After" state fully realized
- Motion: Smooth, organic transition that tells the story of change
- NO quick cuts or instant changes - show the evolution`;
  } else if (hasCharacter && hasObjects) {
    animationInstructions = `
NARRATIVE ANIMATION SEQUENCE (5-8 seconds):
- Start: Character in initial state, objects begin appearing
- Progressive action: Objects accumulate/stack/pile up around character
- Character reacts: Body language changes in response (slouching, leaning, gesturing)
- Continuous motion: Objects and character moving throughout, not static poses
- Story: Visual narrative of interaction between character and environment`;
  } else if (hasGrowth) {
    animationInstructions = `
NARRATIVE ANIMATION SEQUENCE (5-8 seconds):
- Start: Small initial state or seed
- Organic growth: Elements sprouting, expanding, multiplying like plants growing
- Progressive scaling: Start small, gradually grow larger
- Natural motion: Spring-like emergence, not linear scaling
- Final state: Fully grown/expanded visualization
- NO instant appearances - show the growth process`;
  } else if (hasObjects) {
    animationInstructions = `
NARRATIVE ANIMATION SEQUENCE (5-8 seconds):
- Objects appear sequentially, one by one (not all at once)
- Each object enters with momentum (falling, sliding, placing)
- Stacking or positioning with physics (slight bounce, settle)
- Progressive build-up of the scene
- Continuous subtle motion throughout
- Final composition assembled piece by piece`;
  } else {
    // Generic narrative animation for other scenes
    animationInstructions = `
NARRATIVE ANIMATION SEQUENCE (5-8 seconds):
- Start: Establish initial scene state
- Progressive reveal: Elements appear and arrange over time
- Continuous motion: Subtle movements throughout (not static freeze frames)
- Build to completion: Scene fully forms by the end
- Story-driven: Animation serves the narrative, not just decoration`;
  }

  const narrativePrompt = `${basePrompt}

${animationInstructions}

VISUAL STYLE REQUIREMENTS:
- Warm earth tones: terracotta (#e8b4a0), warm browns (#d4a574), sage greens, olive, rust, cream
- NO purple, violet, gold, or neon colors
- Natural, human-crafted aesthetic (not slick corporate)
- 16:9 aspect ratio, 1080p resolution
- Clear, readable visuals that support the narrative

ANIMATION PRINCIPLES:
- Tell a story through motion (not just transitions)
- Characters and objects should react and interact
- Organic, purposeful movement (not robotic)
- Progressive change over time (show the process, not just before/after)
- Motion that enhances understanding of the concept`;

  return narrativePrompt;
}

/**
 * Process pitch deck job in background
 * Updates job status and slides progressively in the database
 */
async function processJobInBackground(jobId: string, supabase: any): Promise<void> {
  console.log(`[Job ${jobId}] Starting background processing`);

  try {
    // Fetch job details
    const { data: job, error: fetchError } = await supabase
      .from('pitch_deck_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error(`[Job ${jobId}] Failed to fetch job:`, fetchError);
      return;
    }

    const input = job.input_data as PitchDeckRequest;
    const {
      topic,
      targetAudience = 'general business audience',
      numberOfSlides,
      autoSlideCount = false,
      style = 'professional',
      includeImages = true,
      selectedDocumentIds,
      animationStyle = 'none',
      animateSlides = true,  // Enable SVD video animation
      uploadedContent  // Direct file upload content
    } = input as any;

    const shouldAnimateSlides = animateSlides && includeImages;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Update status: started
    await supabase
      .from('pitch_deck_jobs')
      .update({
        status: 'generating_structure',
        started_at: new Date().toISOString(),
        progress_percent: 5
      })
      .eq('id', jobId);

    // Get API key
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Fetch documents if provided
    let documentContext = '';
    if (selectedDocumentIds && selectedDocumentIds.length > 0) {
      const { data: docs } = await supabase
        .from('knowledge_documents')
        .select('*')
        .in('id', selectedDocumentIds);

      if (docs && docs.length > 0) {
        documentContext = docs
          .map((doc: any) => `### ${doc.title}\n${doc.ai_summary || doc.content?.substring(0, 3000) || ''}`)
          .join('\n\n---\n\n');
      }
    }

    // Add uploaded file content if provided
    if (uploadedContent && uploadedContent.trim()) {
      const uploadedSection = `\n\n### Uploaded Files Content\n\n${uploadedContent}`;
      documentContext = documentContext ? documentContext + uploadedSection : uploadedSection.trim();
      console.log(`[Job ${jobId}] Added uploaded content (${uploadedContent.length} chars)`);
    }

    // Determine slide count
    let slideCount = numberOfSlides || 10;
    if (autoSlideCount) {
      const recommendation = await determineOptimalSlideCount(topic, documentContext, targetAudience, anthropicKey);
      slideCount = recommendation.count;
      console.log(`[Job ${jobId}] Auto slide count: ${slideCount} (${recommendation.reasoning})`);
    }

    // Update total slides
    await supabase
      .from('pitch_deck_jobs')
      .update({ total_slides: slideCount, progress_percent: 10 })
      .eq('id', jobId);

    // Generate deck structure
    console.log(`[Job ${jobId}] Generating structure for ${slideCount} slides`);
    await supabase
      .from('pitch_deck_jobs')
      .update({ status: 'generating_slides', progress_percent: 15 })
      .eq('id', jobId);

    const structurePrompt = buildStructurePrompt(topic, targetAudience, slideCount, style, documentContext);
    const structureResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
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

    if (!structureResponse.ok) {
      const errorText = await structureResponse.text();
      throw new Error(`Claude API error: ${structureResponse.status} - ${errorText}`);
    }

    const structureData = await structureResponse.json();
    const structureText = structureData.content[0].text;

    // Parse the JSON response
    let deckStructure;
    try {
      const jsonMatch = structureText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        deckStructure = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error(`[Job ${jobId}] Failed to parse structure:`, parseError);
      throw new Error('Failed to parse pitch deck structure');
    }

    // Update with deck metadata
    await supabase
      .from('pitch_deck_jobs')
      .update({
        deck_metadata: {
          title: deckStructure.title,
          subtitle: deckStructure.subtitle,
          totalSlides: deckStructure.slides?.length || slideCount
        },
        progress_percent: 25
      })
      .eq('id', jobId);

    // Generate images for each slide in parallel batches
    const slides = deckStructure.slides || [];
    const completedSlides: any[] = [];
    const BATCH_SIZE = 3; // Process 3 slides at a time

    if (includeImages) {
      await supabase
        .from('pitch_deck_jobs')
        .update({ status: 'generating_images' })
        .eq('id', jobId);

      console.log(`[Job ${jobId}] Generating images for ${slides.length} slides`);

      for (let i = 0; i < slides.length; i += BATCH_SIZE) {
        const batch = slides.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (slide: any) => {
          try {
            const imageData = await generateSlideImageForJob(slide.visualPrompt, slide.visualType);
            let videoUrl: string | undefined;
            let videoDuration: number | undefined;

            // Generate video animation if enabled and image was generated
            if (shouldAnimateSlides && imageData) {
              try {
                console.log(`[Job ${jobId}] Animating slide ${slide.slideNumber}...`);
                const videoResponse = await fetch(`${supabaseUrl}/functions/v1/generate-video-falai`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    image_data: imageData,
                    motion_bucket_id: 80,  // Subtle movement
                    fps: 8,                // ~3 second video
                  }),
                });

                if (videoResponse.ok) {
                  const videoResult = await videoResponse.json();
                  if (videoResult.videoUrl) {
                    videoUrl = videoResult.videoUrl;
                    videoDuration = videoResult.duration;
                    console.log(`[Job ${jobId}] ✓ Video animated for slide ${slide.slideNumber}`);
                  }
                } else {
                  console.error(`[Job ${jobId}] Video animation failed for slide ${slide.slideNumber}: HTTP ${videoResponse.status}`);
                }
              } catch (videoError) {
                console.error(`[Job ${jobId}] Video animation error for slide ${slide.slideNumber}:`, videoError);
              }
            }

            return { ...slide, imageData, videoUrl, videoDuration };
          } catch (error) {
            console.error(`[Job ${jobId}] Image generation failed for slide ${slide.slideNumber}:`, error);
            return { ...slide, imageData: undefined };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        completedSlides.push(...batchResults);

        // Update progress after each batch
        const progress = Math.round(25 + ((completedSlides.length / slides.length) * 70));
        await supabase
          .from('pitch_deck_jobs')
          .update({
            slides: completedSlides,
            current_slide: completedSlides.length,
            progress_percent: Math.min(progress, 95)
          })
          .eq('id', jobId);

        console.log(`[Job ${jobId}] Completed ${completedSlides.length}/${slides.length} slides (${progress}%)`);
      }
    } else {
      // No images - just copy slides as-is
      completedSlides.push(...slides);
      await supabase
        .from('pitch_deck_jobs')
        .update({
          slides: completedSlides,
          current_slide: slides.length,
          progress_percent: 95
        })
        .eq('id', jobId);
    }

    // Mark as completed
    await supabase
      .from('pitch_deck_jobs')
      .update({
        status: 'completed',
        progress_percent: 100,
        completed_at: new Date().toISOString(),
        slides: completedSlides,
        deck_metadata: {
          title: deckStructure.title,
          subtitle: deckStructure.subtitle,
          totalSlides: completedSlides.length
        }
      })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] Completed successfully with ${completedSlides.length} slides`);

  } catch (error) {
    console.error(`[Job ${jobId}] Processing failed:`, error);

    // Mark job as failed
    await supabase
      .from('pitch_deck_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', jobId);
  }
}

/**
 * Build the structure prompt for Claude
 */
function buildStructurePrompt(topic: string, targetAudience: string, slideCount: number, style: string, documentContext: string): string {
  return `You are an expert pitch deck creator. Generate a complete pitch deck structure as JSON.

Topic: ${topic}
Target Audience: ${targetAudience}
Number of Slides: ${slideCount}
Style: ${style}

${documentContext ? `Reference Materials:\n${documentContext}\n` : ''}

Generate a JSON response with this exact structure:
{
  "title": "Deck Title",
  "subtitle": "Deck Subtitle",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "content": "Slide content with key points",
      "visualType": "photo/chart/diagram/illustration",
      "visualPrompt": "Detailed prompt for image generation",
      "notes": "Speaker notes"
    }
  ]
}

Requirements:
- Generate exactly ${slideCount} slides
- Each slide must have a unique, compelling visualPrompt
- Content should be concise but informative
- Include speaker notes for each slide
- Use professional language appropriate for ${targetAudience}
- Follow ${style} style guidelines

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Generate image for a slide in background job
 */
async function generateSlideImageForJob(visualPrompt: string, visualType: string): Promise<string | undefined> {
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    console.log('No GEMINI_API_KEY configured, skipping image generation');
    return undefined;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a 16:9 illustration or graphic. DO NOT INCLUDE ANY TEXT, WORDS, LETTERS, OR NUMBERS IN THE IMAGE.

Visual Type: ${visualType}
Concept to illustrate: ${visualPrompt}

CRITICAL REQUIREMENTS:
- NO text of any kind - no titles, labels, captions, or watermarks
- NO letters, words, numbers, or symbols that look like writing
- This is a VISUAL GRAPHIC only - text will be added separately by the presentation software
- Create an abstract or symbolic visual representation of the concept
- Focus on shapes, colors, illustrations, icons, and imagery

Style: Professional, clean, modern. Use warm earth tones (terracotta, sage green, cream, navy). No purple or neon colors. High quality, suitable for business presentations.`
            }]
          }],
          generationConfig: {
            responseModalities: ['image', 'text']
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return undefined;
    }

    const data = await response.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (imagePart?.inlineData?.data) {
      return imagePart.inlineData.data;
    }

    return undefined;
  } catch (error) {
    console.error('Image generation error:', error);
    return undefined;
  }
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

    const requestBody: PitchDeckRequest = await req.json();
    const {
      topic,
      targetAudience = 'general business audience',
      numberOfSlides,
      autoSlideCount = false,
      style = 'professional',
      includeImages = true,
      selectedDocumentIds,
      revisionRequest,
      currentDeck,
      slideNumber,
      animationStyle = 'none',
      frameCount = 3,
      enableRemotionAnimation = false,
      animateSlides = true,  // Enable SVD video animation of still images
      async: asyncMode = false,  // Enable async job processing
      uploadedContent,  // Direct file upload content
      customInstructions,  // User-provided formatting/style instructions
      brandDocIds,  // Brand guidelines document IDs
      deckPurpose = 'presenter',  // Presenter mode (with notes) or audience mode (self-contained)
      presentationTitle  // User-specified presentation title (overrides AI-generated title)
    } = requestBody;

    const isRevision = !!revisionRequest && !!currentDeck;
    const generateFrames = animationStyle === 'expressive' && frameCount >= 2 && frameCount <= 5;
    const effectiveFrameCount = Math.max(2, Math.min(5, frameCount)); // Enforce 2-5 range
    const shouldAnimateSlides = animateSlides && includeImages;  // Only animate if images enabled

    console.log('Generating pitch deck:', {
      topic,
      numberOfSlides,
      autoSlideCount,
      style,
      selectedDocs: selectedDocumentIds?.length || 0,
      isRevision,
      targetSlide: slideNumber,
      animationStyle,
      generateFrames,
      frameCount: generateFrames ? effectiveFrameCount : 0,
      enableRemotionAnimation,
      animateSlides: shouldAnimateSlides,
      asyncMode
    });

    // ========== ASYNC MODE: Create job and process in background ==========
    if (asyncMode && !isRevision) {
      console.log('Async mode enabled - creating job for background processing');

      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('pitch_deck_jobs')
        .insert({
          user_id: user.id,
          status: 'pending',
          input_data: requestBody,
          total_slides: numberOfSlides || 12
        })
        .select()
        .single();

      if (jobError) {
        console.error('Failed to create job:', jobError);
        throw new Error('Failed to create pitch deck job');
      }

      console.log('Created job:', job.id);

      // Start background processing (doesn't block response)
      EdgeRuntime.waitUntil(processJobInBackground(job.id, supabase));

      // Return immediately with job ID
      return new Response(
        JSON.stringify({
          job_id: job.id,
          status: 'pending',
          message: 'Pitch deck generation started. Connect to SSE stream for progress updates.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ========== END ASYNC MODE ==========

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
        // Rank documents by relevance and extract key metrics
        const rankedDocs = selectedDocs
          .map(doc => ({
            ...doc,
            relevanceScore: calculateRelevance(doc, topic),
            keyMetrics: extractMetrics(doc.content || doc.ai_summary || '')
          }))
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 25); // Limit to top 25 most relevant documents

        // Build smarter context with summaries and metrics
        documentContext = rankedDocs
          .map(doc => {
            const summary = doc.ai_summary || doc.content?.substring(0, 3000) || '';
            const metricsText = doc.keyMetrics.length > 0
              ? `\nKey Metrics: ${doc.keyMetrics.join(', ')}`
              : '';
            return `### ${doc.title}\nCategory: ${doc.category || 'General'}${metricsText}\n\n${summary}`;
          })
          .join('\n\n---\n\n');

        console.log(`Built ranked context from ${rankedDocs.length}/${selectedDocs.length} documents (${documentContext.length} chars)`);
      }
    }

    // Add uploaded file content if provided
    if (uploadedContent && uploadedContent.trim()) {
      const uploadedSection = `\n\n### Uploaded Files Content\n\n${uploadedContent}`;
      documentContext = documentContext ? documentContext + uploadedSection : uploadedSection.trim();
      console.log(`Added uploaded content (${uploadedContent.length} chars)`);
    }

    // Fetch brand guidelines document if specified
    let brandContext = '';
    if (brandDocIds && brandDocIds.length > 0) {
      console.log(`Fetching ${brandDocIds.length} brand guideline documents...`);
      const { data: brandDocs, error: brandError } = await supabase
        .from('knowledge_documents')
        .select('title, content, ai_summary')
        .in('id', brandDocIds)
        .eq('user_id', user.id);

      if (brandError) {
        console.error('Error fetching brand documents:', brandError);
      } else if (brandDocs && brandDocs.length > 0) {
        brandContext = brandDocs.map(doc =>
          `## Brand Guidelines: ${doc.title}\n${doc.ai_summary || doc.content?.substring(0, 3000) || ''}`
        ).join('\n\n');
        console.log(`Built brand context from ${brandDocs.length} documents (${brandContext.length} chars)`);
      }
    }

    // Determine slide count
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    let finalSlideCount: number;
    let slideCountReasoning: string | undefined;

    if (autoSlideCount && !isRevision) {
      // Use AI to determine optimal count
      console.log('Using AI to determine optimal slide count...');
      const slideCountAnalysis = await determineOptimalSlideCount(
        topic,
        documentContext,
        targetAudience,
        anthropicKey
      );

      finalSlideCount = slideCountAnalysis.count;
      slideCountReasoning = slideCountAnalysis.reasoning;

      console.log(`AI determined ${finalSlideCount} slides: ${slideCountReasoning}`);
    } else {
      // Use user-specified count or default
      finalSlideCount = numberOfSlides || 10;
      console.log(`Using ${finalSlideCount} slides (${numberOfSlides ? 'user-specified' : 'default'})`);
    }

    // Step 1: Use Claude to generate pitch deck structure and content
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

${documentContext ? `\n## Available Source Documents:\n\n${documentContext}\n\n` : ''}
${brandContext ? `\n## Brand Guidelines\n\nFollow these brand guidelines for visual and content consistency:\n${brandContext}\n\n` : ''}
${customInstructions ? `\n## User Custom Instructions\n\nIMPORTANT - Follow these specific instructions from the user:\n${customInstructions}\n\n` : ''}
${deckPurpose === 'audience' ? `
## Self-Contained Deck Requirement

This deck will be sent to customers/investors WITHOUT a presenter. Each slide MUST:
- Be completely self-explanatory without speaker notes
- Include all necessary context in the slide content itself
- Have clear, detailed bullet points that tell the full story
- Not assume the reader has background knowledge
- Be persuasive as a standalone sales/pitch document

Speaker notes should still be generated but will not be shown to the audience.
` : ''}`;
      }
    } else {
      // New generation mode
      structurePrompt = `You are an expert pitch deck consultant. ${
        documentContext
          ? `Using the source documents provided below, create a comprehensive ${finalSlideCount}-slide pitch deck.`
          : `Create a comprehensive ${finalSlideCount}-slide pitch deck about: "${topic}"`
      }

Target audience: ${targetAudience}
Style: ${style} - ${getStyleGuidance(style)}

${slideCountReasoning ? `\n## Slide Count Rationale\nThis deck uses ${finalSlideCount} slides because: ${slideCountReasoning}\n` : ''}

${documentContext ? `\n## Source Documents\n\n${documentContext}\n\n` : ''}
${brandContext ? `\n## Brand Guidelines\n\nFollow these brand guidelines for visual and content consistency:\n${brandContext}\n\n` : ''}
${customInstructions ? `\n## User Custom Instructions\n\nIMPORTANT - Follow these specific instructions from the user:\n${customInstructions}\n\n` : ''}
${deckPurpose === 'audience' ? `
## Self-Contained Deck Requirement

This deck will be sent to customers/investors WITHOUT a presenter. Each slide MUST:
- Be completely self-explanatory without speaker notes
- Include all necessary context in the slide content itself
- Have clear, detailed bullet points that tell the full story
- Not assume the reader has background knowledge
- Be persuasive as a standalone sales/pitch document

Speaker notes should still be generated but will not be shown to the audience.
` : ''}
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

${getAntiAIGuidelines(style)}

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

    // Add animation frame generation instructions if expressive mode
    const frameInstructions = generateFrames ? `

## ANIMATION FRAME GENERATION (Expressive Mode)

For slides with visual content, generate ${effectiveFrameCount} animation frames that show progressive build-up:
- Frame 1: Initial state (empty or minimal)
- Frames 2-${effectiveFrameCount - 1}: Progressive reveals (elements appearing, bars growing, etc.)
- Frame ${effectiveFrameCount}: Final complete state

**Frame Examples:**
- Chart: Bars grow from 0 to final height across frames
- Diagram: Components appear one-by-one
- Illustration: Scene builds layer by layer
- Photo: Gradual reveal (blur → clear, or zoom in)

Each frame needs a unique visual prompt describing that specific moment in the animation.
` : '';

    const frameJsonExample = generateFrames ? `,
      "frames": [
        {
          "frameNumber": 1,
          "description": "Initial empty state",
          "visualPrompt": "Description for frame 1 visual"
        },
        {
          "frameNumber": 2,
          "description": "Partial build-up",
          "visualPrompt": "Description for frame 2 visual"
        },
        {
          "frameNumber": ${effectiveFrameCount},
          "description": "Final complete state",
          "visualPrompt": "Description for final frame visual"
        }
      ]` : '';

    structurePrompt += `

For each slide, provide:
1. Slide number
2. Title (clear, engaging)
3. Content (bullet points, key messages${documentContext ? ' - use information from source documents' : ''})
4. Visual recommendation (what type of visual would enhance this slide: chart, diagram, illustration, icon, photo, or none)
5. Visual prompt (if a visual is needed, describe what should be shown)
6. Speaker notes (what the presenter should say${documentContext ? ' - reference source documents where relevant' : ''})${generateFrames ? `
7. Animation frames (${effectiveFrameCount} frames showing progressive build-up of the visual)` : ''}
${frameInstructions}
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
      "notes": "Speaker notes"${frameJsonExample}
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

    // Override AI-generated title with user-specified title if provided
    if (presentationTitle && presentationTitle.trim()) {
      console.log(`Using user-specified presentation title: "${presentationTitle}"`);
      pitchDeckStructure.title = presentationTitle.trim();
    }

    // Step 2: Generate Remotion animation scripts (Phase 7 - Narrative Animation)
    if (enableRemotionAnimation) {
      console.log('Generating Remotion animation scripts for narrative video...');

      // Helper function to generate Remotion TSX code for a single slide
      const generateRemotionScript = async (slide: Slide): Promise<string | undefined> => {
        try {
          const animationPrompt = `You are an expert motion graphics designer using Remotion (React for video).

Generate a Remotion composition component for this slide that creates a narrative animation.

## Slide Content
**Title**: ${slide.title}
**Content**: ${slide.content}
**Visual Description**: ${slide.visualPrompt || 'No specific visual description provided'}
**Speaker Notes**: ${slide.notes || 'No notes provided'}

## Requirements
1. Export a React component that uses Remotion's API
2. Use useCurrentFrame(), interpolate(), spring() for timing
3. Duration: 5-10 seconds @ 30fps (150-300 frames total)
4. Include character animation, object movement, organic growth as needed
5. Tell a visual story that unfolds over time - NOT just transitions or bounces

## Animation Style Guidelines
**DO** create narrative animations where:
- Characters move and react (person slumping as work piles up)
- Objects have physics (papers stacking, boxes moving into position)
- Elements grow organically (money sprouting from blocks like plants)
- Story progresses over time (visual narrative that unfolds)

**DON'T** use:
- Simple bounce/spring entrance effects
- Generic stagger animations
- CSS transition-style effects
- Slide-in/fade-in patterns

## Visual Design Constraints (ANTI-AI AESTHETIC)
**Colors to AVOID**:
- NO purple, violet, indigo, or lavender tones
- NO gold, metallic gold, or champagne accents
- NO purple-to-blue gradients or pink-to-purple gradients
- NO neon or glowing color effects
- NO typical "tech startup" colors (indigo-500, violet gradients on dark)

**Colors to USE**:
- Warm earth tones: terracotta (#e8b4a0), warm browns (#d4a574), sage greens, olive, rust, cream
- Classic professional: navy blue (#0a2342), charcoal gray, forest green, burgundy
- Natural palettes: stone, sand, moss, sky blue, coral
- Muted, desaturated tones rather than oversaturated bright colors

## Technical Requirements
- Import: \`import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';\`
- Component name: Use slide title in PascalCase (e.g., "Problem Statement" → "ProblemStatement")
- Export: \`export const ComponentName: React.FC = () => { ... }\`
- Resolution: 1920x1080 (16:9 aspect ratio)
- Frame rate: 30fps
- Use frame-based timing: \`const frame = useCurrentFrame();\`

## Example Animation Patterns

**Character Movement**:
\`\`\`tsx
const personY = interpolate(frame, [0, 150], [0, 30], { extrapolateRight: 'clamp' });
const personRotation = interpolate(frame, [0, 150], [0, 15], { extrapolateRight: 'clamp' });
<div style={{ transform: \`translate(-50%, \${personY}px) rotate(\${personRotation}deg)\` }}>
  {/* SVG person */}
</div>
\`\`\`

**Object Stacking**:
\`\`\`tsx
const boxCount = Math.min(Math.floor(frame / 30), 5); // New box every second
{Array.from({ length: boxCount }).map((_, i) => {
  const scale = spring({ frame: frame - (i * 30), fps: 30 });
  return <div key={i} style={{ transform: \`scale(\${scale})\` }}>{/* Box */}</div>
})}
\`\`\`

**Organic Growth**:
\`\`\`tsx
const growthScale = spring({
  frame: frame - 90,
  fps: 30,
  config: { damping: 8, stiffness: 150 }
});
<span style={{
  transform: \`scale(\${growthScale}) rotate(\${interpolate(growthScale, [0, 1], [0, 360])})\`,
  transformOrigin: 'bottom center'
}}>$</span>
\`\`\`

## Output Format
Return ONLY the complete TSX code for the Remotion component, starting with imports and ending with the component export.
Do NOT include explanations, markdown formatting, or additional text.
The code should be production-ready and immediately renderable by Remotion.`;

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: CLAUDE_MODELS.PRIMARY, // Use primary model for complex code generation
              max_tokens: 4096,
              messages: [{
                role: 'user',
                content: animationPrompt
              }]
            })
          });

          if (!response.ok) {
            console.error(`Failed to generate Remotion script for slide ${slide.slideNumber}: ${response.status}`);
            return undefined;
          }

          const result = await response.json();
          let tsxCode = result.content[0].text;

          // Extract TSX code from markdown code blocks if present
          const codeBlockMatch = tsxCode.match(/```(?:tsx|typescript|ts)?\n?([\s\S]*?)\n?```/);
          if (codeBlockMatch) {
            tsxCode = codeBlockMatch[1];
          }

          // Basic validation: check for Remotion imports
          if (!tsxCode.includes('from \'remotion\'') && !tsxCode.includes('from "remotion"')) {
            console.warn(`Generated code for slide ${slide.slideNumber} missing Remotion imports`);
            return undefined;
          }

          console.log(`✓ Remotion script generated for slide ${slide.slideNumber} (${tsxCode.length} chars)`);
          return tsxCode;

        } catch (error) {
          console.error(`Error generating Remotion script for slide ${slide.slideNumber}:`, error);
          return undefined;
        }
      };

      // Generate Remotion scripts in parallel for all slides
      const remotionPromises = pitchDeckStructure.slides.map(async (slide) => {
        // Only generate for slides with visual content
        if (slide.visualType && slide.visualType !== 'none') {
          slide.animationScript = await generateRemotionScript(slide);
        }
      });

      await Promise.all(remotionPromises);

      const scriptsGenerated = pitchDeckStructure.slides.filter(s => s.animationScript).length;
      console.log(`Remotion animation scripts: ${scriptsGenerated}/${pitchDeckStructure.slides.length} slides`);

      // Trigger video rendering for slides with animation scripts
      if (scriptsGenerated > 0) {
        console.log('Triggering video rendering for animation scripts...');

        const renderPromises = pitchDeckStructure.slides.map(async (slide) => {
          if (!slide.animationScript) return;

          try {
            // Generate unique slide ID
            const slideId = `${user.id}-slide-${slide.slideNumber}-${Date.now()}`;

            // Call render-remotion-video Edge Function
            const renderResponse = await fetch(`${supabaseUrl}/functions/v1/render-remotion-video`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader!,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                animationScript: slide.animationScript,
                slideId,
                compositionConfig: {
                  id: `slide-${slide.slideNumber}`,
                  fps: 30,
                  durationInFrames: 240, // 8 seconds @ 30fps
                  width: 1920,
                  height: 1080,
                },
              }),
            });

            if (renderResponse.ok) {
              const renderResult = await renderResponse.json();

              // Store video URL if rendering succeeded
              if (renderResult.videoUrl) {
                slide.videoUrl = renderResult.videoUrl;
                slide.videoDuration = renderResult.duration;
                slide.videoFileSizeMb = renderResult.fileSizeMb;
                console.log(`✓ Video rendered for slide ${slide.slideNumber}: ${renderResult.videoUrl}`);
              } else {
                // Rendering not yet implemented or failed
                console.log(`⚠ Video rendering not available for slide ${slide.slideNumber}: ${renderResult.error || 'Unknown error'}`);
              }
            } else {
              console.error(`✗ Failed to render video for slide ${slide.slideNumber}: HTTP ${renderResponse.status}`);
            }
          } catch (error) {
            console.error(`Error rendering video for slide ${slide.slideNumber}:`, error);
          }
        });

        await Promise.all(renderPromises);

        const videosRendered = pitchDeckStructure.slides.filter(s => s.videoUrl).length;
        console.log(`Video rendering complete: ${videosRendered}/${scriptsGenerated} videos rendered`);
      }
    }

    // Step 3: Generate images for slides that need them (if requested)
    if (includeImages) {
      console.log('Generating images for slides in parallel...');

      // Helper function to generate a single image with timeout
      const generateImage = async (visualPrompt: string, visualType: string): Promise<string | undefined> => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout per image

          const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(getStandardImageParams(visualPrompt, visualType)),
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            return imageResult.imageData;
          } else {
            const errorText = await imageResponse.text();
            console.error(`Image generation failed (${imageResponse.status}):`, errorText.substring(0, 200));
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.error('Image generation timed out');
          } else {
            console.error('Image generation error:', error);
          }
        }
        return undefined;
      };

      // Helper function to animate a still image using SVD Turbo
      const generateVideo = async (imageData: string, slideNumber: number, retries = 2): Promise<{ url?: string; duration?: number; sizeMb?: number; error?: string }> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            console.log(`Video animation attempt ${attempt + 1}/${retries + 1} for slide ${slideNumber}`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for SVD

            const videoResponse = await fetch(`${supabaseUrl}/functions/v1/generate-video-falai`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader!,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image_data: imageData,    // Base64 still image to animate
                motion_bucket_id: 80,     // Subtle movement
                fps: 8,                   // Slow, deliberate (~3 sec video)
              }),
              signal: controller.signal
            });

            clearTimeout(timeout);

            if (videoResponse.ok) {
              const videoResult = await videoResponse.json();
              if (videoResult.videoUrl) {
                console.log(`✓ Video animated successfully (attempt ${attempt + 1})`);
                return {
                  url: videoResult.videoUrl,
                  duration: videoResult.duration,
                  sizeMb: undefined
                };
              } else if (videoResult.error) {
                console.error(`✗ Video API returned error: ${videoResult.error}`);
                return { error: videoResult.error };
              }
            } else {
              const errorText = await videoResponse.text();
              console.error(`✗ Video API HTTP ${videoResponse.status}: ${errorText}`);

              // Retry on 5xx errors (server-side issues)
              if (videoResponse.status >= 500 && attempt < retries) {
                console.log(`Retrying after ${2 ** attempt}s backoff...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** attempt)));
                continue;
              }

              return { error: `HTTP ${videoResponse.status}` };
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`✗ Video animation exception (attempt ${attempt + 1}):`, errorMessage);

            // Retry on network errors or timeouts
            if (attempt < retries) {
              console.log(`Retrying after ${2 ** attempt}s backoff...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** attempt)));
              continue;
            }

            return { error: errorMessage };
          }
        }

        return { error: 'Max retries exceeded' };
      };

      // Track media generation statistics for cost reporting
      let videosGenerated = 0;
      let videosPreserved = 0;
      let imagesGenerated = 0;
      let imagesPreserved = 0;

      // Process images in batches of 2 to stay within Edge Function timeout
      // Total time budget: ~50s (Claude: 10s + 10 slides × 2 batches × 4s/image = 48s)
      const BATCH_SIZE = 2;
      const slides = pitchDeckStructure.slides;

      for (let i = 0; i < slides.length; i += BATCH_SIZE) {
        const batch = slides.slice(i, i + BATCH_SIZE);
        console.log(`Processing image batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(slides.length / BATCH_SIZE)} (slides ${i + 1}-${Math.min(i + BATCH_SIZE, slides.length)})`);

        const batchPromises = batch.map(async (slide) => {
          // For revisions, preserve existing images/videos unless the slide was modified
          const shouldGenerateImage = slide.visualType && slide.visualType !== 'none' && slide.visualPrompt;
          const isRevisedSlide = isRevision && slideNumber ? slide.slideNumber === slideNumber : true;

          // If revision and not the target slide, try to preserve existing media
          if (isRevision && !isRevisedSlide && currentDeck) {
            const existingSlide = currentDeck.slides.find(s => s.slideNumber === slide.slideNumber);

            // Preserve video if it exists (expressive mode)
            if (existingSlide?.videoUrl) {
              slide.videoUrl = existingSlide.videoUrl;
              slide.videoDuration = existingSlide.videoDuration;
              slide.videoFileSizeMb = existingSlide.videoFileSizeMb;
              videosPreserved++;
              console.log(`✓ Preserved existing video for slide ${slide.slideNumber}`);
              return;
            }

            // Preserve image if it exists (static modes)
            if (existingSlide?.imageData) {
              slide.imageData = existingSlide.imageData;
              imagesPreserved++;
              console.log(`✓ Preserved existing image for slide ${slide.slideNumber}`);
              return;
            }

            // Preserve animation frames if they exist (old expressive mode)
            if (existingSlide?.frames && existingSlide.frames.length > 0) {
              slide.frames = existingSlide.frames;
              imagesPreserved++; // Count frame preservation as image preservation
              console.log(`✓ Preserved existing animation frames for slide ${slide.slideNumber}`);
              return;
            }
          }

          if (shouldGenerateImage && slide.visualPrompt) {
            // Generate image for this slide
            console.log(`Generating image for slide ${slide.slideNumber}...`);
            slide.imageData = await generateImage(slide.visualPrompt, slide.visualType || 'illustration');

            if (slide.imageData) {
              imagesGenerated++;
              console.log(`✓ Image generated for slide ${slide.slideNumber}`);

              // Generate animated video from the still image using SVD Turbo
              // This creates subtle element movement (head turns, gentle sway, etc.)
              if (shouldAnimateSlides) {
                console.log(`Animating image for slide ${slide.slideNumber}...`);
                const videoResult = await generateVideo(slide.imageData, slide.slideNumber);

                if (videoResult.url) {
                  slide.videoUrl = videoResult.url;
                  slide.videoDuration = videoResult.duration;
                  slide.videoFileSizeMb = videoResult.sizeMb;
                  videosGenerated++;
                  console.log(`✓ Video animated for slide ${slide.slideNumber}: ${videoResult.url}`);
                } else {
                  console.log(`✗ Video animation failed for slide ${slide.slideNumber}: ${videoResult.error}`);
                }
              }
            } else {
              console.log(`✗ Image generation failed for slide ${slide.slideNumber}`);

              // FALLBACK: If this is a revision and image generation failed,
              // try to preserve the existing image from the current deck
              if (isRevision && currentDeck) {
                const existingSlide = currentDeck.slides.find(s => s.slideNumber === slide.slideNumber);
                if (existingSlide?.imageData) {
                  slide.imageData = existingSlide.imageData;
                  slide.imageGenerationFailed = true; // Flag to inform user
                  imagesPreserved++;
                  console.log(`↩ Preserved existing image for slide ${slide.slideNumber} (new image generation failed)`);
                } else if (existingSlide?.videoUrl) {
                  slide.videoUrl = existingSlide.videoUrl;
                  slide.videoDuration = existingSlide.videoDuration;
                  slide.videoFileSizeMb = existingSlide.videoFileSizeMb;
                  slide.imageGenerationFailed = true;
                  videosPreserved++;
                  console.log(`↩ Preserved existing video for slide ${slide.slideNumber} (new image generation failed)`);
                } else {
                  slide.imageGenerationFailed = true;
                  console.log(`⚠ No fallback image available for slide ${slide.slideNumber}`);
                }
              } else {
                slide.imageGenerationFailed = true;
              }
            }

            // Clear frame prompts if they exist - frames are now replaced by video
            if (slide.frames && slide.frames.length > 0) {
              slide.frames.forEach(frame => {
                frame.imageData = undefined;
              });
            }
          }
        });

        // Wait for this batch to complete before starting the next
        await Promise.all(batchPromises);
      }

      // Log media generation summary with cost estimates
      const totalSlides = pitchDeckStructure.slides.length;
      const videoCostPerSlide = 0.075; // $0.075 per ~3-second SVD video
      const imageCostPerSlide = 0.01; // $0.01 per static image

      const videosCost = videosGenerated * videoCostPerSlide;
      const imagesCost = imagesGenerated * imageCostPerSlide;
      const totalCost = videosCost + imagesCost;

      const videosSaved = videosPreserved * videoCostPerSlide;
      const imagesSaved = imagesPreserved * imageCostPerSlide;
      const totalSaved = videosSaved + imagesSaved;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Media Generation Summary:');
      console.log(`  Total slides: ${totalSlides}`);
      console.log(`  Videos: ${videosGenerated} generated, ${videosPreserved} preserved`);
      console.log(`  Images: ${imagesGenerated} generated, ${imagesPreserved} preserved`);
      if (isRevision) {
        console.log(`  Progressive generation savings: $${totalSaved.toFixed(2)} (${videosPreserved + imagesPreserved}/${totalSlides} slides reused)`);
      }
      console.log(`  Estimated cost: $${totalCost.toFixed(2)}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
