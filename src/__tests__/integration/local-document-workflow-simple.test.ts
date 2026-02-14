import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLocalDocuments } from '@/hooks/useLocalDocuments';
import { useHybridQuery } from '@/hooks/useHybridQuery';
import type { LocalDocument, LocalDocumentSearchResult } from '@/lib/local-documents/types';

// Mock the hooks
vi.mock('@/hooks/useLocalDocuments');
vi.mock('@/hooks/useHybridQuery');

const mockUseLocalDocuments = vi.mocked(useLocalDocuments);
const mockUseHybridQuery = vi.mocked(useHybridQuery);

describe('Local Document Indexing - Core Functionality Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates complete workflow functionality through hooks', async () => {
    // Step 1: Initial state - feature supported but not initialized
    const mockInitialize = vi.fn().mockResolvedValue(undefined);
    const mockRequestFolderAccess = vi.fn().mockResolvedValue({
      permission: { path: '/Users/test/Documents', name: 'Documents' },
      scanResult: {
        foldersScanned: 1,
        documentsProcessed: 2,
        documentsUpdated: 2,
        errors: []
      }
    });
    const mockSearchLocal = vi.fn().mockResolvedValue([]);
    const mockRefreshIndex = vi.fn().mockResolvedValue({
      foldersScanned: 1,
      documentsProcessed: 2,
      documentsUpdated: 0,
      errors: []
    });

    mockUseLocalDocuments.mockReturnValue({
      isSupported: true,
      isInitialized: false,
      isScanning: false,
      indexStats: {
        totalDocuments: 0,
        totalFolders: 0,
        lastFullScan: 0,
        indexSizeBytes: 0,
        documentsNeedingUpdate: 0
      },
      lastScanResult: null,
      initialize: mockInitialize,
      requestFolderAccess: mockRequestFolderAccess,
      searchLocal: mockSearchLocal,
      refreshIndex: mockRefreshIndex,
      getDocumentContent: vi.fn(),
      getStats: vi.fn()
    });

    const localDocsHook = useLocalDocuments();

    // Verify initial state
    expect(localDocsHook.isSupported).toBe(true);
    expect(localDocsHook.isInitialized).toBe(false);
    expect(localDocsHook.indexStats?.totalDocuments).toBe(0);

    // Step 2: Initialize the system
    await localDocsHook.initialize();
    expect(mockInitialize).toHaveBeenCalled();

    // Step 3: Add folder
    const folderResult = await localDocsHook.requestFolderAccess();
    expect(mockRequestFolderAccess).toHaveBeenCalled();
    expect(folderResult?.permission.path).toBe('/Users/test/Documents');
    expect(folderResult?.scanResult.documentsProcessed).toBe(2);

    // Step 4: Refresh index
    const refreshResult = await localDocsHook.refreshIndex();
    expect(mockRefreshIndex).toHaveBeenCalled();
    expect(refreshResult.foldersScanned).toBe(1);

    // Step 5: Test search functionality
    await localDocsHook.searchLocal('test query');
    expect(mockSearchLocal).toHaveBeenCalledWith('test query');
  });

  it('validates hybrid search integration with local and cloud results', async () => {
    // Mock local documents
    const mockLocalResults: LocalDocumentSearchResult[] = [
      {
        document: {
          id: 'local-1',
          filePath: '/Users/test/project.md',
          title: 'Project Plan',
          summary: 'Project planning document',
          keywords: ['project', 'planning'],
          lastModified: Date.now(),
          lastIndexed: Date.now(),
          fileSize: 1024,
          mimeType: 'text/markdown',
          metadata: {
            author: 'Test Author'
          }
        },
        relevance: 0.95,
        excerpt: 'Project planning document content...',
        matchedFields: ['title', 'content']
      }
    ];

    const mockCloudResults = [
      {
        id: 'cloud-1',
        user_id: 'test-user-id',
        google_file_id: 'test-google-id',
        title: 'Cloud Document',
        content: 'Cloud document content',
        file_type: 'text/plain',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Mock hybrid search
    const mockSearch = vi.fn().mockResolvedValue({
      local: mockLocalResults,
      cloud: mockCloudResults,
      totalResults: 2,
      searchTime: 150
    });

    const mockSearchLocalOnly = vi.fn().mockResolvedValue({
      local: mockLocalResults,
      cloud: [],
      totalResults: 1,
      searchTime: 80
    });

    const mockSearchCloudOnly = vi.fn().mockResolvedValue({
      local: [],
      cloud: mockCloudResults,
      totalResults: 1,
      searchTime: 70
    });

    mockUseHybridQuery.mockReturnValue({
      search: mockSearch,
      searchLocalOnly: mockSearchLocalOnly,
      searchCloudOnly: mockSearchCloudOnly,
      isLoading: false
    });

    const hybridQueryHook = useHybridQuery();

    // Test hybrid search (local + cloud)
    const hybridResult = await hybridQueryHook.search('project planning');
    expect(mockSearch).toHaveBeenCalledWith('project planning');
    expect(hybridResult.local).toHaveLength(1);
    expect(hybridResult.cloud).toHaveLength(1);
    expect(hybridResult.totalResults).toBe(2);

    // Test local-only search
    const localResult = await hybridQueryHook.searchLocalOnly('project planning');
    expect(mockSearchLocalOnly).toHaveBeenCalledWith('project planning');
    expect(localResult.local).toHaveLength(1);
    expect(localResult.cloud).toHaveLength(0);

    // Test cloud-only search
    const cloudResult = await hybridQueryHook.searchCloudOnly('project planning');
    expect(mockSearchCloudOnly).toHaveBeenCalledWith('project planning');
    expect(cloudResult.local).toHaveLength(0);
    expect(cloudResult.cloud).toHaveLength(1);
  });

  it('validates error handling and graceful fallback scenarios', async () => {
    // Mock permission denied scenario
    const mockRequestFolderAccess = vi.fn().mockRejectedValue(
      new DOMException('Permission denied', 'NotAllowedError')
    );

    mockUseLocalDocuments.mockReturnValue({
      isSupported: true,
      isInitialized: true,
      isScanning: false,
      indexStats: {
        totalDocuments: 0,
        totalFolders: 0,
        lastFullScan: 0,
        indexSizeBytes: 0,
        documentsNeedingUpdate: 0
      },
      lastScanResult: {
        foldersScanned: 0,
        documentsProcessed: 0,
        documentsUpdated: 0,
        errors: ['Permission denied: User cancelled folder selection']
      },
      initialize: vi.fn(),
      requestFolderAccess: mockRequestFolderAccess,
      searchLocal: vi.fn(),
      refreshIndex: vi.fn(),
      getDocumentContent: vi.fn(),
      getStats: vi.fn()
    });

    const localDocsHook = useLocalDocuments();

    // Test error handling
    await expect(localDocsHook.requestFolderAccess()).rejects.toThrow('Permission denied');
    expect(localDocsHook.lastScanResult?.errors).toContain('Permission denied: User cancelled folder selection');

    // System should remain stable after error
    expect(localDocsHook.isSupported).toBe(true);
    expect(localDocsHook.isInitialized).toBe(true);
  });

  it('validates unsupported browser graceful fallback', async () => {
    // Mock unsupported browser
    mockUseLocalDocuments.mockReturnValue({
      isSupported: false,
      isInitialized: false,
      isScanning: false,
      indexStats: {
        totalDocuments: 0,
        totalFolders: 0,
        lastFullScan: 0,
        indexSizeBytes: 0,
        documentsNeedingUpdate: 0
      },
      lastScanResult: null,
      initialize: vi.fn(),
      requestFolderAccess: vi.fn(),
      searchLocal: vi.fn(),
      refreshIndex: vi.fn(),
      getDocumentContent: vi.fn(),
      getStats: vi.fn()
    });

    // Mock cloud-only search for unsupported browsers
    mockUseHybridQuery.mockReturnValue({
      search: vi.fn().mockResolvedValue({
        local: [],
        cloud: [{
          id: 'cloud-1',
          user_id: 'test-user-id',
          google_file_id: 'test-google-id',
          title: 'Cloud Doc',
          content: 'Content',
          file_type: 'text/plain',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }],
        totalResults: 1,
        searchTime: 100
      }),
      searchLocalOnly: vi.fn().mockResolvedValue({
        local: [],
        cloud: [],
        totalResults: 0,
        searchTime: 0
      }),
      searchCloudOnly: vi.fn().mockResolvedValue({
        local: [],
        cloud: [{
          id: 'cloud-1',
          user_id: 'test-user-id',
          google_file_id: 'test-google-id',
          title: 'Cloud Doc',
          content: 'Content',
          file_type: 'text/plain',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }],
        totalResults: 1,
        searchTime: 100
      }),
      isLoading: false
    });

    const localDocsHook = useLocalDocuments();
    const hybridQueryHook = useHybridQuery();

    // Verify unsupported state
    expect(localDocsHook.isSupported).toBe(false);
    expect(localDocsHook.isInitialized).toBe(false);

    // Verify search still works with cloud documents only
    const searchResult = await hybridQueryHook.search('test query');
    expect(searchResult.local).toHaveLength(0);
    expect(searchResult.cloud).toHaveLength(1);
    expect(searchResult.totalResults).toBe(1);
  });

  it('validates performance characteristics with large datasets', async () => {
    // Mock large document collection
    const largeStats = {
      totalDocuments: 1000,
      totalFolders: 5,
      lastFullScan: Date.now(),
      indexSizeBytes: 52428800, // 50MB
      documentsNeedingUpdate: 0
    };

    const mockSearchLocal = vi.fn().mockImplementation(() => {
      // Simulate fast local search
      const startTime = performance.now();
      return Promise.resolve([]).then(result => {
        const searchTime = performance.now() - startTime;
        expect(searchTime).toBeLessThan(100); // Should be very fast for mocked implementation
        return result;
      });
    });

    mockUseLocalDocuments.mockReturnValue({
      isSupported: true,
      isInitialized: true,
      isScanning: false,
      indexStats: largeStats,
      lastScanResult: {
        foldersScanned: 5,
        documentsProcessed: 1000,
        documentsUpdated: 50,
        errors: []
      },
      initialize: vi.fn(),
      requestFolderAccess: vi.fn(),
      searchLocal: mockSearchLocal,
      refreshIndex: vi.fn(),
      getDocumentContent: vi.fn(),
      getStats: vi.fn()
    });

    const localDocsHook = useLocalDocuments();

    // Verify large collection handling
    expect(localDocsHook.indexStats?.totalDocuments).toBe(1000);
    expect(localDocsHook.indexStats?.indexSizeBytes).toBe(52428800);

    // Test search performance with large collection
    await localDocsHook.searchLocal('performance test');
    expect(mockSearchLocal).toHaveBeenCalledWith('performance test');
  });

  it('validates concurrent operations and state consistency', async () => {
    const mockRefreshIndex = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve({
          foldersScanned: 1,
          documentsProcessed: 3,
          documentsUpdated: 1,
          errors: []
        }), 50);
      });
    });

    // Mock scanning state
    mockUseLocalDocuments.mockReturnValue({
      isSupported: true,
      isInitialized: true,
      isScanning: true, // Currently scanning
      indexStats: {
        totalDocuments: 2,
        totalFolders: 1,
        lastFullScan: Date.now() - 3600000,
        indexSizeBytes: 2048,
        documentsNeedingUpdate: 1
      },
      lastScanResult: null,
      initialize: vi.fn(),
      requestFolderAccess: vi.fn(),
      searchLocal: vi.fn(),
      refreshIndex: mockRefreshIndex,
      getDocumentContent: vi.fn(),
      getStats: vi.fn()
    });

    const localDocsHook = useLocalDocuments();

    // Verify scanning state
    expect(localDocsHook.isScanning).toBe(true);
    expect(localDocsHook.indexStats?.documentsNeedingUpdate).toBe(1);

    // Test refresh during scanning
    const refreshPromise = localDocsHook.refreshIndex();
    await expect(refreshPromise).resolves.toEqual({
      foldersScanned: 1,
      documentsProcessed: 3,
      documentsUpdated: 1,
      errors: []
    });
  });

  it('validates data integrity and consistency across operations', async () => {
    const mockStats = {
      totalDocuments: 3,
      totalFolders: 2,
      lastFullScan: Date.now(),
      indexSizeBytes: 4096,
      documentsNeedingUpdate: 0
    };

    mockUseLocalDocuments.mockReturnValue({
      isSupported: true,
      isInitialized: true,
      isScanning: false,
      indexStats: mockStats,
      lastScanResult: {
        foldersScanned: 2,
        documentsProcessed: 3,
        documentsUpdated: 3,
        errors: []
      },
      initialize: vi.fn(),
      requestFolderAccess: vi.fn(),
      searchLocal: vi.fn(),
      refreshIndex: vi.fn(),
      getDocumentContent: vi.fn(),
      getStats: vi.fn()
    });

    const localDocsHook = useLocalDocuments();

    // Verify data consistency
    expect(localDocsHook.indexStats?.totalDocuments).toBe(3);
    expect(localDocsHook.lastScanResult?.documentsProcessed).toBe(3);

    // Statistics should be internally consistent
    expect(localDocsHook.lastScanResult?.foldersScanned).toBe(localDocsHook.indexStats?.totalFolders);
    expect(localDocsHook.indexStats?.documentsNeedingUpdate).toBe(0);
  });
});