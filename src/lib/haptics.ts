/**
 * Mobile haptic feedback and voice input utilities
 * Provides consistent haptic feedback patterns for mobile interactions
 */

// Haptic feedback patterns
export const Vibrate = {
  // Light tap feedback for selections and navigation
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  // Standard selection feedback
  selection: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  // Heavy feedback for important actions or errors
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  },

  // Success pattern
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 50, 20]);
    }
  },

  // Error pattern
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 100, 100, 100, 100]);
    }
  },

  // Warning pattern
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  },

  // Notification pattern
  notification: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30, 50]);
    }
  },

  // Custom pattern
  custom: (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
};

// Voice input functionality
export const VoiceInput = {
  // Check if voice input is supported
  isSupported: (): boolean => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  // Start voice recognition
  start: (options: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    maxDuration?: number;
  } = {}): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!VoiceInput.isSupported()) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = options.language || 'en-US';
      recognition.continuous = options.continuous || false;
      recognition.interimResults = options.interimResults || false;

      let finalTranscript = '';
      let timeout: NodeJS.Timeout | undefined;

      // Set maximum duration timeout
      if (options.maxDuration) {
        timeout = setTimeout(() => {
          recognition.stop();
        }, options.maxDuration);
      }

      recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Provide interim results if requested
        if (options.interimResults && interimTranscript) {
          // Could emit interim results to a callback if needed
        }
      };

      recognition.onend = () => {
        if (timeout) clearTimeout(timeout);
        resolve(finalTranscript.trim());
      };

      recognition.onerror = (event) => {
        if (timeout) clearTimeout(timeout);
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.start();
    });
  }
};

// Mobile performance utilities
export const MobilePerf = {
  // Detect if device is low-end
  isLowEndDevice: (): boolean => {
    // Check memory (if available)
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory < 4;
    }

    // Check hardware concurrency
    if (navigator.hardwareConcurrency) {
      return navigator.hardwareConcurrency < 4;
    }

    // Fallback: assume low-end if we can't determine
    return false;
  },

  // Reduce animations for low-end devices
  shouldReduceAnimations: (): boolean => {
    // Check user preference first
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }

    // Check if low-end device
    return MobilePerf.isLowEndDevice();
  },

  // Optimize touch events
  optimizeTouchEvents: (element: HTMLElement) => {
    // Use passive listeners for better scroll performance
    element.addEventListener('touchstart', () => {}, { passive: true });
    element.addEventListener('touchmove', () => {}, { passive: true });
    element.addEventListener('touchend', () => {}, { passive: true });
  },

  // Debounce touch events
  debouncedTouch: (callback: () => void, delay: number = 150) => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, delay);
    };
  }
};

// Network optimization for mobile
export const MobileNetwork = {
  // Check if on slow connection
  isSlowConnection: (): boolean => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
    }
    return false;
  },

  // Optimize images for mobile
  optimizeImageLoading: (img: HTMLImageElement, lowQualitySrc?: string) => {
    if (MobileNetwork.isSlowConnection() && lowQualitySrc) {
      img.src = lowQualitySrc;
    }

    // Use loading="lazy" for off-screen images
    if ('loading' in img) {
      img.loading = 'lazy';
    }
  },

  // Preload critical resources
  preloadResource: (href: string, as: 'style' | 'script' | 'image' | 'font') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }
};

// Screen orientation utilities
export const ScreenOrientation = {
  // Get current orientation
  getOrientation: (): 'portrait' | 'landscape' => {
    if (screen.orientation) {
      return screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape';
    }
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  },

  // Listen for orientation changes
  onOrientationChange: (callback: (orientation: 'portrait' | 'landscape') => void) => {
    const handleChange = () => {
      callback(ScreenOrientation.getOrientation());
    };

    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleChange);
      return () => screen.orientation.removeEventListener('change', handleChange);
    } else {
      window.addEventListener('orientationchange', handleChange);
      return () => window.removeEventListener('orientationchange', handleChange);
    }
  },

  // Lock to specific orientation (requires fullscreen)
  lock: async (orientation: 'portrait' | 'landscape') => {
    if (screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock(orientation);
      } catch (error) {
        console.warn('Orientation lock failed:', error);
      }
    }
  }
};

// Mobile-specific CSS utilities
export const MobileCss = {
  // Add safe area classes for notch support
  addSafeAreaSupport: () => {
    const style = document.createElement('style');
    style.textContent = `
      .safe-top { padding-top: env(safe-area-inset-top); }
      .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
      .safe-left { padding-left: env(safe-area-inset-left); }
      .safe-right { padding-right: env(safe-area-inset-right); }
      .safe-all {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }
    `;
    document.head.appendChild(style);
  },

  // Prevent zoom on input focus (iOS)
  preventZoomOnInput: () => {
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.setAttribute('content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }
  },

  // Enable momentum scrolling (iOS)
  enableMomentumScrolling: (element?: HTMLElement) => {
    const style = element?.style || document.body.style;
    style.webkitOverflowScrolling = 'touch';
  }
};

// Initialize mobile optimizations
export const initializeMobileOptimizations = () => {
  // Add safe area support
  MobileCss.addSafeAreaSupport();

  // Optimize for low-end devices
  if (MobilePerf.isLowEndDevice()) {
    document.body.classList.add('low-end-device');
  }

  // Enable momentum scrolling
  MobileCss.enableMomentumScrolling();

  // Prevent zoom on inputs for better UX
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    MobileCss.preventZoomOnInput();
  }
};

// Export types for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}