import React from 'react';
import Box from '@mui/material/Box';
import { Outlet, useLocation } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import { MicroAppContainer } from './MicroAppContainer';

interface ContentProps {
  sidebarOpen: boolean;
}

const drawerWidth = 240;

const Content: React.FC<ContentProps> = ({ sidebarOpen }) => {
  const { isMobile } = useResponsive();
  const location = useLocation();

  const currentScope =
    (import.meta as unknown as { env: Record<string, string> }).env.VITE_APP_SCOPE || 'admin';
  const isHost = currentScope === 'admin';

  // 识别当前路由属于哪一个子应用
  const isEnterpriseActive =
    isHost &&
    (location.pathname.startsWith('/organization/') ||
      location.pathname.startsWith('organization/') ||
      location.pathname.startsWith('/executive/') ||
      location.pathname.startsWith('executive/'));
  const isPersonalActive =
    isHost &&
    (location.pathname.startsWith('/personal/') || location.pathname.startsWith('personal/'));
  const isMicroAppActive = isEnterpriseActive || isPersonalActive;

  return (
    <Box
      component="main"
      className={isMobile ? 'content-mobile-padding' : ''}
      sx={{
        flexGrow: 1,
        minWidth: 0,
        p: { xs: 2, md: 3 },
        width: {
          xs: '100%',
          sm: sidebarOpen ? `calc(100vw - ${drawerWidth}px)` : `calc(100vw - 56px)`,
        },
        minHeight: 'calc(100vh - 64px)',
        pb: isMobile ? 'calc(72px + env(safe-area-inset-bottom, 16px))' : { xs: 2, md: 3 },
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* 如果是 Host 应用，我们把 MicroAppContainer 直接常驻渲染在这里，通过 visible 属性控制显隐，实现 keep-alive */}
      {isHost && (
        <>
          <MicroAppContainer scope="enterprise" visible={isEnterpriseActive} />
          <MicroAppContainer scope="personal" visible={isPersonalActive} />
        </>
      )}

      {/* 只有在非微前端子页面处于激活状态时才渲染当前的 Outlet（对于 Host 应用就是普通的 Admin 页面） */}
      <div style={{ display: isMicroAppActive ? 'none' : 'block', width: '100%', height: '100%' }}>
        <Outlet />
      </div>
    </Box>
  );
};

export default Content;
