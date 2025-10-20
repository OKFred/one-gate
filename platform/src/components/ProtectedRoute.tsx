import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authUtils } from '@/utils/auth';
import { verifyToken } from '@/api/system/auth';
import { CircularProgress, Box } from '@mui/material';
import type { VerifyTokenData } from '@/pages/login/type';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const token = authUtils.getToken();
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // 验证token是否有效
        const result = await verifyToken({ data: { token } });
        const verifyData = result.data.data as VerifyTokenData;
        
        if (result.data.ok && verifyData?.valid) {
          setIsAuthenticated(true);
        } else {
          // token无效，清理本地存储
          authUtils.logout();
          setIsAuthenticated(false);
        }
      } catch {
        // 验证失败，清理本地存储
        authUtils.logout();
        setIsAuthenticated(false);
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
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 已认证，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute;
