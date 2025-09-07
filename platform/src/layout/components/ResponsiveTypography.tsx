import React from 'react';
import { Typography } from '@mui/material';
import type { TypographyProps } from '@mui/material';
import { useResponsiveValue } from '../hooks/useResponsive';
import type { BreakpointKey } from '../hooks/useResponsive';

interface ResponsiveTypographyProps extends Omit<TypographyProps, 'variant'> {
  variant?: TypographyProps['variant'];
  variants?: Partial<Record<BreakpointKey, TypographyProps['variant']>>;
  mobileAlign?: 'left' | 'center' | 'right';
  desktopAlign?: 'left' | 'center' | 'right';
}

export const ResponsiveTypography: React.FC<ResponsiveTypographyProps> = ({
  variant = 'body1',
  variants,
  mobileAlign = 'center',
  desktopAlign = 'left',
  sx,
  ...props
}) => {
  // 总是调用Hook，但只在有variants时使用结果
  const responsiveVariant = useResponsiveValue(variants || {});
  const finalVariant = variants && responsiveVariant ? responsiveVariant : variant;

  return (
    <Typography
      variant={finalVariant}
      sx={{
        textAlign: { xs: mobileAlign, md: desktopAlign },
        ...sx,
      }}
      {...props}
    />
  );
};

// 预定义的响应式标题组件
export const ResponsiveTitle: React.FC<Omit<ResponsiveTypographyProps, 'variants'>> = (props) => (
  <ResponsiveTypography
    variants={{
      xs: 'h5',
      sm: 'h5', 
      md: 'h4',
      lg: 'h4',
      xl: 'h3'
    }}
    fontWeight="bold"
    {...props}
  />
);

export const ResponsiveSubtitle: React.FC<Omit<ResponsiveTypographyProps, 'variants'>> = (props) => (
  <ResponsiveTypography
    variants={{
      xs: 'body1',
      sm: 'body1',
      md: 'h6',
      lg: 'h6',
      xl: 'h5'
    }}
    color="text.secondary"
    {...props}
  />
);
