import { useState, useRef, useCallback, useEffect } from 'react';
import { LocalDocumentIndexer, type ScanResult, type FolderAccessResult } from '../lib/local-documents/LocalDocumentIndexer';
import type { LocalIndexStats, LocalDocumentSearchResult } from '../lib/local-documents/types';

export interface UseLocalDocumentsReturn {
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

export function useLocalDocuments(): UseLocalDocumentsReturn {
  const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [indexStats, setIndexStats] = useState<LocalIndexStats | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);

  const indexerRef = useRef<LocalDocumentIndexer | null>(null);

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

      const stats = await indexerRef.current.getIndexStats();
      setIndexStats(stats);
    } catch (error) {
      console.error('Failed to initialize local document indexer:', error);
    }
  }, [isSupported, isInitialized]);

  const requestFolderAccess = useCallback(async (): Promise<FolderAccessResult | undefined> => {
    if (!isSupported || !indexerRef.current) {
      return;
    }

    try {
      const result = await indexerRef.current.requestFolderAccess();
      setLastScanResult(result.scanResult);

      const stats = await indexerRef.current.getIndexStats();
      setIndexStats(stats);

      return result;
    } catch (error) {
      console.error('Failed to request folder access:', error);
      return;
    }
  }, [isSupported]);

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

  const getStats = useCallback((): LocalIndexStats => {
    return indexStats || {
      totalDocuments: 0,
      totalFolders: 0,
      lastFullScan: 0,
      indexSizeBytes: 0,
      documentsNeedingUpdate: 0
    };
  }, [indexStats]);

  useEffect(() => {
    return () => {
      if (indexerRef.current) {
        indexerRef.current.dispose();
        indexerRef.current = null;
      }
    };
  }, []);

  return {
      isSupported,
    isInitialized,
    isScanning,
    indexStats,
    lastScanResult,

    initialize,
    requestFolderAccess,
    searchLocal,
    refreshIndex,
    getDocumentContent,
    getStats
  };
}