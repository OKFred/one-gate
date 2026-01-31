import React, { useState, useEffect, useCallback } from 'react';

import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useNavigate, useLocation } from 'react-router';
import Icon from '@/components/Icon';
import type { SystemMenuTree } from './type';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import { useMenu } from '@/hooks/useMenu';

const drawerWidth = 240;
type MenuNode = Omit<SystemMenuTree, 'children'> & { children?: MenuNode[] };

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const { navItems } = useMenu();
  const { isMobile } = useResponsive();
  const t = useTranslation();

  // 规范化后端返回的数据，确保 children 为 MenuNode[]
  const normalizeMenus = useCallback((items: unknown): MenuNode[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const raw = item as Record<string, unknown>;
      const childrenRaw = Array.isArray(raw.children) ? raw.children : [];
      const children = normalizeMenus(childrenRaw);
      const { children: _children, ...rest } = raw;
      void _children;
      return { ...(rest as unknown as Omit<SystemMenuTree, 'children'>), children };
    });
  }, []);

  // 递归查找匹配路径的菜单项，并返回需要展开的菜单 ID 集合
  const findExpandedMenus = (items: MenuNode[], currentPath: string): Record<string, boolean> => {
    const expanded: Record<string, boolean> = {};

    const traverse = (nodes: MenuNode[], parentIds: string[] = []): boolean => {
      for (const item of nodes) {
        const currentIds = [...parentIds, String(item.id)];
        if (item.path === currentPath) {
          // 找到匹配项，设置所有父级为展开
          parentIds.forEach((id) => (expanded[id] = true));
          return true;
        }
        if (item.children && item.children.length > 0) {
          if (traverse(item.children, currentIds)) {
            // 子项中找到了，设置当前项为展开
            expanded[String(item.id)] = true;
            return true;
          }
        }
      }
      return false;
    };

    traverse(items);
    return expanded;
  };

  // 当菜单加载或路径变化时，自动展开到当前菜单
  useEffect(() => {
    if (navItems.length > 0) {
      const expanded = findExpandedMenus(navItems, location.pathname);
      setExpandedMenus(expanded);
    }
  }, [navItems, location.pathname]);

  const handleMenuClick = (item: MenuNode) => {
    if (item.children && item.children.length > 0) {
      setExpandedMenus((prev) => ({
        ...prev,
        [String(item.id)]: !prev[String(item.id)],
      }));
    } else if (item.path) {
      navigate(item.path);
      if (isMobile) {
        onClose?.();
      } // 移动端点击菜单后关闭侧边栏
    }
  };

  // 渲染菜单项
  const renderSystemMenuTree = (item: MenuNode, currentPath: string, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus[String(item.id)];
    const isActive = item.path === currentPath;

    return (
      <React.Fragment key={item.id}>
        <ListItemButton
          onClick={() => handleMenuClick(item)}
          sx={{
            pl: level > 0 ? 4 : 2,
            backgroundColor: isActive ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            {item.icon && <Icon name={item.icon} size={24} />}
          </ListItemIcon>
          <ListItemText primary={t(item.name)} />
          {hasChildren && (
            <Icon
              name={isExpanded ? 'material-symbols:expand-less' : 'material-symbols:expand-more'}
              size={20}
            />
          )}
        </ListItemButton>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {(item.children ?? []).map((child) =>
                renderSystemMenuTree(child, currentPath, level + 1),
              )}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  // 侧边栏内容
  const drawerContent = (
    <div>
      <div className="h-64px flex items-center pl-20px color-white">
        <Typography variant="h6" noWrap component="div">
          {t('topbar.title')}
        </Typography>
      </div>
      {navItems && navItems.length > 0 ? (
        <List className="pb-0! pt-0!">
          {navItems.map((item) => renderSystemMenuTree(item, location.pathname))}
        </List>
      ) : null}
    </div>
  );

  // 移动端侧边栏 (temporary drawer, 全屏宽度)
  const mobileSidebar = (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // 提升移动端性能
      }}
      sx={{
        display: { xs: 'block', sm: 'none' },
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: '100vw',
          top: '64px',
          height: 'calc(100% - 64px)',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );

  // 桌面端侧边栏
  const desktopSidebar = (
    <Box
      component="nav"
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: { sm: 0 },
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        display: { xs: 'none', sm: 'block' },
      }}
      aria-label="mailbox folders"
    >
      <Drawer
        variant="permanent"
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: open ? drawerWidth : 0,
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );

  return (
    <>
      {mobileSidebar}
      {desktopSidebar}
    </>
  );
};

export default Sidebar;
