import { useState, useEffect } from 'react';
import { useUserSettings } from './useUserSettings';

export function useOffline() {
  const { offlineMode, setOfflineMode } = useUserSettings();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handle = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    };
  }, []);

  return {
    offlineEnabled: offlineMode || !isOnline,
    offlineMode,
    setOfflineMode,
    isOnline,
  };
}
