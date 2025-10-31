// Timeline page component

import React from 'react';
import { MagneticTimeline } from '@/components/magnetic-timeline/MagneticTimeline';
import { TimelineManager } from '@/components/timeline/TimelineManager';
import { Separator } from '@/components/ui/separator';

export default function Timeline() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Magnetic Timeline - 24-hour continuous coverage at the top */}
      <div>
        <MagneticTimeline />
      </div>

      <Separator className="my-8" />

      {/* Existing Timeline - Additional items below */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Additional Timeline Items</h2>
          <p className="text-sm text-muted-foreground">
            Add supplementary items that complement your day
          </p>
        </div>
        <TimelineManager />
      </div>
    </div>
  );
}
