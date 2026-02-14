import type { LocalDocumentIndex, LocalDocumentSearchResult } from './types';

export class LocalDocumentStore {
  private dbName = 'aiqueryhub-local-documents';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {}

  public async init(): Promise<void> {
    await this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown database error'}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('documents')) {
          const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });

          documentsStore.createIndex('filePath', 'filePath', { unique: true });
          documentsStore.createIndex('lastModified', 'lastModified', { unique: false });
          documentsStore.createIndex('keywords', 'keywords', { multiEntry: true });
        }

        if (!db.objectStoreNames.contains('permissions')) {
          db.createObjectStore('permissions', { keyPath: 'path' });
        }
      };
    });
  }

  async addDocument(document: LocalDocumentIndex): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');

      const request = store.put(document);

      request.onerror = () => {
        reject(new Error(`Failed to add document: ${request.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getDocument(id: string): Promise<LocalDocumentIndex | null> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');

      const request = store.get(id);

      request.onerror = () => {
        reject(new Error(`Failed to get document: ${request.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  async deleteDocument(id: string): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');

      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Failed to delete document: ${request.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getAllDocuments(): Promise<LocalDocumentIndex[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');

      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get all documents: ${request.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  async searchDocuments(query: string): Promise<LocalDocumentSearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const documents = await this.getAllDocuments();
    const results: LocalDocumentSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const doc of documents) {
      const relevance = this.calculateRelevance(doc, queryLower);

      if (relevance > 0) {
        const excerpt = this.extractExcerpt(doc, queryLower);

        results.push({
          document: doc,
          relevance,
          excerpt,
          matchedFields: this.getMatchedFields(doc, queryLower)
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  async getStats(): Promise<{ totalDocuments: number; indexSizeBytes: number }> {
    const documents = await this.getAllDocuments();

    const totalDocuments = documents.length;
    const indexSizeBytes = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

    return {
      totalDocuments,
      indexSizeBytes
    };
  }

  async clearAll(): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');

      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear documents: ${request.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  private calculateRelevance(document: LocalDocumentIndex, queryLower: string): number {
    let score = 0;

    if (document.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    for (const keyword of document.keywords) {
      if (keyword.toLowerCase().includes(queryLower)) {
        score += 5;
      }
    }

    const summaryLower = document.summary.toLowerCase();
    const matches = summaryLower.split(queryLower).length - 1;
    score += matches;

    return score;
  }

  private extractExcerpt(document: LocalDocumentIndex, queryLower: string): string {
    const text = document.summary;
    const textLower = text.toLowerCase();
    const queryIndex = textLower.indexOf(queryLower);

    if (queryIndex === -1) {
      return text.length > 200 ? text.substring(0, 200) + '...' : text;
    }
    const contextWords = 15;
    const words = text.split(' ');
    const queryWordIndex = textLower.substring(0, queryIndex).split(' ').length - 1;

    const startIndex = Math.max(0, queryWordIndex - contextWords);
    const endIndex = Math.min(words.length, queryWordIndex + contextWords + 1);

    let excerpt = words.slice(startIndex, endIndex).join(' ');

    if (startIndex > 0) {
      excerpt = '...' + excerpt;
    }

    if (endIndex < words.length) {
      excerpt = excerpt + '...';
    }

    return excerpt;
  }

  private getMatchedFields(document: LocalDocumentIndex, queryLower: string): string[] {
    const matched: string[] = [];

    if (document.title.toLowerCase().includes(queryLower)) {
      matched.push('title');
    }

    if (document.summary.toLowerCase().includes(queryLower)) {
      matched.push('summary');
    }

    if (document.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))) {
      matched.push('keywords');
    }

    return matched;
  }
}