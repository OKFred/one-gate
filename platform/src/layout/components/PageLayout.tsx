import React from 'react';
import { Box } from '@mui/material';
import type { ContainerProps, BoxProps } from '@mui/material';
import { ResponsiveContainer } from './ResponsiveContainer';
import { ResponsiveTitle } from './ResponsiveTypography';
import { ResponsiveButtonGroup } from './ResponsiveButton';

interface PageLayoutProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: ContainerProps['maxWidth'];
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  actions,
  children,
  maxWidth = 'lg',
  className,
}) => {
  return (
    <ResponsiveContainer maxWidth={maxWidth} className={className}>
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
        <ResponsiveTitle component="h1">
          {title}
        </ResponsiveTitle>
        
        {actions && (
          <ResponsiveButtonGroup>
            {actions}
          </ResponsiveButtonGroup>
        )}
      </Box>

      {/* 页面内容 */}
      {children}
    </ResponsiveContainer>
  );
};

interface SectionLayoutProps extends BoxProps {
  title?: string;
  children: React.ReactNode;
}

export const SectionLayout: React.FC<SectionLayoutProps> = ({
  title,
  children,
  sx,
  ...props
}) => {
  return (
    <Box sx={{ mb: { xs: 3, md: 4 }, ...sx }} {...props}>
      {title && (
        <ResponsiveTitle 
          variant="h5" 
          gutterBottom 
          fontWeight="bold"
          sx={{ mb: 2 }}
        >
          {title}
        </ResponsiveTitle>
      )}
      {children}
    </Box>
  );
};
