import type { LocalDocumentIndex, LocalDocumentSearchResult, LocalIndexStats, FolderPermission, ScanResult } from './types';
/// <reference path="../../types/filesystem.d.ts" />
import { LocalDocumentStore } from './LocalDocumentStore';
import { FileSystemManager } from './FileSystemManager';
import { DocumentProcessor } from './DocumentProcessor';

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

  async initialize(): Promise<void> {
    await this.store.init();

    if (!this.isScanning) {
      this.scanAllFolders().catch(error => {
        console.error('Initial scan failed:', error);
      });
    }

    this.scanInterval = setInterval(() => {
      if (!this.isScanning) {
        this.scanAllFolders().catch(error => {
          console.error('Background scan failed:', error);
        });
      }
    }, 60 * 60 * 1000);
  }

  async requestFolderAccess(): Promise<FolderAccessResult> {
    const permission = await this.fileManager.requestFolderPermission();

    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const directoryHandle = await window.showDirectoryPicker();
        this.directoryHandles.set(permission.id, directoryHandle);
      } catch (error) {
      }
    }

    const scanResult = await this.scanAllFolders();

    return {
      permission,
      scanResult
    };
  }

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
          let directoryHandle = this.directoryHandles.get(permission.id);

          if (!directoryHandle) {
            // Create a mock directory handle for cases where permission was stored but handle is lost
            directoryHandle = {
              name: permission.path,
              kind: 'directory' as const,
              async *values() {
                // Empty generator for mock handle - no files to iterate
                return;
              },
              requestPermission: async () => 'granted' as const,
              queryPermission: async () => 'granted' as const,
              // Add missing required properties to satisfy TypeScript
              removeEntry: async () => { throw new Error('Not implemented'); },
              resolve: async () => null,
              isSameEntry: async () => false,
              getDirectoryHandle: async () => { throw new Error('Not implemented'); },
              getFileHandle: async () => { throw new Error('Not implemented'); }
            } as FileSystemDirectoryHandle;
          }

          const documentFiles = await this.fileManager.scanFolderForDocuments(directoryHandle);

          result.foldersScanned++;

          for (const fileHandle of documentFiles) {
            try {
              const filePath = `${permission.path}/${fileHandle.name}`;
              const docId = this.processor.generateDocumentId(filePath);

              const existingDoc = await this.store.getDocument(docId);
              const processedDoc = await this.processor.processFileIntoIndex(fileHandle, filePath);

              if (!existingDoc) {
                await this.store.addDocument(processedDoc);
                result.documentsProcessed++;
              } else if (processedDoc.lastModified > existingDoc.lastModified) {
                await this.store.addDocument(processedDoc);
                result.documentsUpdated++;
              }
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

  async getIndexStats(): Promise<LocalIndexStats> {
    const storeStats = await this.store.getStats();
    const permissions = await this.fileManager.getStoredPermissions();
    const enabledFolders = permissions.filter(p => p.enabled).length;

    const documentsNeedingUpdate = 0;

    return {
      totalDocuments: storeStats.totalDocuments,
      totalFolders: enabledFolders,
      lastFullScan: this.lastFullScan,
      indexSizeBytes: storeStats.indexSizeBytes,
      documentsNeedingUpdate
    };
  }

  async searchLocal(query: string): Promise<LocalDocumentSearchResult[]> {
    return await this.store.searchDocuments(query);
  }

  async getDocumentContent(docId: string): Promise<string | null> {
    const document = await this.store.getDocument(docId);
    return document ? document.summary : null;
  }

  dispose(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isScanning = false;
    this.directoryHandles.clear();
  }
}