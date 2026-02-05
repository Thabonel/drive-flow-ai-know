// Interface Mode Controller - Progressive Disclosure for Timeline Manager
// Reduces cognitive load by providing beginner/intermediate/expert modes

import { useState, useEffect, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  GraduationCap,
  User,
  Crown,
  Settings2,
  Info,
  ChevronDown,
  Lightbulb,
  Zap
} from 'lucide-react';

export type InterfaceMode = 'beginner' | 'intermediate' | 'expert';

interface InterfaceModeConfig {
  id: InterfaceMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  cognitiveLoad: number; // 1-10 scale
  featuresVisible: {
    // Primary actions (always visible)
    addItem: boolean;
    planDay: boolean;
    lockToggle: boolean;

    // Secondary actions
    zoomControls: boolean;
    navigation: boolean;
    calendarSync: boolean;
    moreActions: boolean;

    // Advanced features
    attentionSystem: boolean;
    roleZones: boolean;
    layers: boolean;
    templates: boolean;
    aiInsights: boolean;

    // Expert features
    multiplierDashboard: boolean;
    decisionBatching: boolean;
    weeklyCalibration: boolean;
    parkedItems: boolean;
    bookingLinks: boolean;
  };
  maxButtonsInPrimary: number;
  showDescriptiveText: boolean;
  showTooltips: boolean;
  compactMode: boolean;
}

const INTERFACE_MODES: Record<InterfaceMode, InterfaceModeConfig> = {
  beginner: {
    id: 'beginner',
    label: 'Simplified',
    description: 'Clean, focused interface with essential actions only',
    icon: GraduationCap,
    cognitiveLoad: 3,
    featuresVisible: {
      addItem: true,
      planDay: true,
      lockToggle: true,

      zoomControls: false,
      navigation: false,
      calendarSync: false,
      moreActions: true,

      attentionSystem: false,
      roleZones: false,
      layers: false,
      templates: false,
      aiInsights: false,

      multiplierDashboard: false,
      decisionBatching: false,
      weeklyCalibration: false,
      parkedItems: false,
      bookingLinks: false,
    },
    maxButtonsInPrimary: 4,
    showDescriptiveText: true,
    showTooltips: true,
    compactMode: false,
  },

  intermediate: {
    id: 'intermediate',
    label: 'Balanced',
    description: 'Core functionality with helpful guidance and productivity features',
    icon: User,
    cognitiveLoad: 5,
    featuresVisible: {
      addItem: true,
      planDay: true,
      lockToggle: true,

      zoomControls: true,
      navigation: true,
      calendarSync: true,
      moreActions: true,

      attentionSystem: true,
      roleZones: false,
      layers: true,
      templates: true,
      aiInsights: true,

      multiplierDashboard: false,
      decisionBatching: false,
      weeklyCalibration: true,
      parkedItems: true,
      bookingLinks: false,
    },
    maxButtonsInPrimary: 6,
    showDescriptiveText: false,
    showTooltips: true,
    compactMode: false,
  },

  expert: {
    id: 'expert',
    label: 'Full Power',
    description: 'All features visible for maximum productivity and customization',
    icon: Crown,
    cognitiveLoad: 8,
    featuresVisible: {
      addItem: true,
      planDay: true,
      lockToggle: true,

      zoomControls: true,
      navigation: true,
      calendarSync: true,
      moreActions: true,

      attentionSystem: true,
      roleZones: true,
      layers: true,
      templates: true,
      aiInsights: true,

      multiplierDashboard: true,
      decisionBatching: true,
      weeklyCalibration: true,
      parkedItems: true,
      bookingLinks: true,
    },
    maxButtonsInPrimary: 10,
    showDescriptiveText: false,
    showTooltips: false,
    compactMode: true,
  },
};

// Context for sharing interface mode across components
interface InterfaceModeContextType {
  currentMode: InterfaceMode;
  config: InterfaceModeConfig;
  setMode: (mode: InterfaceMode) => void;
  isFeatureVisible: (feature: keyof InterfaceModeConfig['featuresVisible']) => boolean;
}

const InterfaceModeContext = createContext<InterfaceModeContextType | undefined>(undefined);

// Hook for components to check feature visibility
export const useInterfaceMode = () => {
  const context = useContext(InterfaceModeContext);
  if (!context) {
    throw new Error('useInterfaceMode must be used within InterfaceModeProvider');
  }
  return context;
};

// Provider component
interface InterfaceModeProviderProps {
  children: React.ReactNode;
  initialMode?: InterfaceMode;
}

export const InterfaceModeProvider: React.FC<InterfaceModeProviderProps> = ({
  children,
  initialMode = 'intermediate'
}) => {
  const [currentMode, setCurrentMode] = useState<InterfaceMode>(() => {
    // Load from localStorage with fallback
    const saved = localStorage.getItem('timeline-interface-mode');
    if (saved && saved in INTERFACE_MODES) {
      return saved as InterfaceMode;
    }
    return initialMode;
  });

  // Save to localStorage when mode changes
  useEffect(() => {
    localStorage.setItem('timeline-interface-mode', currentMode);
  }, [currentMode]);

  const config = INTERFACE_MODES[currentMode];

  const isFeatureVisible = (feature: keyof InterfaceModeConfig['featuresVisible']) => {
    return config.featuresVisible[feature];
  };

  const value: InterfaceModeContextType = {
    currentMode,
    config,
    setMode: setCurrentMode,
    isFeatureVisible,
  };

  return (
    <InterfaceModeContext.Provider value={value}>
      {children}
    </InterfaceModeContext.Provider>
  );
};

// Control component for switching interface modes
interface InterfaceModeControllerProps {
  className?: string;
}

export const InterfaceModeController: React.FC<InterfaceModeControllerProps> = ({
  className
}) => {
  const { currentMode, config, setMode } = useInterfaceMode();
  const [showModeInfo, setShowModeInfo] = useState(false);

  // Track usage analytics
  const handleModeChange = (newMode: InterfaceMode) => {
    setMode(newMode);

    // Analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'interface_mode_changed', {
        from_mode: currentMode,
        to_mode: newMode,
        cognitive_load_change: INTERFACE_MODES[newMode].cognitiveLoad - config.cognitiveLoad
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Mode Selector */}
      <Popover open={showModeInfo} onOpenChange={setShowModeInfo}>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9"
              >
                <config.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>
            Interface complexity: {config.label} mode
            <br />
            Cognitive load: {config.cognitiveLoad}/10
          </TooltipContent>
        </Tooltip>

        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Interface Complexity
              </h3>
              <p className="text-xs text-muted-foreground">
                Choose your preferred level of interface complexity. This affects which features are visible and how they're organized.
              </p>
            </div>

            <div className="space-y-2">
              {Object.values(INTERFACE_MODES).map((mode) => {
                const Icon = mode.icon;
                const isActive = mode.id === currentMode;

                return (
                  <button
                    key={mode.id}
                    onClick={() => handleModeChange(mode.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{mode.label}</span>
                          <Badge
                            variant={isActive ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            Load: {mode.cognitiveLoad}/10
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {mode.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Current mode benefits */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-sm">Current Benefits</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {currentMode === 'beginner' && (
                  <>
                    <li>• Reduced decision fatigue with fewer options</li>
                    <li>• Clear guidance and helpful tooltips</li>
                    <li>• Focus on essential timeline management</li>
                  </>
                )}
                {currentMode === 'intermediate' && (
                  <>
                    <li>• Balance of power and simplicity</li>
                    <li>• Access to attention system and AI insights</li>
                    <li>• Productivity features without overwhelm</li>
                  </>
                )}
                {currentMode === 'expert' && (
                  <>
                    <li>• Full feature access for maximum productivity</li>
                    <li>• Advanced role-based and attention management</li>
                    <li>• Compact layout saves screen space</li>
                  </>
                )}
              </ul>
            </div>

            {/* Quick tip */}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center gap-2 text-blue-800">
                <Info className="h-3 w-3" />
                <span className="font-medium">Pro Tip</span>
              </div>
              <p className="text-blue-700 mt-1">
                Start with Simplified mode, then gradually increase complexity as you become comfortable with the timeline system.
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick cognitive load indicator */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
        <Zap className="h-3 w-3" />
        <span>Load: {config.cognitiveLoad}/10</span>
      </div>
    </div>
  );
};

// Utility function to determine if current mode should show a feature
export const shouldShowFeature = (
  feature: keyof InterfaceModeConfig['featuresVisible'],
  mode?: InterfaceMode
): boolean => {
  const targetMode = mode || 'intermediate'; // fallback if no context
  return INTERFACE_MODES[targetMode].featuresVisible[feature];
};

// Higher-order component for conditional feature rendering
interface ConditionalFeatureProps {
  feature: keyof InterfaceModeConfig['featuresVisible'];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ConditionalFeature: React.FC<ConditionalFeatureProps> = ({
  feature,
  children,
  fallback = null,
}) => {
  const { isFeatureVisible } = useInterfaceMode();

  return isFeatureVisible(feature) ? <>{children}</> : <>{fallback}</>;
};

// Component to show onboarding hints for beginners
export const BeginnerHints: React.FC = () => {
  const { currentMode } = useInterfaceMode();
  const [hintsVisible, setHintsVisible] = useState(() => {
    // Only show hints for beginners on first visit
    const hasSeenHints = localStorage.getItem('timeline-beginner-hints-seen');
    return currentMode === 'beginner' && !hasSeenHints;
  });

  const hideHints = () => {
    setHintsVisible(false);
    localStorage.setItem('timeline-beginner-hints-seen', 'true');
  };

  if (!hintsVisible || currentMode !== 'beginner') {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-3">
        <GraduationCap className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-2">Welcome to Simplified Mode!</h4>
          <p className="text-sm text-blue-800 mb-3">
            We've simplified the interface to show only the essential features.
            Here's how to get started:
          </p>
          <ul className="text-sm text-blue-700 space-y-1 mb-3">
            <li>• Click <strong>+ Add Item</strong> to create your first timeline event</li>
            <li>• Use <strong>Plan Day</strong> to access AI-powered scheduling</li>
            <li>• Toggle <strong>Lock/Unlock</strong> to follow real-time or browse freely</li>
          </ul>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={hideHints}>
              Got it!
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHintsVisible(false)}
            >
              Hide
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};