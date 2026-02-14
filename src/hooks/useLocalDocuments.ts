import { useState, useRef, useCallback, useEffect } from 'react';
import { LocalDocumentIndexer, type ScanResult, type FolderAccessResult } from '../lib/local-documents/LocalDocumentIndexer';
import type { LocalIndexStats, LocalDocumentSearchResult } from '../lib/local-documents/types';

export interface UseLocalDocumentsReturn {
  // State
  isSupported: boolean;
  isInitialized: boolean;
  isScanning: boolean;
  indexStats: LocalIndexStats | null;
  lastScanResult: ScanResult | null;

  // Methods
  initialize: () => Promise<void>;
  requestFolderAccess: () => Promise<FolderAccessResult | undefined>;
  searchLocal: (query: string) => Promise<LocalDocumentSearchResult[]>;
  refreshIndex: () => Promise<ScanResult>;
  getDocumentContent: (docId: string) => Promise<string | null>;
  getStats: () => LocalIndexStats;
}

/**
 * React hook for managing local document indexing and search functionality.
 * Provides state management and operations for the File System Access API-based
 * local document indexing system.
 */
export function useLocalDocuments(): UseLocalDocumentsReturn {
  // Feature detection - check if File System Access API is supported
  const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [indexStats, setIndexStats] = useState<LocalIndexStats | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);

  // Refs
  const indexerRef = useRef<LocalDocumentIndexer | null>(null);

  // Initialize the indexer
  const initialize = useCallback(async (): Promise<void> => {
    if (!isSupported || isInitialized) {
      return;
    }

    try {
      if (!indexerRef.current) {
        indexerRef.current = new LocalDocumentIndexer();
      }

      await indexerRef.current.initialize();
      setIsInitialized(true);

      // Update initial stats
      const stats = await indexerRef.current.getIndexStats();
      setIndexStats(stats);
    } catch (error) {
      console.error('Failed to initialize local document indexer:', error);
    }
  }, [isSupported, isInitialized]);

  // Request folder access permission
  const requestFolderAccess = useCallback(async (): Promise<FolderAccessResult | undefined> => {
    if (!isSupported || !indexerRef.current) {
      return;
    }

    try {
      const result = await indexerRef.current.requestFolderAccess();
      setLastScanResult(result.scanResult);

      // Update stats after folder access
      const stats = await indexerRef.current.getIndexStats();
      setIndexStats(stats);

      return result;
    } catch (error) {
      console.error('Failed to request folder access:', error);
      return;
    }
  }, [isSupported]);

  // Search local documents
  const searchLocal = useCallback(async (query: string): Promise<LocalDocumentSearchResult[]> => {
    if (!isSupported || !indexerRef.current || !query.trim()) {
      return [];
    }

    try {
      return await indexerRef.current.searchLocal(query);
    } catch (error) {
      console.error('Failed to search local documents:', error);
      return [];
    }
  }, [isSupported]);

  // Refresh the document index
  const refreshIndex = useCallback(async (): Promise<ScanResult> => {
    if (!isSupported || !indexerRef.current) {
      const emptyScanResult: ScanResult = {
        foldersScanned: 0,
        documentsProcessed: 0,
        documentsUpdated: 0,
        errors: []
      };
      return emptyScanResult;
    }

    setIsScanning(true);

    try {
      const result = await indexerRef.current.scanAllFolders();
      setLastScanResult(result);

      // Update stats after scan
      const stats = await indexerRef.current.getIndexStats();
      setIndexStats(stats);

      return result;
    } catch (error) {
      console.error('Failed to refresh index:', error);
      const errorScanResult: ScanResult = {
        foldersScanned: 0,
        documentsProcessed: 0,
        documentsUpdated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      setLastScanResult(errorScanResult);
      return errorScanResult;
    } finally {
      setIsScanning(false);
    }
  }, [isSupported]);

  // Get document content by ID
  const getDocumentContent = useCallback(async (docId: string): Promise<string | null> => {
    if (!isSupported || !indexerRef.current) {
      return null;
    }

    try {
      return await indexerRef.current.getDocumentContent(docId);
    } catch (error) {
      console.error('Failed to get document content:', error);
      return null;
    }
  }, [isSupported]);

  // Get current index statistics
  const getStats = useCallback((): LocalIndexStats => {
    // Return current stats or default empty stats
    return indexStats || {
      totalDocuments: 0,
      totalFolders: 0,
      lastFullScan: 0,
      indexSizeBytes: 0,
      documentsNeedingUpdate: 0
    };
  }, [indexStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (indexerRef.current) {
        indexerRef.current.dispose();
        indexerRef.current = null;
      }
    };
  }, []);

  return {
    // State
    isSupported,
    isInitialized,
    isScanning,
    indexStats,
    lastScanResult,

    // Methods
    initialize,
    requestFolderAccess,
    searchLocal,
    refreshIndex,
    getDocumentContent,
    getStats
  };
}