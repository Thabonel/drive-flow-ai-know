import { supabase } from '@/integrations/supabase/client';
import { arrayBufferToBase64 } from '@/lib/base64Utils';

export interface ParsedDocument {
  content: string;
  metadata: {
    title?: string;
    pageCount?: number;
    fileType: string;
    hasImages?: boolean;
    extractedImages?: string[];
  };
}

export class DocumentParserService {
  private static readonly SUPPORTED_FORMATS = {
    // Text formats
    'text/plain': true,
    'text/markdown': true,
    'application/json': true,
    'application/xml': true,
    'text/xml': true,
    'text/csv': true,

    // PDF
    'application/pdf': true,

    // Microsoft Office
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true, // .docx
    'application/msword': true, // .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true, // .xlsx
    'application/vnd.ms-excel': true, // .xls
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true, // .pptx
    'application/vnd.ms-powerpoint': true, // .ppt

    // Other document formats
    'application/rtf': true,
    'application/vnd.oasis.opendocument.text': true, // .odt
    'application/vnd.oasis.opendocument.spreadsheet': true, // .ods
    'application/vnd.oasis.opendocument.presentation': true, // .odp

    // Screenwriting formats
    'application/x-final-draft': true, // .fdx (Final Draft)

    // Audio formats (for transcription)
    'audio/mpeg': true, // .mp3
    'audio/wav': true,
    'audio/m4a': true,
    'audio/ogg': true,

    // Images (for OCR)
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/tiff': true,
  };

  static isSupported(mimeType: string): boolean {
    return this.SUPPORTED_FORMATS[mimeType as keyof typeof this.SUPPORTED_FORMATS] || false;
  }

  static getSupportedExtensions(): string[] {
    return [
      '.txt', '.md', '.json', '.xml', '.csv',
      '.pdf',
      '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
      '.rtf', '.odt', '.ods', '.odp',
      '.fdx', // Final Draft screenwriting
      '.mp3', '.wav', '.m4a', '.ogg',
      '.jpg', '.jpeg', '.png', '.webp', '.tiff'
    ];
  }

  static async parseDocument(file: File): Promise<ParsedDocument> {
    try {
      // Handle Final Draft FDX files (XML-based screenwriting format) via edge function
      if (file.name.toLowerCase().endsWith('.fdx')) {
        return this.parseBinaryDocument(file);
      }

      // Handle text files directly
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        return this.parseTextFile(file);
      }

      // Handle JSON and simple structured formats
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        return this.parseJsonFile(file);
      }

      // For binary documents, use the document parsing service
      return this.parseBinaryDocument(file);
    } catch (error) {
      console.error('Document parsing error:', error);
      throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async parseTextFile(file: File): Promise<ParsedDocument> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve({
          content,
          metadata: {
            title: file.name.replace(/\.[^/.]+$/, ''),
            fileType: 'text',
          }
        });
      };
      
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  private static async parseJsonFile(file: File): Promise<ParsedDocument> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const jsonData = JSON.parse(content);
          
          // Format JSON for better readability
          const formattedContent = JSON.stringify(jsonData, null, 2);
          
          resolve({
            content: formattedContent,
            metadata: {
              title: file.name.replace(/\.[^/.]+$/, ''),
              fileType: 'json',
            }
          });
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read JSON file'));
      reader.readAsText(file);
    });
  }

  private static async parseBinaryDocument(file: File): Promise<ParsedDocument> {
    // First, upload the file temporarily to parse it
    const formData = new FormData();
    formData.append('file', file);
    
    // Create a temporary blob URL for the file
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to base64 for API call
    const base64 = arrayBufferToBase64(uint8Array);
    
    try {
      // Use the document parsing edge function
      const { data, error } = await supabase.functions.invoke('parse-document', {
        body: {
          fileName: file.name,
          mimeType: file.type,
          fileData: base64,
        }
      });

      if (error) {
        throw new Error(`Document parsing failed: ${error.message}`);
      }

      return {
        content: data.content || '',
        metadata: {
          title: data.title || file.name.replace(/\.[^/.]+$/, ''),
          pageCount: data.pageCount,
          fileType: this.getFileTypeFromMime(file.type),
          hasImages: data.hasImages,
          extractedImages: data.extractedImages,
        }
      };
    } catch (error) {
      // Fallback: save file info without content for unsupported formats
      console.warn('Document parsing failed, saving without content:', error);
      return {
        content: `[Binary file: ${file.name}]\nFile type: ${file.type}\nSize: ${this.formatFileSize(file.size)}\n\nThis file format is not yet supported for content extraction.`,
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileType: this.getFileTypeFromMime(file.type),
        }
      };
    }
  }

  private static getFileTypeFromMime(mimeType: string): string {
    const typeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/rtf': 'rtf',
      'application/x-final-draft': 'fdx',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    };

    return typeMap[mimeType] || mimeType.split('/')[1] || 'unknown';
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
