// Timeline Manager Wrapper - Conditional Enhancement Based on Feature Flags
// Safely switches between original and enhanced timeline managers

import { useFeatureFlag } from '@/lib/feature-flags';
import { EnhancedTimelineManager } from './enhanced/EnhancedTimelineManager';
import { TimelineManager } from './TimelineManager';

interface TimelineManagerWrapperProps {
  className?: string;
  onCanvasReady?: (svg: SVGSVGElement) => void;
}

export const TimelineManagerWrapper: React.FC<TimelineManagerWrapperProps> = (props) => {
  const { isEnabled: isEnhancedEnabled } = useFeatureFlag('enhanced_timeline_manager');

  // Feature flag determines which timeline manager to use
  if (isEnhancedEnabled) {
    return <EnhancedTimelineManager {...props} initialInterfaceMode="intermediate" />;
  }

  // Fallback to original timeline manager
  return <TimelineManager {...props} />;
};