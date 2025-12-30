import { useState } from 'react';

/**
 * Hook for managing compact mode state with localStorage persistence
 * Used across Timeline components to toggle between normal and compact layouts
 */
export function useCompactMode() {
  const [isCompactMode, setIsCompactModeState] = useState(() => {
    return localStorage.getItem('timeline-compact-mode') === 'true';
  });

  const setIsCompactMode = (value: boolean) => {
    localStorage.setItem('timeline-compact-mode', String(value));
    setIsCompactModeState(value);
  };

  return { isCompactMode, setIsCompactMode };
}
