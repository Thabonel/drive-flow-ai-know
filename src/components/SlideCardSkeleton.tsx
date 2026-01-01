import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SlideCardSkeletonProps {
  slideNumber?: number;
  showImage?: boolean;
}

/**
 * Skeleton loading state for a slide card
 * Displays a placeholder while the actual slide content is being generated
 */
export function SlideCardSkeleton({ slideNumber, showImage = true }: SlideCardSkeletonProps) {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-center justify-between">
          {/* Title skeleton */}
          <Skeleton className="h-6 w-3/4" />
          {slideNumber && (
            <span className="text-sm text-muted-foreground">
              Slide {slideNumber}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image skeleton - 16:9 aspect ratio */}
        {showImage && (
          <Skeleton className="w-full aspect-video rounded-lg" />
        )}

        {/* Content lines skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Speaker notes skeleton */}
        <div className="bg-muted/50 p-3 rounded space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Title slide skeleton
 */
export function TitleSlideCardSkeleton() {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 animate-pulse">
      <CardContent className="pt-6 space-y-4">
        {/* Title */}
        <Skeleton className="h-10 w-2/3 mx-auto" />
        {/* Subtitle */}
        <Skeleton className="h-6 w-1/2 mx-auto" />
      </CardContent>
    </Card>
  );
}

/**
 * Compact skeleton for slide thumbnails in a grid
 */
export function SlideThumbSkeleton({ slideNumber }: { slideNumber?: number }) {
  return (
    <div className="border rounded-lg p-2 animate-pulse bg-muted/30">
      {/* Thumbnail image placeholder */}
      <Skeleton className="w-full aspect-video rounded mb-2" />
      {/* Title placeholder */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-2/3" />
        {slideNumber && (
          <span className="text-xs text-muted-foreground">{slideNumber}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Progress indicator for slide generation
 */
export function SlideGenerationProgress({
  currentSlide,
  totalSlides,
  progress,
  status,
}: {
  currentSlide: number;
  totalSlides: number;
  progress: number;
  status: string;
}) {
  const statusMessages: Record<string, string> = {
    starting: 'Starting generation...',
    generating_structure: 'Creating deck structure...',
    generating_slides: 'Generating slide content...',
    generating_images: `Generating images (${currentSlide}/${totalSlides})...`,
    complete: 'Generation complete!',
    error: 'Generation failed',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {statusMessages[status] || 'Processing...'}
        </span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {status === 'generating_images' && (
        <p className="text-xs text-muted-foreground text-center">
          Slides appear as they complete - {currentSlide} of {totalSlides} ready
        </p>
      )}
    </div>
  );
}
