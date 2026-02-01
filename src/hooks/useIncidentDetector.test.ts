import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useIncidentDetector } from './useIncidentDetector';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null }))
          }))
        })),
        insert: vi.fn(() => ({ data: [], error: null })),
        order: vi.fn(() => ({ data: [], error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => ({ data: { user: { id: 'test-user-id' } } }))
    }
  }
}));

describe('useIncidentDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect brute force attempts when 6+ failed logins from same IP', async () => {
    // Arrange: Mock 6 failed login attempts from same IP in last hour
    const mockFailedLogins = Array(6).fill(null).map((_, i) => ({
      id: `log-${i}`,
      user_id: 'test-user-id',
      action: 'LOGIN_FAILED',
      category: 'authentication',
      timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(), // 5 minutes apart
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0',
      additional_metadata: { reason: 'invalid_credentials' }
    }));

    const mockSupabaseFrom = vi.mocked(supabase.from);
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'compliance_audit_log') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({ data: mockFailedLogins, error: null }))
              }))
            }))
          }))
        } as any;
      }
      if (table === 'security_incidents') {
        return {
          insert: vi.fn(() => ({ data: [], error: null })),
          select: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null }))
          }))
        } as any;
      }
      return {} as any;
    });

    // Act
    const { result } = renderHook(() => useIncidentDetector());

    await waitFor(() => {
      expect(result.current.detectIncidents).toBeDefined();
    });

    await result.current.detectIncidents();

    // Assert: Should create a BRUTE_FORCE_ATTEMPT incident
    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalledWith('security_incidents');
    });

    const insertCall = mockSupabaseFrom.mock.calls.find(call => call[0] === 'security_incidents');
    expect(insertCall).toBeDefined();
  });

  it('should classify incident with HIGH severity for brute force', async () => {
    const mockFailedLogins = Array(7).fill(null).map((_, i) => ({
      id: `log-${i}`,
      action: 'LOGIN_FAILED',
      timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
      ip_address: '192.168.1.100'
    }));

    const mockInsert = vi.fn(() => ({ data: [], error: null }));
    const mockSupabaseFrom = vi.mocked(supabase.from);
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'compliance_audit_log') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({ data: mockFailedLogins, error: null }))
              }))
            }))
          }))
        } as any;
      }
      if (table === 'security_incidents') {
        return {
          insert: mockInsert,
          select: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null }))
          }))
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useIncidentDetector());
    await result.current.detectIncidents();

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'HIGH',
          ip_address: '192.168.1.100',
          status: 'ACTIVE'
        })
      );
    });
  });

  it('should not create incident for fewer than 6 failed attempts', async () => {
    const mockFailedLogins = Array(4).fill(null).map((_, i) => ({
      id: `log-${i}`,
      action: 'LOGIN_FAILED',
      timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
      ip_address: '192.168.1.100'
    }));

    const mockInsert = vi.fn(() => ({ data: [], error: null }));
    const mockSupabaseFrom = vi.mocked(supabase.from);
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'compliance_audit_log') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({ data: mockFailedLogins, error: null }))
              }))
            }))
          }))
        } as any;
      }
      if (table === 'security_incidents') {
        return {
          insert: mockInsert,
          select: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null }))
          }))
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useIncidentDetector());
    await result.current.detectIncidents();

    await waitFor(() => {
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  it('should get active incidents', async () => {
    const mockIncidents = [
      {
        id: 'incident-1',
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        status: 'ACTIVE',
        detected_at: new Date().toISOString()
      }
    ];

    const mockSupabaseFrom = vi.mocked(supabase.from);
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'security_incidents') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({ data: mockIncidents, error: null }))
          })),
          insert: vi.fn(() => ({ data: [], error: null }))
        } as any;
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({ data: [], error: null }))
            }))
          }))
        }))
      } as any;
    });

    const { result } = renderHook(() => useIncidentDetector());

    await waitFor(() => {
      expect(result.current.getActiveIncidents).toBeDefined();
    });

    await result.current.getActiveIncidents();

    await waitFor(() => {
      expect(result.current.activeIncidents).toHaveLength(1);
      expect(result.current.activeIncidents[0].type).toBe('BRUTE_FORCE_ATTEMPT');
    });
  });

  it('should resolve incident by ID', async () => {
    const mockUpdate = vi.fn(() => ({ data: [], error: null }));
    const mockSupabaseFrom = vi.mocked(supabase.from);
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'security_incidents') {
        return {
          update: mockUpdate,
          eq: vi.fn(() => ({ data: [], error: null })),
          select: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null }))
          })),
          insert: vi.fn(() => ({ data: [], error: null }))
        } as any;
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({ data: [], error: null }))
            }))
          }))
        }))
      } as any;
    });

    const { result } = renderHook(() => useIncidentDetector());

    await waitFor(() => {
      expect(result.current.resolveIncident).toBeDefined();
    });

    await result.current.resolveIncident('incident-123');

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'RESOLVED' });
    });
  });
});