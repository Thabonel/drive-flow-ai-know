import { LocalDocumentIndex, FolderPermission } from '../types';

describe('LocalDocument Types', () => {
  test('imports should work', () => {
    expect(typeof LocalDocumentIndex).toBeDefined();
    expect(typeof FolderPermission).toBeDefined();
  });

  test('LocalDocumentIndex has required fields', () => {
    const doc: LocalDocumentIndex = {
      id: 'test-id',
      filePath: '/path/to/doc.pdf',
      title: 'Test Document',
      summary: 'Test summary',
      keywords: ['test', 'doc'],
      lastModified: Date.now(),
      lastIndexed: Date.now(),
      fileSize: 1024,
      mimeType: 'application/pdf',
      metadata: {}
    };
    expect(doc.id).toBe('test-id');
    expect(doc.filePath).toBe('/path/to/doc.pdf');
  });

  test('FolderPermission has required fields', () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    const permission: FolderPermission = {
      handle: mockHandle,
      path: '/Documents',
      lastScanned: Date.now(),
      enabled: true
    };
    expect(permission.enabled).toBe(true);
  });
});