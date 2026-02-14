import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LocalDocumentStore } from '../LocalDocumentStore';
import { LocalDocumentIndex } from '../types';

// Create a more complete mock for IndexedDB
const createMockRequest = (result: any = null) => {
  const request = {
    result,
    error: null,
    onsuccess: null as any,
    onerror: null as any,
    readyState: 'done'
  };

  // Simulate async behavior
  setTimeout(() => {
    if (request.onsuccess) {
      request.onsuccess();
    }
  }, 0);

  return request;
};

const mockObjectStore = {
  put: vi.fn(() => createMockRequest()),
  get: vi.fn(() => createMockRequest(null)),
  getAll: vi.fn(() => createMockRequest([])),
  delete: vi.fn(() => createMockRequest()),
  clear: vi.fn(() => createMockRequest()),
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
    store = new LocalDocumentStore();
  });

  test('creates instance successfully', () => {
    expect(store).toBeInstanceOf(LocalDocumentStore);
  });

  test('searches documents by text returns array', async () => {
    const results = await store.searchDocuments('test query');
    expect(Array.isArray(results)).toBe(true);
  });

  test('handles empty search query', async () => {
    const results = await store.searchDocuments('');
    expect(results).toEqual([]);
  });
});