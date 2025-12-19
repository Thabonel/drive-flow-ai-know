/**
 * Presentation Sync Utility
 *
 * Handles real-time cross-window communication between presenter and audience views.
 * Uses BroadcastChannel API with localStorage fallback for older browsers.
 *
 * Communication Pattern:
 * 1. Audience window opens → sends READY message
 * 2. Presenter receives READY → sends DECK_DATA with full pitch deck
 * 3. Both windows sync via SLIDE_CHANGE messages
 * 4. Presenter sends EXIT_PRESENTATION when closing
 */

import type { PitchDeck } from './presentationStorage';

/**
 * State shared between presenter and audience windows
 */
export interface PresentationState {
  sessionId: string;
  currentSlideIndex: number;
  presentationStartTime: number;
  isActive: boolean;
}

/**
 * Message types for cross-window communication
 */
export type PresentationMessage =
  | { type: 'READY'; sessionId: string }
  | { type: 'DECK_DATA'; pitchDeck: PitchDeck }
  | { type: 'SLIDE_CHANGE'; index: number }
  | { type: 'EXIT_PRESENTATION'; sessionId: string }
  | { type: 'SYNC_STATE'; state: PresentationState }
  | { type: 'HEARTBEAT'; timestamp: number };

/**
 * Callback function for handling incoming messages
 */
export type MessageHandler = (message: PresentationMessage) => void;

/**
 * Presentation sync controller
 * Manages communication between presenter and audience windows
 */
export class PresentationSync {
  private sessionId: string;
  private isPresenter: boolean;
  private channel: BroadcastChannel | null = null;
  private messageHandler: MessageHandler | null = null;
  private heartbeatInterval: number | null = null;
  private useFallback = false;

  constructor(sessionId: string, isPresenter: boolean) {
    this.sessionId = sessionId;
    this.isPresenter = isPresenter;
    this.initializeChannel();
  }

  /**
   * Initialize communication channel
   * Uses BroadcastChannel if available, otherwise falls back to localStorage
   */
  private initializeChannel(): void {
    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(`presentation-sync-${this.sessionId}`);
        this.setupBroadcastChannel();
        console.log(
          `[Sync] Initialized BroadcastChannel for session ${this.sessionId} (${
            this.isPresenter ? 'presenter' : 'audience'
          })`
        );
      } catch (error) {
        console.warn('[Sync] BroadcastChannel failed, using localStorage fallback:', error);
        this.useFallback = true;
        this.setupLocalStorageFallback();
      }
    } else {
      console.log('[Sync] BroadcastChannel not available, using localStorage fallback');
      this.useFallback = true;
      this.setupLocalStorageFallback();
    }

    // Start heartbeat for presenter to detect window close
    if (this.isPresenter) {
      this.startHeartbeat();
    }
  }

  /**
   * Set up BroadcastChannel message listener
   */
  private setupBroadcastChannel(): void {
    if (!this.channel) return;

    this.channel.onmessage = (event: MessageEvent<PresentationMessage>) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Set up localStorage fallback for older browsers (Safari < 15.4)
   */
  private setupLocalStorageFallback(): void {
    const storageKey = `presentation-sync-${this.sessionId}`;

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        try {
          const message: PresentationMessage = JSON.parse(event.newValue);
          this.handleMessage(message);
        } catch (error) {
          console.error('[Sync] Failed to parse localStorage message:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);
  }

  /**
   * Handle incoming messages from other window
   */
  private handleMessage(message: PresentationMessage): void {
    console.log('[Sync] Received message:', message.type);

    // Don't process messages from same window
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }

  /**
   * Send a message to the other window
   */
  public send(message: PresentationMessage): void {
    if (this.channel && !this.useFallback) {
      // Use BroadcastChannel
      this.channel.postMessage(message);
      console.log('[Sync] Sent via BroadcastChannel:', message.type);
    } else {
      // Use localStorage fallback
      const storageKey = `presentation-sync-${this.sessionId}`;
      localStorage.setItem(storageKey, JSON.stringify(message));
      console.log('[Sync] Sent via localStorage:', message.type);

      // Clean up after a short delay (avoid memory leak)
      setTimeout(() => {
        if (localStorage.getItem(storageKey) === JSON.stringify(message)) {
          localStorage.removeItem(storageKey);
        }
      }, 100);
    }
  }

  /**
   * Register callback for incoming messages
   */
  public onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Start heartbeat to detect presenter window close
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.send({
        type: 'HEARTBEAT',
        timestamp: Date.now(),
      });
    }, 2000); // Every 2 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Clean up resources when presentation ends
   */
  public destroy(): void {
    console.log('[Sync] Destroying sync for session', this.sessionId);

    this.stopHeartbeat();

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    // Clean up localStorage if using fallback
    if (this.useFallback) {
      const storageKey = `presentation-sync-${this.sessionId}`;
      localStorage.removeItem(storageKey);
    }

    this.messageHandler = null;
  }
}

/**
 * Generate a unique session ID for presentation
 * Uses crypto.randomUUID() for strong uniqueness
 */
export const generateSessionId = (): string => {
  if ('randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Create and initialize a presentation sync instance
 *
 * @param sessionId - Unique session identifier
 * @param isPresenter - true for presenter window, false for audience
 * @returns Configured PresentationSync instance
 */
export const createPresentationSync = (
  sessionId: string,
  isPresenter: boolean
): PresentationSync => {
  return new PresentationSync(sessionId, isPresenter);
};
