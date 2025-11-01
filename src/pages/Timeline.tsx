// Timeline page component

import React from 'react';
import { TimelineWithDnd } from '@/components/timeline/TimelineWithDnd';

export default function Timeline() {
  return (
    <div className="container mx-auto py-6">
      <TimelineWithDnd />
    </div>
  );
}
