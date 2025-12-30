/**
 * Presentation Storage Utility
 *
 * Handles storage of large pitch deck data using IndexedDB to avoid localStorage quota limits.
 * Uses idb-keyval library for simple Promise-based API.
 *
 * Why IndexedDB?
 * - localStorage has 5MB quota limit
 * - Base64 encoded PNG images in pitch decks can exceed this limit
 * - IndexedDB supports GBs of data
 * - Async operations don't block UI thread
 */

import { get, set, del } from 'idb-keyval';

export interface PitchDeck {
  id: string;
  title: string;
  slides: Slide[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Animation frame for expressive mode
 * Represents one step in a progressive visual build-up
 */
export interface AnimationFrame {
  frameNumber: number;
  description: string;
  visualPrompt: string;
  imageData?: string;
}

export interface Slide {
  slideNumber: number;
  title: string;
  content: string;
  imageUrl?: string;
  speakerNotes?: string;
  // Animation frames for expressive mode (Phase 5)
  frames?: AnimationFrame[];
}

/**
 * Store a pitch deck in IndexedDB
 * Handles large Base64 images without quota issues
 *
 * @param sessionId - Unique session identifier
 * @param pitchDeck - Complete pitch deck object with slides
 * @returns Promise that resolves when storage is complete
 */
export const storePitchDeck = async (
  sessionId: string,
  pitchDeck: PitchDeck
): Promise<void> => {
  try {
    await set(`presentation-deck-${sessionId}`, pitchDeck);
    console.log(`[Storage] Stored pitch deck for session ${sessionId}`);
  } catch (error) {
    console.error('[Storage] Failed to store pitch deck:', error);
    throw new Error('Failed to store presentation data');
  }
};

/**
 * Retrieve a pitch deck from IndexedDB
 *
 * @param sessionId - Unique session identifier
 * @returns Promise resolving to pitch deck or null if not found
 */
export const getPitchDeck = async (
  sessionId: string
): Promise<PitchDeck | null> => {
  try {
    const deck = await get<PitchDeck>(`presentation-deck-${sessionId}`);
    if (deck) {
      console.log(`[Storage] Retrieved pitch deck for session ${sessionId}`);
    } else {
      console.warn(`[Storage] No pitch deck found for session ${sessionId}`);
    }
    return deck || null;
  } catch (error) {
    console.error('[Storage] Failed to retrieve pitch deck:', error);
    return null;
  }
};

/**
 * Delete a pitch deck from IndexedDB
 * Called when presentation ends to clean up storage
 *
 * @param sessionId - Unique session identifier
 * @returns Promise that resolves when deletion is complete
 */
export const deletePitchDeck = async (sessionId: string): Promise<void> => {
  try {
    await del(`presentation-deck-${sessionId}`);
    console.log(`[Storage] Deleted pitch deck for session ${sessionId}`);
  } catch (error) {
    console.error('[Storage] Failed to delete pitch deck:', error);
    // Don't throw - deletion failure shouldn't block presentation exit
  }
};

/**
 * Check if IndexedDB is available in the current browser
 *
 * @returns true if IndexedDB is supported
 */
export const isIndexedDBAvailable = (): boolean => {
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
};
