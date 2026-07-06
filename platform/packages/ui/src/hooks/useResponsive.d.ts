export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallMobile: boolean;
  breakpoint: BreakpointKey;
}
export declare const ResponsiveContext: import('react').Context<ResponsiveState | undefined>;
export declare const useResponsive: () => ResponsiveState;
