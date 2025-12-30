/**
 * usePresentationSettings Hook
 *
 * Manages presentation settings with localStorage persistence.
 * Settings persist across sessions and are type-safe.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  type PresentationSettingsData,
  DEFAULT_SETTINGS,
} from '@/components/PresentationSettings';

const STORAGE_KEY = 'presentation-settings';

/**
 * Load settings from localStorage with fallback to defaults
 */
function loadSettings(): PresentationSettingsData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle any new settings that were added
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load presentation settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: PresentationSettingsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save presentation settings:', error);
  }
}

/**
 * Hook for managing presentation settings with localStorage persistence
 *
 * @returns Object containing settings state and updater function
 */
export function usePresentationSettings() {
  const [settings, setSettingsState] = useState<PresentationSettingsData>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettingsState(loaded);
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change
  const setSettings = useCallback((newSettings: PresentationSettingsData) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
  }, []);

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof PresentationSettingsData>(
    key: K,
    value: PresentationSettingsData[K]
  ) => {
    setSettingsState((prev) => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Reset to default settings
  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    setSettings,
    updateSetting,
    resetSettings,
    isLoaded,
  };
}

export default usePresentationSettings;
