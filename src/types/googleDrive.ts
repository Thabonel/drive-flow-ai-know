export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
}

export interface SelectedDriveItem {
  folder_id: string;
  folder_name: string;
  folder_path: string | null;
  mimeType: string;
  isFolder: boolean;
}

export interface DriveNavigationState {
  currentFolderId: string | 'root';
  folderName: string;
  breadcrumbs: Array<{ id: string; name: string }>;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
