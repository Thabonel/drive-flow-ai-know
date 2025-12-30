/**
 * useFrameAnimation Hook
 *
 * Handles animation frame playback for expressive mode.
 * Cycles through frames at a configurable interval.
 *
 * Timing:
 * - Default: 1500ms per frame (comfortable viewing)
 * - Range: 800ms - 3000ms depending on content
 *
 * Behavior:
 * - Starts automatically when frames are provided
 * - Loops continuously until slide changes
 * - Can be paused/resumed with mouse hover
 * - Resets to frame 0 when slide changes
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface AnimationFrame {
  frameNumber: number;
  description: string;
  visualPrompt: string;
  imageData?: string;
}

interface UseFrameAnimationOptions {
  /** Array of animation frames */
  frames: AnimationFrame[] | undefined;
  /** Whether animation is enabled */
  enabled: boolean;
  /** Milliseconds per frame (default: 1500ms) */
  frameInterval?: number;
  /** Whether to loop animation (default: true) */
  loop?: boolean;
  /** Dependency to reset animation (e.g., slide index) */
  resetDependency?: number | string;
}

interface UseFrameAnimationResult {
  /** Current frame index (0-based) */
  currentFrameIndex: number;
  /** Current frame data */
  currentFrame: AnimationFrame | undefined;
  /** Whether animation is playing */
  isPlaying: boolean;
  /** Whether animation is paused */
  isPaused: boolean;
  /** Total number of frames */
  totalFrames: number;
  /** Pause the animation */
  pause: () => void;
  /** Resume the animation */
  resume: () => void;
  /** Jump to a specific frame */
  goToFrame: (index: number) => void;
  /** Reset to first frame */
  reset: () => void;
  /** Progress (0-1) through current frame cycle */
  progress: number;
}

export function useFrameAnimation({
  frames,
  enabled,
  frameInterval = 1500,
  loop = true,
  resetDependency,
}: UseFrameAnimationOptions): UseFrameAnimationResult {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedElapsedRef = useRef<number>(0);

  const totalFrames = frames?.length || 0;
  const hasFrames = frames && frames.length > 1;
  const currentFrame = frames?.[currentFrameIndex];

  /**
   * Clear the interval
   */
  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Start or restart the animation
   */
  const start = useCallback(() => {
    if (!enabled || !hasFrames) return;

    clearIntervalRef();
    setIsPlaying(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    pausedElapsedRef.current = 0;
    setProgress(0);

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;

      const elapsed = Date.now() - startTimeRef.current;
      const frameProgress = (elapsed % frameInterval) / frameInterval;
      setProgress(frameProgress);

      // Check if it's time to advance to next frame
      if (elapsed >= frameInterval) {
        setCurrentFrameIndex((prev) => {
          const nextIndex = prev + 1;
          if (nextIndex >= totalFrames) {
            if (loop) {
              return 0; // Loop back to start
            } else {
              clearIntervalRef();
              setIsPlaying(false);
              return prev; // Stay on last frame
            }
          }
          return nextIndex;
        });
        startTimeRef.current = Date.now();
      }
    }, 50); // Update every 50ms for smooth progress
  }, [enabled, hasFrames, frameInterval, totalFrames, loop, clearIntervalRef]);

  /**
   * Stop the animation
   */
  const stop = useCallback(() => {
    clearIntervalRef();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentFrameIndex(0);
    setProgress(0);
    startTimeRef.current = null;
    pausedElapsedRef.current = 0;
  }, [clearIntervalRef]);

  /**
   * Pause the animation
   */
  const pause = useCallback(() => {
    if (!isPlaying || isPaused) return;

    clearIntervalRef();
    setIsPaused(true);

    // Store elapsed time when paused
    if (startTimeRef.current !== null) {
      pausedElapsedRef.current = Date.now() - startTimeRef.current;
    }
  }, [isPlaying, isPaused, clearIntervalRef]);

  /**
   * Resume the animation
   */
  const resume = useCallback(() => {
    if (!isPlaying || !isPaused || !hasFrames) return;

    setIsPaused(false);

    // Adjust start time to account for pause duration
    startTimeRef.current = Date.now() - pausedElapsedRef.current;

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;

      const elapsed = Date.now() - startTimeRef.current;
      const frameProgress = (elapsed % frameInterval) / frameInterval;
      setProgress(frameProgress);

      if (elapsed >= frameInterval) {
        setCurrentFrameIndex((prev) => {
          const nextIndex = prev + 1;
          if (nextIndex >= totalFrames) {
            if (loop) {
              return 0;
            } else {
              clearIntervalRef();
              setIsPlaying(false);
              return prev;
            }
          }
          return nextIndex;
        });
        startTimeRef.current = Date.now();
      }
    }, 50);
  }, [isPlaying, isPaused, hasFrames, frameInterval, totalFrames, loop, clearIntervalRef]);

  /**
   * Jump to a specific frame
   */
  const goToFrame = useCallback((index: number) => {
    if (!hasFrames || index < 0 || index >= totalFrames) return;
    setCurrentFrameIndex(index);
    startTimeRef.current = Date.now();
    setProgress(0);
  }, [hasFrames, totalFrames]);

  /**
   * Reset to first frame
   */
  const reset = useCallback(() => {
    stop();
    if (enabled && hasFrames) {
      start();
    }
  }, [stop, enabled, hasFrames, start]);

  /**
   * Effect: Start/stop based on enabled state
   */
  useEffect(() => {
    if (enabled && hasFrames) {
      start();
    } else {
      stop();
    }

    return () => {
      clearIntervalRef();
    };
  }, [enabled, hasFrames, start, stop, clearIntervalRef]);

  /**
   * Effect: Reset when resetDependency changes (e.g., slide change)
   */
  useEffect(() => {
    setCurrentFrameIndex(0);
    setProgress(0);
    if (enabled && hasFrames) {
      stop();
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetDependency]);

  return {
    currentFrameIndex,
    currentFrame,
    isPlaying,
    isPaused,
    totalFrames,
    pause,
    resume,
    goToFrame,
    reset,
    progress,
  };
}

export default useFrameAnimation;
