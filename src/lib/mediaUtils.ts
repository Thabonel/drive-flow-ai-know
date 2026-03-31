/**
 * Media file utilities for video/audio handling
 * Client-side metadata extraction and classification
 */

// File type classification
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.wmv', '.flv', '.3gp'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
const AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];

export const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB - practical limit for direct upload
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export interface MediaAttachment {
  fileName: string;
  file: File;
  mimeType: string;
  fileSize: number;
  fileType: 'video' | 'audio';
  metadata?: VideoMetadata;
  thumbnailDataUrl?: string;
  frames?: string[]; // base64 data URLs of extracted frames
}

export function isVideoFile(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
  return VIDEO_EXTENSIONS.includes(ext) || VIDEO_MIMES.some(m => file.type.startsWith(m.split('/')[0]));
}

export function isAudioFile(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
  return AUDIO_EXTENSIONS.includes(ext) || AUDIO_MIMES.some(m => file.type === m);
}

export function isMediaFile(file: File): boolean {
  return isVideoFile(file) || isAudioFile(file);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return 'unknown';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}:${String(remainMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Extract video metadata using HTML5 video element
 */
export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);
    const fallback = { duration: 0, width: 0, height: 0 };

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      cleanup();
    };
    video.onerror = () => { resolve(fallback); cleanup(); };
    // Timeout after 10s
    setTimeout(() => { resolve(fallback); cleanup(); }, 10000);
  });
}

/**
 * Generate a thumbnail from a video file at t=2s
 */
export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(2, video.duration * 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(320, video.videoWidth);
        canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth) || 180;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        resolve('');
      }
      cleanup();
    };

    video.onerror = () => { resolve(''); cleanup(); };
    setTimeout(() => { resolve(''); cleanup(); }, 15000);
  });
}

/**
 * Extract key frames from a video for AI analysis
 * Samples frames at regular intervals, returns base64 JPEG data URLs
 */
export function extractVideoFrames(file: File, maxFrames: number = 10): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;

    const cleanup = () => URL.revokeObjectURL(url);
    const frames: string[] = [];

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) { resolve([]); cleanup(); return; }

      const interval = duration / (maxFrames + 1);
      let frameIndex = 0;
      const targetTimes = Array.from({ length: maxFrames }, (_, i) => interval * (i + 1));

      const captureNext = () => {
        if (frameIndex >= targetTimes.length) {
          resolve(frames);
          cleanup();
          return;
        }
        video.currentTime = targetTimes[frameIndex];
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          // Use reasonable resolution for AI analysis (max 512px wide)
          canvas.width = Math.min(512, video.videoWidth);
          canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth) || 288;
          canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL('image/jpeg', 0.6));
        } catch { /* skip frame */ }
        frameIndex++;
        captureNext();
      };

      captureNext();
    };

    video.onerror = () => { resolve([]); cleanup(); };
    // Generous timeout for large videos
    setTimeout(() => { resolve(frames); cleanup(); }, 60000);
  });
}

/**
 * Extract audio duration using HTML5 audio element
 */
export function extractAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.onloadedmetadata = () => { resolve(audio.duration); URL.revokeObjectURL(url); };
    audio.onerror = () => { resolve(0); URL.revokeObjectURL(url); };
    setTimeout(() => { resolve(0); URL.revokeObjectURL(url); }, 10000);
  });
}
