import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'aiqueryhub-theme';

/**
 * Syncs theme preference between localStorage and the user_settings DB table.
 * Must be rendered inside both ThemeProvider and AuthProvider.
 *
 * On login: restores theme from DB if localStorage is missing it.
 * On theme change: persists to DB so it survives logout/login.
 */
export function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { themePreference, setThemePreference, isLoaded } = useUserSettings();
  const hasRestoredFromDb = useRef(false);

  // On login: if localStorage has no theme but DB does, restore from DB
  useEffect(() => {
    if (!user || !isLoaded || hasRestoredFromDb.current) return;
    hasRestoredFromDb.current = true;

    const localTheme = localStorage.getItem(STORAGE_KEY);
    if (!localTheme && themePreference) {
      setTheme(themePreference as any);
    }
  }, [user, isLoaded, themePreference, setTheme]);

  // When theme changes, persist to DB
  useEffect(() => {
    if (!user || !isLoaded) return;
    // Only save if the theme differs from what's in the DB
    if (theme && theme !== themePreference) {
      setThemePreference(theme);
    }
  }, [theme, user, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
