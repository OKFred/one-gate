import React from 'react';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import type { ContainerProps, BoxProps } from '@mui/material';
import { ResponsiveButtonGroup } from '@/components/Responsive/ResponsiveButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMenu } from '@/hooks/useMenu';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsive } from '@/hooks/useResponsive';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import type { MenuNode } from '@/contexts/MenuContext';

interface PageLayoutProps {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: ContainerProps['maxWidth'];
  className?: string;
}

// 递归与回退前缀匹配算法获取路径
function findBreadcrumbPath(items: MenuNode[], pathname: string): MenuNode[] {
  const traverse = (
    nodes: MenuNode[],
    currentPath: string,
    parentPath: MenuNode[] = [],
  ): MenuNode[] | null => {
    for (const node of nodes) {
      const nodePath = [...parentPath, node];
      if (node.path && node.path === currentPath) {
        return nodePath;
      }
      if (node.children && node.children.length > 0) {
        const found = traverse(node.children, currentPath, nodePath);
        if (found) return found;
      }
    }
    return null;
  };

  // 1. 尝试精准完全匹配
  let path = traverse(items, pathname);
  if (path) return path;

  // 2. 逐级前缀回退匹配
  let tempPathname = pathname;
  while (tempPathname.includes('/')) {
    const lastSlash = tempPathname.lastIndexOf('/');
    if (lastSlash <= 0) break;
    tempPathname = tempPathname.substring(0, lastSlash);
    path = traverse(items, tempPathname);
    if (path) return path;
  }

  return [];
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, actions, children, className }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { navItems } = useMenu();
  const t = useTranslation();
  const { isMobile } = useResponsive();

  const matchedPath = React.useMemo(() => {
    return findBreadcrumbPath(navItems || [], location.pathname);
  }, [navItems, location.pathname]);

  const breadcrumbs = React.useMemo(() => {
    const list = matchedPath.map((node) => ({
      label: t(node.name || ''),
      path: node.children && node.children.length > 0 ? undefined : node.path || undefined,
    }));

    // 若无匹配或最后一项的 path 并不等于 location.pathname，且当前有 title 属性，将其作为最后一项追加
    const lastMatched = matchedPath[matchedPath.length - 1];
    if (title) {
      if (!lastMatched || lastMatched.path !== location.pathname) {
        list.push({ label: title, path: undefined });
      }
    } else if (list.length === 0) {
      // 保证至少有一项
      list.push({ label: 'System', path: undefined });
    }

    return list;
  }, [matchedPath, title, location.pathname, t]);

  const handleLinkClick = (event: React.MouseEvent, path?: string) => {
    event.preventDefault();
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className={className}>
      {/* 页面标题区域：使用面包屑替换原有大标题 */}
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
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          maxItems={isMobile ? 2 : undefined}
          sx={{
            '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap', alignItems: 'center' },
            '& .MuiBreadcrumbs-li': { whiteSpace: 'nowrap' },
          }}
        >
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            if (isLast) {
              return (
                <Typography
                  key={index}
                  sx={{
                    color: 'text.primary',
                    fontWeight: 'bold',
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  }}
                >
                  {item.label}
                </Typography>
              );
            }
            return (
              <Link
                key={index}
                underline="hover"
                color="inherit"
                href={item.path || '#'}
                onClick={(e) => handleLinkClick(e, item.path)}
                sx={{
                  cursor: item.path ? 'pointer' : 'default',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  color: 'text.secondary',
                  '&:hover': item.path ? {} : { textDecoration: 'none', color: 'inherit' },
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </Breadcrumbs>

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
        <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
};
