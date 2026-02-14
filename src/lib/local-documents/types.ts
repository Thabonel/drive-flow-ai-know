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
  handle: FileSystemDirectoryHandle; // persistent browser permission
  path: string;                      // display path
  lastScanned: number;              // timestamp
  enabled: boolean;                 // user can disable
}

export interface LocalDocumentSearchResult {
  document: LocalDocumentIndex;
  relevanceScore: number;
  matchedKeywords: string[];
  summaryExcerpt: string;
}

export interface LocalIndexStats {
  totalDocuments: number;
  totalFolders: number;
  lastFullScan: number;
  indexSizeBytes: number;
  documentsNeedingUpdate: number;
}