import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { UNSAFE_DataRouterStateContext } from 'react-router-dom';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Content from './components/Content';
import ScrollTop from './components/ScrollTop';
import { useResponsive } from '../hooks/useResponsive';
import { LayoutConfigProvider } from '../contexts/LayoutConfigContext';
import { useLayoutConfig } from '../contexts/LayoutConfigContextCore';

interface RouteHandle {
  hideSidebar?: boolean;
  hideTopbar?: boolean;
}

function ResponsiveLayoutInner() {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);

  const routerState = React.useContext(UNSAFE_DataRouterStateContext);
  const matches = React.useMemo(() => routerState?.matches || [], [routerState]);

  // 监听屏幕尺寸变化，移动端时关闭侧边栏，桌面端时打开侧边栏
  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const { config: contextConfig } = useLayoutConfig();

  // 动态读取并合并当前激活路由的 handle 配置以控制布局
  const layoutConfig = React.useMemo(() => {
    let hideSidebar = contextConfig.hideSidebar || false;
    let hideTopbar = contextConfig.hideTopbar || false;

    if (!hideSidebar || !hideTopbar) {
      matches.forEach((match) => {
        const handle = (match as unknown as { handle?: RouteHandle }).handle;
        if (handle) {
          if (handle.hideSidebar !== undefined) hideSidebar = hideSidebar || handle.hideSidebar;
          if (handle.hideTopbar !== undefined) hideTopbar = hideTopbar || handle.hideTopbar;
        }
      });
    }

    return { hideSidebar, hideTopbar };
  }, [matches, contextConfig]);

  const showTopbar = !layoutConfig.hideTopbar;
  const showSidebar = !layoutConfig.hideSidebar;

  return (
    <div>
      <Box sx={{ width: '100vw', minHeight: '100vh' }}>
        <CssBaseline />
        {showTopbar && <Topbar setSidebarOpen={setSidebarOpen} />}
        <Box sx={{ display: 'flex', pt: showTopbar ? 8 : 0 }}>
          {showSidebar && <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />}
          <Content sidebarOpen={showSidebar && sidebarOpen} />
        </Box>
        <ScrollTop />
      </Box>
    </div>
  );
}

export default React.memo(function ResponsiveLayout() {
  return (
    <LayoutConfigProvider>
      <ResponsiveLayoutInner />
    </LayoutConfigProvider>
  );
});
