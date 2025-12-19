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
      selectedDocumentIds
    }: PitchDeckRequest = await req.json();

    console.log('Generating pitch deck:', { topic, numberOfSlides, style, selectedDocs: selectedDocumentIds?.length || 0 });

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

    const structurePrompt = `You are an expert pitch deck consultant. ${
      documentContext
        ? `Using the source documents provided below, create a comprehensive ${numberOfSlides}-slide pitch deck.`
        : `Create a comprehensive ${numberOfSlides}-slide pitch deck about: "${topic}"`
    }

Target audience: ${targetAudience}
Style: ${style}

${documentContext ? `\n## Source Documents\n\n${documentContext}\n\n` : ''}

${documentContext
  ? 'Extract the key information from the source documents and structure them into a compelling pitch deck. Use data, facts, and insights from the documents to make the pitch persuasive and credible.'
  : 'Research and create compelling content for the pitch deck based on the topic.'
}

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
      console.log('Generating images for slides...');

      for (const slide of pitchDeckStructure.slides) {
        if (slide.visualType && slide.visualType !== 'none' && slide.visualPrompt) {
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
      }
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
