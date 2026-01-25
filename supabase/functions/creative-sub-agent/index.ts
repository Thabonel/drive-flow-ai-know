import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { updateTokenUsage, extractTokensFromClaudeResponse } from '../_shared/token-tracking.ts';
import { CLAUDE_MODELS } from '../_shared/models.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Style guidance for creative content generation
 * Adapted from pitch deck patterns for content creation
 */
function getCreativeStyleGuidance(style: string): string {
  const styleGuide: Record<string, string> = {
    professional: `PROFESSIONAL STYLE
TONE: Authoritative, trustworthy, measured, confident.
LANGUAGE:
- Use formal but accessible language
- Lead with data and concrete benefits
- Include industry terminology appropriately
- Use phrases like "proven results", "measurable impact"
STRUCTURE:
- Clear hierarchy with headlines and supporting points
- Logical flow from problem to solution
- Include specific metrics when possible`,

    creative: `CREATIVE STYLE
TONE: Energetic, visionary, emotionally engaging.
LANGUAGE:
- Use vivid storytelling and narrative arcs
- Employ unexpected metaphors and analogies
- Ask rhetorical questions that challenge assumptions
- Use punchy, memorable phrases
- Embrace bold claims: "revolutionary", "game-changing"
STRUCTURE:
- Open with a hook that surprises or intrigues
- Build emotional momentum
- End with a vision that inspires action`,

    minimal: `MINIMAL STYLE
TONE: Clean, focused, zen-like clarity.
LANGUAGE:
- One powerful idea at a time
- Short, declarative sentences
- Remove all filler words
- Every word must earn its place
STRUCTURE:
- Strip to essential elements only
- Prefer single statements over lists
- Use white space as a design element`,

    bold: `BOLD STYLE
TONE: Strong, assertive, commanding presence.
LANGUAGE:
- Make definitive statements, not suggestions
- Use active voice exclusively
- Lead with your strongest claims
- Use power words: "dominate", "transform", "lead"
- No hedging, no qualifiers
STRUCTURE:
- Open with your biggest claim
- Back it up with evidence
- Close with a compelling call to action`
  };
  return styleGuide[style] || styleGuide.professional;
}

/**
 * Anti-AI aesthetic guidelines for quality content
 */
function getAntiAIGuidelines(): string {
  return `## WRITING QUALITY GUIDELINES

**Avoid these overused AI patterns:**
- NEVER use em dashes (—). Use commas or periods instead
- AVOID: delve, realm, tapestry, unleash, unlock, harness, navigate, embark, journey, elevate, robust, cutting-edge, game-changer, testament, vibrant, seamless, groundbreaking, revolutionize, transformative, unprecedented, synergy, paradigm, leverage, empower, holistic, streamline
- AVOID phrases: "In today's digital age", "It's important to note", "When it comes to", "A testament to"

**Write naturally:**
- Direct, conversational language
- Short sentences, active voice
- Specific examples over vague claims
- Vary sentence length for rhythm`;
}

/**
 * Detect if the task requires visual content
 */
function needsVisuals(title: string, description: string): boolean {
  const visualKeywords = [
    'visual', 'visuals', 'image', 'images', 'graphic', 'graphics',
    'illustration', 'diagram', 'chart', 'infographic', 'picture',
    'slide', 'slides', 'presentation', 'deck', 'mockup', 'design'
  ];
  const combined = `${title} ${description}`.toLowerCase();
  return visualKeywords.some(keyword => combined.includes(keyword));
}

/**
 * Generate a Pitch Deck prompt based on the creative task
 * Adds explicit VISUAL-ONLY instruction to prevent text in generated images
 */
function generatePitchDeckPrompt(title: string, description: string): {
  topic: string;
  style: string;
  slides: number;
  deepLink: string;
} {
  // Extract topic from task
  const rawTopic = title.replace(/^(create|make|design|prep|prepare|draft)\s+/i, '').trim();

  // Add explicit visual-only instruction to prevent text in images
  // This is critical because AI image generators often add text to charts/graphs
  const topic = `${rawTopic} [VISUAL ILLUSTRATION ONLY - NO TEXT/LABELS/NUMBERS IN IMAGES]`;

  // Determine appropriate style
  let style = 'professional';
  if (/bold|strong|powerful/i.test(description)) style = 'bold';
  else if (/creative|fun|engaging/i.test(description)) style = 'creative';
  else if (/clean|simple|minimal/i.test(description)) style = 'minimal';

  // Extract slide count if mentioned
  const slideMatch = description.match(/(\d+)\s*(?:visuals?|slides?|images?)/i);
  const slides = slideMatch ? parseInt(slideMatch[1]) : 5;

  // Build deep link (use raw topic for URL readability)
  const params = new URLSearchParams({
    topic: rawTopic,
    style: style,
    slides: slides.toString(),
  });
  const deepLink = `/pitch-deck?${params.toString()}`;

  return { topic, style, slides, deepLink };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { sub_agent_id } = await req.json();

    if (!sub_agent_id) {
      return new Response(
        JSON.stringify({ error: 'sub_agent_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get sub-agent details
    const { data: subAgent, error: agentError } = await supabase
      .from('sub_agents')
      .select('*')
      .eq('id', sub_agent_id)
      .single();

    if (agentError || !subAgent) {
      throw new Error('Sub-agent not found');
    }

    // Update sub-agent status to active
    await supabase
      .from('sub_agents')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', sub_agent_id);

    const startTime = Date.now();

    // Extract task data
    const taskData = subAgent.task_data;
    const taskTitle = taskData.title || 'Creative Task';
    const taskDescription = taskData.description || '';
    const style = taskData.style || 'professional';

    // Check if task needs visuals
    const requiresVisuals = needsVisuals(taskTitle, taskDescription);
    let visualContent: any = null;
    let pitchDeckJobId: string | null = null;

    // If visuals are needed, actually generate them using Pitch Deck
    if (requiresVisuals) {
      const pitchDeckConfig = generatePitchDeckPrompt(taskTitle, taskDescription);
      console.log(`Visual task detected - calling pitch deck generator with ${pitchDeckConfig.slides} slides`);

      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const pitchDeckResponse = await fetch(`${supabaseUrl}/functions/v1/generate-pitch-deck`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            topic: pitchDeckConfig.topic,
            style: pitchDeckConfig.style,
            numberOfSlides: pitchDeckConfig.slides,
            targetAudience: 'general business audience',
            includeImages: true,
            animateSlides: false, // Disable video for faster generation
            async: false, // Synchronous for immediate results
          }),
        });

        if (pitchDeckResponse.ok) {
          const pitchDeckResult = await pitchDeckResponse.json();

          // Check if async mode returned a job ID
          if (pitchDeckResult.job_id) {
            pitchDeckJobId = pitchDeckResult.job_id;
            console.log(`Pitch deck job started: ${pitchDeckJobId}`);
          } else {
            // Synchronous result - we have the slides
            visualContent = {
              title: pitchDeckResult.title,
              subtitle: pitchDeckResult.subtitle,
              slides: pitchDeckResult.slides?.map((slide: any) => ({
                slideNumber: slide.slideNumber,
                title: slide.title,
                content: slide.content,
                imageData: slide.imageData, // Base64 image
                visualPrompt: slide.visualPrompt,
              })) || [],
              totalSlides: pitchDeckResult.totalSlides || pitchDeckResult.slides?.length || 0,
            };
            console.log(`Pitch deck generated: ${visualContent.totalSlides} slides with images`);
          }
        } else {
          const errorText = await pitchDeckResponse.text();
          console.error('Pitch deck generation failed:', errorText);
        }
      } catch (pitchDeckError) {
        console.error('Error calling pitch deck generator:', pitchDeckError);
      }
    }

    // Fetch user's recent documents for context (optional enhancement)
    const { data: recentDocs } = await supabase
      .from('knowledge_documents')
      .select('title, ai_summary')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5);

    const documentContext = recentDocs && recentDocs.length > 0
      ? `\n\nRELEVANT USER DOCUMENTS:\n${recentDocs.map(d => `- ${d.title}: ${d.ai_summary || 'No summary'}`).join('\n')}`
      : '';

    // Build creative prompt
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Build the creative prompt - if visuals were generated, inform the AI
    const visualsGeneratedNote = visualContent
      ? `\n\n**NOTE:** Visual content has already been automatically generated for this task. ${visualContent.totalSlides} slides with AI-generated images are ready. Focus on the text/copy portions of the task.`
      : '';

    const creativePrompt = `You are a creative content specialist helping with the following task.

TASK: ${taskTitle}
DETAILS: ${taskDescription}

${getCreativeStyleGuidance(style)}

${getAntiAIGuidelines()}
${documentContext}
${visualsGeneratedNote}

Complete the creative task. Provide:
1. The requested content (taglines, copy, strategy, etc.)
2. Clear, actionable deliverables
3. Any additional recommendations

Format your response in clear markdown sections.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODELS.FAST,
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: creativePrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    let creativeContent = data.content[0].text;

    // If visuals were generated, append a summary
    if (visualContent && visualContent.slides?.length > 0) {
      creativeContent += `\n\n---\n\n## Generated Visuals\n\n**${visualContent.totalSlides} slides** have been automatically generated for this task.\n\nSlides:\n${visualContent.slides.map((s: any) => `${s.slideNumber}. ${s.title}`).join('\n')}\n\nThe visual content is ready to download or view in the results panel.`;
    }

    console.log('Generated creative content for:', taskTitle);

    // Track token usage
    const tokensUsed = extractTokensFromClaudeResponse(data);
    const tokenUpdate = await updateTokenUsage(subAgent.session_id, tokensUsed);

    if (tokenUpdate.budgetExceeded) {
      console.warn(`Token budget exceeded. Session paused.`);
    }

    // Store result in agent_memory
    await supabase
      .from('agent_memory')
      .insert({
        session_id: subAgent.session_id,
        user_id: user.id,
        memory_type: 'creative_output',
        content: {
          source: 'creative_agent',
          task_title: taskTitle,
          output: creativeContent,
          requires_visuals: requiresVisuals,
          style: style,
          created_at: new Date().toISOString(),
        },
        importance: 4,
      });

    // Update sub-agent to completed with visual content
    await supabase
      .from('sub_agents')
      .update({
        status: 'completed',
        result_data: {
          content: creativeContent,
          requires_visuals: requiresVisuals,
          style: style,
          // Include generated visual content
          visuals_generated: !!visualContent,
          pitch_deck_job_id: pitchDeckJobId,
          visual_content: visualContent ? {
            title: visualContent.title,
            subtitle: visualContent.subtitle,
            totalSlides: visualContent.totalSlides,
            slides: visualContent.slides,
          } : null,
        },
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      })
      .eq('id', sub_agent_id);

    // Update task status to completed
    if (taskData?.task_id) {
      await supabase
        .from('agent_tasks')
        .update({ status: 'completed' })
        .eq('id', taskData.task_id);
    }

    return new Response(
      JSON.stringify({
        message: 'Creative task completed successfully',
        content: creativeContent,
        requires_visuals: requiresVisuals,
        visuals_generated: !!visualContent,
        pitch_deck_job_id: pitchDeckJobId,
        visual_content: visualContent,
        status: 'completed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in creative sub-agent:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
