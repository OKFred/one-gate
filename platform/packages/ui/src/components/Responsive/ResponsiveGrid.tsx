import React from 'react';
import { Box } from '@mui/material';
import type { BoxProps } from '@mui/material';
import type { BreakpointKey } from '../../hooks/useResponsive';

interface ResponsiveGridProps extends Omit<BoxProps, 'display'> {
  columns?: Partial<Record<BreakpointKey, number | string>>;
  gap?: number | string;
  mobileGap?: number | string;
  desktopGap?: number | string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3 },
  gap,
  mobileGap = 2,
  desktopGap = 3,
  sx,
  ...props
}) => {
  const finalGap = gap || { xs: mobileGap, md: desktopGap };

  // 构建grid-template-columns的响应式值
  const gridTemplateColumns: Record<string, string> = {};
  Object.entries(columns).forEach(([breakpoint, colCount]) => {
    if (typeof colCount === 'number') {
      gridTemplateColumns[breakpoint] = `repeat(${colCount}, 1fr)`;
    } else {
      gridTemplateColumns[breakpoint] = colCount;
    }
  });

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: gridTemplateColumns,
        gap: finalGap,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// 预定义的卡片网格
export const CardGrid: React.FC<Omit<ResponsiveGridProps, 'columns'>> = (props) => (
  <ResponsiveGrid
    columns={{
      xs: 1,
      sm: 2,
      md: 2,
      lg: 3,
      xl: 4,
    }}
    {...props}
  />
);

// 预定义的仪表板网格
export const DashboardGrid: React.FC<Omit<ResponsiveGridProps, 'columns'>> = (props) => (
  <ResponsiveGrid
    columns={{
      xs: 1,
      sm: 2,
      md: 2,
      lg: 4,
      xl: 4,
    }}
    {...props}
  />
);
