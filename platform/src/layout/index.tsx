import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Content from './components/Content';
import GoBack from './components/GoBack';
import ScrollTop from './components/ScrollTop';
import { useResponsive } from '@/layout/responsive';
import { ResponsiveProvider } from './responsive';

export default function ResponsiveLayout() {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <ResponsiveProvider>
      <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CssBaseline />
        <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <Box sx={{ display: 'flex', pt: { xs: 7, sm: 8 } }}>
          <Sidebar open={sidebarOpen} />
          <Content sidebarOpen={sidebarOpen} />
        </Box>
        {/* 固定右下角返回按钮和回到顶部按钮 */}
        {!isMobile && <GoBack />}
        <ScrollTop />
      </Box>
    </ResponsiveProvider>
  );
}
