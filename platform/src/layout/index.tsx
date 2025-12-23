import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Content from './components/Content';
import ScrollTop from './components/ScrollTop';
import { ResponsiveProvider } from './responsive';

export default function ResponsiveLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);

  // 监听屏幕尺寸变化，移动端时关闭侧边栏，桌面端时打开侧边栏
  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <ResponsiveProvider>
      <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CssBaseline />
        <Topbar setSidebarOpen={setSidebarOpen} />
        <Box sx={{ display: 'flex', pt: { xs: 7, sm: 8 } }}>
          <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />
          <Content sidebarOpen={sidebarOpen} />
        </Box>
        <ScrollTop />
      </Box>
    </ResponsiveProvider>
  );
}
