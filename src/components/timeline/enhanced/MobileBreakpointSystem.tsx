// Mobile Breakpoint System - Comprehensive Responsive Design Framework
// Provides consistent breakpoint handling across all timeline components

import { createContext, useContext, ReactNode } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

// Breakpoint configuration following mobile-first approach
export const BREAKPOINTS = {
  mobile: { min: 0, max: 767 },      // 0-767px
  tablet: { min: 768, max: 1023 },  // 768-1023px
  desktop: { min: 1024, max: 1439 }, // 1024-1439px
  largeDesktop: { min: 1440, max: Infinity }, // 1440px+
} as const;

// Responsive configuration for timeline components
interface ResponsiveConfig {
  // Button and control sizing
  buttonSize: 'sm' | 'default' | 'lg';
  compactMode: boolean;

  // Text and spacing
  fontSize: 'xs' | 'sm' | 'base' | 'lg';
  spacing: 'tight' | 'normal' | 'relaxed';

  // Timeline-specific
  layerHeight: number;
  pixelsPerHour: number;
  timeGridInterval: number; // Hours between major grid lines

  // Touch interactions
  touchTargetSize: number; // Minimum 44px for accessibility
  gestureEnabled: boolean;

  // UI adaptations
  showLabels: boolean;
  maxVisibleButtons: number;
  useBottomSheet: boolean; // For mobile modals
}

const RESPONSIVE_CONFIGS: Record<string, ResponsiveConfig> = {
  mobile: {
    buttonSize: 'sm',
    compactMode: true,
    fontSize: 'xs',
    spacing: 'tight',
    layerHeight: 40,
    pixelsPerHour: 60,
    timeGridInterval: 2,
    touchTargetSize: 44,
    gestureEnabled: true,
    showLabels: false,
    maxVisibleButtons: 3,
    useBottomSheet: true,
  },
  tablet: {
    buttonSize: 'default',
    compactMode: false,
    fontSize: 'sm',
    spacing: 'normal',
    layerHeight: 50,
    pixelsPerHour: 80,
    timeGridInterval: 1,
    touchTargetSize: 44,
    gestureEnabled: true,
    showLabels: true,
    maxVisibleButtons: 5,
    useBottomSheet: false,
  },
  desktop: {
    buttonSize: 'default',
    compactMode: false,
    fontSize: 'base',
    spacing: 'normal',
    layerHeight: 60,
    pixelsPerHour: 100,
    timeGridInterval: 1,
    touchTargetSize: 32,
    gestureEnabled: false,
    showLabels: true,
    maxVisibleButtons: 8,
    useBottomSheet: false,
  },
  largeDesktop: {
    buttonSize: 'lg',
    compactMode: false,
    fontSize: 'lg',
    spacing: 'relaxed',
    layerHeight: 70,
    pixelsPerHour: 120,
    timeGridInterval: 0.5,
    touchTargetSize: 32,
    gestureEnabled: false,
    showLabels: true,
    maxVisibleButtons: 12,
    useBottomSheet: false,
  },
};

// Context for responsive configuration
interface ResponsiveContextType {
  breakpoint: string;
  config: ResponsiveConfig;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;

  // Utility functions
  getResponsiveValue: <T>(values: Partial<Record<string, T>>) => T | undefined;
  shouldUseCompactLayout: () => boolean;
  getOptimalButtonCount: (maxButtons: number) => number;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

// Provider component
interface ResponsiveProviderProps {
  children: ReactNode;
}

export const ResponsiveProvider: React.FC<ResponsiveProviderProps> = ({ children }) => {
  const { mobile, tablet, desktop, largeDesktop } = useResponsive();

  const breakpoint = mobile ? 'mobile' : tablet ? 'tablet' : desktop ? 'desktop' : 'largeDesktop';
  const config = RESPONSIVE_CONFIGS[breakpoint];

  const getResponsiveValue = <T,>(values: Partial<Record<string, T>>): T | undefined => {
    // Mobile-first fallback chain
    return values[breakpoint] ||
           values.desktop ||
           values.tablet ||
           values.mobile ||
           Object.values(values)[0];
  };

  const shouldUseCompactLayout = (): boolean => {
    return config.compactMode || mobile;
  };

  const getOptimalButtonCount = (maxButtons: number): number => {
    return Math.min(maxButtons, config.maxVisibleButtons);
  };

  const value: ResponsiveContextType = {
    breakpoint,
    config,
    isMobile: mobile,
    isTablet: tablet,
    isDesktop: desktop,
    isLargeDesktop: largeDesktop,
    getResponsiveValue,
    shouldUseCompactLayout,
    getOptimalButtonCount,
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
};

// Hook to use responsive context
export const useResponsiveConfig = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsiveConfig must be used within ResponsiveProvider');
  }
  return context;
};

// Utility components for responsive rendering
interface ResponsiveShowProps {
  on?: ('mobile' | 'tablet' | 'desktop' | 'largeDesktop')[];
  children: ReactNode;
}

export const ResponsiveShow: React.FC<ResponsiveShowProps> = ({
  on = ['desktop', 'largeDesktop'],
  children
}) => {
  const { breakpoint } = useResponsiveConfig();

  if (on.includes(breakpoint as any)) {
    return <>{children}</>;
  }

  return null;
};

interface ResponsiveHideProps {
  on?: ('mobile' | 'tablet' | 'desktop' | 'largeDesktop')[];
  children: ReactNode;
}

export const ResponsiveHide: React.FC<ResponsiveHideProps> = ({
  on = ['mobile'],
  children
}) => {
  const { breakpoint } = useResponsiveConfig();

  if (!on.includes(breakpoint as any)) {
    return <>{children}</>;
  }

  return null;
};

// Responsive button component with proper touch targets
interface ResponsiveButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  showLabel?: boolean;
  icon?: ReactNode;
  label?: string;
  className?: string;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  disabled = false,
  showLabel,
  icon,
  label,
  className = '',
}) => {
  const { config, isMobile } = useResponsiveConfig();

  const shouldShowLabel = showLabel ?? config.showLabels;
  const minTouchTarget = config.touchTargetSize;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200 select-none touch-manipulation
        ${config.buttonSize === 'sm' ? 'px-3 py-1.5 text-xs' :
          config.buttonSize === 'lg' ? 'px-6 py-3 text-lg' :
          'px-4 py-2 text-sm'}
        ${variant === 'outline' ? 'border border-gray-300 bg-white hover:bg-gray-50' :
          variant === 'ghost' ? 'bg-transparent hover:bg-gray-100' :
          'bg-primary text-primary-foreground hover:bg-primary/90'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${className}
      `}
      style={{
        minHeight: isMobile ? `${minTouchTarget}px` : 'auto',
        minWidth: isMobile ? `${minTouchTarget}px` : 'auto',
      }}
    >
      {icon && (
        <span className="flex-shrink-0">
          {icon}
        </span>
      )}

      {shouldShowLabel && (label || children) && (
        <span className={isMobile ? 'sr-only' : ''}>
          {label || children}
        </span>
      )}

      {!shouldShowLabel && !icon && children}
    </button>
  );
};

// Responsive grid component for button layouts
interface ResponsiveButtonGridProps {
  children: ReactNode;
  maxColumns?: number;
}

export const ResponsiveButtonGrid: React.FC<ResponsiveButtonGridProps> = ({
  children,
  maxColumns = 6,
}) => {
  const { config, isMobile } = useResponsiveConfig();

  const columns = isMobile ?
    Math.min(2, maxColumns) : // Max 2 columns on mobile
    Math.min(maxColumns, config.maxVisibleButtons);

  return (
    <div
      className={`
        grid gap-2 w-full
        ${config.spacing === 'tight' ? 'gap-1' :
          config.spacing === 'relaxed' ? 'gap-4' : 'gap-2'}
      `}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {children}
    </div>
  );
};

// Responsive modal wrapper
interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const { config, isMobile } = useResponsiveConfig();

  if (!isOpen) return null;

  if (config.useBottomSheet) {
    // Bottom sheet for mobile
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
        <div
          className={`
            w-full bg-white rounded-t-lg shadow-lg max-h-[90vh] overflow-y-auto
            transform transition-transform duration-300
            ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          `}
        >
          <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              ×
            </button>
          </div>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Regular modal for desktop
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className={`
          bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto
          ${isMobile ? 'mx-4' : 'mx-auto'}
        `}
      >
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// CSS utility classes for responsive design
export const responsiveClasses = {
  // Spacing
  spacing: {
    tight: 'space-y-1 gap-1',
    normal: 'space-y-2 gap-2',
    relaxed: 'space-y-4 gap-4',
  },

  // Typography
  text: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  },

  // Touch targets (minimum 44px for mobile accessibility)
  touchTarget: {
    mobile: 'min-h-[44px] min-w-[44px]',
    desktop: 'min-h-[32px] min-w-[32px]',
  },

  // Responsive visibility
  showOnMobile: 'block md:hidden',
  hideOnMobile: 'hidden md:block',
  showOnTablet: 'hidden md:block lg:hidden',
  showOnDesktop: 'hidden lg:block',
};