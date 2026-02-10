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

// Mock Google Identity Services - now using initCodeClient (authorization code flow)
const mockCodeClient = {
  requestCode: vi.fn(),
};

const mockGoogle = {
  accounts: {
    oauth2: {
      initCodeClient: vi.fn().mockReturnValue(mockCodeClient),
      // Keep initTokenClient mock for backward compatibility in case any code references it
      initTokenClient: vi.fn().mockReturnValue({ requestAccessToken: vi.fn() }),
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

  it('should request correct OAuth scopes including Google Sheets via initCodeClient', () => {
    const { result } = renderHook(() => useGoogleDrive());

    // Trigger the sign in process which will call initCodeClient
    result.current.signIn();

    // Verify that initCodeClient was called with the correct scope
    expect(mockGoogle.accounts.oauth2.initCodeClient).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets',
        client_id: '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com',
        ux_mode: 'popup',
      })
    );
  });

  it('should include both Drive and Sheets scopes in the OAuth request', () => {
    const { result } = renderHook(() => useGoogleDrive());

    result.current.signIn();

    const initCodeClientCall = mockGoogle.accounts.oauth2.initCodeClient.mock.calls[0][0];
    const scope = initCodeClientCall.scope;

    // Verify both scopes are present
    expect(scope).toContain('https://www.googleapis.com/auth/drive.readonly');
    expect(scope).toContain('https://www.googleapis.com/auth/spreadsheets');
  });

  it('should send authorization code to Edge Function for token exchange', async () => {
    const mockSupabase = await import('@/integrations/supabase/client');

    const { result } = renderHook(() => useGoogleDrive());

    // Simulate successful OAuth code response
    const mockCallback = vi.fn();
    mockGoogle.accounts.oauth2.initCodeClient.mockImplementation((config: any) => {
      // Store the callback for later invocation
      mockCallback.mockImplementation(config.callback);
      return { requestCode: mockCallback };
    });

    result.current.signIn();

    // Simulate successful authorization code response
    const codeResponse = {
      code: 'mock-authorization-code',
    };

    await mockCallback(codeResponse);

    // Verify that the authorization code is sent to the Edge Function
    expect(mockSupabase.supabase.functions.invoke).toHaveBeenCalledWith('store-google-tokens', {
      body: expect.objectContaining({
        code: 'mock-authorization-code',
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
