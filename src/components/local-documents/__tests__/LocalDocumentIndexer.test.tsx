import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LocalDocumentIndexer } from '../LocalDocumentIndexer';
import { useLocalDocuments } from '../../../hooks/useLocalDocuments';

// Mock the hook
vi.mock('../../../hooks/useLocalDocuments');
const mockUseLocalDocuments = useLocalDocuments as ReturnType<typeof vi.fn>;

describe('LocalDocumentIndexer', () => {
  const mockHookReturn = {
    isSupported: true,
    isInitialized: false,
    isScanning: false,
    indexStats: null,
    lastScanResult: null,
    initialize: vi.fn().mockResolvedValue(undefined),
    requestFolderAccess: vi.fn().mockResolvedValue(undefined),
    searchLocal: vi.fn().mockResolvedValue([]),
    refreshIndex: vi.fn().mockResolvedValue(undefined),
    getDocumentContent: vi.fn().mockResolvedValue(''),
    getStats: vi.fn().mockResolvedValue(null)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocalDocuments.mockReturnValue(mockHookReturn);
  });

  test('shows unsupported message when File System API not available', () => {
    mockUseLocalDocuments.mockReturnValue({
      ...mockHookReturn,
      isSupported: false
    });

    render(<LocalDocumentIndexer />);
    expect(screen.getByText(/not supported/i)).toBeInTheDocument();
  });

  test('shows setup message when not initialized', () => {
    render(<LocalDocumentIndexer />);
    expect(screen.getByText(/set up local document indexing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add folder/i })).toBeInTheDocument();
  });

  test('requests folder access when button clicked', async () => {
    render(<LocalDocumentIndexer />);

    const addButton = screen.getByRole('button', { name: /add folder/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockHookReturn.requestFolderAccess).toHaveBeenCalled();
    });
  });

  test('shows stats when indexStats are available', () => {
    mockUseLocalDocuments.mockReturnValue({
      ...mockHookReturn,
      indexStats: {
        totalDocuments: 5,
        totalFolders: 2,
        lastFullScan: '2024-01-15T10:00:00.000Z',
        indexSizeBytes: 2048
      }
    });

    render(<LocalDocumentIndexer />);

    expect(screen.getByText('5 documents indexed')).toBeInTheDocument();
    expect(screen.getByText('2 folders monitored')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh index/i })).toBeInTheDocument();
  });

  test('shows loading state when scanning', () => {
    mockUseLocalDocuments.mockReturnValue({
      ...mockHookReturn,
      isScanning: true,
      indexStats: {
        totalDocuments: 5,
        totalFolders: 2,
        lastFullScan: '2024-01-15T10:00:00.000Z',
        indexSizeBytes: 2048
      }
    });

    render(<LocalDocumentIndexer />);

    expect(screen.getByText('Scanning...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add folder/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /scanning\.\.\./i })).toBeDisabled();
  });
});