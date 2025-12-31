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
  // Remotion narrative animation (Phase 7)
  animationScript?: string;  // React TSX code for Remotion video generation
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
${documentContext ? `${documentContext.substring(0, 2000)}...` : 'No source documents provided'}

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
      enableRemotionAnimation = false
    }: PitchDeckRequest = await req.json();

    const isRevision = !!revisionRequest && !!currentDeck;
    const generateFrames = animationStyle === 'expressive' && frameCount >= 2 && frameCount <= 5;
    const effectiveFrameCount = Math.max(2, Math.min(5, frameCount)); // Enforce 2-5 range

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
      enableRemotionAnimation
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
        // Rank documents by relevance and extract key metrics
        const rankedDocs = selectedDocs
          .map(doc => ({
            ...doc,
            relevanceScore: calculateRelevance(doc, topic),
            keyMetrics: extractMetrics(doc.content || doc.ai_summary || '')
          }))
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 10); // Limit to top 10 most relevant documents

        // Build smarter context with summaries and metrics
        documentContext = rankedDocs
          .map(doc => {
            const summary = doc.ai_summary || doc.content?.substring(0, 500) || '';
            const metricsText = doc.keyMetrics.length > 0
              ? `\nKey Metrics: ${doc.keyMetrics.join(', ')}`
              : '';
            return `### ${doc.title}\nCategory: ${doc.category || 'General'}${metricsText}\n\n${summary}`;
          })
          .join('\n\n---\n\n');

        console.log(`Built ranked context from ${rankedDocs.length}/${selectedDocs.length} documents (${documentContext.length} chars)`);
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

${documentContext ? `\n## Available Source Documents:\n\n${documentContext}\n\n` : ''}`;
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

## ANTI-AI AESTHETIC GUIDELINES (MANDATORY)

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
- Each slide should feel intentionally designed, not template-filled

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
    }

    // Step 3: Generate images for slides that need them (if requested)
    if (includeImages) {
      console.log('Generating images for slides in parallel...');

      // Helper function to generate a single image
      const generateImage = async (visualPrompt: string, visualType: string): Promise<string | undefined> => {
        try {
          const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(getStandardImageParams(visualPrompt, visualType))
          });

          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            return imageResult.imageData;
          }
        } catch (error) {
          console.error('Image generation error:', error);
        }
        return undefined;
      };

      // Helper function to generate a single video with retry logic
      const generateVideo = async (visualPrompt: string, visualType: string, retries = 2): Promise<{ url?: string; duration?: number; sizeMb?: number; error?: string }> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            console.log(`Video generation attempt ${attempt + 1}/${retries + 1} for prompt: "${visualPrompt.substring(0, 50)}..."`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout for video API

            const videoResponse = await fetch(`${supabaseUrl}/functions/v1/generate-video`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader!,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: visualPrompt,
                duration: 4, // 4 seconds default
                aspectRatio: '16:9',
                resolution: '1080p',
              }),
              signal: controller.signal
            });

            clearTimeout(timeout);

            if (videoResponse.ok) {
              const videoResult = await videoResponse.json();
              if (videoResult.videoUrl) {
                console.log(`✓ Video generated successfully (attempt ${attempt + 1}, cached: ${videoResult.cached || false})`);
                return {
                  url: videoResult.videoUrl,
                  duration: videoResult.duration,
                  sizeMb: videoResult.fileSizeMb
                };
              } else if (videoResult.error) {
                console.error(`✗ Video API returned error: ${videoResult.error}`);
                // Don't retry if API explicitly returned an error
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
            console.error(`✗ Video generation exception (attempt ${attempt + 1}):`, errorMessage);

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

      // Generate all images in parallel to avoid timeout
      const imagePromises = pitchDeckStructure.slides.map(async (slide) => {
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
          // Generate video for expressive mode, otherwise generate image
          if (animationStyle === 'expressive') {
            const videoResult = await generateVideo(slide.visualPrompt, slide.visualType || 'illustration');
            if (videoResult.url) {
              slide.videoUrl = videoResult.url;
              slide.videoDuration = videoResult.duration;
              slide.videoFileSizeMb = videoResult.sizeMb;
              videosGenerated++;
              console.log(`✓ Video generated for slide ${slide.slideNumber}: ${videoResult.url}`);
            } else {
              console.warn(`⚠ Failed to generate video for slide ${slide.slideNumber} (${videoResult.error || 'unknown error'}), falling back to static image`);
              // Fallback to static image if video generation fails
              slide.imageData = await generateImage(slide.visualPrompt, slide.visualType || 'illustration');
              if (slide.imageData) {
                imagesGenerated++;
                console.log(`✓ Fallback image generated for slide ${slide.slideNumber}`);
              } else {
                console.error(`✗ Both video and image generation failed for slide ${slide.slideNumber}`);
              }
            }
          } else {
            // Generate main slide image for non-expressive modes
            slide.imageData = await generateImage(slide.visualPrompt, slide.visualType || 'illustration');
            if (slide.imageData) {
              imagesGenerated++;
              console.log(`✓ Image generated for slide ${slide.slideNumber}`);
            } else {
              console.warn(`⚠ Failed to generate image for slide ${slide.slideNumber}`);
            }
          }

          // Generate frame images if expressive mode is enabled and frames exist
          if (generateFrames && slide.frames && slide.frames.length > 0) {
            console.log(`Generating ${slide.frames.length} frame images for slide ${slide.slideNumber}...`);

            // Generate frame images in parallel
            const frameImagePromises = slide.frames.map(async (frame) => {
              if (frame.visualPrompt) {
                frame.imageData = await generateImage(frame.visualPrompt, slide.visualType || 'illustration');
                if (frame.imageData) {
                  console.log(`Frame ${frame.frameNumber} image generated for slide ${slide.slideNumber}`);
                }
              }
            });

            await Promise.all(frameImagePromises);
            console.log(`All frame images generated for slide ${slide.slideNumber}`);
          }
        }
      });

      // Wait for all images to complete
      await Promise.all(imagePromises);

      // Log media generation summary with cost estimates
      const totalSlides = pitchDeckStructure.slides.length;
      const videoCostPerSlide = 0.20; // $0.20 per 4-second video
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
