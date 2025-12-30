/**
 * Presenter View Component
 *
 * Rich interface for the presenter showing:
 * - Current slide (60% width)
 * - Next slide preview (40% width)
 * - Speaker notes (always visible, scrollable)
 * - Timer showing elapsed time
 * - Navigation controls
 *
 * Layout optimized for laptop/desktop displays.
 */

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Settings } from 'lucide-react';
import type { PitchDeck } from '@/lib/presentationStorage';
import type { PresentationSettingsData } from '@/components/PresentationSettings';

interface PresenterViewProps {
  pitchDeck: PitchDeck;
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
  onExit: () => void;
  presentationStartTime: number;
  settings: PresentationSettingsData;
  onOpenSettings: () => void;
}

/**
 * Format elapsed time as MM:SS
 */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function PresenterView({
  pitchDeck,
  currentSlideIndex,
  onSlideChange,
  onExit,
  presentationStartTime,
  settings,
  onOpenSettings,
}: PresenterViewProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Button refs for keyboard delegation
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Update timer every second
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - presentationStartTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [presentationStartTime]);

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prevButtonRef.current?.click();
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ': // Space bar
          e.preventDefault();
          nextButtonRef.current?.click();
          break;
        case 'Home':
          e.preventDefault();
          onSlideChange(0);
          break;
        case 'End':
          e.preventDefault();
          onSlideChange(pitchDeck.slides.length - 1);
          break;
        case 'Escape':
          e.preventDefault();
          exitButtonRef.current?.click();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          onOpenSettings();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pitchDeck.slides.length, onSlideChange, onOpenSettings]);

  const currentSlide = pitchDeck.slides[currentSlideIndex];
  const nextSlide = pitchDeck.slides[currentSlideIndex + 1];
  const totalSlides = pitchDeck.slides.length;

  const canGoPrevious = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < totalSlides - 1;

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-lg font-semibold">
            Timer: <span className="font-mono">{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="text-lg">
            Slide {currentSlideIndex + 1} of {totalSlides}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenSettings}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-700"
            title="Presentation Settings (S)"
          >
            <Settings className="h-5 w-5 mr-2" />
            Settings
          </Button>
          <Button
            ref={exitButtonRef}
            onClick={onExit}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-700"
          >
            <X className="h-5 w-5 mr-2" />
            Exit Presenter View
          </Button>
        </div>
      </div>

      {/* Main Content: Current Slide + Next Preview */}
      <div className="flex-1 grid grid-cols-5 gap-4 p-4 overflow-hidden">
        {/* Current Slide (60% - 3 columns) */}
        <div className="col-span-3 bg-black rounded-lg overflow-hidden flex flex-col">
          <div className="bg-gray-800 px-4 py-2 text-sm font-semibold border-b border-gray-700">
            Current Slide
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {currentSlide?.imageUrl ? (
              <img
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center">
                <h2 className="text-4xl font-bold mb-4">{currentSlide?.title}</h2>
                <p className="text-xl text-gray-300">{currentSlide?.content}</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Slide Preview (40% - 2 columns) */}
        <div className="col-span-2 bg-black rounded-lg overflow-hidden flex flex-col">
          <div className="bg-gray-800 px-4 py-2 text-sm font-semibold border-b border-gray-700">
            Next Slide Preview
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {nextSlide ? (
              <>
                {nextSlide.imageUrl ? (
                  <img
                    src={nextSlide.imageUrl}
                    alt={nextSlide.title}
                    className="max-w-full max-h-full object-contain opacity-70"
                  />
                ) : (
                  <div className="text-center opacity-70">
                    <h3 className="text-2xl font-bold mb-2">{nextSlide.title}</h3>
                    <p className="text-sm text-gray-400">{nextSlide.content}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 text-center">
                <p className="text-lg">End of presentation</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Speaker Notes */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4 max-h-48 overflow-y-auto">
        <div className="text-sm font-semibold mb-2 text-gray-400">SPEAKER NOTES</div>
        <div className="text-base text-gray-200">
          {currentSlide?.speakerNotes ? (
            <p className="whitespace-pre-wrap">{currentSlide.speakerNotes}</p>
          ) : (
            <p className="text-gray-500 italic">No speaker notes for this slide</p>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4 flex items-center justify-center gap-4">
        <Button
          ref={prevButtonRef}
          onClick={() => canGoPrevious && onSlideChange(currentSlideIndex - 1)}
          disabled={!canGoPrevious}
          variant={null as any}
          size="lg"
          className="min-w-40 !bg-accent !text-accent-foreground hover:!bg-accent/90 !shadow-none disabled:!opacity-100 disabled:!bg-accent"
        >
          <ChevronLeft className="h-5 w-5 mr-2" />
          Previous
        </Button>
        <Button
          ref={nextButtonRef}
          onClick={() => canGoNext && onSlideChange(currentSlideIndex + 1)}
          disabled={!canGoNext}
          variant="default"
          size="lg"
          className="min-w-40 bg-primary hover:bg-primary/90"
        >
          Next
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="bg-gray-900 px-6 py-2 text-xs text-gray-500 text-center border-t border-gray-800">
        Keyboard: ← → (arrows) | Space (next) | Home/End | S (settings) | ESC (exit)
      </div>
    </div>
  );
}
