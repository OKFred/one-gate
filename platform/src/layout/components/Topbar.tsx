import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useResponsive } from '../responsive';

interface TopbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Topbar: React.FC<TopbarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { isMobile } = useResponsive();
  
  return (
    <AppBar
      position="fixed"
      sx={{ width: '100vw', left: 0, zIndex: (theme) => theme.zIndex.drawer + 2 }}
    >
      <Toolbar sx={{ minHeight: '64px', pl: { sm: 0 } }}>
        {/* 桌面端侧边栏收起/展开按钮，绝对定位到左侧，避免被遮挡 */}
        {!isMobile && (
          <Box
            sx={{
              position: 'relative',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
            }}
          >
            <IconButton color="inherit" onClick={() => setSidebarOpen((v) => !v)}>
              {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
        )}
        <Typography variant="h6" noWrap component="div">
          OKFred平台
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
