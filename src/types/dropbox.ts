export interface DropboxItem {
  id: string;
  name: string;
  path_display: string;
  path_lower: string;
  '.tag': 'file' | 'folder';
}

export interface SelectedDropboxItem {
  folder_id: string;
  folder_name: string;
  folder_path: string | null;
}

declare global {
  interface Window {
    Dropbox: any;
  }
}
