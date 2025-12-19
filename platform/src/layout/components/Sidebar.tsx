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
import { useResponsive } from '../responsive';
import Icon from '@/components/Icon';
import { getMenuList, type MenuItem } from '@/api/system/menu';

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [navItems, setNavItems] = useState<MenuItem[]>([]);

  // 异步加载菜单数据
  useEffect(() => {
    const loadMenus = async () => {
      const resData = await getMenuList();
      setNavItems(resData.data.data);
    };
    loadMenus();
  }, []);

  const handleMenuClick = (item: MenuItem) => {
    if (item.children && item.children.length > 0) {
      setExpandedMenus((prev) => ({
        ...prev,
        [String(item.id)]: !prev[String(item.id)],
      }));
    } else if (item.path) {
      navigate(item.path);
    }
  };

  // 渲染菜单项
  const renderMenuItem = (item: MenuItem, level = 0) => {
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
              {item.children!.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  // 桌面端侧边栏
  const desktopSidebar = (
    <Box
      component="nav"
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: { sm: 0 },
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
      aria-label="mailbox folders"
    >
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: open ? drawerWidth : 0,
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
            overflowX: 'hidden',
          },
        }}
        open
      >
        <div>
          <div>
            <div className="h-64px flex items-center pl-20px color-white">
              <Typography variant="h6" noWrap component="div">
                OKFred平台
              </Typography>
            </div>
            {navItems && navItems.length > 0 ? (
              <List className="pb-0! pt-0!">{navItems.map((item) => renderMenuItem(item))}</List>
            ) : null}
          </div>
        </div>
      </Drawer>
    </Box>
  );

  // 移动端底部菜单
  const mobileMenu = (
    <Box
      className="mobile-bottom-nav"
      sx={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: '100vw',
        bgcolor: 'background.paper',
        borderTop: '1px solid #e0e0e0',
        zIndex: 1201,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {navItems && navItems.length > 0 ? (
        <Box
          sx={{
            overflowX: 'auto',
            display: 'flex',
            px: 1,
          }}
        >
          {navItems.map((item) => (
            <Box
              key={item.id}
              sx={{
                flex: '0 0 auto',
                minWidth: 120,
                textAlign: 'center',
                py: 1,
                px: 1.5,
                cursor: 'pointer',
                color: 'text.secondary',
                '&:active': { color: 'primary.main' },
                transition: 'color 0.2s ease',
              }}
              onClick={() => (item.path ? navigate(item.path) : navigate('/mail'))}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                <Icon name={item.icon} size={24} />
              </Box>
              <Typography variant="caption">{item.text}</Typography>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );

  return isMobile ? mobileMenu : desktopSidebar;
};

export default Sidebar;
