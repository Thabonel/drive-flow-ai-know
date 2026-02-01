import { useState, useRef, useCallback, useEffect } from 'react';

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

export interface GestureAction {
  type: 'swipe' | 'longpress' | 'pinch';
  action: 'complete' | 'park' | 'delegate' | 'edit' | 'zoom' | 'navigate';
  threshold?: number;
  callback: (data?: any) => void;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface UseGesturesOptions {
  swipeThreshold?: number;
  longPressThreshold?: number;
  velocityThreshold?: number;
  preventDefaultOnSwipe?: boolean;
}

export function useGestures(
  actions: GestureAction[] = [],
  options: UseGesturesOptions = {}
) {
  const {
    swipeThreshold = 50,
    longPressThreshold = 500,
    velocityThreshold = 0.3,
    preventDefaultOnSwipe = true,
  } = options;

  const [isGesturing, setIsGesturing] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);

  // Calculate distance between two points
  const calculateDistance = useCallback((point1: TouchPoint, point2: TouchPoint) => {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    );
  }, []);

  // Calculate velocity
  const calculateVelocity = useCallback((point1: TouchPoint, point2: TouchPoint) => {
    const distance = calculateDistance(point1, point2);
    const time = point2.time - point1.time;
    return time > 0 ? distance / time : 0;
  }, [calculateDistance]);

  // Determine swipe direction
  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): SwipeGesture['direction'] => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    setIsGesturing(true);

    // Handle pinch gesture (two fingers)
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialPinchDistanceRef.current = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
    }

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current) {
        setCurrentGesture('longpress');
        const longPressAction = actions.find(action => action.type === 'longpress');
        if (longPressAction) {
          longPressAction.callback({
            x: touchStartRef.current.x,
            y: touchStartRef.current.y,
          });
        }
      }
    }, longPressThreshold);
  }, [actions, longPressThreshold]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistanceRef.current) {
      // Handle pinch gesture
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      const scale = currentDistance / initialPinchDistanceRef.current;
      const pinchAction = actions.find(action => action.type === 'pinch');
      if (pinchAction) {
        pinchAction.callback({ scale });
      }
      setCurrentGesture('pinch');
    }

    // Clear long press timer on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, [actions]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches[0];
    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (touchStartRef.current && touchEndRef.current) {
      const distance = calculateDistance(touchStartRef.current, touchEndRef.current);
      const velocity = calculateVelocity(touchStartRef.current, touchEndRef.current);

      // Check if it's a swipe gesture
      if (distance >= swipeThreshold && velocity >= velocityThreshold) {
        const direction = getSwipeDirection(touchStartRef.current, touchEndRef.current);
        const gesture: SwipeGesture = {
          direction,
          distance,
          velocity,
          duration: touchEndRef.current.time - touchStartRef.current.time,
        };

        setCurrentGesture(`swipe-${direction}`);

        // Find and execute swipe action
        const swipeAction = actions.find(action =>
          action.type === 'swipe' &&
          (!action.threshold || distance >= action.threshold)
        );

        if (swipeAction) {
          swipeAction.callback(gesture);
          if (preventDefaultOnSwipe) {
            e.preventDefault();
          }
        }
      }
    }

    // Reset state
    setIsGesturing(false);
    setCurrentGesture(null);
    touchStartRef.current = null;
    touchEndRef.current = null;
    initialPinchDistanceRef.current = null;
  }, [
    actions,
    calculateDistance,
    calculateVelocity,
    getSwipeDirection,
    swipeThreshold,
    velocityThreshold,
    preventDefaultOnSwipe,
  ]);

  // Attach event listeners
  useEffect(() => {
    const element = document.body;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isGesturing,
    currentGesture,
  };
}

// Helper hook for specific timeline item gestures
export function useTimelineItemGestures(
  onComplete?: () => void,
  onPark?: () => void,
  onDelegate?: () => void,
  onEdit?: () => void
) {
  const actions: GestureAction[] = [
    {
      type: 'swipe',
      action: 'complete',
      callback: () => onComplete?.(),
    },
    {
      type: 'swipe',
      action: 'park',
      callback: () => onPark?.(),
    },
    {
      type: 'longpress',
      action: 'edit',
      callback: () => onEdit?.(),
    },
  ];

  return useGestures(actions, {
    swipeThreshold: 80,
    longPressThreshold: 600,
    preventDefaultOnSwipe: true,
  });
}

// Helper hook for attention budget gestures
export function useAttentionBudgetGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onPinchZoom?: (scale: number) => void
) {
  const actions: GestureAction[] = [
    {
      type: 'swipe',
      action: 'navigate',
      callback: (gesture: SwipeGesture) => {
        if (gesture.direction === 'left') onSwipeLeft?.();
        if (gesture.direction === 'right') onSwipeRight?.();
      },
    },
    {
      type: 'pinch',
      action: 'zoom',
      callback: ({ scale }: { scale: number }) => onPinchZoom?.(scale),
    },
  ];

  return useGestures(actions);
}