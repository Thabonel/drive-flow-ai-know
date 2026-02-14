import { LocalDocumentIndex } from './types';

interface ExtractedContent {
  text: string;
  metadata: {
    wordCount: number;
    author?: string;
    created?: string;
  };
}

export class DocumentProcessor {
  /**
   * Extract content from a file
   */
  async extractContent(file: File): Promise<ExtractedContent> {
    const text = await this.extractTextFromFile(file);
    const wordCount = this.calculateWordCount(text);

    return {
      text,
      metadata: {
        wordCount,
        // Additional metadata could be extracted here based on file type
      }
    };
  }

  /**
   * Generate a document ID from file path using hash
   */
  generateDocumentId(filePath: string): string {
    // Simple hash function for file path
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to base36 and pad to ensure 8 characters
    const hashString = Math.abs(hash).toString(36);
    return hashString.padStart(8, '0').substring(0, 8);
  }

  /**
   * Extract keywords from content
   */
  async extractKeywords(content: string): Promise<string[]> {
    // Simple keyword extraction by frequency
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};

    // Count word frequencies for words longer than 3 characters
    words.forEach(word => {
      // Clean word of punctuation
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    });

    // Handle multi-word phrases like "artificial intelligence"
    const phraseMatches = content.toLowerCase().match(/\b\w+\s+\w+\b/g);
    const phrases: string[] = phraseMatches || [];
    phrases.forEach(phrase => {
      if (phrase && phrase.length > 6) { // Only consider longer phrases
        wordFreq[phrase] = (wordFreq[phrase] || 0) + 1;
      }
    });

    // Sort by frequency and return top 10
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Generate summary from content
   */
  generateSummary(content: string): string {
    if (content.length <= 500) {
      return content;
    }
    return content.substring(0, 497) + '...';
  }

  /**
   * Process a file handle into a LocalDocumentIndex
   */
  async processFileIntoIndex(
    fileHandle: FileSystemFileHandle,
    filePath: string
  ): Promise<LocalDocumentIndex> {
    const file = await fileHandle.getFile();
    const { text, metadata } = await this.extractContent(file);

    const keywords = await this.extractKeywords(text);
    const summary = this.generateSummary(text);

    return {
      id: this.generateDocumentId(filePath),
      filePath,
      title: this.extractTitle(file.name, text),
      summary,
      keywords,
      lastModified: file.lastModified,
      lastIndexed: Date.now(),
      fileSize: file.size,
      mimeType: file.type,
      metadata
    };
  }

  /**
   * Extract text content from file based on type
   */
  private async extractTextFromFile(file: File): Promise<string> {
    const { type, name } = file;

    // Handle text files
    if (type === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
      // For testing environments, check if text() method exists
      if (typeof file.text === 'function') {
        return await file.text();
      }
      // Fallback for test environments where File might be mocked differently
      if (file instanceof File && file.size > 0) {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }
      // Ultimate fallback - read the content from mock files
      const arrayBuffer = await file.arrayBuffer();
      return new TextDecoder().decode(arrayBuffer);
    }

    // Handle binary files that need parsing
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return `[${type} content - requires parsing]`;
    }

    if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        name.endsWith('.docx')) {
      return `[${type} content - requires parsing]`;
    }

    if (type === 'application/msword' || name.endsWith('.doc')) {
      return `[${type} content - requires parsing]`;
    }

    // Unsupported file types
    throw new Error(`Unsupported file type: ${type || 'unknown'}`);
  }

  /**
   * Calculate word count from text
   */
  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract title from filename and content
   */
  private extractTitle(filename: string, content: string): string {
    // Remove file extension and return as title
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    // Could potentially extract title from content here
    // For now, just use the filename
    return nameWithoutExt;
  }
}