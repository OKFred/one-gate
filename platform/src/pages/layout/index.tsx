import React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
// import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
// import BottomNavigation from '@mui/material/BottomNavigation';
// import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
// import MenuIcon from '@mui/icons-material/Menu';
// import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MailIcon from '@mui/icons-material/Mail';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const drawerWidth = 240;

const navItems = [
  { text: '首页', icon: <HomeIcon />, path: '/home' },
  { text: '账户', icon: <AccountCircleIcon />, path: '/account' },
  { text: '邮件', icon: <MailIcon />, path: '/mail' },
];

// 侧边栏收起/展开按钮组件
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useNavigate } from 'react-router';

function SidebarToggle() {
  const [open, setOpen] = React.useContext(SidebarContext);
  return (
    <IconButton color="inherit" onClick={() => setOpen((v: boolean) => !v)}>
      {open ? <ChevronLeftIcon /> : <MenuIcon />}
    </IconButton>
  );
}

// 侧边栏显示状态上下文
const SidebarContext = React.createContext<
  [boolean, React.Dispatch<React.SetStateAction<boolean>>]
>([true, () => {}]);
import { Outlet } from 'react-router-dom';
export default function ResponsiveLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // 桌面端侧边栏显示/隐藏
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const navigate = useNavigate();

  const drawer = (
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
  );

  return (
    <SidebarContext.Provider value={[sidebarOpen, setSidebarOpen]}>
      <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CssBaseline />
        {/* 顶部栏全宽 */}
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
                <SidebarToggle />
              </Box>
            )}
            <Typography variant="h6" noWrap component="div">
              OKFred平台
            </Typography>
          </Toolbar>
        </AppBar>
        {/* 内容区：顶部栏下方，flex布局，左侧侧边栏，右侧主内容 */}
        <Box sx={{ display: 'flex', pt: { xs: 7, sm: 8 } }}>
          {/* 桌面端侧边栏 */}
          {!isMobile && (
            <Box
              component="nav"
              sx={{
                width: sidebarOpen ? drawerWidth : 0,
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
                    width: sidebarOpen ? drawerWidth : 0,
                    transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
                    overflowX: 'hidden',
                  },
                }}
                open
              >
                {drawer}
              </Drawer>
            </Box>
          )}
          {/* 主内容区 */}
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
        </Box>
        {/* 移动端底部菜单 */}
        {isMobile && (
          <Box
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
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>{item.icon}</Box>
                  <Typography variant="caption">{item.text}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </SidebarContext.Provider>
  );
}
