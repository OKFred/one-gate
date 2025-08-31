import React from 'react';
import Box from '@mui/material/Box';
import { Outlet } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

interface ContentProps {
  sidebarOpen: boolean;
}

const drawerWidth = 240;

const Content: React.FC<ContentProps> = ({ sidebarOpen }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        width: { sm: sidebarOpen ? `calc(100vw - ${drawerWidth}px)` : `calc(100vw - 56px)` },
        minHeight: 'calc(100vh - 64px)',
        pb: isMobile ? 8 : 0, // 给底部菜单留空间
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <Outlet />
    </Box>
  );
};

export default Content;
