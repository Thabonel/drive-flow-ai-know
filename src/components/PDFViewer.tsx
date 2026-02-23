import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  showDownload?: boolean;
  className?: string;
}

export function PDFViewer({ fileUrl, fileName, showDownload = true, className = '' }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Fetch PDF as blob to bypass X-Frame-Options blocking from Supabase Storage
  useEffect(() => {
    let cancelled = false;

    const fetchPdf = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);

        const blob = await response.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (err) {
        console.error('PDF fetch error:', err);
        if (!cancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    fetchPdf();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [fileUrl]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  const handleOpenInNewTab = () => {
    window.open(blobUrl || fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{fileName}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3ch] text-center">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              title="Open in New Tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            {showDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center p-12 bg-muted/50 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading PDF...</span>
          </div>
        )}

        {hasError && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load PDF. Please try{' '}
              <button
                onClick={handleOpenInNewTab}
                className="underline font-medium"
              >
                opening it in a new tab
              </button>
              {' '}or downloading it.
            </AlertDescription>
          </Alert>
        )}

        {blobUrl && (
          <div
            className={`relative ${isLoading || hasError ? 'hidden' : ''}`}
            style={{
              width: '100%',
              height: '600px',
              overflow: 'auto',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              backgroundColor: 'hsl(var(--muted))'
            }}
          >
            <iframe
              src={`${blobUrl}#zoom=${zoom}`}
              className="w-full h-full"
              style={{
                border: 'none',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                width: `${10000 / zoom}%`,
                height: `${10000 / zoom}%`
              }}
              title={fileName}
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          <p>
            <strong>Tip:</strong> Use the zoom controls above or open in a new tab for better viewing experience.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default PDFViewer;
