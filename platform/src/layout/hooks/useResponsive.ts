import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createContext, useContext } from 'react';

// 定义响应式断点类型
export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// 响应式状态接口
export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallMobile: boolean;
  breakpoint: BreakpointKey;
}

// 创建响应式上下文
export const ResponsiveContext = createContext<ResponsiveState | undefined>(undefined);

// 自定义Hook：获取响应式状态
export const useResponsive = (): ResponsiveState => {
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

  const state = {
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    breakpoint,
  };

  const context = useContext(ResponsiveContext);
  return context || state;
};

// 自定义Hook：获取响应式值
export const useResponsiveValue = <T>(values: Partial<Record<BreakpointKey, T>>): T | undefined => {
  const { breakpoint } = useResponsive();
  
  // 按优先级查找值
  const keys: BreakpointKey[] = ['xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = keys.indexOf(breakpoint);
  
  for (let i = currentIndex; i < keys.length; i++) {
    if (values[keys[i]] !== undefined) {
      return values[keys[i]];
    }
  }
  
  return undefined;
};
