import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMFA } from './useMFA';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      mfa: {
        enroll: vi.fn(),
        unenroll: vi.fn(),
        verify: vi.fn(),
        challenge: vi.fn(),
        listFactors: vi.fn(),
      },
      getUser: vi.fn(),
      updateUser: vi.fn()
    }
  }
}));

describe('useMFA Hook', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked supabase client
    const module = await import('@/integrations/supabase/client');
    mockSupabase = module.supabase;
  });

  test('MFA enrollment increases security score', async () => {
    // Mock user without MFA initially
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: { security_score: 5 }
        }
      }
    });

    // Mock successful MFA enrollment
    mockSupabase.auth.mfa.enroll.mockResolvedValue({
      data: {
        id: 'factor-id-123',
        type: 'totp',
        totp: {
          qr_code: 'data:image/png;base64,mockqrcode',
          secret: 'mock-secret-key',
          uri: 'otpauth://totp/test@example.com?secret=mock-secret-key'
        }
      },
      error: null
    });

    // Mock updateUser
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });

    const { result } = renderHook(() => useMFA());

    // Enroll MFA
    await act(async () => {
      await result.current.enrollMFA();
    });

    // Wait for security score update
    await waitFor(() => {
      expect(result.current.securityScore).toBeGreaterThan(7);
      expect(result.current.mfaEnabled).toBe(true);
    });
  });

  test('returns MFA enrollment data when enrolling TOTP', async () => {
    // Mock successful TOTP enrollment with QR code
    mockSupabase.auth.mfa.enroll.mockResolvedValue({
      data: {
        id: 'factor-id-123',
        type: 'totp',
        totp: {
          qr_code: 'data:image/png;base64,mockqrcode',
          secret: 'JBSWY3DPEHPK3PXP',
          uri: 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=AI%20Query%20Hub'
        }
      },
      error: null
    });

    // Mock getUser and updateUser
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    });
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.enrollMFA();
    });

    expect(result.current.enrollmentData).toBeDefined();
    expect(result.current.enrollmentData?.qr_code).toContain('data:image/png');
    expect(result.current.enrollmentData?.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.current.enrollmentData?.uri).toContain('otpauth://totp/');
  });

  test('verifies MFA code correctly', async () => {
    // Mock challenge creation
    mockSupabase.auth.mfa.challenge.mockResolvedValue({
      data: { id: 'challenge-id-123' },
      error: null
    });

    // Mock successful verification
    mockSupabase.auth.mfa.verify.mockResolvedValue({
      data: { access_token: 'verified-token', user: { id: 'test-user-id' } },
      error: null
    });

    // Mock getUser and updateUser
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    });
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      const verificationResult = await result.current.verifyMFA('123456', 'factor-id-123');
      expect(verificationResult.success).toBe(true);
    });

    expect(mockSupabase.auth.mfa.verify).toHaveBeenCalledWith({
      factorId: 'factor-id-123',
      challengeId: 'challenge-id-123',
      code: '123456'
    });
  });

  test('handles MFA enrollment errors gracefully', async () => {
    // Mock enrollment error
    mockSupabase.auth.mfa.enroll.mockResolvedValue({
      data: null,
      error: { message: 'MFA enrollment failed' }
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.enrollMFA();
    });

    expect(result.current.error).toBe('MFA enrollment failed');
    expect(result.current.enrollmentData).toBeNull();
  });

  test('lists existing MFA factors', async () => {
    // Mock existing factors
    mockSupabase.auth.mfa.listFactors.mockResolvedValue({
      data: {
        all: [
          {
            id: 'factor-id-123',
            factor_type: 'totp',
            status: 'verified',
            created_at: '2026-02-01T12:00:00Z'
          }
        ]
      },
      error: null
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.listFactors();
    });

    expect(result.current.factors).toHaveLength(1);
    expect(result.current.factors[0].type).toBe('totp');
    expect(result.current.factors[0].status).toBe('verified');
  });
});