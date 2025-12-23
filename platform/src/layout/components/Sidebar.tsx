import React, { useState, useEffect } from 'react';

import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router';
import Icon from '@/components/Icon';
import { treeFn } from '@/api/system/menu';
import type { SystemMenuTree } from './type';
import { useResponsive } from '../responsive';

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [navItems, setNavItems] = useState<SystemMenuTree[]>([]);
  const { isMobile } = useResponsive();

  // 异步加载菜单数据
  useEffect(() => {
    const loadMenus = async () => {
      const resData = await treeFn();
      setNavItems(resData.data.data);
    };
    loadMenus();
  }, []);

  const handleMenuClick = (item: SystemMenuTree) => {
    if (item.children && item.children.length > 0) {
      setExpandedMenus((prev) => ({
        ...prev,
        [String(item.id)]: !prev[String(item.id)],
      }));
    } else if (item.path) {
      navigate(item.path);
      // 移动端点击菜单后关闭侧边栏
      isMobile && onClose?.();
    }
  };

  // 渲染菜单项
  const renderSystemMenuTree = (item: SystemMenuTree, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus[String(item.id)];

    return (
      <React.Fragment key={item.id}>
        <ListItemButton onClick={() => handleMenuClick(item)} sx={{ pl: level > 0 ? 4 : 2 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            {item.icon && <Icon name={item.icon} size={24} />}
          </ListItemIcon>
          <ListItemText primary={item.text} />
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
              {item.children!.map((child) => renderSystemMenuTree(child, level + 1))}
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
          OKFred平台
        </Typography>
      </div>
      {navItems && navItems.length > 0 ? (
        <List className="pb-0! pt-0!">{navItems.map((item) => renderSystemMenuTree(item))}</List>
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
