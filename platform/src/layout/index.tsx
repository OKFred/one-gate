import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Content from './components/Content';
import ScrollTop from './components/ScrollTop';
import { ResponsiveProvider } from './responsive';

export default function ResponsiveLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <ResponsiveProvider>
      <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CssBaseline />
        <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <Box sx={{ display: 'flex', pt: { xs: 7, sm: 8 } }}>
          <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />
          <Content sidebarOpen={sidebarOpen} />
        </Box>
        <ScrollTop />
      </Box>
    </ResponsiveProvider>
  );
}
