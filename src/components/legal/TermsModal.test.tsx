import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TermsModal from './TermsModal';

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

describe('Terms of Service Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('new users must accept terms before accessing app', async () => {
    render(<TermsModal />);

    // Modal should be visible for new users
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument();

    // Should show acceptance button
    const acceptButton = screen.getByRole('button', { name: /I Accept/i });
    expect(acceptButton).toBeInTheDocument();

    // Accept button should be disabled initially (until scrolled)
    expect(acceptButton).toHaveProperty('disabled', true);
  });

  test('modal does not show for users who already accepted', () => {
    // Mock existing terms acceptance
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: 'v1',
        accepted: true,
        timestamp: new Date().toISOString()
      })
    );

    render(<TermsModal />);

    // Should not show modal
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('accept button enables after scrolling to bottom', async () => {
    render(<TermsModal />);

    const acceptButton = screen.getByRole('button', { name: /I Accept/i });
    const scrollContainer = screen.getByTestId('terms-content');

    // Initially disabled
    expect(acceptButton).toHaveProperty('disabled', true);

    // Simulate scrolling to bottom
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      value: 1000,
      writable: true
    });
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 900,
      writable: true
    });
    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 100,
      writable: true
    });

    fireEvent.scroll(scrollContainer);

    // Button should be enabled after scrolling
    await waitFor(() => {
      expect(acceptButton).toHaveProperty('disabled', false);
    });
  });

  test('accepting terms saves acceptance and closes modal', async () => {
    render(<TermsModal />);

    // Enable accept button by scrolling
    const acceptButton = screen.getByRole('button', { name: /I Accept/i });
    const scrollContainer = screen.getByTestId('terms-content');

    // Simulate scroll to bottom
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000 });
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 900 });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 100 });
    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      expect(acceptButton).toHaveProperty('disabled', false);
    });

    // Click accept
    fireEvent.click(acceptButton);

    // Should save acceptance to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'terms-acceptance-v1',
      expect.stringMatching(/accepted.*true/)
    );

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  test('modal is unescapable until terms accepted', () => {
    render(<TermsModal />);

    const modal = screen.getByRole('dialog');

    // Try to close with escape key
    fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape' });

    // Modal should still be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Should not have close button or click-outside to close
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  test('terms content covers required legal areas', () => {
    render(<TermsModal />);

    // Should cover key terms areas with headings
    expect(screen.getByRole('heading', { name: /Service Description/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /User Obligations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Limitation of Liability/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Termination/i })).toBeInTheDocument();
  });

  test('acceptance includes timestamp and version tracking', () => {
    render(<TermsModal />);

    // Enable and click accept
    const acceptButton = screen.getByRole('button', { name: /I Accept/i });
    const scrollContainer = screen.getByTestId('terms-content');

    // Simulate scroll
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000 });
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 900 });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 100 });
    fireEvent.scroll(scrollContainer);

    fireEvent.click(acceptButton);

    // Verify acceptance record structure
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'terms-acceptance-v1',
      expect.stringContaining('"timestamp"')
    );

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'terms-acceptance-v1',
      expect.stringContaining('"version":"v1"')
    );
  });
});