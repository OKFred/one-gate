import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { useMatches, useLocation, useNavigate } from 'react-router-dom';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Content from './components/Content';
import ScrollTop from './components/ScrollTop';
import { useResponsive } from '../hooks/useResponsive';
import { LayoutConfigProvider, useLayoutConfig } from '../contexts/LayoutConfigContext';

interface RouteHandle {
  hideSidebar?: boolean;
  hideTopbar?: boolean;
}

function ResponsiveLayoutInner() {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);
  const location = useLocation();
  const navigate = useNavigate();

  // 判断是否处于 Iframe 中（微前端加载）
  const isIframe = React.useMemo(() => window.self !== window.top, []);
  
  let matches: any[] = [];
  try {
    matches = useMatches();
  } catch (e) {
    // 降级支持非 Data Router
  }

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
    // 在微前端 iframe 容器中运行时，强制隐藏侧边栏与顶栏，只显示内容区
    if (isIframe) {
      return { hideSidebar: true, hideTopbar: true };
    }

    let hideSidebar = contextConfig.hideSidebar || false;
    let hideTopbar = contextConfig.hideTopbar || false;

    if (!hideSidebar || !hideTopbar) {
      matches.forEach((match) => {
        const handle = match.handle as RouteHandle | undefined;
        if (handle) {
          if (handle.hideSidebar !== undefined) hideSidebar = hideSidebar || handle.hideSidebar;
          if (handle.hideTopbar !== undefined) hideTopbar = hideTopbar || handle.hideTopbar;
        }
      });
    }

    return { hideSidebar, hideTopbar };
  }, [matches, contextConfig, isIframe]);

  // 当处于 Iframe 时，同步子系统的路由改变到父系统
  React.useEffect(() => {
    if (isIframe) {
      const currentPath = location.pathname + location.search;
      window.parent.postMessage({
        type: 'CHILD_ROUTE_CHANGE',
        path: currentPath,
      }, '*');
    }
  }, [location.pathname, location.search, isIframe]);

  // 接收来自父系统（admin 宿主）的路由切换通知，同步子路由
  React.useEffect(() => {
    if (!isIframe) return;

    const handleParentMessage = (event: MessageEvent) => {
      // 验证是否是合法的宿主消息
      if (event.data?.type === 'PARENT_ROUTE_CHANGE') {
        const targetPath = event.data.path;
        const currentPath = location.pathname + location.search;
        if (targetPath && targetPath !== currentPath) {
          navigate(targetPath);
        }
      }
    };

    window.addEventListener('message', handleParentMessage);
    return () => window.removeEventListener('message', handleParentMessage);
  }, [isIframe, location.pathname, location.search, navigate]);

  const showTopbar = !layoutConfig.hideTopbar;
  const showSidebar = !layoutConfig.hideSidebar;

  return (
    <div>
      <Box sx={{ width: '100vw', minHeight: '100vh' }}>
        <CssBaseline />
        {showTopbar && <Topbar setSidebarOpen={setSidebarOpen} />}
        <Box sx={{ display: 'flex', pt: showTopbar ? 8 : 0 }}>
          {showSidebar && <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />}
          <Content sidebarOpen={showSidebar && sidebarOpen} isIframe={isIframe} />
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
