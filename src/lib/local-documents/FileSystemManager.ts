/// <reference path="../../types/filesystem.d.ts" />
import type { FolderPermission } from './types';

export class FileSystemManager {
  private static readonly STORAGE_KEY = 'aiqueryhub-folder-permissions';

  private readonly SUPPORTED_EXTENSIONS = [
    '.pdf', '.docx', '.doc', '.rtf', '.txt', '.md', '.fdx',
    '.xlsx', '.xls', '.csv'
  ];

  constructor() {
    if (!('showDirectoryPicker' in window)) {
      console.warn('File System Access API is not supported in this browser');
    }
  }

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

      await this.storeFolderPermission(folderPermission);

      return folderPermission;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('User cancelled folder selection');
      }
      throw error;
    }
  }

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

  async checkFolderPermission(directoryHandle: FileSystemDirectoryHandle): Promise<boolean> {
    try {
      const permission = await directoryHandle.queryPermission({ mode: 'read' });
      return permission === 'granted';
    } catch (error) {
      console.error('Error checking folder permission:', error);
      return false;
    }
  }

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

  private isSupportedFileType(filename: string): boolean {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return this.SUPPORTED_EXTENSIONS.includes(extension);
  }
}