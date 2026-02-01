import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrivacyPolicyWidget from './PrivacyPolicyWidget';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Privacy Policy Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('privacy policy loads and tracks consent', async () => {
    render(<PrivacyPolicyWidget />);

    // Privacy policy banner should be accessible
    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeDefined();

    // Should show accept all button
    const acceptButton = screen.getByRole('button', { name: /accept all/i });
    expect(acceptButton).toBeDefined();

    // Mock user accepting privacy policy
    fireEvent.click(acceptButton);

    // Should track consent in localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'privacy-consent-v1',
      expect.stringMatching(/accepted/)
    );
  });

  test('consent banner does not show when already accepted', () => {
    // Mock existing consent
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: 'v1',
        accepted: true,
        timestamp: new Date().toISOString()
      })
    );

    render(<PrivacyPolicyWidget />);

    // Should not show consent banner
    expect(screen.queryByText(/Accept Privacy Policy/i)).toBeNull();
  });

  test('consent includes required GDPR information', async () => {
    render(<PrivacyPolicyWidget />);

    // Should contain consent banner with privacy information
    expect(screen.getByText(/we use cookies and collect data/i)).toBeDefined();

    // Should have link to full privacy policy
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });
    expect(privacyLink).toBeDefined();
    expect(privacyLink.getAttribute('href')).toBe('/privacy');
  });

  test('consent banner shows granular cookie controls', () => {
    render(<PrivacyPolicyWidget />);

    // Should show customize button first
    const customizeButton = screen.getByRole('button', { name: /customize/i });
    expect(customizeButton).toBeDefined();

    // Click customize to show granular controls
    fireEvent.click(customizeButton);

    // Should show different types of cookies/consent
    expect(screen.getByText(/Essential/i)).toBeDefined();
    expect(screen.getByText(/Analytics/i)).toBeDefined();

    // Should have individual toggle controls
    const essentialToggle = screen.getByLabelText(/essential cookies/i);
    const analyticsToggle = screen.getByLabelText(/analytics cookies/i);

    expect(essentialToggle).toBeDefined();
    expect(analyticsToggle).toBeDefined();

    // Essential should be disabled (required)
    expect(essentialToggle).toHaveProperty('disabled', true);
  });

  test('consent records include timestamp and version', () => {
    render(<PrivacyPolicyWidget />);

    const acceptButton = screen.getByRole('button', { name: /accept all/i });
    fireEvent.click(acceptButton);

    // Verify consent record structure
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'privacy-consent-v1',
      expect.stringContaining('"timestamp"')
    );

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'privacy-consent-v1',
      expect.stringContaining('"version":"v1"')
    );
  });

  test('privacy policy content covers required areas', () => {
    render(<PrivacyPolicyWidget showFullPolicy={true} />);

    // Should cover key privacy areas with headings
    expect(screen.getByRole('heading', { name: /data collection/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /cookies/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /third-party services/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /your rights/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /contact/i })).toBeDefined();
  });

  test('consent can be withdrawn', () => {
    // Mock existing consent
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: 'v1',
        accepted: true,
        essential: true,
        analytics: true,
        timestamp: new Date().toISOString()
      })
    );

    render(<PrivacyPolicyWidget />);

    // Should show manage preferences option
    const manageButton = screen.getByRole('button', { name: /manage preferences/i });
    fireEvent.click(manageButton);

    // Should show withdraw consent option
    const withdrawButton = screen.getByRole('button', { name: /withdraw consent/i });
    fireEvent.click(withdrawButton);

    // Should clear consent from localStorage
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('privacy-consent-v1');
  });
});