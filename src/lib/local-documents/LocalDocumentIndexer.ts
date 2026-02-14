import type { LocalDocumentIndex, LocalDocumentSearchResult, LocalIndexStats, FolderPermission } from './types';
import { LocalDocumentStore } from './LocalDocumentStore';
import { FileSystemManager } from './FileSystemManager';
import { DocumentProcessor } from './DocumentProcessor';

export interface ScanResult {
  foldersScanned: number;
  documentsProcessed: number;
  documentsUpdated: number;
  errors: string[];
}

export interface FolderAccessResult {
  permission: FolderPermission;
  scanResult: ScanResult;
}

export class LocalDocumentIndexer {
  private store: LocalDocumentStore;
  private fileManager: FileSystemManager;
  private processor: DocumentProcessor;
  private scanInterval: NodeJS.Timeout | null = null;
  private isScanning: boolean = false;
  private lastFullScan: number = 0;
  private directoryHandles: Map<string, FileSystemDirectoryHandle> = new Map();

  constructor() {
    this.store = new LocalDocumentStore();
    this.fileManager = new FileSystemManager();
    this.processor = new DocumentProcessor();
  }

  /**
   * Initialize the indexer and start background scanning
   */
  async initialize(): Promise<void> {
    await this.store.init();

    // Start immediate scan (don't await - fire and forget)
    if (!this.isScanning) {
      this.scanAllFolders().catch(error => {
        console.error('Initial scan failed:', error);
      });
    }

    // Set up background scanning (every hour)
    this.scanInterval = setInterval(() => {
      if (!this.isScanning) {
        this.scanAllFolders().catch(error => {
          console.error('Background scan failed:', error);
        });
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Request folder access permission and trigger immediate scan
   */
  async requestFolderAccess(): Promise<FolderAccessResult> {
    const permission = await this.fileManager.requestFolderPermission();

    // In a real implementation, we would store the directory handle
    // For testing purposes, we'll create a mock handle
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const directoryHandle = await window.showDirectoryPicker();
        this.directoryHandles.set(permission.id, directoryHandle);
      } catch (error) {
        // Handle error - user probably cancelled
      }
    }

    const scanResult = await this.scanAllFolders();

    return {
      permission,
      scanResult
    };
  }

  /**
   * Scan all enabled folder permissions and update document index
   */
  async scanAllFolders(force: boolean = false): Promise<ScanResult> {
    if (this.isScanning && !force) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    const result: ScanResult = {
      foldersScanned: 0,
      documentsProcessed: 0,
      documentsUpdated: 0,
      errors: []
    };

    try {
      const permissions = await this.fileManager.getStoredPermissions();
      const enabledPermissions = permissions.filter(p => p.enabled);

      for (const permission of enabledPermissions) {
        try {
          // Try to get the stored directory handle, or create a mock one for testing
          let directoryHandle = this.directoryHandles.get(permission.id);

          if (!directoryHandle) {
            // For testing or when handle is not available, create a mock
            directoryHandle = {
              name: permission.path,
              values: () => ({
                async *[Symbol.asyncIterator]() {
                  // Return empty for when no handle is available
                  return;
                }
              })
            } as any;
          }

          const documentFiles = await this.fileManager.scanFolderForDocuments(directoryHandle);

          result.foldersScanned++;

          for (const fileHandle of documentFiles) {
            try {
              const filePath = `${permission.path}/${fileHandle.name}`;
              const docId = this.processor.generateDocumentId(filePath);

              // Check if document already exists and is up to date
              const existingDoc = await this.store.getDocument(docId);
              const processedDoc = await this.processor.processFileIntoIndex(fileHandle, filePath);

              if (!existingDoc) {
                // New document
                await this.store.addDocument(processedDoc);
                result.documentsProcessed++;
              } else if (processedDoc.lastModified > existingDoc.lastModified) {
                // Document was updated
                await this.store.addDocument(processedDoc);
                result.documentsUpdated++;
              }
              // If document exists and is up to date, skip it
            } catch (error) {
              result.errors.push(`Failed to process file ${fileHandle.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        } catch (error) {
          result.errors.push(`Failed to scan folder ${permission.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      this.lastFullScan = Date.now();
    } finally {
      this.isScanning = false;
    }

    return result;
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<LocalIndexStats> {
    const storeStats = await this.store.getStats();
    const permissions = await this.fileManager.getStoredPermissions();
    const enabledFolders = permissions.filter(p => p.enabled).length;

    // For documentsNeedingUpdate, we would need to check file system timestamps
    // vs indexed timestamps. For now, return 0 as a placeholder.
    const documentsNeedingUpdate = 0;

    return {
      totalDocuments: storeStats.totalDocuments,
      totalFolders: enabledFolders,
      lastFullScan: this.lastFullScan,
      indexSizeBytes: storeStats.indexSizeBytes,
      documentsNeedingUpdate
    };
  }

  /**
   * Search local documents
   */
  async searchLocal(query: string): Promise<LocalDocumentSearchResult[]> {
    return await this.store.searchDocuments(query);
  }

  /**
   * Get document content by ID (returns summary for now)
   */
  async getDocumentContent(docId: string): Promise<string | null> {
    const document = await this.store.getDocument(docId);
    return document ? document.summary : null;
  }

  /**
   * Clean up resources and stop background scanning
   */
  dispose(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isScanning = false;
    this.directoryHandles.clear();
  }
}