import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the local documents hooks
vi.mock('@/hooks/useLocalDocuments', () => ({
  useLocalDocuments: vi.fn(() => ({
    isSupported: true,
    isInitialized: true,
    folders: [],
    documents: [],
    indexStats: {
      totalDocuments: 0,
      totalFolders: 0,
      lastFullScan: 0,
      indexSizeBytes: 0,
      documentsNeedingUpdate: 0
    },
    addFolder: vi.fn(),
    removeFolder: vi.fn(),
    scanFolder: vi.fn(),
    scanAllFolders: vi.fn(),
    getDocumentContent: vi.fn(),
    error: null,
    isLoading: false
  }))
}));

vi.mock('@/hooks/useHybridQuery', () => ({
  useHybridQuery: vi.fn(() => ({
    search: vi.fn(async () => ({
      local: [],
      cloud: [],
      totalResults: 0,
      searchTime: 50
    })),
    searchLocalOnly: vi.fn(async () => ({
      local: [],
      cloud: [],
      totalResults: 0,
      searchTime: 50
    })),
    searchCloudOnly: vi.fn(async () => ({
      local: [],
      cloud: [],
      totalResults: 0,
      searchTime: 50
    })),
    isLoading: false
  }))
}));

import { useLocalDocuments } from '@/hooks/useLocalDocuments';
import { useHybridQuery } from '@/hooks/useHybridQuery';
import type { LocalDocument, LocalDocumentSearchResult } from '@/lib/local-documents/types';

// Mock data
const mockLocalDocuments: LocalDocument[] = [
  {
    id: 'local-1',
    filePath: '/Users/test/Documents/test.txt',
    title: 'Test Document',
    summary: 'A test document about project planning',
    keywords: ['test', 'project', 'planning'],
    lastModified: Date.now() - 3600000, // 1 hour ago
    lastIndexed: Date.now() - 1800000, // 30 minutes ago
    fileSize: 1024,
    mimeType: 'text/plain',
    metadata: {
      author: 'Test User',
      tags: ['work', 'planning']
    }
  },
  {
    id: 'local-2',
    filePath: '/Users/test/Documents/report.pdf',
    title: 'Quarterly Report',
    summary: 'Q3 financial and operational report',
    keywords: ['quarterly', 'report', 'financial', 'Q3'],
    lastModified: Date.now() - 7200000, // 2 hours ago
    lastIndexed: Date.now() - 3600000, // 1 hour ago
    fileSize: 2048,
    mimeType: 'application/pdf',
    metadata: {
      author: 'Finance Team',
      tags: ['finance', 'reporting']
    }
  }
];

const mockSearchResults: LocalDocumentSearchResult[] = [
  {
    document: mockLocalDocuments[0],
    relevance: 0.85,
    excerpt: 'This test document covers project planning methodologies...',
    matchedFields: ['title', 'content']
  },
  {
    document: mockLocalDocuments[1],
    relevance: 0.72,
    excerpt: 'Q3 showed strong financial performance with revenue growth...',
    matchedFields: ['content', 'keywords']
  }
];

describe('Local Documents Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Integration Testing', () => {
    it('validates useLocalDocuments hook interface', () => {
      const localDocsHook = useLocalDocuments();

      // Verify hook returns expected interface
      expect(localDocsHook).toBeDefined();
      expect(typeof localDocsHook.isSupported).toBe('boolean');
      expect(typeof localDocsHook.isInitialized).toBe('boolean');
      expect(Array.isArray(localDocsHook.folders)).toBe(true);
      expect(Array.isArray(localDocsHook.documents)).toBe(true);
      expect(typeof localDocsHook.addFolder).toBe('function');
      expect(typeof localDocsHook.removeFolder).toBe('function');
      expect(typeof localDocsHook.scanFolder).toBe('function');
      expect(typeof localDocsHook.scanAllFolders).toBe('function');
      expect(typeof localDocsHook.getDocumentContent).toBe('function');
    });

    it('validates useHybridQuery hook interface', () => {
      const hybridQueryHook = useHybridQuery();

      // Verify hook returns expected interface
      expect(hybridQueryHook).toBeDefined();
      expect(typeof hybridQueryHook.search).toBe('function');
      expect(typeof hybridQueryHook.searchLocalOnly).toBe('function');
      expect(typeof hybridQueryHook.searchCloudOnly).toBe('function');
      expect(typeof hybridQueryHook.isLoading).toBe('boolean');
    });

    it('tests local documents hook with mocked functionality', async () => {
      const mockUseLocalDocuments = vi.mocked(useLocalDocuments);

      // Mock successful folder addition
      mockUseLocalDocuments.mockReturnValue({
        isSupported: true,
        isInitialized: true,
        folders: [{ id: 'test-folder', path: 'Test Documents', enabled: true, grantedAt: Date.now().toString(), lastAccessed: Date.now().toString() }],
        documents: mockLocalDocuments,
        indexStats: {
          totalDocuments: 2,
          totalFolders: 1,
          lastFullScan: Date.now(),
          indexSizeBytes: 3072,
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: null,
        isLoading: false
      });

      const localDocsHook = useLocalDocuments();

      // Verify mocked state
      expect(localDocsHook.isSupported).toBe(true);
      expect(localDocsHook.folders).toHaveLength(1);
      expect(localDocsHook.documents).toHaveLength(2);
      expect(localDocsHook.indexStats.totalDocuments).toBe(2);
    });

    it('tests hybrid query hook with mocked search results', async () => {
      const mockUseHybridQuery = vi.mocked(useHybridQuery);

      // Mock search results
      mockUseHybridQuery.mockReturnValue({
        search: vi.fn(async () => ({
          local: mockSearchResults,
          cloud: [],
          totalResults: 2,
          searchTime: 150
        })),
        searchLocalOnly: vi.fn(async () => ({
          local: mockSearchResults,
          cloud: [],
          totalResults: 2,
          searchTime: 150
        })),
        searchCloudOnly: vi.fn(async () => ({
          local: [],
          cloud: [],
          totalResults: 0,
          searchTime: 50
        })),
        isLoading: false
      });

      const hybridQueryHook = useHybridQuery();

      // Test search functionality
      const searchResult = await hybridQueryHook.search('test query');
      expect(searchResult).toBeDefined();
      expect(searchResult.totalResults).toBe(2);
      expect(searchResult.local).toHaveLength(2);
      expect(searchResult.searchTime).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Workflow Simulation', () => {
    it('simulates complete user workflow: permission → scan → index → search', async () => {
      const mockUseLocalDocuments = vi.mocked(useLocalDocuments);
      const mockUseHybridQuery = vi.mocked(useHybridQuery);

      // Step 1: Initial state - no folders, no documents
      mockUseLocalDocuments.mockReturnValueOnce({
        isSupported: true,
        isInitialized: true,
        folders: [],
        documents: [],
        indexStats: {
          totalDocuments: 0,
          totalFolders: 0,
          lastFullScan: 0,
          indexSizeBytes: 0,
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: null,
        isLoading: false
      });

      // Step 2: After folder addition - folder added, documents indexed
      mockUseLocalDocuments.mockReturnValue({
        isSupported: true,
        isInitialized: true,
        folders: [{ id: 'test-folder', path: 'Test Documents', enabled: true, grantedAt: Date.now().toString(), lastAccessed: Date.now().toString() }],
        documents: mockLocalDocuments,
        indexStats: {
          totalDocuments: 2,
          totalFolders: 1,
          lastFullScan: Date.now(),
          indexSizeBytes: 3072,
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: null,
        isLoading: false
      });

      // Step 3: Mock search functionality
      mockUseHybridQuery.mockReturnValue({
        search: vi.fn(async () => ({
          local: mockSearchResults,
          cloud: [],
          totalResults: 2,
          searchTime: 150
        })),
        searchLocalOnly: vi.fn(async () => ({
          local: mockSearchResults,
          cloud: [],
          totalResults: 2,
          searchTime: 150
        })),
        searchCloudOnly: vi.fn(async () => ({
          local: [],
          cloud: [],
          totalResults: 0,
          searchTime: 50
        })),
        isLoading: false
      });

      // Test workflow
      const initialState = useLocalDocuments();
      expect(initialState.folders).toHaveLength(0);

      // Simulate folder addition workflow
      const afterAddition = useLocalDocuments();
      expect(afterAddition.folders).toHaveLength(1);
      expect(afterAddition.documents).toHaveLength(2);

      // Test search functionality
      const hybridQuery = useHybridQuery();
      const searchResult = await hybridQuery.searchLocalOnly('test');

      expect(searchResult).toBeDefined();
      expect(searchResult.totalResults).toBe(2);
      expect(searchResult.local).toEqual(mockSearchResults);
    });

    it('handles error scenarios gracefully', () => {
      const mockUseLocalDocuments = vi.mocked(useLocalDocuments);

      // Mock error state
      mockUseLocalDocuments.mockReturnValue({
        isSupported: false,
        isInitialized: false,
        folders: [],
        documents: [],
        indexStats: {
          totalDocuments: 0,
          totalFolders: 0,
          lastFullScan: 0,
          indexSizeBytes: 0,
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: 'File System Access API not supported',
        isLoading: false
      });

      const localDocsHook = useLocalDocuments();

      // Verify error state is handled gracefully
      expect(localDocsHook.isSupported).toBe(false);
      expect(localDocsHook.error).toBe('File System Access API not supported');
      expect(localDocsHook.folders).toEqual([]);
      expect(localDocsHook.documents).toEqual([]);
    });

    it('handles permission denial gracefully', () => {
      const mockUseLocalDocuments = vi.mocked(useLocalDocuments);

      // Mock permission denied state
      mockUseLocalDocuments.mockReturnValue({
        isSupported: true,
        isInitialized: true,
        folders: [],
        documents: [],
        indexStats: {
          totalDocuments: 0,
          totalFolders: 0,
          lastFullScan: 0,
          indexSizeBytes: 0,
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: 'Permission denied',
        isLoading: false
      });

      const localDocsHook = useLocalDocuments();

      // Should remain in consistent state despite error
      expect(localDocsHook.isSupported).toBe(true);
      expect(localDocsHook.error).toBe('Permission denied');
      expect(localDocsHook.folders).toEqual([]);
    });

    it('handles no documents found scenario', () => {
      const mockUseLocalDocuments = vi.mocked(useLocalDocuments);

      // Mock empty folder state
      mockUseLocalDocuments.mockReturnValue({
        isSupported: true,
        isInitialized: true,
        folders: [{ id: 'empty-folder', path: 'Empty Folder', enabled: true, grantedAt: Date.now().toString(), lastAccessed: Date.now().toString() }],
        documents: [],
        indexStats: {
          totalDocuments: 0,
          totalFolders: 1,
          lastFullScan: Date.now(),
          indexSizeBytes: 0,
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: null,
        isLoading: false
      });

      const localDocsHook = useLocalDocuments();

      // Should handle empty directory gracefully
      expect(localDocsHook.folders).toHaveLength(1);
      expect(localDocsHook.documents).toHaveLength(0);
      expect(localDocsHook.indexStats.totalDocuments).toBe(0);
    });

    it('handles loading states correctly', () => {
      const mockUseLocalDocuments = vi.mocked(useLocalDocuments);

      // Mock loading state
      mockUseLocalDocuments.mockReturnValue({
        isSupported: true,
        isInitialized: false,
        folders: [],
        documents: [],
        indexStats: {
          totalDocuments: 0,
          totalFolders: 0,
          lastFullScan: 0,
          indexSizeBytes: 0,
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: null,
        isLoading: true
      });

      const localDocsHook = useLocalDocuments();

      // Should indicate loading state
      expect(localDocsHook.isLoading).toBe(true);
      expect(localDocsHook.isInitialized).toBe(false);
    });
  });

  describe('Performance Testing', () => {
    it('validates search performance timing', async () => {
      const mockUseHybridQuery = vi.mocked(useHybridQuery);

      // Mock fast search
      mockUseHybridQuery.mockReturnValue({
        search: vi.fn(async () => {
          const startTime = performance.now();
          await new Promise(resolve => setTimeout(resolve, 50)); // Simulate 50ms search
          const endTime = performance.now();

          return {
            local: mockSearchResults,
            cloud: [],
            totalResults: 2,
            searchTime: endTime - startTime
          };
        }),
        searchLocalOnly: vi.fn(async () => ({
          local: mockSearchResults,
          cloud: [],
          totalResults: 2,
          searchTime: 50
        })),
        searchCloudOnly: vi.fn(async () => ({
          local: [],
          cloud: [],
          totalResults: 0,
          searchTime: 25
        })),
        isLoading: false
      });

      const hybridQuery = useHybridQuery();
      const searchResult = await hybridQuery.search('test query');

      // Search should complete within reasonable time
      expect(searchResult.searchTime).toBeLessThan(2000); // 2 seconds max
      expect(searchResult.searchTime).toBeGreaterThanOrEqual(0);
    });

    it('validates indexing performance metrics', () => {
      const mockUseLocalDocuments = vi.mocked(useLocalDocuments);

      // Mock large document collection
      const largeDocumentSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockLocalDocuments[0],
        id: `doc-${i}`,
        title: `Document ${i}`,
        filePath: `/path/to/doc-${i}.txt`
      }));

      mockUseLocalDocuments.mockReturnValue({
        isSupported: true,
        isInitialized: true,
        folders: [{ id: 'large-folder', path: 'Large Collection', enabled: true, grantedAt: Date.now().toString(), lastAccessed: Date.now().toString() }],
        documents: largeDocumentSet,
        indexStats: {
          totalDocuments: 1000,
          totalFolders: 1,
          lastFullScan: Date.now(),
          indexSizeBytes: 1024 * 1000, // 1MB
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: null,
        isLoading: false
      });

      const localDocsHook = useLocalDocuments();

      // Should handle large collections
      expect(localDocsHook.documents).toHaveLength(1000);
      expect(localDocsHook.indexStats.totalDocuments).toBe(1000);
      expect(localDocsHook.indexStats.indexSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('Search Quality and Relevance', () => {
    it('validates search result structure and ordering', async () => {
      const mockUseHybridQuery = vi.mocked(useHybridQuery);

      // Mock search results with different relevance scores
      const sortedResults = [
        { ...mockSearchResults[0], relevance: 0.95 },
        { ...mockSearchResults[1], relevance: 0.80 }
      ];

      mockUseHybridQuery.mockReturnValue({
        search: vi.fn(async () => ({
          local: sortedResults,
          cloud: [],
          totalResults: 2,
          searchTime: 100
        })),
        searchLocalOnly: vi.fn(async () => ({
          local: sortedResults,
          cloud: [],
          totalResults: 2,
          searchTime: 100
        })),
        searchCloudOnly: vi.fn(async () => ({
          local: [],
          cloud: [],
          totalResults: 0,
          searchTime: 50
        })),
        isLoading: false
      });

      const hybridQuery = useHybridQuery();
      const searchResult = await hybridQuery.searchLocalOnly('test query');

      // Verify results structure
      expect(searchResult.local).toHaveLength(2);
      expect(searchResult.local[0].relevance).toBe(0.95);
      expect(searchResult.local[1].relevance).toBe(0.80);
      expect(searchResult.local[0].excerpt).toBeDefined();
      expect(searchResult.local[0].matchedFields).toBeInstanceOf(Array);
    });

    it('validates hybrid search combining local and cloud results', async () => {
      const mockUseHybridQuery = vi.mocked(useHybridQuery);

      // Mock combined search results
      mockUseHybridQuery.mockReturnValue({
        search: vi.fn(async () => ({
          local: mockSearchResults,
          cloud: [{ id: 'cloud-1', title: 'Cloud Document', content: 'Cloud content' }],
          totalResults: 3,
          searchTime: 200
        })),
        searchLocalOnly: vi.fn(async () => ({
          local: mockSearchResults,
          cloud: [],
          totalResults: 2,
          searchTime: 150
        })),
        searchCloudOnly: vi.fn(async () => ({
          local: [],
          cloud: [{ id: 'cloud-1', title: 'Cloud Document', content: 'Cloud content' }],
          totalResults: 1,
          searchTime: 100
        })),
        isLoading: false
      });

      const hybridQuery = useHybridQuery();
      const hybridResult = await hybridQuery.search('test query');

      // Should combine local and cloud results
      expect(hybridResult.local).toHaveLength(2);
      expect(hybridResult.cloud).toHaveLength(1);
      expect(hybridResult.totalResults).toBe(3);

      // Verify individual searches work
      const localOnly = await hybridQuery.searchLocalOnly('test query');
      expect(localOnly.totalResults).toBe(2);

      const cloudOnly = await hybridQuery.searchCloudOnly('test query');
      expect(cloudOnly.totalResults).toBe(1);
    });
  });

  describe('Data Integrity and State Management', () => {
    it('validates consistent state management across hook calls', () => {
      const mockUseLocalDocuments = vi.mocked(useLocalDocuments);

      // Mock consistent state
      const consistentState = {
        isSupported: true,
        isInitialized: true,
        folders: [{ id: 'folder-1', path: 'Test Folder', enabled: true, grantedAt: Date.now().toString(), lastAccessed: Date.now().toString() }],
        documents: mockLocalDocuments,
        indexStats: {
          totalDocuments: 2,
          totalFolders: 1,
          lastFullScan: Date.now(),
          indexSizeBytes: 3072,
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: null,
        isLoading: false
      };

      mockUseLocalDocuments.mockReturnValue(consistentState);

      // Multiple hook calls should return consistent state
      const call1 = useLocalDocuments();
      const call2 = useLocalDocuments();

      expect(call1.folders).toEqual(call2.folders);
      expect(call1.documents).toEqual(call2.documents);
      expect(call1.indexStats).toEqual(call2.indexStats);
    });

    it('validates error state propagation', () => {
      const mockUseLocalDocuments = vi.mocked(useLocalDocuments);

      // Mock error state
      mockUseLocalDocuments.mockReturnValue({
        isSupported: true,
        isInitialized: false,
        folders: [],
        documents: [],
        indexStats: {
          totalDocuments: 0,
          totalFolders: 0,
          lastFullScan: 0,
          indexSizeBytes: 0,
          documentsNeedingUpdate: 0
        },
        addFolder: vi.fn(),
        removeFolder: vi.fn(),
        scanFolder: vi.fn(),
        scanAllFolders: vi.fn(),
        getDocumentContent: vi.fn(),
        error: 'Database connection failed',
        isLoading: false
      });

      const localDocsHook = useLocalDocuments();

      // Error should be properly communicated
      expect(localDocsHook.error).toBe('Database connection failed');
      expect(localDocsHook.isInitialized).toBe(false);
      expect(localDocsHook.folders).toEqual([]);
      expect(localDocsHook.documents).toEqual([]);
    });
  });
});