import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  visualType?: string;
  visualPrompt?: string;
  imageData?: string;
  notes?: string;
  frames?: AnimationFrame[];
  videoUrl?: string;
  videoDuration?: number;
  videoFileSizeMb?: number;
  animationScript?: string;
}

interface DeckMetadata {
  title: string;
  subtitle: string;
  totalSlides: number;
}

interface GenerateParams {
  topic: string;
  targetAudience?: string;
  numberOfSlides?: number;
  autoSlideCount?: boolean;
  style?: 'professional' | 'creative' | 'minimal' | 'bold';
  includeImages?: boolean;
  selectedDocumentIds?: string[];
  animationStyle?: 'none' | 'minimal' | 'standard' | 'expressive';
  frameCount?: number;
  enableRemotionAnimation?: boolean;
  uploadedContent?: string; // Direct file upload content
}

type StreamStatus = 'idle' | 'starting' | 'generating_structure' | 'generating_slides' | 'generating_images' | 'complete' | 'error';

interface PitchDeckStreamState {
  status: StreamStatus;
  slides: Slide[];
  deckMetadata: DeckMetadata | null;
  progress: number;
  currentSlide: number;
  totalSlides: number;
  error: string | null;
  jobId: string | null;
}

/**
 * Hook for progressive pitch deck generation with SSE streaming
 *
 * Usage:
 * ```tsx
 * const { generate, status, slides, progress, deckMetadata, cancel } = usePitchDeckStream();
 *
 * // Start generation
 * await generate({ topic: 'AI Startup Pitch', includeImages: true });
 *
 * // Slides appear progressively as they complete
 * slides.map(slide => <SlideCard slide={slide} />)
 * ```
 */
export function usePitchDeckStream() {
  const [state, setState] = useState<PitchDeckStreamState>({
    status: 'idle',
    slides: [],
    deckMetadata: null,
    progress: 0,
    currentSlide: 0,
    totalSlides: 0,
    error: null,
    jobId: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cancel ongoing generation
   */
  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      status: 'idle',
      error: 'Generation cancelled',
    }));
  }, []);

  /**
   * Start pitch deck generation with streaming updates
   */
  const generate = useCallback(async (params: GenerateParams): Promise<void> => {
    // Clean up any existing stream
    cancel();

    // Reset state
    setState({
      status: 'starting',
      slides: [],
      deckMetadata: null,
      progress: 0,
      currentSlide: 0,
      totalSlides: params.numberOfSlides || 12,
      error: null,
      jobId: null,
    });

    try {
      // Step 1: Create job via Edge Function
      const { data, error } = await supabase.functions.invoke('generate-pitch-deck', {
        body: {
          ...params,
          async: true, // Enable async mode
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.job_id) {
        throw new Error('No job ID returned from server');
      }

      const jobId = data.job_id;
      console.log('[Stream] Job created:', jobId);

      setState(prev => ({
        ...prev,
        jobId,
        status: 'generating_structure',
        progress: 5,
      }));

      // Step 2: Get auth token for SSE connection
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Step 3: Connect to SSE stream
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const streamUrl = `${supabaseUrl}/functions/v1/pitch-deck-stream?job_id=${jobId}`;

      // EventSource doesn't support custom headers, so we use fetch with streaming
      abortControllerRef.current = new AbortController();

      const response = await fetch(streamUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream connection failed: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      console.log('[Stream] Connected, reading events...');

      // Read stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[Stream] Stream ended');
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete events (SSE format: data: {...}\n\n)
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep incomplete event in buffer

        for (const event of events) {
          if (!event.trim()) continue;

          // Parse SSE data line
          const dataMatch = event.match(/^data: (.+)$/m);
          if (!dataMatch) continue;

          try {
            const eventData = JSON.parse(dataMatch[1]);
            console.log('[Stream] Event:', eventData.type);

            switch (eventData.type) {
              case 'progress':
                setState(prev => ({
                  ...prev,
                  status: eventData.status as StreamStatus,
                  progress: eventData.progress_percent || prev.progress,
                  currentSlide: eventData.current_slide || prev.currentSlide,
                  totalSlides: eventData.total_slides || prev.totalSlides,
                  deckMetadata: eventData.deck_metadata || prev.deckMetadata,
                }));
                break;

              case 'slide_complete':
                setState(prev => ({
                  ...prev,
                  slides: [...prev.slides, eventData.slide],
                  currentSlide: eventData.slide_number,
                }));
                break;

              case 'done':
                setState(prev => ({
                  ...prev,
                  status: 'complete',
                  progress: 100,
                  slides: eventData.slides || prev.slides,
                  deckMetadata: eventData.deck_metadata || prev.deckMetadata,
                  totalSlides: eventData.total_slides || prev.totalSlides,
                }));
                toast.success('Pitch deck generated successfully!');
                return;

              case 'error':
                setState(prev => ({
                  ...prev,
                  status: 'error',
                  error: eventData.error,
                }));
                toast.error(eventData.error || 'Generation failed');
                return;
            }
          } catch (parseError) {
            console.warn('[Stream] Failed to parse event:', event);
          }
        }
      }

    } catch (error) {
      console.error('[Stream] Error:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        // Cancelled by user
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
      toast.error(errorMessage);
    }
  }, [cancel]);

  /**
   * Build complete PitchDeck object from state
   * Compatible with existing PitchDeck.tsx interface
   */
  const getPitchDeck = useCallback(() => {
    if (!state.deckMetadata || state.slides.length === 0) {
      return null;
    }

    return {
      title: state.deckMetadata.title,
      subtitle: state.deckMetadata.subtitle,
      slides: state.slides,
      totalSlides: state.slides.length,
    };
  }, [state.deckMetadata, state.slides]);

  return {
    // Actions
    generate,
    cancel,
    getPitchDeck,

    // State
    status: state.status,
    slides: state.slides,
    deckMetadata: state.deckMetadata,
    progress: state.progress,
    currentSlide: state.currentSlide,
    totalSlides: state.totalSlides,
    error: state.error,
    jobId: state.jobId,

    // Convenience flags
    isGenerating: state.status !== 'idle' && state.status !== 'complete' && state.status !== 'error',
    isComplete: state.status === 'complete',
    hasError: state.status === 'error',
  };
}
