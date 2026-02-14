import type { FolderPermission } from './types';

export class FileSystemManager {
  private static readonly STORAGE_KEY = 'aiqueryhub-folder-permissions';

  private readonly SUPPORTED_EXTENSIONS = [
    '.pdf', '.docx', '.doc', '.rtf', '.txt', '.md', '.fdx',
    '.xlsx', '.xls', '.csv'
  ];

  constructor() {
    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
      console.warn('File System Access API is not supported in this browser');
    }
  }

  /**
   * Request permission to access a folder using the File System Access API
   * @returns Promise<FolderPermission> The folder permission object
   * @throws Error if API not supported or user cancels
   */
  async requestFolderPermission(): Promise<FolderPermission> {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('File System Access API is not supported in this browser');
    }

    try {
      const directoryHandle = await window.showDirectoryPicker();

      // Request read permission
      const permission = await directoryHandle.requestPermission({ mode: 'read' });

      if (permission !== 'granted') {
        throw new Error('Permission denied to access folder');
      }

      const folderPermission: FolderPermission = {
        id: crypto.randomUUID(),
        path: directoryHandle.name,
        enabled: true,
        grantedAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      };

      // Store in localStorage (note: we can't serialize the handle directly)
      await this.storeFolderPermission(folderPermission);

      return folderPermission;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('User cancelled folder selection');
      }
      throw error;
    }
  }

  /**
   * Get all stored folder permissions from localStorage
   * @returns Promise<FolderPermission[]> Array of folder permissions
   */
  async getStoredPermissions(): Promise<FolderPermission[]> {
    try {
      const stored = localStorage.getItem(FileSystemManager.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const permissions: FolderPermission[] = JSON.parse(stored);
      return permissions;
    } catch (error) {
      console.error('Error retrieving stored permissions:', error);
      return [];
    }
  }

  /**
   * Scan a folder for supported document types
   * @param directoryHandle FileSystemDirectoryHandle to scan
   * @returns Promise<FileSystemFileHandle[]> Array of document files
   */
  async scanFolderForDocuments(directoryHandle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
    const documentFiles: FileSystemFileHandle[] = [];

    try {
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
          const fileHandle = entry as FileSystemFileHandle;

          if (this.isSupportedFileType(fileHandle.name)) {
            documentFiles.push(fileHandle);
          }
        }
      }
    } catch (error) {
      console.error('Error scanning folder for documents:', error);
      throw error;
    }

    return documentFiles;
  }

  /**
   * Check if a folder permission is still valid
   * @param directoryHandle FileSystemDirectoryHandle to check
   * @returns Promise<boolean> True if permission is granted
   */
  async checkFolderPermission(directoryHandle: FileSystemDirectoryHandle): Promise<boolean> {
    try {
      const permission = await directoryHandle.queryPermission({ mode: 'read' });
      return permission === 'granted';
    } catch (error) {
      console.error('Error checking folder permission:', error);
      return false;
    }
  }

  /**
   * Store a folder permission in localStorage
   * @param permission FolderPermission to store
   */
  private async storeFolderPermission(permission: FolderPermission): Promise<void> {
    try {
      const existingPermissions = await this.getStoredPermissions();
      const updatedPermissions = [...existingPermissions, permission];

      localStorage.setItem(
        FileSystemManager.STORAGE_KEY,
        JSON.stringify(updatedPermissions)
      );
    } catch (error) {
      console.error('Error storing folder permission:', error);
      throw error;
    }
  }

  /**
   * Check if a file type is supported for document processing
   * @param filename String filename to check
   * @returns boolean True if file type is supported
   */
  private isSupportedFileType(filename: string): boolean {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return this.SUPPORTED_EXTENSIONS.includes(extension);
  }
}