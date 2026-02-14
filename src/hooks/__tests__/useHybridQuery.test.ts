import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { LocalDocumentSearchResult } from '../../lib/local-documents/types';

// Mock functions
const mockSearchLocal = vi.fn();
const mockSupabaseSelect = vi.fn();

// Mock the useLocalDocuments hook
vi.mock('../useLocalDocuments', () => ({
  useLocalDocuments: vi.fn(() => ({
    searchLocal: mockSearchLocal,
    isSupported: true,
    isInitialized: true
  }))
}));

// Mock the Supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: mockSupabaseSelect
      }))
    }))
  },
  isSupabaseConfigured: true
}));

import { useHybridQuery } from '../useHybridQuery';

describe('useHybridQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks
    mockSearchLocal.mockResolvedValue([]);
    mockSupabaseSelect.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('searches both local and cloud sources in parallel', async () => {
      const localResults: LocalDocumentSearchResult[] = [{
        document: {
          id: 'local-1',
          filePath: '/path/to/local.txt',
          title: 'Local Document',
          summary: 'Local summary',
          keywords: ['local', 'test'],
          lastModified: Date.now(),
          lastIndexed: Date.now(),
          fileSize: 1000,
          mimeType: 'text/plain',
          metadata: {}
        },
        relevance: 0.8,
        excerpt: 'Local content excerpt',
        matchedFields: ['title', 'content']
      }];

      const cloudResults = [{
        id: 'cloud-1',
        title: 'Cloud Document',
        content: 'Cloud content',
        ai_summary: 'Cloud summary'
      }];

      mockSearchLocal.mockResolvedValue(localResults);
      mockSupabaseSelect.mockResolvedValue({ data: cloudResults, error: null });

      const { result } = renderHook(() => useHybridQuery());

      const searchResult = await result.current.search('test query');

      expect(searchResult).toEqual({
        local: localResults,
        cloud: cloudResults,
        totalResults: 2,
        searchTime: expect.any(Number)
      });

      expect(mockSearchLocal).toHaveBeenCalledWith('test query');
      expect(mockSupabaseSelect).toHaveBeenCalled();
    });

    it('handles search options correctly', async () => {
      const { result } = renderHook(() => useHybridQuery());

      await result.current.search('test query', { maxResults: 5 });

      // Verify the search was called with proper parameters
      expect(mockSearchLocal).toHaveBeenCalledWith('test query');
    });

    it('returns performance timing', async () => {
      const { result } = renderHook(() => useHybridQuery());

      const searchResult = await result.current.search('test query');

      expect(searchResult.searchTime).toBeGreaterThanOrEqual(0);
      expect(typeof searchResult.searchTime).toBe('number');
    });

    it('handles empty results correctly', async () => {
      mockSearchLocal.mockResolvedValue([]);
      mockSupabaseSelect.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useHybridQuery());

      const searchResult = await result.current.search('test query');

      expect(searchResult).toEqual({
        local: [],
        cloud: [],
        totalResults: 0,
        searchTime: expect.any(Number)
      });
    });
  });

  describe('searchLocalOnly', () => {
    it('searches only local sources', async () => {
      const localResults: LocalDocumentSearchResult[] = [{
        document: {
          id: 'local-1',
          filePath: '/path/to/local.txt',
          title: 'Local Document',
          summary: 'Local summary',
          keywords: ['local', 'test'],
          lastModified: Date.now(),
          lastIndexed: Date.now(),
          fileSize: 1000,
          mimeType: 'text/plain',
          metadata: {}
        },
        relevance: 0.8,
        excerpt: 'Local content excerpt',
        matchedFields: ['title', 'content']
      }];

      mockSearchLocal.mockResolvedValue(localResults);

      const { result } = renderHook(() => useHybridQuery());

      const searchResult = await result.current.searchLocalOnly('test query');

      expect(searchResult).toEqual({
        local: localResults,
        cloud: [],
        totalResults: 1,
        searchTime: expect.any(Number)
      });

      expect(mockSearchLocal).toHaveBeenCalledWith('test query');
      expect(mockSupabaseSelect).not.toHaveBeenCalled();
    });
  });

  describe('searchCloudOnly', () => {
    it('searches only cloud sources', async () => {
      const cloudResults = [{
        id: 'cloud-1',
        title: 'Cloud Document',
        content: 'Cloud content',
        ai_summary: 'Cloud summary'
      }];

      mockSupabaseSelect.mockResolvedValue({ data: cloudResults, error: null });

      const { result } = renderHook(() => useHybridQuery());

      const searchResult = await result.current.searchCloudOnly('test query');

      expect(searchResult).toEqual({
        local: [],
        cloud: cloudResults,
        totalResults: 1,
        searchTime: expect.any(Number)
      });

      expect(mockSearchLocal).not.toHaveBeenCalled();
      expect(mockSupabaseSelect).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles local search errors gracefully', async () => {
      mockSearchLocal.mockRejectedValue(new Error('Local search failed'));
      mockSupabaseSelect.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useHybridQuery());

      const searchResult = await result.current.search('test query');

      expect(searchResult).toEqual({
        local: [],
        cloud: [],
        totalResults: 0,
        searchTime: expect.any(Number),
        errors: {
          local: 'Local search failed'
        }
      });
    });

    it('handles cloud search errors gracefully', async () => {
      mockSearchLocal.mockResolvedValue([]);
      mockSupabaseSelect.mockResolvedValue({
        data: null,
        error: { message: 'Cloud search failed' }
      });

      const { result } = renderHook(() => useHybridQuery());

      const searchResult = await result.current.search('test query');

      expect(searchResult).toEqual({
        local: [],
        cloud: [],
        totalResults: 0,
        searchTime: expect.any(Number),
        errors: {
          cloud: 'Cloud search failed'
        }
      });
    });

    it('handles both sources failing gracefully', async () => {
      mockSearchLocal.mockRejectedValue(new Error('Local search failed'));
      mockSupabaseSelect.mockResolvedValue({
        data: null,
        error: { message: 'Cloud search failed' }
      });

      const { result } = renderHook(() => useHybridQuery());

      const searchResult = await result.current.search('test query');

      expect(searchResult).toEqual({
        local: [],
        cloud: [],
        totalResults: 0,
        searchTime: expect.any(Number),
        errors: {
          local: 'Local search failed',
          cloud: 'Cloud search failed'
        }
      });
    });
  });

  describe('search options', () => {
    it('respects localOnly option', async () => {
      const { result } = renderHook(() => useHybridQuery());

      await result.current.search('test query', { localOnly: true });

      expect(mockSearchLocal).toHaveBeenCalledWith('test query');
      expect(mockSupabaseSelect).not.toHaveBeenCalled();
    });

    it('respects cloudOnly option', async () => {
      const { result } = renderHook(() => useHybridQuery());

      await result.current.search('test query', { cloudOnly: true });

      expect(mockSearchLocal).not.toHaveBeenCalled();
      expect(mockSupabaseSelect).toHaveBeenCalled();
    });

    it('limits results based on maxResults option', async () => {
      const localResults: LocalDocumentSearchResult[] = Array.from({ length: 5 }, (_, i) => ({
        document: {
          id: `local-${i}`,
          filePath: `/path/to/local${i}.txt`,
          title: `Local Document ${i}`,
          summary: `Local summary ${i}`,
          keywords: ['local', 'test'],
          lastModified: Date.now(),
          lastIndexed: Date.now(),
          fileSize: 1000,
          mimeType: 'text/plain',
          metadata: {}
        },
        relevance: 0.8,
        excerpt: `Local content excerpt ${i}`,
        matchedFields: ['title', 'content']
      }));

      const cloudResults = Array.from({ length: 5 }, (_, i) => ({
        id: `cloud-${i}`,
        title: `Cloud Document ${i}`,
        content: `Cloud content ${i}`,
        ai_summary: `Cloud summary ${i}`
      }));

      mockSearchLocal.mockResolvedValue(localResults);
      mockSupabaseSelect.mockResolvedValue({ data: cloudResults, error: null });

      const { result } = renderHook(() => useHybridQuery());

      const searchResult = await result.current.search('test query', { maxResults: 6 });

      expect(searchResult.totalResults).toBeLessThanOrEqual(6);
    });
  });

  describe('loading states', () => {
    it('sets loading state during search', async () => {
      // Create a promise we can control
      let resolveLocal: (value: LocalDocumentSearchResult[]) => void;
      const localPromise = new Promise<LocalDocumentSearchResult[]>(resolve => {
        resolveLocal = resolve;
      });

      mockSearchLocal.mockReturnValue(localPromise);
      mockSupabaseSelect.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useHybridQuery());

      const searchPromise = result.current.search('test query');

      // Should be loading initially
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the local search
      resolveLocal([]);
      await searchPromise;

      // Should not be loading after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});