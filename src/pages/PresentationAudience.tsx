/**
 * Presentation Audience View
 *
 * Minimal fullscreen slide renderer for external displays/projectors.
 * Shows clean slides only with no UI chrome.
 *
 * Critical Features:
 * - User gesture button for fullscreen (browsers require click to enter fullscreen)
 * - Handshake pattern: sends READY → receives DECK_DATA from presenter
 * - Auto-closes when presenter exits
 * - Syncs slide changes in real-time
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  createPresentationSync,
  type PresentationSync,
  type PresentationMessage,
} from '@/lib/presentationSync';
import type { PitchDeck } from '@/lib/presentationStorage';

/**
 * Connection states for audience view
 */
type ConnectionState = 'waiting' | 'ready' | 'connected' | 'disconnected';

export default function PresentationAudience() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [connectionState, setConnectionState] = useState<ConnectionState>('waiting');
  const [pitchDeck, setPitchDeck] = useState<PitchDeck | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [sync, setSync] = useState<PresentationSync | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /**
   * Initialize sync and send READY message to presenter
   */
  useEffect(() => {
    if (!sessionId) {
      toast({
        title: 'Invalid Session',
        description: 'No session ID provided',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    // Create sync instance (audience mode)
    const syncInstance = createPresentationSync(sessionId, false);
    setSync(syncInstance);

    // Send READY message to presenter
    setTimeout(() => {
      syncInstance.send({ type: 'READY', sessionId });
      console.log('[Audience] Sent READY message to presenter');
    }, 100);

    return () => {
      syncInstance.destroy();
    };
  }, [sessionId, navigate, toast]);

  /**
   * Handle incoming messages from presenter
   */
  const handleMessage = useCallback(
    (message: PresentationMessage) => {
      switch (message.type) {
        case 'DECK_DATA':
          console.log('[Audience] Received pitch deck data');
          setPitchDeck(message.pitchDeck);
          setConnectionState('ready');
          break;

        case 'SLIDE_CHANGE':
          console.log('[Audience] Slide changed to', message.index);
          setCurrentSlideIndex(message.index);
          break;

        case 'EXIT_PRESENTATION':
          console.log('[Audience] Presenter exited presentation');
          setConnectionState('disconnected');
          toast({
            title: 'Presentation Ended',
            description: 'The presenter has ended the presentation',
          });
          setTimeout(() => {
            window.close();
          }, 2000);
          break;

        case 'SYNC_STATE':
          console.log('[Audience] Synced state:', message.state);
          setCurrentSlideIndex(message.state.currentSlideIndex);
          break;

        default:
          break;
      }
    },
    [toast]
  );

  /**
   * Register message handler
   */
  useEffect(() => {
    if (sync) {
      sync.onMessage(handleMessage);
    }
  }, [sync, handleMessage]);

  /**
   * Request fullscreen and connect
   * Must be triggered by user gesture (button click)
   */
  const handleConnect = async () => {
    try {
      // Request fullscreen on document element
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setConnectionState('connected');
        console.log('[Audience] Entered fullscreen mode');
      }
    } catch (error) {
      console.error('[Audience] Fullscreen request failed:', error);

      // Fallback: CSS fullscreen without browser API
      setIsFullscreen(true);
      setConnectionState('connected');

      toast({
        title: 'Fullscreen Blocked',
        description: 'Press F11 for fullscreen, or allow fullscreen permission',
        variant: 'default',
      });
    }
  };

  /**
   * Monitor fullscreen changes
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);

      if (!isCurrentlyFullscreen && connectionState === 'connected') {
        toast({
          title: 'Exited Fullscreen',
          description: 'Press F11 or click to re-enter fullscreen',
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [connectionState, toast]);

  /**
   * Get current slide
   */
  const currentSlide = pitchDeck?.slides?.[currentSlideIndex];

  /**
   * Render waiting state
   */
  if (connectionState === 'waiting') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Monitor className="h-16 w-16 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold mb-2">Waiting for Presenter...</h1>
          <p className="text-gray-400">Connecting to presentation session</p>
        </div>
      </div>
    );
  }

  /**
   * Render "Click to Connect" button
   * Required for user gesture to enter fullscreen
   */
  if (connectionState === 'ready' && !isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md px-8">
          <Monitor className="h-20 w-20 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Ready to Connect</h1>
          <p className="text-gray-300 mb-8">
            Position this window on your projector or external display, then click the button
            below to enter fullscreen presentation mode.
          </p>
          <Button
            onClick={handleConnect}
            size="lg"
            className="w-full h-16 text-xl bg-primary hover:bg-primary/90"
          >
            Click to Connect & Go Fullscreen
          </Button>
        </div>
      </div>
    );
  }

  /**
   * Render disconnected state
   */
  if (connectionState === 'disconnected') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Presentation Ended</h1>
          <p className="text-gray-400">This window will close automatically</p>
        </div>
      </div>
    );
  }

  /**
   * Render slide (connected state)
   */
  return (
    <div className="fixed inset-0 bg-black overflow-hidden cursor-none">
      {currentSlide ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8">
          {/* Slide Video or Image */}
          {currentSlide.videoUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <video
                src={currentSlide.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : currentSlide.imageUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            /* Fallback: Text content if no video or image */
            <div className="text-center text-white max-w-4xl">
              <h1 className="text-6xl font-bold mb-8">{currentSlide.title}</h1>
              <div className="text-2xl text-gray-300 whitespace-pre-wrap">
                {currentSlide.content}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          <p className="text-2xl">No slide available</p>
        </div>
      )}
    </div>
  );
}
