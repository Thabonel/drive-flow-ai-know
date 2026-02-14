import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGoogleDrive } from './useGoogleDrive';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true } }),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

// Mock useGoogleOAuth hook since useGoogleDrive depends on it
const mockInitiateGoogleOAuth = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useGoogleOAuth', () => ({
  useGoogleOAuth: () => ({
    isAuthenticated: false,
    initiateGoogleOAuth: mockInitiateGoogleOAuth,
    checkConnection: vi.fn(),
    disconnect: vi.fn(),
    refreshAccessToken: vi.fn(),
  }),
}));


describe('useGoogleDrive OAuth Scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should request correct OAuth scopes including Google Sheets via initiateGoogleOAuth', async () => {
    const { result } = renderHook(() => useGoogleDrive());

    // Trigger the sign in process which will call initiateGoogleOAuth
    await result.current.signIn();

    // Verify that initiateGoogleOAuth was called with the correct scope
    expect(mockInitiateGoogleOAuth).toHaveBeenCalledWith(
      'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets'
    );
  });

  it('should include both Drive and Sheets scopes in the OAuth request', async () => {
    const { result } = renderHook(() => useGoogleDrive());

    await result.current.signIn();

    const initiateOAuthCall = mockInitiateGoogleOAuth.mock.calls[0][0];

    // Verify both scopes are present
    expect(initiateOAuthCall).toContain('https://www.googleapis.com/auth/drive.readonly');
    expect(initiateOAuthCall).toContain('https://www.googleapis.com/auth/spreadsheets');
  });

  it('should trigger OAuth flow for token exchange', async () => {
    const { result } = renderHook(() => useGoogleDrive());

    await result.current.signIn();

    // Verify that initiateGoogleOAuth was called (the OAuth flow is handled by useGoogleOAuth)
    expect(mockInitiateGoogleOAuth).toHaveBeenCalledWith(
      'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets'
    );
  });

  it('should maintain backward compatibility with existing Drive functionality', () => {
    const { result } = renderHook(() => useGoogleDrive());

    // Verify that all existing methods are still available
    expect(typeof result.current.isAuthenticated).toBe('boolean');
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.loadDriveItems).toBe('function');
    expect(typeof result.current.navigateToFolder).toBe('function');
    expect(typeof result.current.checkConnection).toBe('function');
  });
});
