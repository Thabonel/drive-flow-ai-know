import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocalIndexingSettings } from '../LocalIndexingSettings';

// Mock the useLocalDocuments hook
const mockUseLocalDocuments = {
  isSupported: true,
  isInitialized: false,
  isScanning: false,
  indexStats: null,
  lastScanResult: null,
  initialize: vi.fn(),
  requestFolderAccess: vi.fn(),
  searchLocal: vi.fn(),
  refreshIndex: vi.fn(),
  getDocumentContent: vi.fn(),
  getStats: vi.fn(),
};

vi.mock('@/hooks/useLocalDocuments', () => ({
  useLocalDocuments: () => mockUseLocalDocuments
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('LocalIndexingSettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    Object.assign(mockUseLocalDocuments, {
      isSupported: true,
      isInitialized: false,
      isScanning: false,
      indexStats: null,
      lastScanResult: null,
    });
  });

  test('displays not supported message when File System API is not supported', () => {
    mockUseLocalDocuments.isSupported = false;

    render(<LocalIndexingSettings />);

    expect(screen.getByText(/Local document indexing is not supported/i)).toBeInTheDocument();
    expect(screen.getByText(/File System Access API is required/i)).toBeInTheDocument();
  });

  test('displays enable local indexing toggle when supported but not initialized', () => {
    mockUseLocalDocuments.isSupported = true;
    mockUseLocalDocuments.isInitialized = false;

    render(<LocalIndexingSettings />);

    expect(screen.getByText('Enable Local Indexing')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  test('displays stats when local indexing is initialized', async () => {
    mockUseLocalDocuments.isSupported = true;
    mockUseLocalDocuments.isInitialized = true;
    mockUseLocalDocuments.indexStats = {
      totalDocuments: 25,
      totalFolders: 3,
      lastFullScan: Date.now() - 3600000, // 1 hour ago
      indexSizeBytes: 1024000,
      documentsNeedingUpdate: 2
    };

    render(<LocalIndexingSettings />);

    // First enable local indexing to show stats
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // document count
      expect(screen.getByText('3')).toBeInTheDocument(); // folder count
      expect(screen.getByText('1000.0 KB')).toBeInTheDocument(); // index size (1024000 bytes = 1000KB)
      expect(screen.getByText(/1 hour ago/)).toBeInTheDocument(); // last scan
    });
  });

  test('enables local indexing when toggle is clicked', async () => {
    mockUseLocalDocuments.isSupported = true;
    mockUseLocalDocuments.isInitialized = false;
    mockUseLocalDocuments.initialize.mockResolvedValue(undefined);

    render(<LocalIndexingSettings />);

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockUseLocalDocuments.initialize).toHaveBeenCalled();
    });
  });

  test('disables local indexing when toggle is clicked on enabled state', async () => {
    mockUseLocalDocuments.isSupported = true;
    mockUseLocalDocuments.isInitialized = true;

    render(<LocalIndexingSettings />);

    const toggle = screen.getByRole('switch');

    // First enable it
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).toBeChecked();
    });

    // Then disable it
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });
  });

  test('shows Add Folder button when initialized', async () => {
    mockUseLocalDocuments.isSupported = true;
    mockUseLocalDocuments.isInitialized = true;
    mockUseLocalDocuments.indexStats = {
      totalDocuments: 0,
      totalFolders: 0,
      lastFullScan: 0,
      indexSizeBytes: 0,
      documentsNeedingUpdate: 0
    };

    render(<LocalIndexingSettings />);

    // First enable local indexing
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Folder/i })).toBeInTheDocument();
    });
  });

  test('shows Refresh Index button when initialized', async () => {
    mockUseLocalDocuments.isSupported = true;
    mockUseLocalDocuments.isInitialized = true;
    mockUseLocalDocuments.indexStats = {
      totalDocuments: 0,
      totalFolders: 0,
      lastFullScan: 0,
      indexSizeBytes: 0,
      documentsNeedingUpdate: 0
    };

    render(<LocalIndexingSettings />);

    // First enable local indexing
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refresh Index/i })).toBeInTheDocument();
    });
  });

  test('calls requestFolderAccess when Add Folder button is clicked', async () => {
    mockUseLocalDocuments.isSupported = true;
    mockUseLocalDocuments.isInitialized = true;
    mockUseLocalDocuments.indexStats = {
      totalDocuments: 0,
      totalFolders: 0,
      lastFullScan: 0,
      indexSizeBytes: 0,
      documentsNeedingUpdate: 0
    };
    mockUseLocalDocuments.requestFolderAccess.mockResolvedValue({
      permission: { id: 'test', path: '/test', enabled: true, grantedAt: '', lastAccessed: '' },
      scanResult: { foldersScanned: 1, documentsProcessed: 0, documentsUpdated: 0, errors: [] }
    });

    render(<LocalIndexingSettings />);

    // First enable local indexing
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(async () => {
      const addFolderButton = screen.getByRole('button', { name: /Add Folder/i });
      fireEvent.click(addFolderButton);

      await waitFor(() => {
        expect(mockUseLocalDocuments.requestFolderAccess).toHaveBeenCalled();
      });
    });
  });

  test('calls refreshIndex when Refresh Index button is clicked', async () => {
    mockUseLocalDocuments.isSupported = true;
    mockUseLocalDocuments.isInitialized = true;
    mockUseLocalDocuments.indexStats = {
      totalDocuments: 0,
      totalFolders: 0,
      lastFullScan: 0,
      indexSizeBytes: 0,
      documentsNeedingUpdate: 0
    };
    mockUseLocalDocuments.refreshIndex.mockResolvedValue({
      foldersScanned: 1,
      documentsProcessed: 5,
      documentsUpdated: 2,
      errors: []
    });

    render(<LocalIndexingSettings />);

    // First enable local indexing
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(async () => {
      const refreshButton = screen.getByRole('button', { name: /Refresh Index/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockUseLocalDocuments.refreshIndex).toHaveBeenCalled();
      });
    });
  });

  test('shows loading state when scanning', async () => {
    mockUseLocalDocuments.isSupported = true;
    mockUseLocalDocuments.isInitialized = true;
    mockUseLocalDocuments.isScanning = true;
    mockUseLocalDocuments.indexStats = {
      totalDocuments: 0,
      totalFolders: 0,
      lastFullScan: 0,
      indexSizeBytes: 0,
      documentsNeedingUpdate: 0
    };

    render(<LocalIndexingSettings />);

    // First enable local indexing
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText(/Scanning/i)).toBeInTheDocument();
    });
  });
});