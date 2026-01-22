import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authUtils, type UserInfo } from '@/utils/auth';
import { getProfile } from '@/api/system/auth';
import { CircularProgress, Box } from '@mui/material';
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  function failedLogin() {
    // token无效，清理本地存储
    authUtils.logout();
    setIsAuthenticated(false);
  }

  function successfulLogin(newUserInfo: UserInfo) {
    authUtils.setUserInfo(newUserInfo);
    setIsAuthenticated(true);
  }

  useEffect(() => {
    const checkAuth = async () => {
      const token = authUtils.getUserInfo()?.token;

      if (!token) {
        failedLogin();
        setIsLoading(false);
        return;
      }

      try {
        // 验证token是否有效
        const result = await getProfile({ data: {} });

        if (result.data.ok) {
          const { userObj } = result.data.data;
          successfulLogin({ token, ...userObj });
          return;
        } else {
          failedLogin();
        }
      } catch {
        failedLogin();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 正在验证token
  if (isLoading) {
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 已认证，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute;
