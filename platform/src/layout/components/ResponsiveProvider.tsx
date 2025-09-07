import React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ResponsiveContext } from '../hooks/useResponsive';
import type { ResponsiveState, BreakpointKey } from '../hooks/useResponsive';

interface ResponsiveProviderProps {
  children: React.ReactNode;
}

export const ResponsiveProvider: React.FC<ResponsiveProviderProps> = ({ children }) => {
  const theme = useTheme();
  
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // 确定当前断点
  let breakpoint: BreakpointKey = 'xl';
  if (isSmallMobile) breakpoint = 'xs';
  else if (isMobile) breakpoint = 'sm';
  else if (isTablet) breakpoint = 'md';
  else if (isDesktop) breakpoint = 'lg';

  const value: ResponsiveState = {
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    breakpoint,
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
};
