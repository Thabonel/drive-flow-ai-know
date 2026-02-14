export interface LocalDocumentIndex {
  id: string;
  filePath: string;
  title: string;
  summary: string;
  keywords: string[];
  lastModified: number;
  lastIndexed: number;
  fileSize: number;
  mimeType: string;
  metadata: {
    author?: string;
    created?: string;
    wordCount?: number;
    pageCount?: number;
  };
}

// Export alias for backward compatibility
export type LocalDocument = LocalDocumentIndex;

export interface FolderPermission {
  id: string;
  path: string;
  enabled: boolean;
  grantedAt: string;
  lastAccessed: string;
}

export interface LocalDocumentSearchResult {
  document: LocalDocumentIndex;
  relevance: number;
  excerpt: string;
  matchedFields: string[];
}

export interface LocalIndexStats {
  totalDocuments: number;
  totalFolders: number;
  lastFullScan: number;
  indexSizeBytes: number;
  documentsNeedingUpdate: number;
}

export interface CloudDocument {
  id: string;
  user_id: string;
  google_file_id: string;
  title: string;
  content: string;
  file_type: string;
  created_at: string;
  updated_at: string;
}

export interface HybridSearchResults {
  local: LocalDocumentSearchResult[];
  cloud: CloudDocument[];
  totalResults: number;
  searchTime: number;
}

export interface ScanResult {
  foldersScanned: number;
  documentsProcessed: number;
  documentsUpdated: number;
  errors: string[];
}