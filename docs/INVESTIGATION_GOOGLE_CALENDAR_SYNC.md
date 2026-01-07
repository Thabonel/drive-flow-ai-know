# Investigation Report: Google Calendar Sync

**Date:** 2026-01-08
**Status:** RESOLVED & WORKING
**Original Symptom:** "Connected successfully but initial sync failed"

---

## Current Status

**Google Calendar sync is now fully functional:**
- OAuth connects successfully
- Primary calendar events sync to timeline
- 42+ items imported and displaying correctly
- All race conditions fixed

---

## Known Limitation: Single Calendar Only

**External calendar events (like TANDA employer app) don't sync.**

### Why
- TANDA events appear on a **separate subscribed calendar** in Google Calendar
- Each calendar has a different ID (e.g., `tanda.employer.com#calendar@group.v.calendar.google.com`)
- App currently syncs **one calendar at a time** (primary by default)

### Workaround
User can manually select TANDA calendar in Calendar Settings, but loses personal calendar events.

### Future Enhancement: Multi-Calendar Support

**Estimated effort: 3-4 hours**

Changes required:
1. **Database**: Change `selected_calendar_id` TEXT → `selected_calendar_ids` TEXT[]
2. **UI**: Replace single Select with multi-select checkbox component
3. **Hook**: Update `useGoogleCalendar.ts` to handle array of calendar IDs
4. **Edge Function**: Loop through all selected calendars when syncing

**Decision**: Not implementing now - documented for future reference.

---

## Executive Summary (Original Investigation)

Three parallel investigation agents analyzed the Google Calendar sync failure. **Two critical race conditions** were identified that cause the sync to fail despite successful OAuth connection.

---

## Root Cause Analysis

### The Failure Chain

```
1. User clicks "Connect Calendar"
2. OAuth popup opens → user authenticates → access_token returned ✓
3. Token set in GAPI client memory (line 232) ✓
4. storeTokens() called to save token to database
   └─► IF FAILS: Error caught, toast shown, BUT execution continues ✗
5. loadCalendars() called - succeeds using in-memory GAPI token ✓
6. upsert to calendar_sync_settings - async, no confirmation waited
7. Edge Function invoked IMMEDIATELY (may execute before upsert completes)
8. Edge Function queries calendar_sync_settings → NO ROW FOUND ✗
9. Edge Function queries user_google_tokens → MAY NOT EXIST ✗
10. Sync fails with 500 error
```

---

## Critical Issues Identified

### Issue #1: Silent Token Storage Failure (CRITICAL)

**File:** `src/hooks/useGoogleCalendar.ts` lines 40-68

The `storeTokens()` function catches errors and shows a toast, but **execution continues**:

```typescript
catch (error) {
  console.error('Error storing tokens:', error);
  toast({
    title: 'Error',
    description: 'Failed to store authentication tokens securely',
    variant: 'destructive',
  });
  // NO re-throw - execution continues to loadCalendars()
}
```

**Impact:** User sees "Connected Successfully!" even though token never reached the database. The Edge Function then fails to find the token.

---

### Issue #2: Race Condition on Sync Settings (CRITICAL)

**File:** `src/hooks/useGoogleCalendar.ts` lines 265-289

Frontend upserts sync settings but doesn't wait for confirmation:

```typescript
// Upsert happens...
await supabase
  .from('calendar_sync_settings')
  .upsert({ ... });  // No .select() to confirm

// Immediately invokes sync (may execute before upsert completes)
const { data: syncResult, error: syncError } = await supabase.functions.invoke('google-calendar-sync', {
  body: { sync_type: 'initial', calendar_id: primaryCalendar.id }
});
```

**Impact:** Edge Function queries `calendar_sync_settings` and finds no row because the upsert hasn't completed yet.

---

### Issue #3: GAPI Script Loading Race Condition (HIGH)

**File:** `src/hooks/useGoogleCalendar.ts` lines 98-112

GIS (OAuth) and GAPI (Calendar API) are separate libraries loaded in parallel:

```typescript
await Promise.all([
  loadScript('https://accounts.google.com/gsi/client'),    // GIS
  loadScript('https://apis.google.com/js/api.js')          // GAPI
]);
```

They don't synchronize readiness. If GAPI loads before GIS completes, `window.gapi.client.calendar` may not be available.

---

### Issue #4: Generic Error Messages (HIGH)

**File:** `supabase/functions/google-calendar-sync/index.ts` lines 391-397

All errors return generic 500 with no context:

```typescript
return new Response(
  JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
  { status: 500, ... }
);
```

**Impact:** User can't distinguish between settings missing, token missing, or API failure.

---

### Issue #5: Sync Log False Positives (MEDIUM)

**File:** `supabase/functions/google-calendar-sync/index.ts` line 119

Log created with `status: 'success'` before any work is done:

```typescript
const { data: logEntry } = await supabaseClient
  .from('calendar_sync_log')
  .insert({
    user_id,
    sync_type,
    status: 'success', // Created as success immediately
  })
```

---

## Recommended Fixes

### Fix #1: Make Token Storage Failure Fatal

```typescript
// Change storeTokens to return success/failure
const storeTokens = useCallback(async (tokenResponse: any): Promise<boolean> => {
  if (!user) return false;

  try {
    const { error } = await supabase.functions.invoke('store-google-tokens', {
      body: { access_token: tokenResponse.access_token, ... }
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error storing tokens:', error);
    toast({ title: 'Error', description: 'Failed to store tokens', variant: 'destructive' });
    return false;
  }
}, [user, toast]);

// In connectCalendar callback:
const tokenStored = await storeTokens(response);
if (!tokenStored) {
  setIsConnecting(false);
  return;  // STOP - don't proceed
}
```

### Fix #2: Wait for Sync Settings Confirmation

```typescript
const { data: upsertResult, error: upsertError } = await supabase
  .from('calendar_sync_settings')
  .upsert({
    user_id: user?.id,
    enabled: true,
    selected_calendar_id: primaryCalendar.id,
    sync_direction: 'both',
    auto_sync_enabled: true,
    sync_interval_minutes: 15,
  })
  .select()   // ADD THIS
  .single();  // ADD THIS

if (upsertError || !upsertResult) {
  throw new Error('Failed to save sync settings');
}

// NOW safe to invoke sync
```

### Fix #3: Add Retry Logic to Edge Function

```typescript
let syncSettings = null;
let retries = 0;
const maxRetries = 3;

while (!syncSettings && retries < maxRetries) {
  const { data } = await supabaseClient
    .from('calendar_sync_settings')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle();

  if (data) {
    syncSettings = data;
    break;
  }

  retries++;
  if (retries < maxRetries) {
    await new Promise(r => setTimeout(r, 500)); // Wait 500ms
  }
}
```

### Fix #4: Verify Token Before Proceeding

```typescript
// After storeTokens, verify it's actually in database:
const { data: storedToken } = await supabase
  .from('user_google_tokens')
  .select('access_token')
  .eq('user_id', user!.id)
  .maybeSingle();

if (!storedToken?.access_token) {
  throw new Error('Token storage verification failed');
}
```

### Fix #5: Initialize Sync Log as Pending

```typescript
const { data: logEntry } = await supabaseClient
  .from('calendar_sync_log')
  .insert({
    user_id,
    sync_type,
    status: 'pending',  // Changed from 'success'
  })
```

---

## Files Requiring Changes

| File | Changes Required |
|------|------------------|
| `src/hooks/useGoogleCalendar.ts` | Fix #1, #2, #4 - Make failures fatal, confirm upsert |
| `supabase/functions/google-calendar-sync/index.ts` | Fix #3, #5 - Add retry, fix log status |

---

## Verification Steps (Post-Fix)

1. Disconnect Google Calendar if connected
2. Click "Connect Google Calendar"
3. Complete OAuth flow
4. Check database: `SELECT * FROM user_google_tokens WHERE user_id = '...'`
5. Check database: `SELECT * FROM calendar_sync_settings WHERE user_id = '...'`
6. Verify toast shows "Calendar Synced!" with event count
7. Open Calendar Settings - should NOT crash
8. Click "Sync Now" - should work

---

## Investigation Agents

| Agent | Focus | Status |
|-------|-------|--------|
| Agent 1 | OAuth Callback Flow (`useGoogleCalendar.ts`) | Complete |
| Agent 2 | Edge Function (`google-calendar-sync/index.ts`) | Complete |
| Agent 3 | Database/RLS Policies | Interrupted |

---

## Conclusion

The sync failure is caused by **race conditions** where async operations (token storage, settings upsert) are not properly awaited before subsequent operations depend on them. The fixes involve:

1. Making token storage failure **fatal** (stop execution)
2. **Confirming** database writes before proceeding
3. Adding **retry logic** for transient timing issues
4. **Verifying** critical data exists before dependent operations

---

## Fixes Applied

All issues have been resolved. Here are the commits:

| Commit | Description |
|--------|-------------|
| `7a38553` | fix: Properly initialize GAPI Calendar client before sync |
| `42a0952` | fix: Eliminate race conditions in Google Calendar sync |
| `7550531` | fix: Use correct OAuth scope for Google Calendar API |
| `c948a73` | fix: Assign synced calendar items to VISIBLE layers |

### Key Changes Made

1. **OAuth Scope Fixed** (`useGoogleCalendar.ts:211`)
   - Changed from `calendar.events` to `calendar` (full access)
   - Enables `calendarList.list()` API call to work

2. **Token Storage Made Fatal** (`useGoogleCalendar.ts:39-73`)
   - `storeTokens()` now returns boolean
   - Connection aborts if token storage fails

3. **Sync Settings Confirmed** (`useGoogleCalendar.ts:282-294`)
   - Added `.select().single()` to upsert
   - Verifies write completes before calling Edge Function

4. **Visible Layers Only** (`useGoogleCalendar.ts:268-278`, `google-calendar-sync/index.ts:214-233`)
   - Synced items assigned to first VISIBLE layer
   - Events skipped if no visible layer exists
   - Timeline now displays all synced items correctly
