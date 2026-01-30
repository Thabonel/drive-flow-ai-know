import React, { useState, useRef } from 'react';
import { Share2, Download, Copy, Twitter, Linkedin, Facebook, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Achievement } from './AISuccessStory';
// Lazy load html2canvas to reduce bundle size
import { toast } from '@/hooks/use-toast';

interface AchievementShareProps {
  achievement: Achievement;
  open: boolean;
  onClose: () => void;
}

export function AchievementShare({ achievement, open, onClose }: AchievementShareProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Generate share text
  const getShareText = () => {
    let text = `${achievement.title}\n\n`;
    text += achievement.message;
    if (achievement.value) {
      text += `\n\n${achievement.value} ${achievement.unit || ''}`;
    }
    text += '\n\n#AIProductivity #TimelineAI';
    return text;
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      setCopied(true);
      toast({
        title: 'Copied to clipboard!',
        description: 'You can now paste this anywhere.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Download as image
  const handleDownload = async () => {
    if (!cardRef.current) return;

    setDownloading(true);
    try {
      // Dynamically import html2canvas only when needed
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `achievement-${achievement.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: 'Downloaded!',
        description: 'Your achievement card has been saved.',
      });
    } catch (error) {
      toast({
        title: 'Failed to download',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  // Share to Twitter
  const shareToTwitter = () => {
    const text = encodeURIComponent(getShareText());
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  // Share to LinkedIn
  const shareToLinkedIn = () => {
    const text = encodeURIComponent(getShareText());
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}&summary=${text}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  // Share to Facebook
  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(getShareText())}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  // Native share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: achievement.title,
          text: getShareText(),
          url: window.location.origin,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Achievement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview Card */}
          <div className="relative">
            <ShareableAchievementCard ref={cardRef} achievement={achievement} />
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share to social media:</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={shareToTwitter}
                className="flex-col h-auto py-3 gap-2"
              >
                <Twitter className="h-5 w-5 text-blue-400" />
                <span className="text-xs">Twitter</span>
              </Button>
              <Button
                variant="outline"
                onClick={shareToLinkedIn}
                className="flex-col h-auto py-3 gap-2"
              >
                <Linkedin className="h-5 w-5 text-blue-600" />
                <span className="text-xs">LinkedIn</span>
              </Button>
              <Button
                variant="outline"
                onClick={shareToFacebook}
                className="flex-col h-auto py-3 gap-2"
              >
                <Facebook className="h-5 w-5 text-blue-500" />
                <span className="text-xs">Facebook</span>
              </Button>
            </div>

            {/* Additional Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={handleCopy}
                className="flex-1 gap-2"
                disabled={copied}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Text
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="flex-1 gap-2"
                disabled={downloading}
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Downloading...' : 'Download Image'}
              </Button>
            </div>

            {/* Native Share (mobile) */}
            {navigator.share && (
              <Button
                onClick={handleNativeShare}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share via...
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Shareable card component (exported for canvas rendering)
interface ShareableAchievementCardProps {
  achievement: Achievement;
  className?: string;
}

export const ShareableAchievementCard = React.forwardRef<
  HTMLDivElement,
  ShareableAchievementCardProps
>(({ achievement, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('w-full aspect-[1.91/1] p-8 rounded-2xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 text-white relative overflow-hidden', className)}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-3xl font-bold mb-2">
              {achievement.title.replace(/[^\w\s]/g, '')}
            </h3>
            <p className="text-white/80 text-sm max-w-md">{achievement.message}</p>
          </div>
        </div>

        {/* Value Display */}
        {achievement.value && (
          <div className="my-auto">
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-black">{achievement.value}</span>
              {achievement.unit && (
                <span className="text-2xl font-semibold text-white/80">
                  {achievement.unit}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <p className="font-semibold text-sm">Timeline AI</p>
              <p className="text-xs text-white/60">Powered by AI</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60">
              {new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

ShareableAchievementCard.displayName = 'ShareableAchievementCard';

// Quick share button component
interface QuickShareButtonProps {
  achievement: Achievement;
  variant?: 'button' | 'icon';
  className?: string;
}

export function QuickShareButton({
  achievement,
  variant = 'button',
  className,
}: QuickShareButtonProps) {
  const [open, setOpen] = useState(false);

  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className={cn('h-8 w-8 p-0', className)}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <AchievementShare achievement={achievement} open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn('gap-2', className)}
      >
        <Share2 className="h-4 w-4" />
        Share Achievement
      </Button>
      <AchievementShare achievement={achievement} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
