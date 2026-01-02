import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { usePresentationMode } from '@/contexts/PresentationModeContext';
import { usePitchDeckStream } from '@/hooks/usePitchDeckStream';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SlideCardSkeleton, TitleSlideCardSkeleton, SlideGenerationProgress } from '@/components/SlideCardSkeleton';
import { Loader2, Presentation, Download, Eye, FileText, Layers, Share2, X, Archive, Monitor, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';
import { PageHelp } from '@/components/PageHelp';
import PresenterView from '@/components/PresenterView';
import PresentationSettings from '@/components/PresentationSettings';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import PresentationProgressIndicators from '@/components/PresentationProgressIndicators';
import PausedIndicator from '@/components/PausedIndicator';
import CostEstimationModal from '@/components/CostEstimationModal';
import { usePresentationSettings } from '@/hooks/usePresentationSettings';
import { useContentAutoScroll } from '@/hooks/useContentAutoScroll';
import { useSlideAutoAdvance } from '@/hooks/useSlideAutoAdvance';
import { useFrameAnimation } from '@/hooks/useFrameAnimation';
import {
  createPresentationSync,
  generateSessionId,
  type PresentationSync,
  type PresentationMessage,
} from '@/lib/presentationSync';
import type { PitchDeck as PitchDeckType } from '@/lib/presentationStorage';

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
  // Animation frames for expressive mode (Phase 5)
  frames?: AnimationFrame[];
  // Video support for expressive mode (Phase 6)
  videoUrl?: string;
  videoDuration?: number;
  videoFileSizeMb?: number;
  // Remotion animation script for narrative video generation (Phase 7)
  animationScript?: string;
}

interface PitchDeck {
  title: string;
  subtitle: string;
  slides: Slide[];
  totalSlides: number;
}

export default function PitchDeck() {
  const { user } = useAuth();
  const { isPresentationMode, enterPresentationMode, exitPresentationMode } = usePresentationMode();
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('general business audience');
  const [numberOfSlides, setNumberOfSlides] = useState('10');
  const [autoSlideCount, setAutoSlideCount] = useState(false);
  const [style, setStyle] = useState('professional');
  const [animationStyle, setAnimationStyle] = useState<'none' | 'minimal' | 'standard' | 'expressive'>('none');
  const [includeImages, setIncludeImages] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pitchDeck, setPitchDeck] = useState<PitchDeck | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDocSelector, setShowDocSelector] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedDecks, setShowSavedDecks] = useState(false);
  const [showArchivedDecks, setShowArchivedDecks] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showPresenterNotes, setShowPresenterNotes] = useState(false);
  const [presentationStartTime, setPresentationStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [useProgressiveMode, setUseProgressiveMode] = useState(true); // NEW: Enable streaming by default
  const [loopVideo, setLoopVideo] = useState(true); // Loop video animations

  // Progressive streaming hook
  const streamingHook = usePitchDeckStream();

  // Sync streaming data to pitchDeck state when complete
  useEffect(() => {
    if (streamingHook.isComplete && streamingHook.deckMetadata && streamingHook.slides.length > 0) {
      const completedDeck = streamingHook.getPitchDeck();
      if (completedDeck) {
        setPitchDeck(completedDeck);
        setGenerating(false);
      }
    }
  }, [streamingHook.isComplete, streamingHook.deckMetadata, streamingHook.slides.length, streamingHook.getPitchDeck]);

  // Presenter view state
  const [presenterSessionId, setPresenterSessionId] = useState<string | null>(null);
  const [audienceWindow, setAudienceWindow] = useState<Window | null>(null);
  const [presentationSync, setPresentationSync] = useState<PresentationSync | null>(null);

  // Single-screen presentation enhancement state
  const [presentationStarted, setPresentationStarted] = useState(false);
  const [showSplitScreenNotes, setShowSplitScreenNotes] = useState(false);

  // Presentation settings state with localStorage persistence
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { settings: presentationSettings, setSettings: setPresentationSettings } = usePresentationSettings();

  // Refs for presentation mode focus management and keyboard navigation
  const presentationRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const prevButtonRef = useRef<HTMLButtonElement>(null);

  // Refs for scroll reset in presentation mode
  const fullSlideContainerRef = useRef<HTMLDivElement>(null);
  const splitSlideContainerRef = useRef<HTMLDivElement>(null);
  const speakerNotesRef = useRef<HTMLDivElement>(null);

  // Fetch user's documents
  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Filter documents based on search query
  const filteredDocuments = documents?.filter(doc => {
    if (!documentSearch.trim()) return true;

    const searchLower = documentSearch.toLowerCase();
    const titleMatch = doc.title?.toLowerCase().includes(searchLower);
    const categoryMatch = doc.category?.toLowerCase().includes(searchLower);
    const summaryMatch = doc.ai_summary?.toLowerCase().includes(searchLower);

    return titleMatch || categoryMatch || summaryMatch;
  }) || [];

  // Smart slide count suggestion based on topic complexity and document count
  const suggestSlideCount = (): number => {
    const topicLength = topic.length;
    const docCount = selectedDocIds.length;

    // Simple heuristic based on content complexity
    if (topicLength < 50 && docCount < 3) return 8;
    if (topicLength < 100 && docCount < 5) return 10;
    if (topicLength > 200 || docCount > 10) return 15;

    return 12; // Default
  };

  const suggestedSlides = suggestSlideCount();

  // Fetch saved pitch decks (active or archived based on toggle)
  const { data: savedDecks, refetch: refetchSavedDecks } = useQuery({
    queryKey: ['saved-pitch-decks', user?.id, showArchivedDecks],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('pitch_decks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', showArchivedDecks)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Determine if we can advance to next slide
  const canAdvanceSlide = pitchDeck ? currentSlideIndex < (pitchDeck.slides?.length || 0) : false;

  // Auto-scroll hooks - only active during actual presentation (not preview)
  const contentAutoScroll = useContentAutoScroll({
    containerRef: fullSlideContainerRef,
    enabled: isPresentationMode && presentationStarted && presentationSettings.contentAutoScrollEnabled,
    speed: presentationSettings.contentAutoScrollSpeed,
    onScrollComplete: () => {
      // When content scroll completes, check if slide auto-advance is disabled
      // If so, we could optionally advance the slide here
      // For now, just let slide auto-advance handle it if enabled
    },
    bottomWaitDelay: 2000,
  });

  const slideAutoAdvance = useSlideAutoAdvance({
    enabled: isPresentationMode && presentationStarted && presentationSettings.slideAutoAdvanceEnabled,
    speed: presentationSettings.slideAutoAdvanceSpeed,
    onAdvance: () => {
      // Use the existing handleNextSlide function
      if (canAdvanceSlide) {
        // Reset content scroll first
        contentAutoScroll.resetScroll();
        // Then advance slide
        setCurrentSlideIndex((prev) => {
          const newIndex = prev + 1;
          // Broadcast if in presenter mode
          if (presenterSessionId && presentationSync) {
            presentationSync.send({
              type: 'SLIDE_CHANGE',
              index: newIndex,
            });
          }
          return newIndex;
        });
      }
    },
    canAdvance: canAdvanceSlide,
    resetDependency: currentSlideIndex,
  });

  // Get current slide's animation frames for expressive mode
  const currentSlideFrames = currentSlideIndex > 0 && pitchDeck?.slides?.[currentSlideIndex - 1]?.frames;

  // Frame animation for expressive mode
  const frameAnimation = useFrameAnimation({
    frames: currentSlideFrames || undefined,
    enabled: isPresentationMode && presentationStarted && presentationSettings.animationStyle === 'expressive',
    frameInterval: 1500, // 1.5 seconds per frame
    loop: true,
    resetDependency: currentSlideIndex,
  });

  // Get the current display image for presentation mode
  // Uses frame image if available (expressive mode), otherwise falls back to main slide image
  const getCurrentSlideImage = () => {
    if (currentSlideIndex === 0) return undefined; // Title slide has no image
    const slide = pitchDeck?.slides?.[currentSlideIndex - 1];
    if (!slide) return undefined;

    // If expressive mode with frames, use current frame's image
    if (presentationSettings.animationStyle === 'expressive' && frameAnimation.currentFrame?.imageData) {
      return frameAnimation.currentFrame.imageData;
    }

    // Fallback to main slide image
    return slide.imageData;
  };

  // Combined pause/resume for hover interactions
  const handlePresentationMouseEnter = () => {
    contentAutoScroll.pause();
    slideAutoAdvance.pause();
    frameAnimation.pause();
  };

  const handlePresentationMouseLeave = () => {
    contentAutoScroll.resume();
    slideAutoAdvance.resume();
    frameAnimation.resume();
  };

  // Check if any auto-feature is paused
  const isAutoPaused = contentAutoScroll.isPaused || slideAutoAdvance.isPaused || frameAnimation.isPaused;

  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (!isPresentationMode || !pitchDeck) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle presentation keys
      const presentationKeys = ['ArrowRight', 'ArrowLeft', ' ', 'Enter', 'Home', 'End', 'Escape', 'n', 'N', 's', 'S', '?'];
      if (!presentationKeys.includes(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      // Handle Space key in preview mode to start presentation
      if (!presentationStarted && e.key === ' ') {
        handleStartActualPresentation();
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          // Navigate to next slide
          if (presentationStarted) {
            handleNextSlide();  // Direct call in Actual Presentation Mode
          } else {
            nextButtonRef.current?.click();  // Delegate in Preview Mode
          }
          break;
        case ' ':
          // Space advances only in Actual Presentation Mode
          if (presentationStarted) {
            handleNextSlide();
          }
          break;
        case 'ArrowLeft':
          // Navigate to previous slide
          if (presentationStarted) {
            handlePreviousSlide();  // Direct call in Actual Presentation Mode
          } else {
            prevButtonRef.current?.click();  // Delegate in Preview Mode
          }
          break;
        case 'Home':
          // First slide
          setCurrentSlideIndex(0);
          // Reset scroll position
          if (fullSlideContainerRef.current) fullSlideContainerRef.current.scrollTop = 0;
          if (splitSlideContainerRef.current) splitSlideContainerRef.current.scrollTop = 0;
          if (speakerNotesRef.current) speakerNotesRef.current.scrollTop = 0;
          break;
        case 'End':
          // Last slide (length - 1 for zero-indexed array)
          setCurrentSlideIndex((pitchDeck.slides?.length || 1) - 1);
          // Reset scroll position
          if (fullSlideContainerRef.current) fullSlideContainerRef.current.scrollTop = 0;
          if (splitSlideContainerRef.current) splitSlideContainerRef.current.scrollTop = 0;
          if (speakerNotesRef.current) speakerNotesRef.current.scrollTop = 0;
          break;
        case 'Escape':
          // Exit presentation mode
          handleExitPresentation();
          break;
        case 'n':
        case 'N':
          // Toggle split-screen notes view
          setShowSplitScreenNotes(prev => !prev);
          break;
        case 's':
        case 'S':
          // Open presentation settings dialog
          setSettingsOpen(true);
          break;
        case '?':
          // Show keyboard shortcuts help
          setHelpOpen(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPresentationMode, pitchDeck, presentationStarted, currentSlideIndex]);

  // Presentation timer
  useEffect(() => {
    if (!isPresentationMode || !presentationStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - presentationStartTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPresentationMode, presentationStartTime]);

  // Auto-focus presentation container for keyboard events
  useEffect(() => {
    if (isPresentationMode && presentationRef.current) {
      presentationRef.current.focus();
    }
  }, [isPresentationMode]);

  // Trigger presentation mode after presenter session is initialized
  // This ensures state coordination to avoid race conditions
  useEffect(() => {
    if (presenterSessionId && presentationSync && !isPresentationMode) {
      enterPresentationMode();
      setCurrentSlideIndex(0);
      setShowPresenterNotes(false);
      setPresentationStartTime(Date.now());
      setElapsedSeconds(0);

      toast.info('Presenter View Started', {
        description: 'Drag the audience window to your projector/external monitor, then click "Connect" on that screen',
        duration: 8000,
      });
    }
  }, [presenterSessionId, presentationSync, isPresentationMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartPresentation = () => {
    if (!pitchDeck) {
      toast.error('Please generate a pitch deck first');
      return;
    }
    setCurrentSlideIndex(0);
    enterPresentationMode();
    setPresentationStarted(false); // Start in preview mode
    setShowPresenterNotes(false);
    setShowSplitScreenNotes(false); // Reset split-screen state
    setPresentationStartTime(Date.now());
    setElapsedSeconds(0);
  };

  const handleStartActualPresentation = () => {
    setPresentationStarted(true);
  };

  const handleExitPresentation = () => {
    // If in presenter view mode, clean up sync and close audience window
    if (presenterSessionId && presentationSync) {
      presentationSync.send({
        type: 'EXIT_PRESENTATION',
        sessionId: presenterSessionId,
      });
      presentationSync.destroy();
      setPresentationSync(null);

      if (audienceWindow && !audienceWindow.closed) {
        audienceWindow.close();
      }
      setAudienceWindow(null);
      setPresenterSessionId(null);
    }

    exitPresentationMode();
    setCurrentSlideIndex(0);
    setPresentationStartTime(null);
    setElapsedSeconds(0);
    setPresentationStarted(false);
    setShowSplitScreenNotes(false);
  };

  const handleStartPresenterView = () => {
    if (!pitchDeck) {
      toast.error('Please generate a pitch deck first');
      return;
    }

    try {
      // Generate unique session ID
      const sessionId = generateSessionId();
      setPresenterSessionId(sessionId);

      // Initialize presentation sync (presenter mode)
      const sync = createPresentationSync(sessionId, true);
      setPresentationSync(sync);

      // Set up message handler to respond to READY message from audience
      sync.onMessage((message: PresentationMessage) => {
        if (message.type === 'READY' && message.sessionId === sessionId) {
          console.log('[Presenter] Audience ready, sending deck data');

          // Convert pitch deck to format expected by audience
          const deckData: PitchDeckType = {
            id: savedDeckId || sessionId,
            title: pitchDeck.title,
            subtitle: pitchDeck.subtitle,
            slides: pitchDeck.slides.map((slide) => ({
              slideNumber: slide.slideNumber,
              title: slide.title,
              content: slide.content,
              imageUrl: slide.imageData
                ? `data:image/png;base64,${slide.imageData}`
                : undefined,
              videoUrl: slide.videoUrl,
              speakerNotes: slide.notes,
            })),
          };

          // Send deck data to audience window
          sync.send({
            type: 'DECK_DATA',
            pitchDeck: deckData,
          });

          toast.success('Audience view connected!', {
            description: 'The presentation is now synced across both windows',
          });
        }
      });

      // Open audience window
      const audienceUrl = `${window.location.origin}/presentation-audience/${sessionId}`;
      const newWindow = window.open(
        audienceUrl,
        '_blank',
        'width=1920,height=1080,left=1920,top=0'
      );

      if (!newWindow || newWindow.closed) {
        toast.error('Failed to open audience window', {
          description: 'Please allow popups for this site and try again',
        });
        sync.destroy();
        setPresenterSessionId(null);
        setPresentationSync(null);
        return;
      }

      setAudienceWindow(newWindow);

      // Note: Presentation mode will be triggered by useEffect hook
      // after presenterSessionId and presentationSync are both set

      // Monitor if audience window is closed
      const checkWindowInterval = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkWindowInterval);
          toast.warning('Audience window closed', {
            description: 'You can reopen it by clicking "Start Presenter View" again',
          });
          // Don't exit presenter view, just clear the audience window reference
          setAudienceWindow(null);
        }
      }, 1000);
    } catch (error) {
      console.error('[Presenter] Error starting presenter view:', error);
      toast.error('Failed to start presenter view', {
        description: 'Please try again or use regular presentation mode',
      });
    }
  };

  const handleNextSlide = () => {
    // Use actual slides array length instead of totalSlides property
    // to handle cases where totalSlides is undefined/missing
    if (pitchDeck && pitchDeck.slides && currentSlideIndex < pitchDeck.slides.length) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);

      // Reset scroll position to top on slide change
      if (fullSlideContainerRef.current) {
        fullSlideContainerRef.current.scrollTop = 0;
      }
      if (splitSlideContainerRef.current) {
        splitSlideContainerRef.current.scrollTop = 0;
      }
      if (speakerNotesRef.current) {
        speakerNotesRef.current.scrollTop = 0;
      }

      // Broadcast slide change to audience window if in presenter view mode
      if (presenterSessionId && presentationSync) {
        presentationSync.send({
          type: 'SLIDE_CHANGE',
          index: newIndex,
        });
      }
    }
  };

  const handlePreviousSlide = () => {
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);

      // Reset scroll position to top on slide change
      if (fullSlideContainerRef.current) {
        fullSlideContainerRef.current.scrollTop = 0;
      }
      if (splitSlideContainerRef.current) {
        splitSlideContainerRef.current.scrollTop = 0;
      }
      if (speakerNotesRef.current) {
        speakerNotesRef.current.scrollTop = 0;
      }

      // Broadcast slide change to audience window if in presenter view mode
      if (presenterSessionId && presentationSync) {
        presentationSync.send({
          type: 'SLIDE_CHANGE',
          index: newIndex,
        });
      }
    }
  };

  const handleGenerate = () => {
    if (!user) {
      toast.error('Please sign in to generate pitch decks');
      return;
    }

    if (!topic.trim() && selectedDocIds.length === 0) {
      toast.error('Please enter a topic or select documents for your pitch deck');
      return;
    }

    // Show cost modal if images are enabled
    if (includeImages) {
      setShowCostModal(true);
    } else {
      // No images = no cost, proceed directly
      handleGenerateConfirmed();
    }
  };

  const handleGenerateConfirmed = async () => {
    // Use progressive streaming mode if enabled
    if (useProgressiveMode) {
      setGenerating(true);
      try {
        await streamingHook.generate({
          topic,
          targetAudience,
          numberOfSlides: autoSlideCount ? undefined : parseInt(numberOfSlides) || 10,
          autoSlideCount,
          style: style as 'professional' | 'creative' | 'minimal' | 'bold',
          animationStyle: animationStyle as 'none' | 'minimal' | 'standard' | 'expressive',
          includeImages,
          selectedDocumentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        });
      } catch (error) {
        console.error('Pitch deck streaming error:', error);
      } finally {
        setGenerating(false);
      }
      return;
    }

    // Fallback to synchronous mode
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pitch-deck', {
        body: {
          topic,
          targetAudience,
          numberOfSlides: autoSlideCount ? undefined : parseInt(numberOfSlides) || 10,
          autoSlideCount: autoSlideCount,
          style,
          animationStyle,
          includeImages,
          selectedDocumentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setPitchDeck(data);
      toast.success('Pitch deck generated successfully!');
    } catch (error) {
      console.error('Pitch deck generation error:', error);
      toast.error('Failed to generate pitch deck. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevise = async (slideNumber?: number) => {
    if (!user || !pitchDeck) {
      toast.error('Please generate a pitch deck first');
      return;
    }

    if (!revisionRequest.trim()) {
      toast.error('Please describe what you want to change');
      return;
    }

    setIsRevising(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pitch-deck', {
        body: {
          topic,
          targetAudience,
          numberOfSlides: autoSlideCount ? undefined : parseInt(numberOfSlides) || 10,
          autoSlideCount: autoSlideCount,
          style,
          animationStyle,
          includeImages,
          selectedDocumentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
          revisionRequest,
          currentDeck: pitchDeck,
          slideNumber
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setPitchDeck(data);
      setRevisionRequest('');
      toast.success(slideNumber
        ? `Slide ${slideNumber} revised successfully!`
        : 'Pitch deck revised successfully!');
    } catch (error) {
      console.error('Pitch deck revision error:', error);
      toast.error('Failed to revise pitch deck. Please try again.');
    } finally {
      setIsRevising(false);
    }
  };

  const handleDownload = () => {
    if (!pitchDeck) return;

    // Create a simple HTML presentation
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${pitchDeck.title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background: #000;
    }
    .slide {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      page-break-after: always;
      padding: 60px;
      box-sizing: border-box;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .slide.title-slide {
      background: linear-gradient(135deg, #0A2342 0%, #FFC300 100%);
    }
    .slide h1 {
      font-size: 4em;
      margin: 0 0 20px 0;
      text-align: center;
    }
    .slide h2 {
      font-size: 3em;
      margin: 0 0 40px 0;
      text-align: center;
    }
    .slide .subtitle {
      font-size: 2em;
      opacity: 0.9;
    }
    .slide .content {
      font-size: 1.5em;
      max-width: 80%;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    .slide img {
      max-width: 80%;
      max-height: 50vh;
      margin: 20px 0;
      border-radius: 10px;
    }
    .slide .notes {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      font-size: 0.8em;
      opacity: 0.6;
      font-style: italic;
    }
    @media print {
      .slide {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="slide title-slide">
    <h1>${pitchDeck.title}</h1>
    <div class="subtitle">${pitchDeck.subtitle}</div>
  </div>
  ${pitchDeck.slides.map(slide => `
    <div class="slide">
      <h2>${slide.title}</h2>
      ${slide.imageData ? `<img src="data:image/png;base64,${slide.imageData}" alt="${slide.visualPrompt || ''}" />` : ''}
      <div class="content">${slide.content}</div>
      ${slide.notes ? `<div class="notes">Speaker Notes: ${slide.notes}</div>` : ''}
    </div>
  `).join('')}
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pitchDeck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Pitch deck downloaded! Open the HTML file in a browser to view.');
  };

  const handleExportPDF = async () => {
    if (!pitchDeck) return;

    try {
      // Create PDF with landscape orientation (16:9 presentation format)
      // A4 landscape: 297mm x 210mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Helper function to add text with word wrap
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, fontSize: number) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * lineHeight);
      };

      // Title slide
      pdf.setFillColor(10, 35, 66); // Deep Navy
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      pdf.setTextColor(255, 195, 0); // Gold
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(pitchDeck.title, contentWidth);
      const titleY = pageHeight / 2 - 20;
      pdf.text(titleLines, pageWidth / 2, titleY, { align: 'center' });

      pdf.setTextColor(255, 255, 255); // White
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'normal');
      const subtitleLines = pdf.splitTextToSize(pitchDeck.subtitle, contentWidth);
      pdf.text(subtitleLines, pageWidth / 2, titleY + 30, { align: 'center' });

      // Content slides
      for (let i = 0; i < pitchDeck.slides.length; i++) {
        const slide = pitchDeck.slides[i];
        pdf.addPage();

        // Background gradient effect (simulated with rectangles)
        pdf.setFillColor(248, 248, 248);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Slide number indicator (top right)
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Slide ${slide.slideNumber} of ${pitchDeck.slides?.length || 0}`, pageWidth - margin, margin);

        // Title
        pdf.setTextColor(10, 35, 66); // Navy
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        const titleLinesPDF = pdf.splitTextToSize(slide.title, contentWidth);
        pdf.text(titleLinesPDF, margin, margin + 10);

        let currentY = margin + 15 + (titleLinesPDF.length * 8);

        // Image if available
        if (slide.imageData) {
          try {
            const imgWidth = contentWidth * 0.7;
            const imgHeight = imgWidth * 0.5625; // 16:9 aspect ratio
            const imgX = (pageWidth - imgWidth) / 2;

            pdf.addImage(
              `data:image/png;base64,${slide.imageData}`,
              'PNG',
              imgX,
              currentY,
              imgWidth,
              imgHeight
            );

            currentY += imgHeight + 10;
          } catch (error) {
            console.error('Error adding image to PDF:', error);
          }
        }

        // Content
        pdf.setTextColor(50, 50, 50);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        const contentLines = pdf.splitTextToSize(slide.content, contentWidth);

        // Check if content fits on page, otherwise reduce content or truncate
        const remainingSpace = pageHeight - currentY - margin - 20; // Reserve space for notes
        const maxContentLines = Math.floor(remainingSpace / 5);
        const displayedContentLines = contentLines.slice(0, maxContentLines);

        pdf.text(displayedContentLines, margin, currentY);
        currentY += (displayedContentLines.length * 5) + 5;

        // Speaker notes (at bottom if space available)
        if (slide.notes && currentY < pageHeight - margin - 15) {
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 100);
          pdf.setFont('helvetica', 'italic');
          const notesLines = pdf.splitTextToSize(`Speaker Notes: ${slide.notes}`, contentWidth);
          const maxNotesLines = Math.floor((pageHeight - currentY - margin) / 4);
          const displayedNotesLines = notesLines.slice(0, maxNotesLines);
          pdf.text(displayedNotesLines, margin, pageHeight - margin - (displayedNotesLines.length * 4));
        }
      }

      // Save PDF
      const fileName = `${pitchDeck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      pdf.save(fileName);

      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  const handleExportPowerPoint = async () => {
    if (!pitchDeck) return;

    try {
      const pptx = new pptxgen();

      // Set presentation properties
      pptx.author = 'AI Query Hub';
      pptx.company = 'AI Query Hub';
      pptx.title = pitchDeck.title;
      pptx.subject = pitchDeck.subtitle;

      // Define theme colors (Deep Navy & Gold)
      const navy = '0A2342';
      const gold = 'FFC300';
      const white = 'FFFFFF';
      const lightGray = 'F8F8F8';

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: navy };

      titleSlide.addText(pitchDeck.title, {
        x: 0.5,
        y: '40%',
        w: '90%',
        h: 1.5,
        fontSize: 44,
        bold: true,
        color: gold,
        align: 'center',
        valign: 'middle'
      });

      titleSlide.addText(pitchDeck.subtitle, {
        x: 0.5,
        y: '55%',
        w: '90%',
        h: 1,
        fontSize: 24,
        color: white,
        align: 'center',
        valign: 'middle'
      });

      // Content slides
      for (const slide of pitchDeck.slides) {
        const contentSlide = pptx.addSlide();
        contentSlide.background = { color: lightGray };

        // Slide number (top right)
        contentSlide.addText(`${slide.slideNumber}`, {
          x: '90%',
          y: 0.2,
          w: '8%',
          h: 0.3,
          fontSize: 10,
          color: '666666',
          align: 'right'
        });

        // Title
        contentSlide.addText(slide.title, {
          x: 0.5,
          y: 0.5,
          w: '90%',
          h: 0.8,
          fontSize: 32,
          bold: true,
          color: navy,
          align: 'left'
        });

        let currentY = 1.5;

        // Image if available
        if (slide.imageData) {
          try {
            contentSlide.addImage({
              data: `data:image/png;base64,${slide.imageData}`,
              x: 1.5,
              y: currentY,
              w: 7,
              h: 3.9375, // 16:9 aspect ratio
            });
            currentY += 4.2;
          } catch (error) {
            console.error('Error adding image to PowerPoint:', error);
          }
        }

        // Content
        const contentLines = slide.content.split('\n').filter(line => line.trim());
        const bulletPoints = contentLines.map(line => {
          // Remove common bullet point characters
          return { text: line.replace(/^[•\-\*]\s*/, ''), options: { bullet: true } };
        });

        if (bulletPoints.length > 0) {
          contentSlide.addText(bulletPoints, {
            x: 0.5,
            y: currentY,
            w: '90%',
            h: slide.imageData ? 2 : 4,
            fontSize: 16,
            color: '333333',
            valign: 'top'
          });
        }

        // Speaker notes
        if (slide.notes) {
          contentSlide.addNotes(slide.notes);
        }
      }

      // Save PowerPoint
      const fileName = `${pitchDeck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`;
      await pptx.writeFile({ fileName });

      toast.success('PowerPoint exported successfully!');
    } catch (error) {
      console.error('PowerPoint export error:', error);
      toast.error('Failed to export PowerPoint. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!user || !pitchDeck) {
      toast.error('Please generate a pitch deck first');
      return;
    }

    setIsSaving(true);
    try {
      const deckData = {
        title: pitchDeck.title,
        subtitle: pitchDeck.subtitle,
        slides: pitchDeck.slides,
        totalSlides: pitchDeck.totalSlides,
      };

      if (savedDeckId) {
        // Update existing deck
        const { error } = await supabase
          .from('pitch_decks')
          .update({
            title: pitchDeck.title,
            subtitle: pitchDeck.subtitle,
            deck_data: deckData,
            topic,
            target_audience: targetAudience,
            style,
            animation_style: animationStyle,
            number_of_slides: pitchDeck.totalSlides,
            source_document_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedDeckId);

        if (error) throw error;
        toast.success('Pitch deck updated successfully!');
      } else {
        // Create new deck
        const { data, error } = await supabase
          .from('pitch_decks')
          .insert({
            user_id: user.id,
            title: pitchDeck.title,
            subtitle: pitchDeck.subtitle,
            deck_data: deckData,
            topic,
            target_audience: targetAudience,
            style,
            animation_style: animationStyle,
            number_of_slides: pitchDeck.totalSlides,
            source_document_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
          })
          .select()
          .single();

        if (error) throw error;
        setSavedDeckId(data.id);
        toast.success('Pitch deck saved successfully!');
      }

      // Refetch saved decks list
      refetchSavedDecks();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save pitch deck. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDeck = async (deckId: string) => {
    try {
      const { data, error } = await supabase
        .from('pitch_decks')
        .select('*')
        .eq('id', deckId)
        .single();

      if (error) throw error;

      // Load the deck data
      const loadedDeck = data.deck_data as PitchDeck;
      setPitchDeck(loadedDeck);

      // Load the configuration
      setTopic(data.topic || '');
      setTargetAudience(data.target_audience || 'general business audience');
      setNumberOfSlides(data.number_of_slides?.toString() || '10');
      setStyle(data.style || 'professional');
      setAnimationStyle(data.animation_style || 'none');
      setSelectedDocIds(data.source_document_ids || []);
      setSavedDeckId(data.id);
      setShareToken(data.share_token || null);

      // Update last viewed
      await supabase
        .from('pitch_decks')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('id', deckId);

      toast.success(`Loaded: ${data.title}`);
      setShowSavedDecks(false);
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Failed to load pitch deck.');
    }
  };

  const handleArchiveDeck = async (deckId: string, archive: boolean) => {
    try {
      const { error } = await supabase
        .from('pitch_decks')
        .update({ is_archived: archive })
        .eq('id', deckId);

      if (error) throw error;

      // If we're archiving the currently loaded deck, clear it
      if (archive && savedDeckId === deckId) {
        setPitchDeck(null);
        setSavedDeckId(null);
        setShareToken(null);
      }

      toast.success(archive ? 'Pitch deck archived' : 'Pitch deck restored');
      refetchSavedDecks();
    } catch (error) {
      console.error('Archive error:', error);
      toast.error(archive ? 'Failed to archive pitch deck' : 'Failed to restore pitch deck');
    }
  };

  const handleGenerateShareLink = async () => {
    if (!user || !savedDeckId) {
      toast.error('Please save your pitch deck first');
      return;
    }

    setIsGeneratingShareLink(true);
    try {
      // Generate share token using the database function
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token');

      if (tokenError) throw tokenError;

      const newToken = tokenData;

      // Update the pitch deck with share token and make it public
      const { error: updateError } = await supabase
        .from('pitch_decks')
        .update({
          is_public: true,
          share_token: newToken,
        })
        .eq('id', savedDeckId);

      if (updateError) throw updateError;

      setShareToken(newToken);

      // Copy share URL to clipboard
      const shareUrl = `${window.location.origin}/pitch-deck/share/${newToken}`;
      await navigator.clipboard.writeText(shareUrl);

      toast.success('Share link copied to clipboard!');
    } catch (error) {
      console.error('Share link generation error:', error);
      toast.error('Failed to generate share link. Please try again.');
    } finally {
      setIsGeneratingShareLink(false);
    }
  };

  const handleRevokeShareLink = async () => {
    if (!user || !savedDeckId) return;

    try {
      const { error } = await supabase
        .from('pitch_decks')
        .update({
          is_public: false,
          share_token: null,
        })
        .eq('id', savedDeckId);

      if (error) throw error;

      setShareToken(null);
      toast.success('Share link revoked');
    } catch (error) {
      console.error('Revoke share link error:', error);
      toast.error('Failed to revoke share link');
    }
  };

  const handleDownloadAsZip = async () => {
    if (!pitchDeck) return;

    try {
      const zip = new JSZip();

      // Add deck data as JSON
      const deckData = {
        title: pitchDeck.title,
        subtitle: pitchDeck.subtitle,
        slides: pitchDeck.slides.map(slide => ({
          ...slide,
          imageData: slide.imageData ? `image_slide_${slide.slideNumber}.png` : null
        })),
        totalSlides: pitchDeck.totalSlides,
      };
      zip.file('deck_data.json', JSON.stringify(deckData, null, 2));

      // Add images folder
      const imagesFolder = zip.folder('images');
      if (imagesFolder) {
        for (const slide of pitchDeck.slides) {
          if (slide.imageData) {
            // Convert base64 to blob
            const base64Data = slide.imageData;
            imagesFolder.file(`slide_${slide.slideNumber}.png`, base64Data, { base64: true });
          }
        }
      }

      // Add HTML file
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${pitchDeck.title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background: #000;
    }
    .slide {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      page-break-after: always;
      padding: 60px;
      box-sizing: border-box;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .slide.title-slide {
      background: linear-gradient(135deg, #0A2342 0%, #FFC300 100%);
    }
    .slide h1 {
      font-size: 4em;
      margin: 0 0 20px 0;
      text-align: center;
    }
    .slide h2 {
      font-size: 3em;
      margin: 0 0 40px 0;
      text-align: center;
    }
    .slide .subtitle {
      font-size: 2em;
      opacity: 0.9;
    }
    .slide .content {
      font-size: 1.5em;
      max-width: 80%;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    .slide img {
      max-width: 80%;
      max-height: 50vh;
      margin: 20px 0;
      border-radius: 10px;
    }
    .slide .notes {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      font-size: 0.8em;
      opacity: 0.6;
      font-style: italic;
    }
    @media print {
      .slide {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="slide title-slide">
    <h1>${pitchDeck.title}</h1>
    <div class="subtitle">${pitchDeck.subtitle}</div>
  </div>
  ${pitchDeck.slides.map(slide => `
    <div class="slide">
      <h2>${slide.title}</h2>
      ${slide.imageData ? `<img src="images/slide_${slide.slideNumber}.png" alt="${slide.visualPrompt || ''}" />` : ''}
      <div class="content">${slide.content}</div>
      ${slide.notes ? `<div class="notes">Speaker Notes: ${slide.notes}</div>` : ''}
    </div>
  `).join('')}
</body>
</html>
      `;
      zip.file('presentation.html', html);

      // Add README
      const readme = `# ${pitchDeck.title}

${pitchDeck.subtitle}

## Contents

- presentation.html - Open this file in a web browser to view the pitch deck
- deck_data.json - Structured data of the pitch deck (can be imported back)
- images/ - All slide images in PNG format

## How to Use

1. Open presentation.html in any modern web browser
2. Press F11 for fullscreen mode
3. Use arrow keys or swipe to navigate slides

Generated with AI Query Hub
`;
      zip.file('README.md', readme);

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pitchDeck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('ZIP file downloaded successfully!');
    } catch (error) {
      console.error('ZIP download error:', error);
      toast.error('Failed to download ZIP file. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
              <Presentation className="h-10 w-10" />
              AI Pitch Deck Generator
            </h1>
            <p className="text-muted-foreground">
              Create professional pitch decks with AI-generated content and graphics
            </p>
          </div>
          <PageHelp
            title="Pitch Deck Generator Help"
            description="Create professional AI-powered pitch decks in minutes. Generate decks from topics or your existing documents, customize with AI revisions, and export to multiple formats."
            tips={[
              "Enter a topic or select documents from your knowledge base to generate a deck",
              "Use the revision input to request changes to the entire deck or specific slides",
              "Save your deck to load and edit it later, export to PDF, PowerPoint, HTML, or ZIP",
              "Click 'Start Presentation' for fullscreen mode with keyboard navigation",
              "Press S during presentation to open settings, ? for help overlay",
              "Enable Content Auto-Scroll to smoothly scroll through long slide content",
              "Enable Slide Auto-Advance for hands-free demos (2-5 second intervals)",
              "Choose animation styles: None, Minimal (fade), Standard (slide), or Expressive",
              "Expressive mode generates AI animation frames that cycle during presentation",
              "Hover your mouse to pause auto-scroll, auto-advance, and frame animations",
              "Visual progress indicators show scroll position and countdown to next slide",
              "Press N to toggle split-screen speaker notes view"
            ]}
          />
        </div>
      </div>

      {/* Saved Decks Section */}
      {savedDecks && (savedDecks.length > 0 || showArchivedDecks) && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>
                  {showArchivedDecks ? 'Archived' : 'Saved'} Pitch Decks ({savedDecks.length})
                </CardTitle>
                <Button
                  variant={showArchivedDecks ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowArchivedDecks(!showArchivedDecks)}
                  className="flex items-center gap-1"
                >
                  <Archive className="h-4 w-4" />
                  {showArchivedDecks ? 'View Active' : 'View Archived'}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavedDecks(!showSavedDecks)}
              >
                {showSavedDecks ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          {showSavedDecks && (
            <CardContent>
              {savedDecks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {showArchivedDecks
                    ? 'No archived pitch decks'
                    : 'No saved pitch decks yet'}
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {savedDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-muted"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleLoadDeck(deck.id)}
                      >
                        <h3 className="font-medium">{deck.title}</h3>
                        {deck.subtitle && (
                          <p className="text-sm text-muted-foreground">{deck.subtitle}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {deck.number_of_slides} slides
                          </Badge>
                          {deck.style && (
                            <Badge variant="outline" className="text-xs">
                              {deck.style}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Updated: {new Date(deck.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {savedDeckId === deck.id && (
                          <Badge>Current</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveDeck(deck.id, !showArchivedDecks);
                          }}
                          title={showArchivedDecks ? 'Restore deck' : 'Archive deck'}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Deck Configuration</CardTitle>
            <CardDescription>
              Customize your pitch deck settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic / Company Name</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {selectedDocIds.length > 0
                  ? 'Documents selected - topic is optional'
                  : 'Describe what your pitch deck is about'
                }
              </p>
              <Textarea
                id="topic"
                placeholder="e.g., AI-powered knowledge management platform"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
              />
            </div>

            {/* Document Selection Section */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select source from documents</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDocSelector(!showDocSelector)}
                >
                  {showDocSelector ? 'Hide' : 'Show'}
                </Button>
              </div>

              {selectedDocIds.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedDocIds.length} document{selectedDocIds.length > 1 ? 's' : ''} selected
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDocIds([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}

              {showDocSelector && (
                <>
                  {/* Search Input */}
                  <div className="mb-3">
                    <Input
                      placeholder="Search documents by title, category, or content..."
                      value={documentSearch}
                      onChange={(e) => setDocumentSearch(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between mt-2">
                      {documentSearch && (
                        <p className="text-xs text-muted-foreground">
                          Showing {filteredDocuments.length} of {documents?.length || 0} documents
                        </p>
                      )}
                      {filteredDocuments.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const filteredIds = filteredDocuments.map(doc => doc.id);
                            const allSelected = filteredIds.every(id => selectedDocIds.includes(id));

                            if (allSelected) {
                              // Deselect all filtered
                              setSelectedDocIds(prev => prev.filter(id => !filteredIds.includes(id)));
                            } else {
                              // Select all filtered
                              setSelectedDocIds(prev => [...new Set([...prev, ...filteredIds])]);
                            }
                          }}
                        >
                          {filteredDocuments.every(doc => selectedDocIds.includes(doc.id))
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2 border rounded p-3">
                  {loadingDocs ? (
                    <p className="text-center text-muted-foreground py-4">Loading documents...</p>
                  ) : filteredDocuments.length > 0 ? (
                    filteredDocuments.map(doc => (
                      <div key={doc.id} className="flex items-start gap-3 p-2 hover:bg-muted rounded">
                        <Checkbox
                          id={`doc-${doc.id}`}
                          checked={selectedDocIds.includes(doc.id)}
                          onCheckedChange={(checked) => {
                            setSelectedDocIds(prev =>
                              checked
                                ? [...prev, doc.id]
                                : prev.filter(id => id !== doc.id)
                            );
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`doc-${doc.id}`} className="cursor-pointer">
                            <div className="font-medium">{doc.title}</div>
                            {doc.ai_summary && (
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {doc.ai_summary}
                              </div>
                            )}
                            <div className="flex gap-2 mt-1">
                              {doc.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {doc.category}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </Label>
                        </div>
                      </div>
                    ))
                  ) : documents && documents.length > 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No documents match your search. Try different keywords.
                    </p>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No documents available. Upload documents first.
                    </p>
                  )}
                </div>
                </>
              )}
            </div>

            <div>
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                placeholder="e.g., venture capitalists, enterprise clients"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            {/* Auto Slide Count Toggle */}
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="autoSlideCount"
                checked={autoSlideCount}
                onCheckedChange={(checked) => {
                  setAutoSlideCount(checked as boolean);
                  if (checked) {
                    // Clear manual slide count when auto is enabled
                    setNumberOfSlides('');
                  } else {
                    // Reset to default when disabling auto mode
                    setNumberOfSlides('10');
                  }
                }}
              />
              <Label htmlFor="autoSlideCount" className="cursor-pointer text-sm font-normal">
                Let AI determine optimal slide count (8-15 slides)
              </Label>
            </div>

            <div>
              <Label htmlFor="slides">
                Number of Slides {autoSlideCount && <Badge variant="secondary" className="ml-2">Auto</Badge>}
              </Label>
              <Input
                id="slides"
                type="number"
                min="3"
                max="50"
                value={numberOfSlides}
                onChange={(e) => setNumberOfSlides(e.target.value)}
                disabled={autoSlideCount}
                placeholder={autoSlideCount ? "AI will decide" : "e.g., 10"}
              />
              {!autoSlideCount && (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    {topic || selectedDocIds.length > 0 ? (
                      <>Suggested: <span className="font-medium text-primary">{suggestedSlides} slides</span></>
                    ) : (
                      'Choose between 3 and 50 slides'
                    )}
                  </p>
                  {(topic || selectedDocIds.length > 0) && suggestedSlides.toString() !== numberOfSlides && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setNumberOfSlides(suggestedSlides.toString())}
                    >
                      Use suggested
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="style">Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="animationStyle">Animation Style</Label>
              <Select value={animationStyle} onValueChange={(value: any) => setAnimationStyle(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Static slides)</SelectItem>
                  <SelectItem value="minimal">Minimal (Fade transitions)</SelectItem>
                  <SelectItem value="standard">Standard (Slide transitions)</SelectItem>
                  <SelectItem value="expressive">Expressive (AI animation frames)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {animationStyle === 'expressive'
                  ? 'AI will generate multiple animation frames per slide (slower generation)'
                  : animationStyle === 'none'
                  ? 'No animations or transitions'
                  : 'Transitions applied during presentation only'}
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeImages"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="includeImages">Include AI-generated images</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Creates AI-generated visuals for each slide. Uncheck for faster, text-only generation.
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="progressiveMode"
                  checked={useProgressiveMode}
                  onChange={(e) => setUseProgressiveMode(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="progressiveMode">Progressive streaming mode</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Shows slides as they generate in real-time. Recommended for better experience.
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || (!topic.trim() && selectedDocIds.length === 0)}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating Deck...
                </>
              ) : (
                <>
                  <Presentation className="h-5 w-5 mr-2" />
                  Generate Pitch Deck
                </>
              )}
            </Button>

            {pitchDeck && (
              <div className="space-y-2">
                <Button
                  onClick={handleStartPresentation}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="lg"
                >
                  <Presentation className="h-5 w-5 mr-2" />
                  Start Presentation
                </Button>
                <Button
                  onClick={handleStartPresenterView}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  <Monitor className="h-5 w-5 mr-2" />
                  Start Presenter View
                </Button>
                <Button
                  onClick={handleSave}
                  className="w-full"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : savedDeckId ? (
                    'Update Saved Deck'
                  ) : (
                    'Save Deck'
                  )}
                </Button>
                <Button
                  onClick={handleExportPDF}
                  variant="default"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </Button>
                <Button
                  onClick={handleExportPowerPoint}
                  variant="default"
                  className="w-full"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Export as PowerPoint
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download as HTML
                </Button>
                <Button
                  onClick={handleDownloadAsZip}
                  variant="outline"
                  className="w-full"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Download as ZIP (All Assets)
                </Button>

                <div className="pt-2 border-t">
                  {shareToken ? (
                    <>
                      <div className="mb-2 p-2 bg-muted rounded text-xs">
                        <p className="text-muted-foreground mb-1">Share URL:</p>
                        <p className="font-mono break-all">{`${window.location.origin}/pitch-deck/share/${shareToken}`}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleGenerateShareLink}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Share2 className="h-3 w-3 mr-2" />
                          Copy Link
                        </Button>
                        <Button
                          onClick={handleRevokeShareLink}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <X className="h-3 w-3 mr-2" />
                          Revoke
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      onClick={handleGenerateShareLink}
                      variant="outline"
                      className="w-full"
                      disabled={isGeneratingShareLink || !savedDeckId}
                    >
                      {isGeneratingShareLink ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4 mr-2" />
                          Generate Share Link
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {pitchDeck ? `${pitchDeck.slides?.length || 0} slides generated` : 'Your pitch deck will appear here'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!pitchDeck && !generating && (
              <div className="flex flex-col items-center justify-center h-96 text-center text-muted-foreground">
                <Eye className="h-16 w-16 mb-4 opacity-20" />
                <p>Configure your pitch deck settings and click Generate</p>
              </div>
            )}

            {generating && (
              <div className="space-y-6">
                {/* Progressive streaming UI */}
                {useProgressiveMode && streamingHook.isGenerating && (
                  <div className="mb-6">
                    <SlideGenerationProgress
                      currentSlide={streamingHook.currentSlide}
                      totalSlides={streamingHook.totalSlides}
                      progress={streamingHook.progress}
                      status={streamingHook.status}
                    />
                  </div>
                )}

                {/* Show title slide skeleton or completed metadata */}
                {streamingHook.deckMetadata ? (
                  <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                    <CardContent className="pt-6">
                      <h2 className="text-3xl font-bold mb-2">{streamingHook.deckMetadata.title}</h2>
                      <p className="text-xl text-muted-foreground">{streamingHook.deckMetadata.subtitle}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <TitleSlideCardSkeleton />
                )}

                {/* Show completed slides + skeletons for remaining */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
                  {/* Completed slides from stream */}
                  {streamingHook.slides.map((slide) => (
                    <Card key={slide.slideNumber} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl">{slide.title}</CardTitle>
                          <span className="text-sm text-muted-foreground">Slide {slide.slideNumber}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {slide.imageData && (
                          <img
                            src={`data:image/png;base64,${slide.imageData}`}
                            alt={slide.visualPrompt || ''}
                            className="w-full rounded-lg"
                          />
                        )}
                        <div className="whitespace-pre-wrap text-sm">{slide.content}</div>
                        {slide.notes && (
                          <div className="bg-muted p-3 rounded text-sm italic text-muted-foreground">
                            <strong>Speaker Notes:</strong> {slide.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Skeleton placeholders for remaining slides */}
                  {Array.from({ length: Math.max(0, streamingHook.totalSlides - streamingHook.slides.length) }).map((_, i) => (
                    <SlideCardSkeleton
                      key={`skeleton-${i}`}
                      slideNumber={streamingHook.slides.length + i + 1}
                      showImage={includeImages}
                    />
                  ))}
                </div>

                {/* Fallback for non-streaming mode */}
                {!useProgressiveMode && (
                  <div className="flex flex-col items-center justify-center h-96">
                    <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">
                      {includeImages
                        ? 'Generating content and images... This may take a minute'
                        : 'Generating pitch deck content...'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {pitchDeck && (
              <>
                {/* Revision Input */}
                <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                  <Label htmlFor="revision" className="mb-2 block">Request Changes</Label>
                  <div className="flex gap-2">
                    <Textarea
                      id="revision"
                      placeholder="e.g., Make slide 3 more technical, add market size data to slide 5, make the whole deck more concise..."
                      value={revisionRequest}
                      onChange={(e) => setRevisionRequest(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleRevise()}
                      disabled={isRevising || !revisionRequest.trim()}
                      size="lg"
                    >
                      {isRevising ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Revising...
                        </>
                      ) : (
                        'Revise Deck'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Describe changes for the whole deck, or mention specific slide numbers for targeted revisions
                  </p>
                </div>

                <div className="space-y-6 max-h-[800px] overflow-y-auto pr-4">
                {/* Title Slide */}
                <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                  <CardContent className="pt-6">
                    <h2 className="text-3xl font-bold mb-2">{pitchDeck.title}</h2>
                    <p className="text-xl text-muted-foreground">{pitchDeck.subtitle}</p>
                  </CardContent>
                </Card>

                {/* Slides */}
                {pitchDeck.slides.map((slide) => (
                  <Card key={slide.slideNumber} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{slide.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Slide {slide.slideNumber}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (revisionRequest.trim()) {
                                handleRevise(slide.slideNumber);
                              } else {
                                toast.error('Please enter a revision request above');
                              }
                            }}
                            disabled={isRevising}
                          >
                            Revise
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {slide.videoUrl ? (
                        <video
                          src={slide.videoUrl}
                          autoPlay
                          loop={loopVideo}
                          muted
                          className="w-full rounded-lg"
                          playsInline
                        />
                      ) : slide.imageData ? (
                        <img
                          src={`data:image/png;base64,${slide.imageData}`}
                          alt={slide.visualPrompt || ''}
                          className="w-full rounded-lg"
                        />
                      ) : null}
                      <div className="whitespace-pre-wrap text-sm">{slide.content}</div>
                      {slide.notes && (
                        <div className="bg-muted p-3 rounded text-sm italic text-muted-foreground">
                          <strong>Speaker Notes:</strong> {slide.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen Presentation Mode */}
      {isPresentationMode && pitchDeck && presenterSessionId && presentationSync && (
        // Presenter View Mode (dual-window)
        <PresenterView
          pitchDeck={{
            id: savedDeckId || presenterSessionId,
            title: pitchDeck.title,
            subtitle: pitchDeck.subtitle,
            slides: pitchDeck.slides.map((slide) => ({
              slideNumber: slide.slideNumber,
              title: slide.title,
              content: slide.content,
              imageUrl: slide.imageData
                ? `data:image/png;base64,${slide.imageData}`
                : undefined,
              videoUrl: slide.videoUrl,
              speakerNotes: slide.notes,
            })),
          }}
          currentSlideIndex={currentSlideIndex}
          onSlideChange={(index) => {
            setCurrentSlideIndex(index);
            // Broadcast slide change
            if (presentationSync) {
              presentationSync.send({
                type: 'SLIDE_CHANGE',
                index,
              });
            }
          }}
          onExit={handleExitPresentation}
          presentationStartTime={presentationStartTime || Date.now()}
          settings={presentationSettings}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* Preview Mode - Fullscreen with START button */}
      {isPresentationMode && pitchDeck && !presenterSessionId && !presentationStarted && (
        <div
          ref={presentationRef}
          className="fixed inset-0 bg-black z-50 flex flex-col"
          tabIndex={0}
        >
          {/* Presentation Content */}
          <div className="flex-1 flex items-center justify-center p-8">
            {currentSlideIndex === 0 ? (
              // Title slide
              <div className="text-center max-w-4xl">
                <h1 className="text-6xl font-bold text-accent mb-6">{pitchDeck.title}</h1>
                <p className="text-3xl text-white opacity-90">{pitchDeck.subtitle}</p>
              </div>
            ) : (
              // Content slide
              <div className="w-full max-w-6xl">
                <h2 className="text-5xl font-bold text-white mb-8">
                  {pitchDeck.slides[currentSlideIndex - 1].title}
                </h2>

                {pitchDeck.slides[currentSlideIndex - 1].videoUrl ? (
                  <video
                    src={pitchDeck.slides[currentSlideIndex - 1].videoUrl}
                    autoPlay
                    loop={loopVideo}
                    muted
                    playsInline
                    className="w-full max-h-96 object-contain rounded-lg mb-6"
                  />
                ) : pitchDeck.slides[currentSlideIndex - 1].imageData ? (
                  <img
                    src={`data:image/png;base64,${pitchDeck.slides[currentSlideIndex - 1].imageData}`}
                    alt={pitchDeck.slides[currentSlideIndex - 1].visualPrompt || ''}
                    className="w-full max-h-96 object-contain rounded-lg mb-6"
                  />
                ) : null}

                <div className="text-2xl text-white whitespace-pre-wrap leading-relaxed">
                  {pitchDeck.slides[currentSlideIndex - 1].content}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="bg-black/80 border-t border-white/10 p-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={handleStartActualPresentation}
                size="sm"
                variant={null as any}
                className="!bg-accent !text-accent-foreground hover:!bg-accent/90 !shadow-none"
              >
                Start
              </Button>
              <Button
                ref={prevButtonRef}
                onClick={handlePreviousSlide}
                disabled={currentSlideIndex === 0}
                size="sm"
                variant={null as any}
                className="!bg-accent !text-accent-foreground hover:!bg-accent/90 !shadow-none disabled:!opacity-100 disabled:!bg-accent"
              >
                ← Previous
              </Button>
              <Button
                ref={nextButtonRef}
                onClick={handleNextSlide}
                disabled={currentSlideIndex === (pitchDeck.slides?.length || 0)}
                size="sm"
                variant="default"
                className="bg-primary hover:bg-primary/90"
              >
                Next →
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => setLoopVideo(!loopVideo)}
                size="sm"
                variant="ghost"
                className={`text-xs ${loopVideo ? 'text-accent' : 'text-white/50'}`}
              >
                Loop {loopVideo ? 'On' : 'Off'}
              </Button>

              <span className="text-accent font-bold text-lg">
                {formatTime(elapsedSeconds)}
              </span>

              <span className="text-white text-sm">
                Slide {currentSlideIndex} of {pitchDeck.slides?.length || 0}
              </span>

              <Button
                onClick={handleExitPresentation}
                size="sm"
                className="bg-transparent text-white border-none shadow-none hover:bg-white/20 hover:text-white active:bg-white/30 transition-colors"
              >
                Exit (ESC)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Presentation Mode - Fullscreen with hidden controls */}
      {isPresentationMode && pitchDeck && !presenterSessionId && presentationStarted && (
        <div
          ref={presentationRef}
          className={`fixed inset-0 bg-black z-50 flex flex-col animation-${presentationSettings.animationStyle}`}
          tabIndex={0}
          onMouseEnter={handlePresentationMouseEnter}
          onMouseLeave={handlePresentationMouseLeave}
        >
          {showSplitScreenNotes ? (
            // Split-Screen Mode: 70% Slide / 30% Notes
            <>
              {/* Slide Area - 70% height */}
              <div ref={splitSlideContainerRef} className="flex-[7] flex items-center justify-center p-4 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div key={`split-slide-${currentSlideIndex}`} className="max-h-full w-full flex items-center justify-center slide-content">
                  {currentSlideIndex === 0 ? (
                    // Title slide
                    <div className="text-center max-w-4xl">
                      <h1 className="slide-title font-bold text-accent mb-4" style={{ fontSize: 'calc(1.75rem + 1.5vh)' }}>{pitchDeck.title}</h1>
                      <p className="slide-text text-white opacity-90" style={{ fontSize: 'calc(1rem + 0.75vh)' }}>{pitchDeck.subtitle}</p>
                    </div>
                  ) : (
                    // Content slide
                    <div className="w-full max-w-6xl">
                      <h2 className="slide-title font-bold text-white mb-3" style={{ fontSize: 'calc(1.5rem + 1.5vh)' }}>
                        {pitchDeck.slides[currentSlideIndex - 1].title}
                      </h2>
                      {pitchDeck.slides[currentSlideIndex - 1].videoUrl ? (
                        <video
                          src={pitchDeck.slides[currentSlideIndex - 1].videoUrl}
                          autoPlay
                          loop={loopVideo}
                          muted
                          playsInline
                          className="slide-image w-full max-h-[25vh] object-contain rounded-lg mb-3"
                        />
                      ) : getCurrentSlideImage() ? (
                        <img
                          src={`data:image/png;base64,${getCurrentSlideImage()}`}
                          alt={pitchDeck.slides[currentSlideIndex - 1].visualPrompt || ''}
                          className="slide-image w-full max-h-[25vh] object-contain rounded-lg mb-3"
                        />
                      ) : null}
                      <div className="slide-text text-white whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[20vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ fontSize: 'calc(0.875rem + 0.5vh)' }}>
                        {pitchDeck.slides[currentSlideIndex - 1].content}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Speaker Notes Area - 30% height */}
              <div ref={speakerNotesRef} className="flex-[3] bg-gray-900/95 border-t border-white/20 p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {currentSlideIndex > 0 && pitchDeck.slides[currentSlideIndex - 1].notes ? (
                  <>
                    <p className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Speaker Notes</p>
                    <p className="text-base text-white leading-relaxed whitespace-pre-wrap">
                      {pitchDeck.slides[currentSlideIndex - 1].notes}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 italic text-center">No speaker notes for this slide</p>
                )}
              </div>
            </>
          ) : (
            // Full-Slide Mode: 100% Slide (no controls visible)
            <div ref={fullSlideContainerRef} className="flex-1 flex items-center justify-center p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div key={`full-slide-${currentSlideIndex}`} className="max-h-[90vh] w-full flex items-center justify-center slide-content">
                {currentSlideIndex === 0 ? (
                  // Title slide
                  <div className="text-center max-w-4xl">
                    <h1 className="slide-title font-bold text-accent mb-6" style={{ fontSize: 'calc(2.5rem + 2vh)' }}>{pitchDeck.title}</h1>
                    <p className="slide-text text-white opacity-90" style={{ fontSize: 'calc(1.5rem + 1vh)' }}>{pitchDeck.subtitle}</p>
                  </div>
                ) : (
                  // Content slide
                  <div className="w-full max-w-6xl">
                    <h2 className="slide-title font-bold text-white mb-6" style={{ fontSize: 'calc(2rem + 2vh)' }}>
                      {pitchDeck.slides[currentSlideIndex - 1].title}
                    </h2>
                    {pitchDeck.slides[currentSlideIndex - 1].videoUrl ? (
                      <video
                        src={pitchDeck.slides[currentSlideIndex - 1].videoUrl}
                        autoPlay
                        loop={loopVideo}
                        muted
                        playsInline
                        className="slide-image w-full max-h-[50vh] object-contain rounded-lg mb-4"
                      />
                    ) : getCurrentSlideImage() ? (
                      <img
                        src={`data:image/png;base64,${getCurrentSlideImage()}`}
                        alt={pitchDeck.slides[currentSlideIndex - 1].visualPrompt || ''}
                        className="slide-image w-full max-h-[50vh] object-contain rounded-lg mb-4"
                      />
                    ) : null}
                    <div className="slide-text text-white whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[30vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ fontSize: 'calc(1rem + 0.75vh)' }}>
                      {pitchDeck.slides[currentSlideIndex - 1].content}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Indicators for auto-scroll/auto-advance */}
          <PresentationProgressIndicators
            scrollProgress={contentAutoScroll.progress}
            isScrollActive={contentAutoScroll.isScrolling}
            advanceProgress={slideAutoAdvance.progress}
            advanceTimeRemaining={slideAutoAdvance.timeRemaining}
            isAdvanceActive={slideAutoAdvance.isActive}
            isPaused={isAutoPaused}
          />

          {/* Paused Indicator (top-center) */}
          {(presentationSettings.contentAutoScrollEnabled || presentationSettings.slideAutoAdvanceEnabled) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <PausedIndicator isPaused={isAutoPaused} />
            </div>
          )}

          {/* Minimal keyboard hints with settings button */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className="text-xs text-gray-500 bg-black/50 px-3 py-2 rounded">
              ← → Navigate | N Notes | S Settings | ? Help | ESC Exit
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="bg-black/50 text-gray-400 hover:text-white hover:bg-black/70 p-2 h-auto"
              title="Presentation Settings (S)"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Presentation Settings Dialog */}
      <PresentationSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={presentationSettings}
        onSettingsChange={setPresentationSettings}
      />

      {/* Keyboard Shortcuts Help Overlay */}
      <KeyboardShortcutsHelp
        open={helpOpen}
        onOpenChange={setHelpOpen}
        mode="presentation"
      />

      {/* Cost Estimation Modal */}
      <CostEstimationModal
        open={showCostModal}
        onOpenChange={setShowCostModal}
        numberOfSlides={autoSlideCount ? 10 : parseInt(numberOfSlides) || 10}
        animationStyle={animationStyle}
        includeImages={includeImages}
        onConfirm={handleGenerateConfirmed}
        onCancel={() => setShowCostModal(false)}
      />
    </div>
  );
}
