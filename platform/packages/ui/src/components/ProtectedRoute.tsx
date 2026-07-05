import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authUtils } from '@/utils/auth';
import { checkTokenFn, getProfileFn } from '@/api/infra/system/auth';
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

  function failedLogin() {
    // token无效，清理本地存储
    authUtils.logout();
    setIsAuthenticated(false);
  }

  function successfulLogin() {
    setIsAuthenticated(true);
  }

  useEffect(() => {
    const checkAuth = async () => {
      const urlToken = getQueryParam('token');
      let tokenToUse = userInfo?.token;

      if (urlToken) {
        tokenToUse = urlToken;
        authUtils.setUserInfo({ id: 0, username: 'Loading...', langCode: 'zh-CN', token: urlToken });
      }

      if (!tokenToUse) {
        failedLogin();
        setIsLoading(false);
        return;
      }
      try {
        if (urlToken) {
          const profileRes = await getProfileFn({ data: {} });
          const realUser = profileRes.data.data.userObj;
          authUtils.setUserInfo({ ...realUser, token: urlToken });

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
          await checkTokenFn({ data: {} });
        }
        successfulLogin();
        return;
      } catch (e) {
        console.error('Token authentication failed:', e);
        failedLogin();
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
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

  if (!isValidPath(navItems, location.pathname)) {
    return <Navigate to="/error/NotFound" replace />;
  }

  // 已认证且路径有效，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute;
