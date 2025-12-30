/**
 * Cost Estimation Modal
 *
 * Shows estimated costs for pitch deck generation before proceeding.
 * Particularly important for expressive mode which uses video generation.
 *
 * Cost breakdown:
 * - Static images: ~$0.01 per slide (Flux Pro 1.1)
 * - Videos (expressive): ~$0.20 per slide (Runway Gen-3, 4 seconds @ $0.05/sec)
 * - Caching reduces costs by ~30-50% for similar content
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Video, Image, Sparkles, Info } from 'lucide-react';

interface CostEstimationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numberOfSlides: number;
  animationStyle: 'none' | 'minimal' | 'standard' | 'expressive';
  includeImages: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Cost constants (in USD)
const COSTS = {
  staticImage: 0.01,      // Flux Pro 1.1
  videoPerSecond: 0.05,   // Runway Gen-3
  videoDuration: 4,       // seconds per video
  cacheReduction: 0.35,   // 35% cost reduction from caching
};

export default function CostEstimationModal({
  open,
  onOpenChange,
  numberOfSlides,
  animationStyle,
  includeImages,
  onConfirm,
  onCancel,
}: CostEstimationModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Calculate costs
  const isExpressive = animationStyle === 'expressive';
  const costPerSlide = isExpressive
    ? COSTS.videoPerSecond * COSTS.videoDuration
    : includeImages
    ? COSTS.staticImage
    : 0;

  const totalCostBeforeCache = costPerSlide * numberOfSlides;
  const estimatedCacheReduction = totalCostBeforeCache * COSTS.cacheReduction;
  const estimatedTotalCost = totalCostBeforeCache - estimatedCacheReduction;

  // Check if user has previously dismissed cost warnings
  useEffect(() => {
    const dismissed = localStorage.getItem('dismiss-cost-modal') === 'true';
    if (dismissed && open) {
      // Auto-confirm if user previously dismissed
      onConfirm();
      onOpenChange(false);
    }
  }, [open, onConfirm, onOpenChange]);

  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem('dismiss-cost-modal', 'true');
    }
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  // Don't show modal for free generations (no images)
  if (!includeImages) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" />
            Cost Estimation
          </DialogTitle>
          <DialogDescription>
            Review estimated costs before generating your pitch deck
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Generation Type */}
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            {isExpressive ? (
              <Video className="h-5 w-5 text-accent mt-0.5" />
            ) : (
              <Image className="h-5 w-5 text-primary mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold">
                {isExpressive ? 'Expressive Mode (AI Video)' : 'Static Images'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {isExpressive
                  ? `${COSTS.videoDuration} seconds of AI-generated video per slide using Runway Gen-3`
                  : 'AI-generated static images using Flux Pro 1.1'}
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {numberOfSlides} slides × ${costPerSlide.toFixed(2)}/slide
              </span>
              <span className="font-mono">${totalCostBeforeCache.toFixed(2)}</span>
            </div>

            {estimatedCacheReduction > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span className="text-sm flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Cache savings (~{(COSTS.cacheReduction * 100).toFixed(0)}%)
                </span>
                <span className="font-mono">-${estimatedCacheReduction.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-semibold">Estimated Total</span>
              <span className="text-xl font-bold font-mono text-primary">
                ${estimatedTotalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {isExpressive ? (
                <>
                  <strong>Video generation:</strong> Creates smooth, professional animations
                  but takes longer (30-60s per slide). Videos are cached to reduce costs for
                  similar content.
                </>
              ) : (
                <>
                  <strong>Static images:</strong> Fast generation with professional quality.
                  Perfect for most presentations.
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* Don't show again checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label
              htmlFor="dontShowAgain"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Don't show this again (auto-approve future generations)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-accent hover:bg-accent/90">
            Confirm & Generate (${estimatedTotalCost.toFixed(2)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
