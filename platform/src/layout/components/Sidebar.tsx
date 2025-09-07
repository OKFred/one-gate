import React from 'react';

import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MailIcon from '@mui/icons-material/Mail';
import PeopleIcon from '@mui/icons-material/People';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router';
import { useResponsive } from '../responsive';
import { authUtils } from '@/utils/auth';

const drawerWidth = 240;

// 获取基础菜单项
const getNavItems = (): NavItem[] => {
  const baseItems = [
    { text: '主页', icon: <HomeIcon />, path: '/home' },
    { text: '我的', icon: <AccountCircleIcon />, path: '/user' },
    { text: '邮件', icon: <MailIcon />, path: '/mail' },
  ];

  // 检查用户是否为管理员，如果是则显示用户管理
  const userInfo = authUtils.getUserInfo();
  if (userInfo && userInfo.role === '管理员') {
    baseItems.splice(2, 0, {
      text: '用户管理',
      icon: <PeopleIcon />,
      path: '/user/management',
    });
  }

  return baseItems;
};

interface SidebarProps {
  open: boolean;
}

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  
  // 动态获取菜单项
  const navItems = getNavItems();

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
          <div className="bg-#1976d2">
            <div className="h-64px flex items-center pl-20px color-white">
              <Typography variant="h6" noWrap component="div">
                OKFred平台
              </Typography>
            </div>
            <List className="pb-0! pt-0!">
              {navItems.map((item) => (
                <ListItem component="button" key={item.text} onClick={() => navigate(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              ))}
            </List>
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
      <Box
        sx={{
          overflowX: 'auto',
          display: 'flex',
          px: 1,
        }}
      >
        {navItems.map((item) => (
          <Box
            key={item.text}
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
            onClick={() => navigate(item.path)}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>{item.icon}</Box>
            <Typography variant="caption">{item.text}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return isMobile ? mobileMenu : desktopSidebar;
};

export default Sidebar;
