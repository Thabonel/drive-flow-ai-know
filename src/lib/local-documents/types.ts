export interface LocalDocumentIndex {
  id: string;              // file path hash
  filePath: string;        // absolute file path
  title: string;          // extracted or filename
  summary: string;        // AI-generated summary (200-500 words)
  keywords: string[];     // extracted key terms
  lastModified: number;   // file system timestamp
  lastIndexed: number;    // when we last processed it
  fileSize: number;       // for change detection
  mimeType: string;       // document type
  metadata: {
    author?: string;
    created?: string;
    wordCount?: number;
    pageCount?: number;
  };
}

export interface FolderPermission {
  id: string;           // unique identifier for the permission
  path: string;         // display path
  enabled: boolean;     // user can disable
  grantedAt: string;    // ISO timestamp when permission was granted
  lastAccessed: string; // ISO timestamp of last folder access
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