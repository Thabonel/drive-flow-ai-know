# Handover: Persist Theme Preference Across Logout/Login

**Date:** 2026-02-21
**Status:** Shipped to production
**Branch:** `staging` merged to `main`
**Commit:** `79f5e1f`

## Problem

Users lost their appearance settings (light/dark theme) when they logged out and logged back in. The theme was stored only in `localStorage` under the `aiqueryhub-theme` key, which could be wiped by `localStorage.clear()` calls in ErrorBoundary, ServiceWorkerManager, and cache-manager.

## Solution

Theme preference is now dual-persisted to both `localStorage` (for immediate use) and the `user_settings.theme` database column (for cross-session persistence). On login, if `localStorage` is missing the theme but the database has one saved, the database value is restored.

## Architecture

### Provider Order Constraint

`ThemeProvider` wraps `AuthProvider` in `App.tsx`, so `ThemeProvider` cannot use auth hooks directly. The sync logic lives in a `ThemeSyncProvider` component placed inside both providers.

```
ThemeProvider
  AuthProvider
    ThemeSyncProvider  <-- sync lives here, has access to both contexts
      BackgroundTasksProvider
        Routes...
```

### Data Flow

**On theme change (Settings page):**
1. User clicks a theme button
2. `setTheme()` updates React context and `localStorage`
3. `setThemePreference()` upserts the `user_settings.theme` column in the DB

**On login (automatic via ThemeSyncProvider):**
1. `useUserSettings` fetches `theme` from `user_settings` table
2. If `localStorage` has no `aiqueryhub-theme` key but DB has a value, `setTheme()` is called to restore it
3. A `useRef` flag prevents duplicate restores on re-renders

**On theme change (automatic via ThemeSyncProvider):**
1. An effect watches the `theme` context value
2. If it differs from the DB value, `setThemePreference()` saves it
3. This handles theme changes made outside the Settings page (if any)

## Files Changed

### `src/hooks/useUserSettings.ts`

- Query now selects `model_preference, theme` (was just `model_preference`)
- Returns structured `UserSettingsData` object instead of a bare string
- New `updateTheme` mutation upserts `user_settings.theme`
- New return values: `themePreference`, `setThemePreference`, `isLoaded`

### `src/components/ThemeSyncProvider.tsx` (new)

- Render-transparent sync component (`<>{children}</>`)
- Uses `useAuth`, `useTheme`, and `useUserSettings` hooks
- Two effects: restore-from-DB on login, persist-to-DB on change
- `hasRestoredFromDb` ref prevents duplicate restore calls

### `src/App.tsx`

- Imported `ThemeSyncProvider`
- Placed inside `AuthProvider`, wrapping `BackgroundTasksProvider` and all routes

### `src/pages/Settings.tsx`

- Destructures `setThemePreference` from `useUserSettings()`
- Theme buttons now call both `setTheme()` and `setThemePreference()` on click

## Database

Uses the existing `user_settings.theme` column (varchar). No migration needed - the column already existed but was unused by the frontend.

Valid values match the `Theme` type in `ThemeProvider.tsx`:
- `light`
- `dark`
- `system`
- `pure-light`
- `magic-blue`
- `classic-dark`

## Testing Checklist

1. Set theme to "light" in Settings - verify it applies
2. Log out, log back in - theme should still be "light"
3. Open DevTools, run `localStorage.removeItem('aiqueryhub-theme')`, refresh - theme should restore from DB
4. Set theme to "dark", open a second browser tab - theme should sync via react-query invalidation
5. New user with no DB row - should default to "system" theme (no errors)

## Known Limitations

- Theme sync is one-directional on login: DB wins only if `localStorage` is empty. If `localStorage` has a value, it takes precedence. This prevents overwriting local customizations.
- The `ThemeSyncProvider` effect that persists to DB on theme change intentionally omits `themePreference` and `setThemePreference` from the dependency array to avoid save loops. The eslint-disable comment documents this.
- If a user clears cookies but keeps `localStorage`, the DB value will not override. This is by design - `localStorage` is the primary source during a session.

## Rollback

To revert, remove `ThemeSyncProvider` from `App.tsx` and its import. The `useUserSettings` changes are backwards-compatible and can stay. The `Settings.tsx` change (extra `setThemePreference` call) is harmless even without the sync provider since the mutation would just be a no-op if the user row exists.
