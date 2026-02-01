import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataRightsPage from './DataRights';
import { BrowserRouter } from 'react-router-dom';

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

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }
      })
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null })
    }
  }
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false
  })
}));

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const DataRightsWrapper = () => (
  <BrowserRouter>
    <DataRightsPage />
  </BrowserRouter>
);

describe('Data Rights Portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('user can request data export from settings', async () => {
    render(<DataRightsWrapper />);

    // Should show data export section
    expect(screen.getByRole('heading', { name: /Export My Data/i })).toBeInTheDocument();

    // Should have export button
    const exportButton = screen.getByRole('button', { name: /Export My Data/i });
    expect(exportButton).toBeInTheDocument();

    // Click export button
    fireEvent.click(exportButton);

    // Should show confirmation or processing state - look for the alert with correct text
    expect(await screen.findByText(/Export requested! You will receive an email/i)).toBeInTheDocument();
  });

  test('user can request account deletion from settings', async () => {
    render(<DataRightsWrapper />);

    // Should show account deletion section
    expect(screen.getByRole('heading', { name: /Delete My Account/i })).toBeInTheDocument();

    // Should have delete button
    const deleteButton = screen.getByRole('button', { name: /Delete My Account/i });
    expect(deleteButton).toBeInTheDocument();

    // Click delete button should open confirmation dialog
    fireEvent.click(deleteButton);

    // Should show confirmation dialog
    expect(await screen.findByText(/Are you sure/i)).toBeInTheDocument();
    expect(screen.getByText(/DELETE_MY_ACCOUNT/i)).toBeInTheDocument();
  });

  test('account deletion requires confirmation input', async () => {
    render(<DataRightsWrapper />);

    const deleteButton = screen.getByRole('button', { name: /Delete My Account/i });
    fireEvent.click(deleteButton);

    // Should show confirmation input
    const confirmationInput = await screen.findByLabelText(/Type "DELETE_MY_ACCOUNT" to confirm/i);
    expect(confirmationInput).toBeInTheDocument();

    // Confirm button should be disabled initially
    const confirmDeleteButton = screen.getByRole('button', { name: /Confirm Deletion/i });
    expect(confirmDeleteButton).toHaveProperty('disabled', true);

    // Type correct confirmation
    fireEvent.change(confirmationInput, { target: { value: 'DELETE_MY_ACCOUNT' } });

    // Confirm button should now be enabled
    await waitFor(() => {
      expect(confirmDeleteButton).toHaveProperty('disabled', false);
    });
  });

  test('displays user data summary', async () => {
    render(<DataRightsWrapper />);

    // Should show data overview
    expect(screen.getByRole('heading', { name: /Your Data Overview/i })).toBeInTheDocument();

    // Should show data categories - use more specific selectors to avoid multiple matches
    expect(screen.getByText('Files you\'ve uploaded')).toBeInTheDocument();
    expect(screen.getByText('AI chat history')).toBeInTheDocument();
    expect(screen.getByText('Search queries')).toBeInTheDocument();
    expect(screen.getByText('Preferences & config')).toBeInTheDocument();
  });

  test('provides data correction options', async () => {
    render(<DataRightsWrapper />);

    // Should show data correction section
    expect(screen.getByRole('heading', { name: /Correct My Data/i })).toBeInTheDocument();

    // Should provide links to update various data types
    expect(screen.getByRole('link', { name: /Update Profile/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage Documents/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review Settings/i })).toBeInTheDocument();
  });

  test('shows privacy policy and legal information', async () => {
    render(<DataRightsWrapper />);

    // Should show legal information section
    expect(screen.getByRole('heading', { name: /Your Privacy Rights/i })).toBeInTheDocument();

    // Should have links to legal documents
    expect(screen.getByRole('link', { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Terms of Service/i })).toBeInTheDocument();
  });

  test('displays contact information for data protection officer', async () => {
    render(<DataRightsWrapper />);

    // Should show DPO contact section
    expect(screen.getByRole('heading', { name: /Data Protection Officer/i })).toBeInTheDocument();

    // Should show contact information
    expect(screen.getByText(/privacy@aiqueryhub.com/i)).toBeInTheDocument();
    expect(screen.getByText(/For privacy-related questions/i)).toBeInTheDocument();
  });

  test('export includes grace period information', async () => {
    render(<DataRightsWrapper />);

    // Should show export timeline information - text is split across elements with strong tags
    expect(screen.getByText('within 30 days')).toBeInTheDocument();
    expect(screen.getByText(/Data exports: up to 30 days/i)).toBeInTheDocument();
  });

  test('deletion shows grace period warning', async () => {
    render(<DataRightsWrapper />);

    const deleteButton = screen.getByRole('button', { name: /Delete My Account/i });
    fireEvent.click(deleteButton);

    // Check that the dialog appears with warning content
    expect(await screen.findByText('Confirm Account Deletion')).toBeInTheDocument();
    expect(screen.getByText(/permanent action/i)).toBeInTheDocument();
  });

  test('handles export request errors', async () => {
    // Mock failed export request
    const mockSupabase = await import('@/integrations/supabase/client');
    vi.mocked(mockSupabase.supabase.functions.invoke).mockRejectedValueOnce(
      new Error('Export service unavailable')
    );

    render(<DataRightsWrapper />);

    const exportButton = screen.getByRole('button', { name: /Export My Data/i });
    fireEvent.click(exportButton);

    // Should show error message
    expect(await screen.findByText(/Export failed/i)).toBeInTheDocument();
  });

  test('provides GDPR rights information', async () => {
    render(<DataRightsWrapper />);

    // Should explain GDPR rights - use more specific selectors to avoid multiple matches
    expect(screen.getByText('Obtain confirmation that we process your data and access to that data')).toBeInTheDocument();
    expect(screen.getByText('Correct inaccurate or incomplete personal data')).toBeInTheDocument();
    expect(screen.getByText('Request deletion of your personal data under certain circumstances')).toBeInTheDocument();
    expect(screen.getByText('Receive your data in a structured, machine-readable format')).toBeInTheDocument();
  });

  test('shows processing time expectations', async () => {
    render(<DataRightsWrapper />);

    // Should show processing timelines
    expect(screen.getByText(/Data exports: up to 30 days/i)).toBeInTheDocument();
    expect(screen.getByText(/Account deletion: immediate scheduling/i)).toBeInTheDocument();
    expect(screen.getByText(/Data corrections: immediate/i)).toBeInTheDocument();
  });
});