import React from 'react';
import { Container } from '@mui/material';
import type { ContainerProps } from '@mui/material';

interface ResponsiveContainerProps extends Omit<ContainerProps, 'maxWidth'> {
  maxWidth?: ContainerProps['maxWidth'];
  mobilePadding?: number | string;
  desktopPadding?: number | string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'lg',
  mobilePadding = 2,
  desktopPadding = 3,
  sx,
  ...props
}) => {
  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        py: { xs: mobilePadding, md: desktopPadding },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Container>
  );
};
