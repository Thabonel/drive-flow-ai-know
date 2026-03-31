/**
 * Media attachment preview for chat input area
 * Shows thumbnail, metadata, upload progress for video/audio files
 */

import { X, Film, Music, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize, formatDuration } from '@/lib/mediaUtils';

interface MediaPreviewProps {
  fileName: string;
  fileSize: number;
  fileType: 'video' | 'audio';
  duration?: number;
  dimensions?: { width: number; height: number };
  thumbnailUrl?: string;
  uploadProgress?: number; // 0-100, undefined = not uploading
  isProcessing?: boolean;
  onRemove?: () => void;
}

export function MediaPreview({
  fileName,
  fileSize,
  fileType,
  duration,
  dimensions,
  thumbnailUrl,
  uploadProgress,
  isProcessing,
  onRemove,
}: MediaPreviewProps) {
  const isUploading = uploadProgress !== undefined && uploadProgress < 100;

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border relative">
      {/* Thumbnail or icon */}
      <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={fileName} className="w-full h-full object-cover" />
        ) : fileType === 'video' ? (
          <Film className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Music className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{formatFileSize(fileSize)}</span>
          {duration ? <span>{formatDuration(duration)}</span> : null}
          {dimensions && dimensions.width > 0 ? (
            <span>{dimensions.width}x{dimensions.height}</span>
          ) : null}
        </div>

        {/* Upload progress bar */}
        {isUploading && (
          <div className="mt-1.5">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-1 mt-1">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <p className="text-xs text-primary">Extracting video frames for AI...</p>
          </div>
        )}
      </div>

      {/* Remove button */}
      {onRemove && !isUploading && !isProcessing && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default MediaPreview;
