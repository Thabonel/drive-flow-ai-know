import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { DocumentSources } from '../DocumentSources';

// Mock problematic components that require providers
vi.mock('../../GoogleDrivePicker', () => ({
  default: () => <div data-testid="google-drive-picker">Google Drive Picker</div>
}));

vi.mock('../../DragDropUpload', () => ({
  default: () => <div data-testid="drag-drop-upload">Drag Drop Upload</div>
}));

vi.mock('../../CloudStorageConnector', () => ({
  default: () => <div data-testid="cloud-storage-connector">Cloud Storage Connector</div>
}));

vi.mock('@/components/local-documents/LocalDocumentIndexer', () => ({
  LocalDocumentIndexer: () => <div data-testid="local-document-indexer">Local Document Indexer</div>
}));

describe('DocumentSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders all tabs including local indexing', () => {
    render(<DocumentSources />);

    expect(screen.getByRole('tab', { name: /upload files/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /local indexing/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /google drive/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /cloud storage/i })).toBeInTheDocument();
  });

  test('shows local indexing tab when File System API supported', () => {
    // Mock File System API support
    Object.defineProperty(window, 'showDirectoryPicker', {
      value: vi.fn()
    });

    render(<DocumentSources />);

    expect(screen.getByRole('tab', { name: /local indexing/i })).toBeInTheDocument();
  });
});