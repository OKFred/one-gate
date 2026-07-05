import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authUtils } from '@/utils/auth';
import { CircularProgress, Box } from '@mui/material';
import { homePath, loginPath } from '@/routes';

const RootRedirect: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const isLoggedIn = authUtils.isAuthenticated();
      setIsAuthenticated(isLoggedIn);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // 正在检查登录状态
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

  // 根据登录状态重定向
  return <Navigate to={isAuthenticated ? homePath : loginPath} replace />;
};

export default RootRedirect;
