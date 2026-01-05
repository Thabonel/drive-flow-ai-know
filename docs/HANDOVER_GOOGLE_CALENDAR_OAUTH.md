# Google Calendar OAuth Integration - Handover Document

**Date:** 2026-01-05
**Status:** Awaiting Production Verification
**Author:** Claude Code

---

## Summary

This document covers the investigation and fix for Google Calendar OAuth popup authentication failing with "Connection Failed - Popup window closed" errors.

---

## Problem Statement

Users clicking "Connect Google Calendar" on the Timeline page experienced:
1. Google sign-in popup opens successfully
2. User authenticates with Google
3. Popup closes but callback never fires
4. App shows "Connection Failed - Popup window closed" error
5. Calendar events never sync

### Console Errors Observed

```
Cross-Origin-Opener-Policy policy would block the window.closed call.
OAuth error_callback: _.Vc
```

---

## Root Cause

**Cross-Origin-Opener-Policy (COOP)** browser security policy was blocking communication between the Google OAuth popup and the parent window.

The default COOP value of `same-origin` prevents cross-origin windows from accessing each other, which breaks OAuth popup flows that rely on `window.closed` checks and `postMessage` communication.

### Technical Details

- Google's Identity Services library uses popup-based OAuth by default
- The library polls `window.closed` to detect when user completes auth
- COOP `same-origin` blocks this cross-origin check
- Result: Callback never fires, auth appears to hang

---

## Solution Implemented

Added `netlify.toml` configuration to set permissive COOP header:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin-allow-popups"
```

**Key change:** `same-origin-allow-popups` allows the page to open popups that can communicate back, while still protecting against other cross-origin attacks.

---

## Files Modified

| File | Change |
|------|--------|
| `netlify.toml` | **Created** - Added COOP header configuration |

---

## Files Involved (Not Modified)

These files contain the Google Calendar OAuth implementation:

| File | Purpose |
|------|---------|
| `src/hooks/useGoogleCalendar.ts` | Main hook for OAuth flow, token storage, sync |
| `src/components/timeline/CalendarSyncButton.tsx` | UI button to trigger OAuth |
| `src/components/timeline/CalendarSyncSettings.tsx` | Sync configuration modal |
| `supabase/functions/store-google-tokens/index.ts` | Edge Function to store OAuth tokens |
| `supabase/functions/google-calendar-sync/index.ts` | Edge Function to sync calendar events |
| `supabase/functions/get-google-config/index.ts` | Edge Function to provide client ID |

---

## OAuth Flow Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User clicks   │────▶│  Google OAuth    │────▶│  Popup returns  │
│ "Connect Google"│     │  Popup opens     │     │  access_token   │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Calendar events │◀────│ google-calendar- │◀────│ store-google-   │
│ appear in       │     │ sync Edge Func   │     │ tokens Edge Func│
│ Timeline        │     └──────────────────┘     └─────────────────┘
└─────────────────┘
```

### Flow Steps

1. **User clicks "Connect Google Calendar"**
   - `CalendarSyncButton.tsx` calls `connectCalendar()` from hook

2. **OAuth popup opens**
   - `useGoogleCalendar.ts` uses `google.accounts.oauth2.initTokenClient()`
   - Requests scope: `https://www.googleapis.com/auth/calendar.events`

3. **User authenticates**
   - Google handles sign-in in popup
   - Returns `access_token` (and potentially `refresh_token`)

4. **Callback fires** (this was broken before fix)
   - Token received in `callback` function
   - `storeTokens()` calls `store-google-tokens` Edge Function

5. **Tokens stored**
   - Saved to `user_google_tokens` table in Supabase
   - Encrypted at rest

6. **Initial sync triggered**
   - `google-calendar-sync` Edge Function called
   - Fetches events from Google Calendar API
   - Transforms and saves to `timeline_items` table

---

## Database Tables

### `user_google_tokens`
Stores OAuth tokens per user.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK to auth.users |
| access_token | text | Google access token |
| refresh_token | text | Google refresh token (nullable) |
| token_type | text | Usually "Bearer" |
| expires_at | timestamp | Token expiration |
| scope | text | Granted OAuth scopes |

### `calendar_sync_settings`
Stores sync preferences per user.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK to auth.users |
| enabled | boolean | Sync enabled flag |
| selected_calendar_id | text | Google calendar ID to sync |
| sync_direction | text | 'to_calendar', 'from_calendar', 'both' |
| auto_sync_enabled | boolean | Enable automatic sync |
| sync_interval_minutes | integer | How often to sync |
| last_sync_at | timestamp | Last successful sync |
| last_sync_status | text | 'success' or 'error' |
| last_sync_error | text | Error message if failed |

### `timeline_items`
Stores synced calendar events.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| title | text | Event title |
| description | text | Event description |
| start_time | timestamp | Event start |
| end_time | timestamp | Event end |
| google_event_id | text | Original Google event ID |
| source | text | 'google_calendar' for synced events |

---

## Environment Variables Required

### Supabase Edge Functions

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `GOOGLE_API_KEY` | API Key for Google APIs |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Key for encrypting stored tokens |

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project or create new
3. Navigate to **APIs & Services** → **Credentials**
4. OAuth 2.0 Client IDs → Select "AI Query Hub Web"
5. Ensure **Authorized JavaScript origins** includes:
   - `https://aiqueryhub.com`
   - `http://localhost:8080` (for development)
6. **Authorized redirect URIs** (only needed if using redirect flow):
   - `https://aiqueryhub.com/auth/google-calendar/callback`

---

## Alternative Approach: Redirect Flow

During investigation, a redirect-based OAuth flow was implemented and then reverted. This approach is documented here for future reference if popup issues persist.

### Redirect Flow Files (Not Currently Used)

These files were created but reverted:

- `src/pages/GoogleCalendarCallback.tsx` - Handles OAuth redirect callback
- `supabase/functions/exchange-google-calendar-code/index.ts` - Exchanges auth code for tokens

### When to Use Redirect Flow

- If COOP header fix doesn't work
- For mobile browsers (Google recommends redirect on mobile)
- If popup blockers are common among users

### Redirect Flow Implementation

1. Change `useGoogleCalendar.ts` to build OAuth URL and redirect
2. Create callback page to handle return
3. Create Edge Function to exchange code for tokens
4. Add redirect URI to Google Cloud Console

---

## Troubleshooting

### "Connection Failed - Popup window closed"

**Cause:** COOP header blocking popup communication

**Fix:** Ensure `netlify.toml` has:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin-allow-popups"
```

### "OAuth client was not found" (401 invalid_client)

**Cause:** Redirect URI not registered in Google Cloud Console

**Fix:** Add exact redirect URI to OAuth client configuration

### Popup opens but nothing happens

**Cause:** Google scripts not loaded

**Fix:** Check `initializeGoogleCalendar()` is called on mount. Verify network requests for:
- `https://accounts.google.com/gsi/client`
- `https://apis.google.com/js/api.js`

### Tokens stored but sync fails

**Cause:** Token expired or insufficient scope

**Fix:**
1. Check `user_google_tokens.expires_at`
2. Verify scope includes `calendar.events`
3. Check Edge Function logs in Supabase dashboard

### "Failed to initialize Google Calendar services"

**Cause:** Missing or invalid `GOOGLE_API_KEY` or `GOOGLE_CLIENT_ID`

**Fix:** Verify environment variables in Supabase Edge Function secrets

---

## Testing Checklist

- [ ] Click "Connect Google Calendar" - popup should open
- [ ] Complete Google sign-in - popup should close
- [ ] Toast shows "Connected Successfully!"
- [ ] Toast shows "Calendar Synced! Imported X events"
- [ ] Events appear in Timeline view
- [ ] "Sync Now" button works
- [ ] "Disconnect" removes connection
- [ ] Reconnecting works after disconnect

---

## References

- [Next.js COOP Discussion](https://github.com/vercel/next.js/discussions/51135)
- [react-oauth COOP Issue](https://github.com/MomenSherif/react-oauth/issues/295)
- [Chrome COOP Documentation](https://developer.chrome.com/blog/coop-restrict-properties)
- [MDN COOP Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [Google Calendar API](https://developers.google.com/calendar/api)

---

## Commits Related to This Work

| Commit | Description |
|--------|-------------|
| `22621f8` | fix: Add COOP header to allow Google OAuth popups |
| `d55be60` | Revert "feat: Switch Google Calendar OAuth to redirect flow" |
| `15892c1` | feat: Switch Google Calendar OAuth to redirect flow (reverted) |

---

## Next Steps

1. **Verify fix in production** - Test after Netlify redeploys
2. **Monitor for edge cases** - Some browsers may behave differently
3. **Consider mobile flow** - Redirect may be better for mobile users
4. **Add token refresh** - Currently tokens expire after 1 hour
5. **Add webhook for real-time sync** - Currently requires manual sync or polling
