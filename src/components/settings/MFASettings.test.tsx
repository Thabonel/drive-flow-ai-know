import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MFASettings } from './MFASettings';

// Mock the MFA hook
const mockUseMFA = {
  enrollmentData: null,
  factors: [],
  securityScore: 5,
  mfaEnabled: false,
  isLoading: false,
  error: null,
  enrollMFA: vi.fn(),
  verifyMFA: vi.fn(),
  listFactors: vi.fn(),
  unenrollMFA: vi.fn(),
};

vi.mock('@/hooks/useMFA', () => ({
  useMFA: () => mockUseMFA
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('MFASettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    Object.assign(mockUseMFA, {
      enrollmentData: null,
      factors: [],
      securityScore: 5,
      mfaEnabled: false,
      isLoading: false,
      error: null
    });
  });

  test('displays current security score', async () => {
    mockUseMFA.securityScore = 7;
    mockUseMFA.mfaEnabled = true;

    render(<MFASettings />);

    expect(screen.getByText('Security Score:')).toBeInTheDocument();
    expect(screen.getByText('7/10')).toBeInTheDocument();
    expect(screen.getByText(/MFA Enabled/i)).toBeInTheDocument();
  });

  test('shows enroll MFA button when not enabled', async () => {
    mockUseMFA.mfaEnabled = false;

    render(<MFASettings />);

    expect(screen.getByRole('button', { name: /Enable MFA/i })).toBeInTheDocument();
    expect(screen.queryByText(/MFA is currently enabled/i)).not.toBeInTheDocument();
  });

  test('enrolling MFA shows QR code when successful', async () => {
    mockUseMFA.enrollMFA.mockImplementation(() => {
      // Simulate successful enrollment
      mockUseMFA.enrollmentData = {
        qr_code: 'data:image/png;base64,mockqrcode',
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP'
      };
    });

    render(<MFASettings />);

    const enrollButton = screen.getByRole('button', { name: /Enable MFA/i });
    fireEvent.click(enrollButton);

    await waitFor(() => {
      expect(mockUseMFA.enrollMFA).toHaveBeenCalled();
    });

    // Re-render with enrollment data
    mockUseMFA.enrollmentData = {
      qr_code: 'data:image/png;base64,mockqrcode',
      secret: 'JBSWY3DPEHPK3PXP',
      uri: 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP'
    };

    render(<MFASettings />);

    expect(screen.getByText(/Scan this QR code/i)).toBeInTheDocument();
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
  });

  test('shows verification code input during MFA setup', async () => {
    mockUseMFA.enrollmentData = {
      qr_code: 'data:image/png;base64,mockqrcode',
      secret: 'JBSWY3DPEHPK3PXP',
      uri: 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP'
    };

    render(<MFASettings />);

    expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify Code/i })).toBeInTheDocument();
  });

  test('verifies MFA code and completes setup', async () => {
    mockUseMFA.enrollmentData = {
      qr_code: 'data:image/png;base64,mockqrcode',
      secret: 'JBSWY3DPEHPK3PXP',
      uri: 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP'
    };

    mockUseMFA.verifyMFA.mockResolvedValue({ success: true });

    render(<MFASettings />);

    const codeInput = screen.getByLabelText(/Verification Code/i);
    const verifyButton = screen.getByRole('button', { name: /Verify Code/i });

    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockUseMFA.verifyMFA).toHaveBeenCalledWith('123456', expect.any(String));
    });
  });

  test('displays error message when MFA enrollment fails', async () => {
    mockUseMFA.error = 'MFA enrollment failed';

    render(<MFASettings />);

    expect(screen.getByText('MFA enrollment failed')).toBeInTheDocument();
  });

  test('shows existing MFA factors when enabled', async () => {
    mockUseMFA.mfaEnabled = true;
    mockUseMFA.factors = [
      {
        id: 'factor-id-123',
        type: 'totp',
        status: 'verified',
        created_at: '2026-02-01T12:00:00Z'
      }
    ];

    render(<MFASettings />);

    expect(screen.getByText(/MFA is currently enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/TOTP \(Time-based\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified/i)).toBeInTheDocument();
  });

  test('allows disabling MFA when enabled', async () => {
    mockUseMFA.mfaEnabled = true;
    mockUseMFA.factors = [
      {
        id: 'factor-id-123',
        type: 'totp',
        status: 'verified',
        created_at: '2026-02-01T12:00:00Z'
      }
    ];

    render(<MFASettings />);

    const disableButton = screen.getByRole('button', { name: /Disable MFA/i });
    fireEvent.click(disableButton);

    await waitFor(() => {
      expect(mockUseMFA.unenrollMFA).toHaveBeenCalledWith('factor-id-123');
    });
  });
});