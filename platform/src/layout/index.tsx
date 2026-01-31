import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Content from './components/Content';
import ScrollTop from './components/ScrollTop';
import { useResponsive } from '../hooks/useResponsive';
import { useLocation, useNavigate } from 'react-router';
import { useMenu } from '@/hooks/useMenu';
import type { SystemMenuTree } from './components/type';
interface MenuNode extends Omit<SystemMenuTree, 'children'> {
  children?: MenuNode[];
}

export default function ResponsiveLayout() {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);
  const location = useLocation();
  const navigate = useNavigate();
  const { navItems } = useMenu();

  // 监听屏幕尺寸变化，移动端时关闭侧边栏，桌面端时打开侧边栏
  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // 检查当前路径是否在菜单中
  React.useEffect(() => {
    if (navItems.length === 0) return; // 菜单数据未加载，跳过检查

    const isValidPath = (items: MenuNode[], path: string): boolean => {
      for (const item of items) {
        if (item.path === path) return true;
        if (item.children && item.children.length > 0) {
          if (isValidPath(item.children, path)) return true;
        }
      }
      return false;
    };

    if (!isValidPath(navItems, location.pathname)) {
      navigate('/error/NotFound');
    }
  }, [navItems, location.pathname, navigate]);

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div>
      <Box sx={{ width: '100vw', minHeight: '100vh' }}>
        <CssBaseline />
        <Topbar setSidebarOpen={setSidebarOpen} />
        <Box sx={{ display: 'flex', pt: { xs: 7, sm: 8 } }}>
          <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />
          <Content sidebarOpen={sidebarOpen} />
        </Box>
        <ScrollTop />
      </Box>
    </div>
  );
}
