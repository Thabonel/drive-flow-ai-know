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
  async extractContent(file: File): Promise<ExtractedContent> {
    const text = await this.extractTextFromFile(file);
    const wordCount = this.calculateWordCount(text);

    return {
      text,
      metadata: {
        wordCount,
      }
    };
  }

  generateDocumentId(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path for document ID generation');
    }
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const hashString = Math.abs(hash).toString(36);
    return hashString.padStart(8, '0').substring(0, 8);
  }

  async extractKeywords(content: string): Promise<string[]> {
    if (!content || typeof content !== 'string') return [];
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};

    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    });

    const phraseMatches = content.toLowerCase().match(/\b\w+\s+\w+\b/g);
    const phrases: string[] = phraseMatches || [];
    phrases.forEach(phrase => {
      if (phrase && phrase.length > 6) {
        wordFreq[phrase] = (wordFreq[phrase] || 0) + 1;
      }
    });

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  generateSummary(content: string): string {
    if (!content || typeof content !== 'string') return '';
    if (content.length <= 500) {
      return content;
    }
    return content.substring(0, 497) + '...';
  }

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

  private async extractTextFromFile(file: File): Promise<string> {
    const { type, name } = file;

    if (type === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
      if (typeof file.text === 'function') {
        return await file.text();
      }
      if (file instanceof File && file.size > 0) {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              resolve(result);
            } else {
              reject(new Error('Failed to read file as text'));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsText(file);
        });
      }
      const arrayBuffer = await file.arrayBuffer();
      return new TextDecoder().decode(arrayBuffer);
    }

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

    // Excel files (.xlsx, .xls)
    if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        type === 'application/vnd.ms-excel' ||
        name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return await this.parseExcelFile(file);
    }

    // CSV files
    if (type === 'text/csv' || name.endsWith('.csv')) {
      return await this.parseCSVFile(file);
    }

    throw new Error(`Unsupported file type: ${type || name || 'unknown'}`);
  }

  private calculateWordCount(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractTitle(filename: string, content: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }

  private async parseExcelFile(file: File): Promise<string> {
    try {
      const XLSX = await import('xlsx');

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellFormula: false,
        cellStyles: false,
        cellDates: true,
      });

      let extractedContent = '';

      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];

        if (index > 0) {
          extractedContent += `\n\n--- Sheet: ${sheetName} ---\n`;
        } else if (workbook.SheetNames.length > 1) {
          extractedContent += `--- Sheet: ${sheetName} ---\n`;
        }

        const csvData = XLSX.utils.sheet_to_csv(worksheet, {
          skipHidden: true,
          blankrows: false,
        });

        if (csvData.trim()) {
          extractedContent += csvData;
        }
      });

      return extractedContent || '[Empty Excel file]';

    } catch (error) {
      return `[Excel file - parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  private async parseCSVFile(file: File): Promise<string> {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        return '[Empty CSV file]';
      }

      return text;
    } catch (error) {
      return `[CSV file - parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }
}