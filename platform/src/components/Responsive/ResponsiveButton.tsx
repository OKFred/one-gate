import React from 'react';
import { Button, Box } from '@mui/material';
import type { ButtonProps, BoxProps } from '@mui/material';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveButtonProps extends ButtonProps {
  mobileFullWidth?: boolean;
  mobileVariant?: ButtonProps['variant'];
  desktopVariant?: ButtonProps['variant'];
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  mobileFullWidth = true,
  mobileVariant,
  desktopVariant,
  variant = 'contained',
  fullWidth,
  ...props
}) => {
  const { isMobile } = useResponsive();

  const finalVariant =
    isMobile && mobileVariant
      ? mobileVariant
      : !isMobile && desktopVariant
        ? desktopVariant
        : variant;

  const finalFullWidth = isMobile ? mobileFullWidth : fullWidth;

  return <Button variant={finalVariant} fullWidth={finalFullWidth} {...props} />;
};

interface ResponsiveButtonGroupProps extends BoxProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  mobileDirection?: 'row' | 'column';
  desktopDirection?: 'row' | 'column';
  gap?: number | string;
}

export const ResponsiveButtonGroup: React.FC<ResponsiveButtonGroupProps> = ({
  children,
  direction,
  mobileDirection = 'column',
  desktopDirection = 'row',
  gap = 2,
  sx,
  ...props
}) => {
  const finalDirection = direction || { xs: mobileDirection, sm: desktopDirection };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: finalDirection,
        gap,
        alignItems: { xs: 'stretch', sm: 'center' },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};
