import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/**
 * SSE Streaming endpoint for pitch deck generation progress
 *
 * Usage: GET /pitch-deck-stream?job_id=<uuid>
 *
 * Streams events:
 * - progress: { type: 'progress', status, progress_percent, current_slide }
 * - slide_complete: { type: 'slide_complete', slide_number, slide }
 * - done: { type: 'done', deck_metadata }
 * - error: { type: 'error', error }
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get job_id from query params
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'job_id parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify job belongs to user
    const { data: job, error: jobError } = await supabase
      .from('pitch_deck_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE event
    const sendEvent = async (data: object) => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch (error) {
        console.error('Error writing to stream:', error);
      }
    };

    // Start streaming in background
    EdgeRuntime.waitUntil((async () => {
      try {
        let lastSlideCount = 0;
        let lastStatus = '';
        let lastProgress = 0;
        const maxIterations = 600; // 5 minutes max (500ms intervals)
        let iterations = 0;

        console.log(`[SSE] Starting stream for job ${jobId}`);

        while (iterations < maxIterations) {
          iterations++;

          // Fetch current job status
          const { data: currentJob, error: fetchError } = await supabase
            .from('pitch_deck_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

          if (fetchError) {
            console.error(`[SSE] Error fetching job:`, fetchError);
            await sendEvent({ type: 'error', error: 'Failed to fetch job status' });
            break;
          }

          const currentSlides = currentJob.slides || [];
          const currentStatus = currentJob.status;
          const currentProgress = currentJob.progress_percent || 0;

          // Send new slides as they complete
          for (let i = lastSlideCount; i < currentSlides.length; i++) {
            await sendEvent({
              type: 'slide_complete',
              slide_number: i + 1,
              slide: currentSlides[i]
            });
            console.log(`[SSE] Sent slide ${i + 1}`);
          }
          lastSlideCount = currentSlides.length;

          // Send progress update if changed
          if (currentStatus !== lastStatus || currentProgress !== lastProgress) {
            await sendEvent({
              type: 'progress',
              status: currentStatus,
              progress_percent: currentProgress,
              current_slide: currentJob.current_slide || 0,
              total_slides: currentJob.total_slides || 0,
              deck_metadata: currentJob.deck_metadata
            });
            lastStatus = currentStatus;
            lastProgress = currentProgress;
          }

          // Check for completion or failure
          if (currentStatus === 'completed') {
            await sendEvent({
              type: 'done',
              deck_metadata: currentJob.deck_metadata,
              slides: currentSlides,
              total_slides: currentSlides.length
            });
            console.log(`[SSE] Job ${jobId} completed with ${currentSlides.length} slides`);
            break;
          }

          if (currentStatus === 'failed') {
            await sendEvent({
              type: 'error',
              error: currentJob.error_message || 'Job failed'
            });
            console.log(`[SSE] Job ${jobId} failed: ${currentJob.error_message}`);
            break;
          }

          if (currentStatus === 'cancelled') {
            await sendEvent({
              type: 'error',
              error: 'Job was cancelled'
            });
            break;
          }

          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (iterations >= maxIterations) {
          await sendEvent({
            type: 'error',
            error: 'Stream timeout - job taking too long'
          });
        }

      } catch (error) {
        console.error(`[SSE] Stream error:`, error);
        await sendEvent({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        try {
          await writer.close();
        } catch (e) {
          // Writer may already be closed
        }
        console.log(`[SSE] Stream closed for job ${jobId}`);
      }
    })());

    // Return SSE response immediately
    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'  // Disable proxy buffering for nginx
      }
    });

  } catch (error) {
    console.error('SSE endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
