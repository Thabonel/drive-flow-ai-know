/**
 * Media file uploader - direct to Supabase Storage
 * Supports files up to 200MB with progress tracking
 */

import { supabase } from '@/integrations/supabase/client';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  path: string;
  publicUrl: string;
  error?: string;
}

/**
 * Upload a media file to Supabase Storage with real progress tracking.
 * Uses XMLHttpRequest for progress events (fetch API doesn't support upload progress).
 */
export async function uploadMediaFile(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const bucket = 'media-temp';
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${timestamp}_${sanitizedName}`;

  try {
    // Get current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { path: '', publicUrl: '', error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`;

    // Use XMLHttpRequest for upload progress tracking
    const result = await new Promise<UploadResult>((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Get the public URL
          const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
          resolve({ path: storagePath, publicUrl: data.publicUrl });
        } else {
          let errorMsg = `Upload failed (${xhr.status})`;
          try {
            const resp = JSON.parse(xhr.responseText);
            errorMsg = resp.error || resp.message || errorMsg;
          } catch { /* use default */ }
          resolve({ path: '', publicUrl: '', error: errorMsg });
        }
      };

      xhr.onerror = () => {
        resolve({ path: '', publicUrl: '', error: 'Network error during upload' });
      };

      xhr.ontimeout = () => {
        resolve({ path: '', publicUrl: '', error: 'Upload timed out' });
      };

      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('x-upsert', 'true');
      // Don't set Content-Type - let the browser set it with the correct boundary for the file
      xhr.timeout = 600000; // 10 minute timeout for large files

      // Send the file directly
      xhr.send(file);
    });

    return result;
  } catch (error) {
    return {
      path: '',
      publicUrl: '',
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a media file from storage
 */
export async function deleteMediaFile(storagePath: string): Promise<boolean> {
  const { error } = await supabase.storage.from('media-temp').remove([storagePath]);
  return !error;
}

/**
 * Get a signed URL for viewing/playing a media file (valid for 1 hour)
 */
export async function getMediaSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('media-temp')
    .createSignedUrl(storagePath, 3600); // 1 hour
  if (error) return null;
  return data.signedUrl;
}
