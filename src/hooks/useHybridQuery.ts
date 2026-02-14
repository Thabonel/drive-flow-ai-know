import { useState, useCallback } from 'react';
import { useLocalDocuments } from './useLocalDocuments';
import { supabase, isSupabaseConfigured } from '../integrations/supabase/client';
import type { LocalDocumentSearchResult } from '../lib/local-documents/types';

// Cloud document type based on knowledge_documents table schema
export interface CloudDocument {
  id: string;
  title: string;
  content: string;
  ai_summary?: string;
  metadata?: any;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface HybridSearchOptions {
  maxResults?: number;
  localOnly?: boolean;
  cloudOnly?: boolean;
}

export interface HybridSearchResults {
  local: LocalDocumentSearchResult[];
  cloud: CloudDocument[];
  totalResults: number;
  searchTime: number;
  errors?: {
    local?: string;
    cloud?: string;
  };
}

export interface UseHybridQueryReturn {
  // State
  isLoading: boolean;

  // Methods
  search: (query: string, options?: HybridSearchOptions) => Promise<HybridSearchResults>;
  searchLocalOnly: (query: string, options?: HybridSearchOptions) => Promise<HybridSearchResults>;
  searchCloudOnly: (query: string, options?: HybridSearchOptions) => Promise<HybridSearchResults>;
}

/**
 * React hook for unified local and cloud document search.
 * Provides hybrid search capabilities with parallel execution and error handling.
 */
export function useHybridQuery(): UseHybridQueryReturn {
  const [isLoading, setIsLoading] = useState(false);
  const { searchLocal, isSupported: isLocalSupported } = useLocalDocuments();

  /**
   * Search local documents with error handling
   */
  const searchLocalSafe = useCallback(async (query: string): Promise<{
    results: LocalDocumentSearchResult[];
    error?: string;
  }> => {
    if (!isLocalSupported || !query.trim()) {
      return { results: [] };
    }

    try {
      const results = await searchLocal(query);
      return { results };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown local search error';
      return { results: [], error: errorMessage };
    }
  }, [searchLocal, isLocalSupported]);

  /**
   * Search cloud documents with error handling
   */
  const searchCloudSafe = useCallback(async (query: string): Promise<{
    results: CloudDocument[];
    error?: string;
  }> => {
    if (!isSupabaseConfigured || !query.trim()) {
      return { results: [] };
    }

    try {
      // Simple text search in title, content, and ai_summary
      // Note: This is a basic implementation. For production, you'd want more sophisticated search
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,ai_summary.ilike.%${query}%`);

      if (error) {
        return { results: [], error: error.message };
      }

      return { results: data || [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown cloud search error';
      return { results: [], error: errorMessage };
    }
  }, []);

  /**
   * Apply result limits and combine results
   */
  const applyOptionsAndCombine = useCallback((
    localResults: LocalDocumentSearchResult[],
    cloudResults: CloudDocument[],
    options?: HybridSearchOptions
  ): { local: LocalDocumentSearchResult[]; cloud: CloudDocument[] } => {
    if (!options?.maxResults) {
      return { local: localResults, cloud: cloudResults };
    }

    const totalResults = localResults.length + cloudResults.length;
    if (totalResults <= options.maxResults) {
      return { local: localResults, cloud: cloudResults };
    }

    // Distribute maxResults proportionally between local and cloud
    const localRatio = localResults.length / totalResults;
    const maxLocal = Math.ceil(options.maxResults * localRatio);
    const maxCloud = options.maxResults - Math.min(maxLocal, localResults.length);

    return {
      local: localResults.slice(0, maxLocal),
      cloud: cloudResults.slice(0, Math.max(0, maxCloud))
    };
  }, []);

  /**
   * Search both local and cloud documents in parallel
   */
  const search = useCallback(async (
    query: string,
    options?: HybridSearchOptions
  ): Promise<HybridSearchResults> => {
    const startTime = performance.now();
    setIsLoading(true);

    try {
      // Handle single-source options
      if (options?.localOnly) {
        return await searchLocalOnly(query, options);
      }

      if (options?.cloudOnly) {
        return await searchCloudOnly(query, options);
      }

      // Search both sources in parallel
      const [localSearch, cloudSearch] = await Promise.all([
        searchLocalSafe(query),
        searchCloudSafe(query)
      ]);

      // Apply options and combine results
      const { local, cloud } = applyOptionsAndCombine(
        localSearch.results,
        cloudSearch.results,
        options
      );

      // Build errors object if any occurred
      const errors: { local?: string; cloud?: string } | undefined =
        (localSearch.error || cloudSearch.error) ? {
          ...(localSearch.error && { local: localSearch.error }),
          ...(cloudSearch.error && { cloud: cloudSearch.error })
        } : undefined;

      const endTime = performance.now();

      return {
        local,
        cloud,
        totalResults: local.length + cloud.length,
        searchTime: endTime - startTime,
        ...(errors && { errors })
      };
    } finally {
      setIsLoading(false);
    }
  }, [searchLocalSafe, searchCloudSafe, applyOptionsAndCombine]);

  /**
   * Search only local documents
   */
  const searchLocalOnly = useCallback(async (
    query: string,
    options?: HybridSearchOptions
  ): Promise<HybridSearchResults> => {
    const startTime = performance.now();
    setIsLoading(true);

    try {
      const localSearch = await searchLocalSafe(query);

      const { local } = applyOptionsAndCombine(
        localSearch.results,
        [],
        options
      );

      const errors = localSearch.error ? { local: localSearch.error } : undefined;
      const endTime = performance.now();

      return {
        local,
        cloud: [],
        totalResults: local.length,
        searchTime: endTime - startTime,
        ...(errors && { errors })
      };
    } finally {
      setIsLoading(false);
    }
  }, [searchLocalSafe, applyOptionsAndCombine]);

  /**
   * Search only cloud documents
   */
  const searchCloudOnly = useCallback(async (
    query: string,
    options?: HybridSearchOptions
  ): Promise<HybridSearchResults> => {
    const startTime = performance.now();
    setIsLoading(true);

    try {
      const cloudSearch = await searchCloudSafe(query);

      const { cloud } = applyOptionsAndCombine(
        [],
        cloudSearch.results,
        options
      );

      const errors = cloudSearch.error ? { cloud: cloudSearch.error } : undefined;
      const endTime = performance.now();

      return {
        local: [],
        cloud,
        totalResults: cloud.length,
        searchTime: endTime - startTime,
        ...(errors && { errors })
      };
    } finally {
      setIsLoading(false);
    }
  }, [searchCloudSafe, applyOptionsAndCombine]);

  return {
    // State
    isLoading,

    // Methods
    search,
    searchLocalOnly,
    searchCloudOnly
  };
}