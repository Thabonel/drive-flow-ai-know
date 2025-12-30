/**
 * useContentAutoScroll Hook
 *
 * Handles smooth auto-scrolling within slide content at readable pace.
 *
 * Speed mappings:
 * - slow: 50 px/second (comfortable reading)
 * - medium: 75 px/second (default, moderate pace)
 * - fast: 100 px/second (quick overview)
 *
 * Behavior:
 * - Scrolls smoothly using requestAnimationFrame
 * - Detects when at bottom and signals completion
 * - Can be paused/resumed (for hover interactions)
 * - Resets when slide changes
 */

import { useEffect, useRef, useCallback, useState } from 'react';

type ScrollSpeed = 'slow' | 'medium' | 'fast';

const SPEED_PX_PER_SECOND: Record<ScrollSpeed, number> = {
  slow: 50,
  medium: 75,
  fast: 100,
};

interface UseContentAutoScrollOptions {
  /** Reference to the scrollable container */
  containerRef: React.RefObject<HTMLElement>;
  /** Whether auto-scroll is enabled */
  enabled: boolean;
  /** Scroll speed setting */
  speed: ScrollSpeed;
  /** Called when scroll reaches bottom of content */
  onScrollComplete?: () => void;
  /** Delay (ms) to wait at bottom before calling onScrollComplete */
  bottomWaitDelay?: number;
}

interface UseContentAutoScrollResult {
  /** Whether scrolling is currently active */
  isScrolling: boolean;
  /** Whether scrolling is paused */
  isPaused: boolean;
  /** Pause the auto-scroll */
  pause: () => void;
  /** Resume the auto-scroll */
  resume: () => void;
  /** Reset scroll to top */
  resetScroll: () => void;
  /** Current scroll progress (0-1) */
  progress: number;
}

export function useContentAutoScroll({
  containerRef,
  enabled,
  speed,
  onScrollComplete,
  bottomWaitDelay = 2000,
}: UseContentAutoScrollOptions): UseContentAutoScrollResult {
  const [isScrolling, setIsScrolling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Animation state refs
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const bottomWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReachedBottomRef = useRef(false);

  /**
   * Calculate scroll progress (0-1)
   */
  const calculateProgress = useCallback((): number => {
    const container = containerRef.current;
    if (!container) return 0;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) return 1; // No scrollable content
    return Math.min(scrollTop / maxScroll, 1);
  }, [containerRef]);

  /**
   * Check if content is scrollable (has overflow)
   */
  const hasScrollableContent = useCallback((): boolean => {
    const container = containerRef.current;
    if (!container) return false;
    return container.scrollHeight > container.clientHeight;
  }, [containerRef]);

  /**
   * Check if scrolled to bottom
   */
  const isAtBottom = useCallback((): boolean => {
    const container = containerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Allow 2px tolerance for rounding
    return scrollTop + clientHeight >= scrollHeight - 2;
  }, [containerRef]);

  /**
   * Animation loop for smooth scrolling
   */
  const animateScroll = useCallback(
    (timestamp: number) => {
      if (!enabled || isPaused || !containerRef.current) {
        lastTimeRef.current = null;
        return;
      }

      // Calculate delta time
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const deltaTime = (timestamp - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = timestamp;

      // Calculate scroll amount based on speed
      const pxPerSecond = SPEED_PX_PER_SECOND[speed];
      const scrollAmount = pxPerSecond * deltaTime;

      // Perform scroll
      const container = containerRef.current;
      container.scrollBy({ top: scrollAmount });

      // Update progress
      setProgress(calculateProgress());

      // Check if reached bottom
      if (isAtBottom()) {
        if (!hasReachedBottomRef.current) {
          hasReachedBottomRef.current = true;

          // Wait at bottom before signaling completion
          bottomWaitTimerRef.current = setTimeout(() => {
            if (onScrollComplete) {
              onScrollComplete();
            }
          }, bottomWaitDelay);
        }
        return; // Stop animation
      }

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    },
    [enabled, isPaused, speed, containerRef, calculateProgress, isAtBottom, onScrollComplete, bottomWaitDelay]
  );

  /**
   * Start scrolling animation
   */
  const startScrolling = useCallback(() => {
    if (!enabled || !hasScrollableContent()) {
      // No scrollable content - immediately signal completion
      if (enabled && onScrollComplete) {
        bottomWaitTimerRef.current = setTimeout(onScrollComplete, bottomWaitDelay);
      }
      return;
    }

    setIsScrolling(true);
    hasReachedBottomRef.current = false;
    lastTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(animateScroll);
  }, [enabled, hasScrollableContent, animateScroll, onScrollComplete, bottomWaitDelay]);

  /**
   * Stop scrolling animation
   */
  const stopScrolling = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (bottomWaitTimerRef.current !== null) {
      clearTimeout(bottomWaitTimerRef.current);
      bottomWaitTimerRef.current = null;
    }
    lastTimeRef.current = null;
    setIsScrolling(false);
  }, []);

  /**
   * Pause auto-scroll
   */
  const pause = useCallback(() => {
    setIsPaused(true);
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (bottomWaitTimerRef.current !== null) {
      clearTimeout(bottomWaitTimerRef.current);
      bottomWaitTimerRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  /**
   * Resume auto-scroll
   */
  const resume = useCallback(() => {
    setIsPaused(false);
    if (enabled && isScrolling && !isAtBottom()) {
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    } else if (enabled && isScrolling && isAtBottom() && !hasReachedBottomRef.current) {
      // Was at bottom when paused, start the wait timer
      hasReachedBottomRef.current = true;
      bottomWaitTimerRef.current = setTimeout(() => {
        if (onScrollComplete) {
          onScrollComplete();
        }
      }, bottomWaitDelay);
    }
  }, [enabled, isScrolling, isAtBottom, animateScroll, onScrollComplete, bottomWaitDelay]);

  /**
   * Reset scroll position to top
   */
  const resetScroll = useCallback(() => {
    stopScrolling();
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setProgress(0);
    hasReachedBottomRef.current = false;
    setIsPaused(false);
  }, [stopScrolling, containerRef]);

  /**
   * Effect: Start/stop scrolling based on enabled state
   */
  useEffect(() => {
    if (enabled) {
      startScrolling();
    } else {
      stopScrolling();
    }

    return () => {
      stopScrolling();
    };
  }, [enabled, startScrolling, stopScrolling]);

  /**
   * Effect: Handle speed changes during scrolling
   */
  useEffect(() => {
    // Speed change is handled automatically via the animateScroll dependency
  }, [speed]);

  return {
    isScrolling,
    isPaused,
    pause,
    resume,
    resetScroll,
    progress,
  };
}

export default useContentAutoScroll;
