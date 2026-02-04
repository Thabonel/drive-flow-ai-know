// Responsive design hooks for mobile-first development

import { useState, useEffect } from 'react';

export interface ResponsiveBreakpoints {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
  largeDesktop: boolean;
}

export const useResponsive = (): ResponsiveBreakpoints => {
  const [breakpoints, setBreakpoints] = useState<ResponsiveBreakpoints>({
    mobile: false,
    tablet: false,
    desktop: false,
    largeDesktop: false,
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      setBreakpoints({
        mobile: width < 768,
        tablet: width >= 768 && width < 1024,
        desktop: width >= 1024 && width < 1440,
        largeDesktop: width >= 1440,
      });
    };

    updateBreakpoints();
    window.addEventListener('resize', updateBreakpoints);
    return () => window.removeEventListener('resize', updateBreakpoints);
  }, []);

  return breakpoints;
};

export const useIsMobile = (): boolean => {
  const { mobile } = useResponsive();
  return mobile;
};

export const useIsTablet = (): boolean => {
  const { tablet } = useResponsive();
  return tablet;
};

export const useIsDesktop = (): boolean => {
  const { desktop, largeDesktop } = useResponsive();
  return desktop || largeDesktop;
};

// Utility hook for getting current breakpoint name
export const useCurrentBreakpoint = (): 'mobile' | 'tablet' | 'desktop' | 'largeDesktop' => {
  const breakpoints = useResponsive();

  if (breakpoints.largeDesktop) return 'largeDesktop';
  if (breakpoints.desktop) return 'desktop';
  if (breakpoints.tablet) return 'tablet';
  return 'mobile';
};