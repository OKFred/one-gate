import React, { useState, useEffect } from 'react';

import Drawer from '@mui/material/Drawer';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
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
  // 移动端：底部抽屉状态
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [activeParentMenu, setActiveParentMenu] = useState<MenuItem | null>(null);

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

  // 移动端：处理底部菜单点击
  const handleMobileMenuClick = (item: MenuItem) => {
    if (item.children && item.children.length > 0) {
      setActiveParentMenu(item);
      setBottomDrawerOpen(true);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  // 移动端：处理子菜单点击
  const handleSubMenuClick = (item: MenuItem) => {
    if (item.path) {
      navigate(item.path);
      setBottomDrawerOpen(false);
      setActiveParentMenu(null);
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
          {navItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            return (
              <Box
                key={item.id}
                sx={{
                  flex: '0 0 auto',
                  minWidth: 72,
                  textAlign: 'center',
                  py: 1,
                  px: 1,
                  cursor: 'pointer',
                  color: 'text.secondary',
                  '&:active': { color: 'primary.main' },
                  transition: 'color 0.2s ease',
                }}
                onClick={() => handleMobileMenuClick(item)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5, position: 'relative' }}>
                  <Icon name={item.icon} size={24} />
                  {hasChildren && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -2,
                        right: 8,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                      }}
                    />
                  )}
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{item.text}</Typography>
              </Box>
            );
          })}
        </Box>
      ) : null}

      {/* 子菜单上拉抽屉 */}
      <SwipeableDrawer
        anchor="bottom"
        open={bottomDrawerOpen}
        onClose={() => {
          setBottomDrawerOpen(false);
          setActiveParentMenu(null);
        }}
        onOpen={() => {}}
        disableSwipeToOpen
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '60vh',
          },
        }}
      >
        {/* 拖拽指示条 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              bgcolor: 'grey.300',
            }}
          />
        </Box>

        {/* 标题 */}
        {activeParentMenu && (
          <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon name={activeParentMenu.icon} size={20} />
            <Typography variant="subtitle1" fontWeight={600}>
              {activeParentMenu.text}
            </Typography>
          </Box>
        )}

        {/* 子菜单列表 */}
        <List sx={{ pb: 2 }}>
          {activeParentMenu?.children?.map((child) => (
            <ListItemButton
              key={child.id}
              onClick={() => handleSubMenuClick(child)}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {child.icon && <Icon name={child.icon} size={22} />}
              </ListItemIcon>
              <ListItemText primary={child.text} />
            </ListItemButton>
          ))}
        </List>
      </SwipeableDrawer>
    </Box>
  );

  return isMobile ? mobileMenu : desktopSidebar;
};

export default Sidebar;
