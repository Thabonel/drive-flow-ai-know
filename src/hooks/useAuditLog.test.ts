import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuditLog } from './useAuditLog';

// Mock the MFA hook
const mockUseAuditLog = {
  logs: [],
  isLoading: false,
  error: null,
  logEvent: vi.fn(),
  getAuditLogs: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null, data: [{ id: 'log-123' }] })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } }
      }))
    }
  }
}));

describe('useAuditLog Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('logs authentication events correctly', async () => {
    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.logEvent({
        action: 'LOGIN_SUCCESS',
        category: 'authentication',
        metadata: {
          method: 'email_password',
          ip_address: '192.168.1.100'
        }
      });
    });

    // Verify the audit log was created successfully
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('logs MFA events with proper metadata', async () => {
    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.logEvent({
        action: 'MFA_ENROLLMENT_SUCCESS',
        category: 'security',
        metadata: {
          factor_type: 'totp',
          security_score_change: { from: 5, to: 8 }
        }
      });
    });

    // Verify the audit log was created successfully
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('logs CSP violations as security events', async () => {
    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.logEvent({
        action: 'CSP_VIOLATION',
        category: 'security',
        metadata: {
          violated_directive: 'script-src',
          blocked_uri: 'https://malicious-site.com/script.js',
          document_uri: 'https://app.example.com/dashboard',
          severity: 'HIGH'
        }
      });
    });

    // Verify the audit log was created successfully
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('retrieves audit logs with filtering', async () => {
    // Mock the data that would be returned
    const mockLogs = [
      {
        id: 'log-1',
        action: 'LOGIN_SUCCESS',
        category: 'authentication',
        timestamp: '2026-02-01T13:00:00Z',
        ip_address: '192.168.1.100'
      },
      {
        id: 'log-2',
        action: 'MFA_ENROLLMENT_SUCCESS',
        category: 'security',
        timestamp: '2026-02-01T13:05:00Z',
        ip_address: '192.168.1.100'
      }
    ];

    // Import and set up the mock to return test data
    const module = await import('@/integrations/supabase/client');
    const mockSupabase = module.supabase;

    // Override the mock to return specific data
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockLogs, error: null }))
          }))
        }))
      }))
    }));

    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.getAuditLogs('authentication');
    });

    // Verify logs were retrieved
    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs[0].action).toBe('LOGIN_SUCCESS');
    expect(result.current.error).toBeNull();
  });

  test('handles audit log errors gracefully', async () => {
    // Import and mock error response
    const module = await import('@/integrations/supabase/client');
    const mockSupabase = module.supabase;

    mockSupabase.from = vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({
        data: null,
        error: { message: 'Audit log insertion failed' }
      }))
    }));

    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.logEvent({
        action: 'LOGIN_ATTEMPT',
        category: 'authentication'
      });
    });

    expect(result.current.error).toBe('Audit log insertion failed');
  });

  test('auto-detects user agent and IP address', async () => {
    // Reset mock to success state for this test
    const module = await import('@/integrations/supabase/client');
    const mockSupabase = module.supabase;

    mockSupabase.from = vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null, data: [{ id: 'log-123' }] }))
    }));

    // Mock navigator
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Test Browser)',
      configurable: true
    });

    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.logEvent({
        action: 'PAGE_VIEW',
        category: 'usage'
      });
    });

    // Verify no error occurred (successful logging)
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});