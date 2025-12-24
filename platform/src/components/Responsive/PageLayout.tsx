import React from 'react';
import { Box, Typography } from '@mui/material';
import type { ContainerProps, BoxProps } from '@mui/material';
import { ResponsiveButtonGroup } from '@/components/Responsive/ResponsiveButton';

interface PageLayoutProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: ContainerProps['maxWidth'];
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, actions, children, className }) => {
  return (
    <div className={className}>
      {/* 页面标题区域 */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 3,
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Typography variant="h4" fontWeight="bold">
          {title}
        </Typography>

        {actions && <ResponsiveButtonGroup>{actions}</ResponsiveButtonGroup>}
      </Box>

      {/* 页面内容 */}
      {children}
    </div>
  );
};

interface SectionLayoutProps extends BoxProps {
  title?: string;
  children: React.ReactNode;
}

export const SectionLayout: React.FC<SectionLayoutProps> = ({ title, children, sx, ...props }) => {
  return (
    <Box sx={{ mb: { xs: 3, md: 4 }, ...sx }} {...props}>
      {title && (
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
};
