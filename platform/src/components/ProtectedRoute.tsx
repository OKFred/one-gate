import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authUtils } from '@/utils/auth';
import { checkTokenFn } from '@/api/infra/system/auth';
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
      const token = userInfo?.token;
      if (!token) {
        failedLogin();
        setIsLoading(false);
        return;
      }
      try {
        await checkTokenFn({ data: {} });
        successfulLogin();
        return;
      } catch {
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
