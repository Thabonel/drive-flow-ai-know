// Mobile-optimized components for 3-2-1 attention system
export { MobileRoleZoneSelector } from './MobileRoleZoneSelector';
export { MobileAttentionBudget } from './MobileAttentionBudget';
export { MobileDelegationPanel } from './MobileDelegationPanel';
export { MobileTimelineControls } from './MobileTimelineControls';
export { MobileCalibrationWizard } from './MobileCalibrationWizard';

// Re-export hook utilities for mobile interactions
export { useGestures, useTimelineItemGestures, useAttentionBudgetGestures } from '@/hooks/useGestures';

// Re-export haptics and mobile utilities
export {
  Vibrate,
  VoiceInput,
  MobilePerf,
  MobileNetwork,
  ScreenOrientation,
  initializeMobileOptimizations
} from '@/lib/haptics';