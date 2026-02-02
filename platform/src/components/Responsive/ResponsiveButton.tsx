import React from 'react';
import { Button, Box } from '@mui/material';
import type { ButtonProps, BoxProps } from '@mui/material';
import { useResponsive } from '@/hooks/useResponsive';
import { usePermission } from '@/hooks/usePermission';

interface ResponsiveButtonProps extends ButtonProps {
  mobileFullWidth?: boolean;
  mobileVariant?: ButtonProps['variant'];
  desktopVariant?: ButtonProps['variant'];
  /** 权限码列表 */
  permissionCodes?: string[];
  /** 是否需要同时拥有所有权限 */
  requireAllPermissions?: boolean;
  /** 无权限时是否隐藏（true 隐藏，false 禁用） */
  hideWhenNoPermission?: boolean;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  mobileFullWidth = true,
  mobileVariant,
  desktopVariant,
  variant = 'contained',
  fullWidth,
  permissionCodes,
  requireAllPermissions = false,
  hideWhenNoPermission = true,
  ...props
}) => {
  const { isMobile } = useResponsive();
  const { hasAnyPermission, hasAllPermissions } = usePermission();

  const finalVariant =
    isMobile && mobileVariant
      ? mobileVariant
      : !isMobile && desktopVariant
        ? desktopVariant
        : variant;

  const finalFullWidth = isMobile ? mobileFullWidth : fullWidth;

  // 检查权限
  let hasAccess = true;
  if (permissionCodes && permissionCodes.length > 0) {
    hasAccess = requireAllPermissions
      ? hasAllPermissions(permissionCodes)
      : hasAnyPermission(permissionCodes);
  }

  // 无权限时处理
  if (!hasAccess) {
    if (hideWhenNoPermission) {
      return null; // 隐藏按钮
    }
    // 禁用按钮
    return <Button variant={finalVariant} fullWidth={finalFullWidth} disabled {...props} />;
  }

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
