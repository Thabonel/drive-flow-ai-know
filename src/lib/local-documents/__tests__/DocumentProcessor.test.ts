import { DocumentProcessor } from '../DocumentProcessor';
import { vi } from 'vitest';

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;

  beforeEach(() => {
    processor = new DocumentProcessor();
  });

  test('extracts content from text file', async () => {
    const mockFile = new File(['Hello world content'], 'test.txt', {
      type: 'text/plain'
    });

    const content = await processor.extractContent(mockFile);
    expect(content.text).toBe('Hello world content');
    expect(content.metadata.wordCount).toBe(3);
  });

  test('generates document ID from file path', () => {
    const id = processor.generateDocumentId('/path/to/document.pdf');
    expect(typeof id).toBe('string');
    expect(id).toHaveLength(8); // Short hash for efficiency
  });

  test('extracts keywords from content', async () => {
    const content = 'artificial intelligence machine learning data science';
    const keywords = await processor.extractKeywords(content);

    expect(keywords).toContain('artificial intelligence');
    expect(keywords).toContain('machine learning');
    expect(keywords.length).toBeLessThanOrEqual(10); // Limit keywords
  });

  test('generates summary from content', () => {
    const shortContent = 'This is a short document.';
    const longContent = 'A'.repeat(600) + ' This text should be truncated.';

    const shortSummary = processor.generateSummary(shortContent);
    const longSummary = processor.generateSummary(longContent);

    expect(shortSummary).toBe(shortContent);
    expect(longSummary).toHaveLength(500);
    expect(longSummary.endsWith('...')).toBe(true);
  });

  test('handles binary files with placeholder content', async () => {
    const mockPdf = new File(['mock pdf content'], 'test.pdf', {
      type: 'application/pdf'
    });

    const content = await processor.extractContent(mockPdf);
    expect(content.text).toBe('[application/pdf content - requires parsing]');
    expect(content.metadata.wordCount).toBe(5); // counting the placeholder words: [application/pdf content - requires parsing]
  });

  test('throws error for unsupported file types', async () => {
    const mockImage = new File(['mock image'], 'test.jpg', {
      type: 'image/jpeg'
    });

    await expect(processor.extractContent(mockImage)).rejects.toThrow('Unsupported file type: image/jpeg');
  });

  test('filters keywords by length', async () => {
    const content = 'a to the from and but also artificial intelligence data science machine learning';
    const keywords = await processor.extractKeywords(content);

    // Short words should be filtered out
    expect(keywords).not.toContain('a');
    expect(keywords).not.toContain('to');
    expect(keywords).not.toContain('the');

    // Long words should be included
    expect(keywords).toContain('artificial');
    expect(keywords).toContain('data');
    expect(keywords).toContain('science');
  });

  test('generates consistent document IDs', () => {
    const filePath = '/path/to/document.pdf';
    const id1 = processor.generateDocumentId(filePath);
    const id2 = processor.generateDocumentId(filePath);

    expect(id1).toBe(id2);
    expect(id1).toHaveLength(8);
  });

  test('processes complete file into index', async () => {
    // Mock FileSystemFileHandle
    const mockFile = new File(['This is test content for indexing'], 'test.txt', {
      type: 'text/plain',
      lastModified: 1640995200000 // Mock timestamp
    });

    const mockFileHandle = {
      getFile: vi.fn().mockResolvedValue(mockFile),
      name: 'test.txt'
    } as unknown as FileSystemFileHandle;

    const index = await processor.processFileIntoIndex(mockFileHandle, '/path/to/test.txt');

    expect(index.id).toHaveLength(8);
    expect(index.filePath).toBe('/path/to/test.txt');
    expect(index.title).toBe('test');
    expect(index.summary).toBe('This is test content for indexing');
    expect(index.keywords).toContain('this');
    expect(index.lastModified).toBe(1640995200000);
    expect(index.fileSize).toBe(mockFile.size);
    expect(index.mimeType).toBe('text/plain');
    expect(index.metadata.wordCount).toBe(6);
    expect(typeof index.lastIndexed).toBe('number');
  });
});