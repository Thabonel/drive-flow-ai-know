import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LocalDocumentStore } from '../LocalDocumentStore';
import { LocalDocumentIndex } from '../types';

// Mock data for testing
const mockDocument: LocalDocumentIndex = {
  id: 'doc1',
  filePath: '/test/document.txt',
  title: 'Test Document',
  summary: 'This is a test document with important information about testing.',
  keywords: ['test', 'document', 'information'],
  lastModified: Date.now() - 1000,
  lastIndexed: Date.now(),
  fileSize: 1024,
  mimeType: 'text/plain',
  metadata: {
    author: 'Test Author',
    wordCount: 10
  }
};

const mockDocument2: LocalDocumentIndex = {
  id: 'doc2',
  filePath: '/test/another.txt',
  title: 'Another Document',
  summary: 'Different content here with some other keywords.',
  keywords: ['another', 'content', 'keywords'],
  lastModified: Date.now() - 2000,
  lastIndexed: Date.now() - 500,
  fileSize: 2048,
  mimeType: 'text/plain',
  metadata: {
    author: 'Another Author',
    wordCount: 8
  }
};

// Create a more complete mock for IndexedDB
const createMockRequest = (result: any = null, shouldSucceed: boolean = true) => {
  const request = {
    result,
    error: shouldSucceed ? null : new Error('Mock error'),
    onsuccess: null as any,
    onerror: null as any,
    readyState: 'done'
  };

  // Simulate async behavior
  setTimeout(() => {
    if (shouldSucceed && request.onsuccess) {
      request.onsuccess();
    } else if (!shouldSucceed && request.onerror) {
      request.onerror();
    }
  }, 0);

  return request;
};

// Mock document storage
let mockDocuments: { [key: string]: LocalDocumentIndex } = {};

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

  // Simulate async database opening
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

// Mock the global indexedDB
global.indexedDB = {
  open: vi.fn(() => createMockOpenRequest()),
  deleteDatabase: vi.fn()
} as any;

describe('LocalDocumentStore', () => {
  let store: LocalDocumentStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocuments = {};
    store = new LocalDocumentStore();
  });

  describe('init method', () => {
    test('has public init method', () => {
      expect(typeof store.init).toBe('function');
    });

    test('init method returns promise', async () => {
      const result = store.init();
      expect(result instanceof Promise).toBe(true);
      await result;
    });
  });

  describe('addDocument method', () => {
    test('adds document successfully', async () => {
      await store.init();
      await store.addDocument(mockDocument);

      expect(mockObjectStore.put).toHaveBeenCalledWith(mockDocument);
    });

    test('handles add document errors', async () => {
      await store.init();

      mockObjectStore.put.mockReturnValueOnce(createMockRequest(null, false));

      await expect(store.addDocument(mockDocument)).rejects.toThrow('Failed to add document');
    });
  });

  describe('getDocument method', () => {
    test('retrieves existing document', async () => {
      await store.init();
      mockDocuments[mockDocument.id] = mockDocument;

      const result = await store.getDocument(mockDocument.id);

      expect(result).toEqual(mockDocument);
      expect(mockObjectStore.get).toHaveBeenCalledWith(mockDocument.id);
    });

    test('returns null for non-existent document', async () => {
      await store.init();

      const result = await store.getDocument('nonexistent');

      expect(result).toBeNull();
    });

    test('handles get document errors', async () => {
      await store.init();

      mockObjectStore.get.mockReturnValueOnce(createMockRequest(null, false));

      await expect(store.getDocument('doc1')).rejects.toThrow('Failed to get document');
    });
  });

  describe('deleteDocument method', () => {
    test('deletes document successfully', async () => {
      await store.init();
      mockDocuments[mockDocument.id] = mockDocument;

      await store.deleteDocument(mockDocument.id);

      expect(mockObjectStore.delete).toHaveBeenCalledWith(mockDocument.id);
      expect(mockDocuments[mockDocument.id]).toBeUndefined();
    });

    test('handles delete document errors', async () => {
      await store.init();

      mockObjectStore.delete.mockReturnValueOnce(createMockRequest(null, false));

      await expect(store.deleteDocument('doc1')).rejects.toThrow('Failed to delete document');
    });
  });

  describe('searchDocuments method', () => {
    beforeEach(async () => {
      await store.init();
      mockDocuments = {
        [mockDocument.id]: mockDocument,
        [mockDocument2.id]: mockDocument2
      };
    });

    test('returns empty array for empty query', async () => {
      const results = await store.searchDocuments('');
      expect(results).toEqual([]);
    });

    test('returns empty array for whitespace query', async () => {
      const results = await store.searchDocuments('   ');
      expect(results).toEqual([]);
    });

    test('searches by title with scoring', async () => {
      const results = await store.searchDocuments('Test');

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe(mockDocument.id);
      expect(results[0].relevance).toBeGreaterThan(0);
      expect(results[0].matchedFields).toContain('title');
    });

    test('searches by keywords with scoring', async () => {
      const results = await store.searchDocuments('information');

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe(mockDocument.id);
      expect(results[0].relevance).toBeGreaterThan(0);
      expect(results[0].matchedFields).toContain('keywords');
    });

    test('searches by summary content with scoring', async () => {
      const results = await store.searchDocuments('important');

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe(mockDocument.id);
      expect(results[0].relevance).toBeGreaterThan(0);
      expect(results[0].matchedFields).toContain('summary');
    });

    test('returns results sorted by relevance', async () => {
      // Add a document with 'test' in title for higher relevance
      const highRelevanceDoc: LocalDocumentIndex = {
        ...mockDocument,
        id: 'doc3',
        title: 'Test Title Test',
        keywords: ['test', 'testing']
      };
      mockDocuments[highRelevanceDoc.id] = highRelevanceDoc;

      const results = await store.searchDocuments('test');

      expect(results.length).toBeGreaterThan(1);
      expect(results[0].relevance).toBeGreaterThanOrEqual(results[1].relevance);
    });

    test('includes excerpt in search results', async () => {
      const results = await store.searchDocuments('important');

      expect(results).toHaveLength(1);
      expect(results[0].excerpt).toBeDefined();
      expect(typeof results[0].excerpt).toBe('string');
    });

    test('case insensitive search', async () => {
      const results = await store.searchDocuments('TEST');

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe(mockDocument.id);
    });
  });

  describe('getStats method', () => {
    test('returns correct stats format', async () => {
      await store.init();
      mockDocuments = {
        [mockDocument.id]: mockDocument,
        [mockDocument2.id]: mockDocument2
      };

      const stats = await store.getStats();

      expect(stats).toHaveProperty('totalDocuments');
      expect(stats).toHaveProperty('indexSizeBytes');
      expect(stats).not.toHaveProperty('totalSize');
      expect(stats).not.toHaveProperty('lastUpdated');
    });

    test('calculates stats correctly', async () => {
      await store.init();
      mockDocuments = {
        [mockDocument.id]: mockDocument,
        [mockDocument2.id]: mockDocument2
      };

      const stats = await store.getStats();

      expect(stats.totalDocuments).toBe(2);
      expect(stats.indexSizeBytes).toBe(mockDocument.fileSize + mockDocument2.fileSize);
    });

    test('handles empty document store', async () => {
      await store.init();

      const stats = await store.getStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.indexSizeBytes).toBe(0);
    });
  });

  describe('clearAll method', () => {
    test('clears all documents successfully', async () => {
      await store.init();
      mockDocuments = {
        [mockDocument.id]: mockDocument,
        [mockDocument2.id]: mockDocument2
      };

      await store.clearAll();

      expect(mockObjectStore.clear).toHaveBeenCalled();
      expect(Object.keys(mockDocuments)).toHaveLength(0);
    });

    test('handles clear errors', async () => {
      await store.init();

      mockObjectStore.clear.mockReturnValueOnce(createMockRequest(null, false));

      await expect(store.clearAll()).rejects.toThrow('Failed to clear documents');
    });
  });
});