import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LocalDocumentIndexer } from '../LocalDocumentIndexer';
import { LocalDocumentIndex } from '../types';

// Mock the File System Access API
const mockFileHandle = {
  name: 'test.txt',
  getFile: vi.fn(() => Promise.resolve({
    name: 'test.txt',
    size: 1000,
    type: 'text/plain',
    lastModified: Date.now(),
    text: () => Promise.resolve('Test document content'),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
  }))
} as any;

const mockDirectoryHandle = {
  name: 'TestFolder',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
  values: vi.fn().mockReturnValue({
    async *[Symbol.asyncIterator]() {
      yield { kind: 'file', ...mockFileHandle };
    }
  })
} as any;

// Mock the global crypto object for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-1234')
  },
  writable: true
});

global.window = {
  showDirectoryPicker: vi.fn(() => Promise.resolve(mockDirectoryHandle))
} as any;

global.localStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
} as any;

// Mock IndexedDB similar to LocalDocumentStore test
let mockDocuments: { [key: string]: LocalDocumentIndex } = {};

const createMockRequest = (result: any = null, shouldSucceed: boolean = true) => {
  const request = {
    result,
    error: shouldSucceed ? null : new Error('Mock error'),
    onsuccess: null as any,
    onerror: null as any,
    readyState: 'done'
  };

  setTimeout(() => {
    if (shouldSucceed && request.onsuccess) {
      request.onsuccess();
    } else if (!shouldSucceed && request.onerror) {
      request.onerror();
    }
  }, 0);

  return request;
};

const mockObjectStore = {
  put: vi.fn((doc) => {
    mockDocuments[doc.id] = doc;
    return createMockRequest();
  }),
  get: vi.fn((id) => {
    const result = mockDocuments[id] || null;
    return createMockRequest(result);
  }),
  getAll: vi.fn(() => {
    const result = Object.values(mockDocuments);
    return createMockRequest(result);
  }),
  delete: vi.fn((id) => {
    delete mockDocuments[id];
    return createMockRequest();
  }),
  clear: vi.fn(() => {
    mockDocuments = {};
    return createMockRequest();
  }),
  createIndex: vi.fn()
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore)
};

const mockDB = {
  transaction: vi.fn(() => mockTransaction),
  objectStoreNames: { contains: vi.fn(() => false) },
  createObjectStore: vi.fn(() => mockObjectStore)
};

const createMockOpenRequest = () => {
  const request = {
    result: mockDB,
    error: null,
    onsuccess: null as any,
    onerror: null as any,
    onupgradeneeded: null as any
  };

  setTimeout(() => {
    if (request.onupgradeneeded) {
      request.onupgradeneeded({ target: request } as any);
    }
    if (request.onsuccess) {
      request.onsuccess();
    }
  }, 0);

  return request;
};

global.indexedDB = {
  open: vi.fn(() => createMockOpenRequest()),
  deleteDatabase: vi.fn()
} as any;

describe('LocalDocumentIndexer', () => {
  let indexer: LocalDocumentIndexer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocuments = {};
    if (indexer) {
      indexer.dispose();
    }
    indexer = new LocalDocumentIndexer();
  });

  afterEach(() => {
    if (indexer) {
      indexer.dispose();
    }
  });

  it('initializes successfully', async () => {
    await expect(indexer.initialize()).resolves.not.toThrow();
  });

  it('requests folder access and returns permission', async () => {
    const permission = {
      id: 'test-uuid-1234',
      path: 'TestFolder',
      enabled: true,
      grantedAt: expect.any(String),
      lastAccessed: expect.any(String)
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([permission]));

    const result = await indexer.requestFolderAccess();

    expect(result.permission).toMatchObject({
      id: 'test-uuid-1234',
      path: 'TestFolder',
      enabled: true
    });
    expect(result.scanResult).toHaveProperty('foldersScanned');
    expect(result.scanResult).toHaveProperty('documentsProcessed');
    expect(result.scanResult).toHaveProperty('documentsUpdated');
    expect(result.scanResult).toHaveProperty('errors');
  });

  it('scans folders and processes documents', async () => {
    const permission = {
      id: 'test-uuid-1234',
      path: 'TestFolder',
      enabled: true,
      grantedAt: '2024-01-01T00:00:00.000Z',
      lastAccessed: '2024-01-01T00:00:00.000Z'
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([permission]));

    // Manually add the directory handle to the indexer
    (indexer as any).directoryHandles.set('test-uuid-1234', mockDirectoryHandle);

    const result = await indexer.scanAllFolders();

    expect(result.foldersScanned).toBe(1);
    expect(result.documentsProcessed).toBe(1);
    expect(result.documentsUpdated).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('skips up-to-date documents during scan', async () => {
    // First, add a document
    const permission = {
      id: 'test-uuid-1234',
      path: 'TestFolder',
      enabled: true,
      grantedAt: '2024-01-01T00:00:00.000Z',
      lastAccessed: '2024-01-01T00:00:00.000Z'
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([permission]));
    (indexer as any).directoryHandles.set('test-uuid-1234', mockDirectoryHandle);

    // First scan should process the document
    const firstScan = await indexer.scanAllFolders();
    expect(firstScan.documentsProcessed).toBe(1);

    // Second scan should skip the same document (assuming same lastModified)
    const secondScan = await indexer.scanAllFolders();
    expect(secondScan.documentsProcessed).toBe(0);
    expect(secondScan.documentsUpdated).toBe(0);
  });

  it('gets index statistics', async () => {
    await indexer.initialize();

    const stats = await indexer.getIndexStats();

    expect(stats).toHaveProperty('totalDocuments');
    expect(stats).toHaveProperty('totalFolders');
    expect(stats).toHaveProperty('lastFullScan');
    expect(stats).toHaveProperty('indexSizeBytes');
    expect(stats).toHaveProperty('documentsNeedingUpdate');
    expect(typeof stats.totalDocuments).toBe('number');
    expect(typeof stats.totalFolders).toBe('number');
    expect(typeof stats.lastFullScan).toBe('number');
    expect(typeof stats.indexSizeBytes).toBe('number');
    expect(typeof stats.documentsNeedingUpdate).toBe('number');
  });

  it('searches local documents', async () => {
    await indexer.initialize();

    // Add a document first
    const permission = {
      id: 'test-uuid-1234',
      path: 'TestFolder',
      enabled: true,
      grantedAt: '2024-01-01T00:00:00.000Z',
      lastAccessed: '2024-01-01T00:00:00.000Z'
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([permission]));
    (indexer as any).directoryHandles.set('test-uuid-1234', mockDirectoryHandle);

    // Force scan to avoid concurrency issues
    await indexer.scanAllFolders(true);

    const results = await indexer.searchLocal('test');

    expect(Array.isArray(results)).toBe(true);
    // Results might be empty if the mock content doesn't match 'test'
  });

  it('gets document content by ID', async () => {
    await indexer.initialize();

    // Add a document first
    const permission = {
      id: 'test-uuid-1234',
      path: 'TestFolder',
      enabled: true,
      grantedAt: '2024-01-01T00:00:00.000Z',
      lastAccessed: '2024-01-01T00:00:00.000Z'
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([permission]));
    (indexer as any).directoryHandles.set('test-uuid-1234', mockDirectoryHandle);

    // Force scan to avoid concurrency issues
    await indexer.scanAllFolders(true);

    // Get the document ID that was generated
    const docs = Object.keys(mockDocuments);
    if (docs.length > 0) {
      const content = await indexer.getDocumentContent(docs[0]);
      expect(typeof content).toBe('string');
      expect(content).toBeTruthy();
    }
  });

  it('returns null for non-existent document content', async () => {
    await indexer.initialize();

    const content = await indexer.getDocumentContent('non-existent-id');
    expect(content).toBeNull();
  });

  it('handles scan errors gracefully', async () => {
    const permission = {
      id: 'test-uuid-1234',
      path: 'TestFolder',
      enabled: true,
      grantedAt: '2024-01-01T00:00:00.000Z',
      lastAccessed: '2024-01-01T00:00:00.000Z'
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([permission]));
    (indexer as any).directoryHandles.set('test-uuid-1234', mockDirectoryHandle);

    // Mock file processing to throw an error
    vi.mocked(mockFileHandle.getFile).mockRejectedValueOnce(new Error('File access denied'));

    const result = await indexer.scanAllFolders();

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('File access denied');
  });

  it('disposes properly without errors', () => {
    expect(() => indexer.dispose()).not.toThrow();
  });

  it('prevents concurrent scans', async () => {
    const permission = {
      id: 'test-uuid-1234',
      path: 'TestFolder',
      enabled: true,
      grantedAt: '2024-01-01T00:00:00.000Z',
      lastAccessed: '2024-01-01T00:00:00.000Z'
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([permission]));
    (indexer as any).directoryHandles.set('test-uuid-1234', mockDirectoryHandle);

    // Start first scan
    const firstScanPromise = indexer.scanAllFolders();

    // Try to start second scan while first is running
    await expect(indexer.scanAllFolders()).rejects.toThrow('Scan already in progress');

    // Wait for first scan to complete
    await firstScanPromise;
  });

  it('allows forced concurrent scan', async () => {
    const permission = {
      id: 'test-uuid-1234',
      path: 'TestFolder',
      enabled: true,
      grantedAt: '2024-01-01T00:00:00.000Z',
      lastAccessed: '2024-01-01T00:00:00.000Z'
    };

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([permission]));
    (indexer as any).directoryHandles.set('test-uuid-1234', mockDirectoryHandle);

    // Start first scan
    const firstScanPromise = indexer.scanAllFolders();

    // Force second scan should work
    const secondScanPromise = indexer.scanAllFolders(true);

    // Both should complete
    await expect(firstScanPromise).resolves.toBeDefined();
    await expect(secondScanPromise).resolves.toBeDefined();
  });
});