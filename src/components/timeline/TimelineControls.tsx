// Timeline controls component (lock, zoom, add item)

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { ZOOM_STEP, MIN_ZOOM, MAX_ZOOM } from '@/lib/timelineConstants';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimelineControlsProps {
  zoomHorizontal: number;
  zoomVertical: number;
  onZoomHorizontalChange: (value: number) => void;
  onZoomVerticalChange: (value: number) => void;
  onFitAllLayers: () => void;
}

export function TimelineControls({
  zoomHorizontal,
  zoomVertical,
  onZoomHorizontalChange,
  onZoomVerticalChange,
  onFitAllLayers,
}: TimelineControlsProps) {
  const handleZoomIn = (isHorizontal: boolean) => {
    if (isHorizontal) {
      onZoomHorizontalChange(Math.min(zoomHorizontal + ZOOM_STEP, MAX_ZOOM));
    } else {
      onZoomVerticalChange(Math.min(zoomVertical + ZOOM_STEP, MAX_ZOOM));
    }
  };

  const handleZoomOut = (isHorizontal: boolean) => {
    if (isHorizontal) {
      onZoomHorizontalChange(Math.max(zoomHorizontal - ZOOM_STEP, MIN_ZOOM));
    } else {
      onZoomVerticalChange(Math.max(zoomVertical - ZOOM_STEP, MIN_ZOOM));
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4 p-1">
        {/* Horizontal Zoom */}
        <div className="space-y-2">
          <Label>Horizontal Zoom ({zoomHorizontal}%)</Label>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleZoomOut(true)}
                  disabled={zoomHorizontal <= MIN_ZOOM}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Zoom out horizontally
              </TooltipContent>
            </Tooltip>
            <Slider
              value={[zoomHorizontal]}
              onValueChange={(values) => onZoomHorizontalChange(values[0])}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              className="flex-1"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleZoomIn(true)}
                  disabled={zoomHorizontal >= MAX_ZOOM}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Zoom in horizontally
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-gray-500">
            Adjust time scale (wider = more detail)
          </p>
        </div>

        {/* Vertical Zoom */}
        <div className="space-y-2">
          <Label>Vertical Zoom ({zoomVertical}%)</Label>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleZoomOut(false)}
                  disabled={zoomVertical <= MIN_ZOOM}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Zoom out vertically
              </TooltipContent>
            </Tooltip>
            <Slider
              value={[zoomVertical]}
              onValueChange={(values) => onZoomVerticalChange(values[0])}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              className="flex-1"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleZoomIn(false)}
                  disabled={zoomVertical >= MAX_ZOOM}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Zoom in vertically
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-gray-500">
            Adjust layer spacing
          </p>
        </div>

        {/* Fit All Layers */}
        <Button
          onClick={onFitAllLayers}
          variant="outline"
          className="w-full"
        >
          <Maximize2 className="mr-2 h-4 w-4" />
          Fit All Layers
        </Button>
      </div>
    </TooltipProvider>
  );
}
