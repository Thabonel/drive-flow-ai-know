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
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
