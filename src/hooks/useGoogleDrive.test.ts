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

// Mock Google Identity Services
const mockTokenClient = {
  requestAccessToken: vi.fn(),
};

const mockGoogle = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn().mockReturnValue(mockTokenClient),
    },
  },
};

Object.defineProperty(window, 'google', {
  value: mockGoogle,
  writable: true,
});

describe('useGoogleDrive OAuth Scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.google
    window.google = mockGoogle;
  });

  it('should request correct OAuth scopes including Google Sheets', () => {
    const { result } = renderHook(() => useGoogleDrive());

    // Trigger the sign in process which will call initTokenClient
    result.current.signIn();

    // Verify that initTokenClient was called with the correct scope
    expect(mockGoogle.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets',
        client_id: '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com',
      })
    );
  });

  it('should include both Drive and Sheets scopes in the OAuth request', () => {
    const { result } = renderHook(() => useGoogleDrive());

    result.current.signIn();

    const initTokenClientCall = mockGoogle.accounts.oauth2.initTokenClient.mock.calls[0][0];
    const scope = initTokenClientCall.scope;

    // Verify both scopes are present
    expect(scope).toContain('https://www.googleapis.com/auth/drive.readonly');
    expect(scope).toContain('https://www.googleapis.com/auth/spreadsheets');
  });

  it('should store tokens with the extended scope', async () => {
    const mockSupabase = await import('@/integrations/supabase/client');

    const { result } = renderHook(() => useGoogleDrive());

    // Simulate successful OAuth response
    const mockCallback = vi.fn();
    mockGoogle.accounts.oauth2.initTokenClient.mockImplementation((config) => {
      // Store the callback for later invocation
      mockCallback.mockImplementation(config.callback);
      return { requestAccessToken: mockCallback };
    });

    result.current.signIn();

    // Simulate successful token response
    const tokenResponse = {
      access_token: 'mock-access-token',
      expires_in: 3600,
    };

    await mockCallback(tokenResponse);

    // Verify that the token is stored with the correct scope
    expect(mockSupabase.supabase.functions.invoke).toHaveBeenCalledWith('store-google-tokens', {
      body: expect.objectContaining({
        access_token: 'mock-access-token',
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets',
      }),
    });
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