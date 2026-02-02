import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Content from './components/Content';
import ScrollTop from './components/ScrollTop';
import { useResponsive } from '../hooks/useResponsive';

export default function ResponsiveLayout() {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);

  // 监听屏幕尺寸变化，移动端时关闭侧边栏，桌面端时打开侧边栏
  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

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
