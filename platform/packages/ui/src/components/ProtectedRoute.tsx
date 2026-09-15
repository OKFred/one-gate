import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Navigate, useLocation } from 'react-router-dom';
import { authUtils, captureAuthSession, isCurrentAuthSession } from '@/utils/auth';
import { checkTokenFn, getProfileFn } from '@/api/admin/system/auth';
import { CircularProgress, Box } from '@mui/material';
import { useMenu } from '@/hooks/useMenu';
import type { MenuNode } from '@/contexts/MenuContext';
import { loginPath } from '@/routes';
import { useUserInfo } from '@/hooks/useUserInfo';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const { userInfo } = useUserInfo();

  const { navItems, loading: menuLoading } = useMenu();

  const getQueryParam = (name: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has(name)) return searchParams.get(name);
    const hash = window.location.hash;
    const queryIdx = hash.indexOf('?');
    if (queryIdx !== -1) {
      const hashParams = new URLSearchParams(hash.substring(queryIdx + 1));
      if (hashParams.has(name)) return hashParams.get(name);
    }
    return null;
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setIsAuthenticated(null);

    const checkAuth = async () => {
      const urlToken = getQueryParam('token');
      let authSession = captureAuthSession();

      if (!authSession.token && urlToken) {
        authUtils.setUserInfo({
          id: 0,
          username: 'Loading...',
          langCode: 'zh-CN',
          token: urlToken,
        });
        authSession = captureAuthSession();
      }

      const isCurrent = () => active && isCurrentAuthSession(authSession);
      if (!authSession.token) {
        if (!isCurrent()) return;
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      let canceled = false;
      const awaitAuthRequest = <T,>(request: Promise<T>): Promise<T | undefined> =>
        request.then(undefined, (error: unknown) => {
          if (axios.isCancel(error)) {
            canceled = true;
            return undefined;
          }
          throw error;
        });

      try {
        if (urlToken === authSession.token) {
          const profileRes = await awaitAuthRequest(getProfileFn({ data: {} }));
          if (!profileRes || !isCurrent()) return;
          const realUser = profileRes.data.data.userObj;
          authUtils.setUserInfo({ ...realUser, token: urlToken });
          if (!isCurrent()) return;

          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          let newHash = window.location.hash;
          const tokenIdx = newHash.indexOf('token=');
          if (tokenIdx !== -1) {
            newHash = newHash.replace(/[?&]token=[^&]+/, '');
            if (newHash.endsWith('?') || newHash.endsWith('&')) {
              newHash = newHash.substring(0, newHash.length - 1);
            }
          }
          window.history.replaceState(null, '', `${url.pathname}${url.search}${newHash}`);
        } else {
          const response = await awaitAuthRequest(checkTokenFn({ data: {} }));
          if (!response || !isCurrent()) return;
        }
        if (isCurrent()) setIsAuthenticated(true);
      } catch {
        if (!isCurrent()) return;
        authUtils.logout();
        setIsAuthenticated(false);
      } finally {
        if (!canceled && isCurrent()) setIsLoading(false);
      }
    };
    void checkAuth();
    return () => {
      active = false;
    };
  }, [userInfo?.token]);

  // 正在验证token或加载菜单
  if (isLoading || menuLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // 未认证，重定向到登录页
  if (!isAuthenticated) {
    if (import.meta.env.VITE_APP_SCOPE !== 'admin') {
      const adminUrl = import.meta.env.VITE_ADMIN_URL || '/admin';
      const redirectUrl = encodeURIComponent(window.location.href);
      window.location.href = `${adminUrl}/#/login?redirect=${redirectUrl}`;
      return null;
    }
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // 已认证，检查路径是否在菜单中
  const isValidPath = (items: MenuNode[], path: string): boolean => {
    for (const item of items) {
      if (item.path === path) return true;
      if (item.children && item.children.length > 0) {
        if (isValidPath(item.children, path)) return true;
      }
    }
    return false;
  };

  const isAccountPath = location.pathname === '/home' || location.pathname === '/me';
  if (!isAccountPath && !isValidPath(navItems, location.pathname)) {
    return <Navigate to="/error/NotFound" replace />;
  }

  // 已认证且路径有效，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute;
