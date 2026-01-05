import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authUtils } from '@/utils/auth';
import { verifyToken } from '@/api/system/auth';
import { CircularProgress, Box } from '@mui/material';

import { listFn } from '@/api/i18n/language';
import { indexedDBHelper } from '@/utils/indexedDB';
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  async function getLanguageData() {
    // 页面加载时请求多语言列表并保存到IndexedDB
    const loadLanguageList = async () => {
      try {
        // 初始化IndexedDB
        await indexedDBHelper.init();

        // 请求多语言列表
        const response = await listFn({ data: { pageNo: 1, pageSize: 1000 } });

        if (response.data?.ok && response.data?.data) {
          const i18nList = response.data.data;

          // 保存到IndexedDB
          const count = await indexedDBHelper.saveLanguageList(i18nList.list);

          console.log(`✅ 多语言列表已保存到IndexedDB，共 ${count} 条数据`);
        } else {
          console.warn('⚠️ 获取多语言列表失败：响应数据格式错误');
        }
      } catch (error) {
        console.error('❌ 加载多语言列表失败：', error);
      }
    };
    loadLanguageList();
  }
  useEffect(() => {
    const checkAuth = async () => {
      const token = authUtils.getUserInfo()?.token;

      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // 验证token是否有效
        const result = await verifyToken({ data: { token } });
        const verified = result.data;

        if (result.data.ok && verified) {
          setIsAuthenticated(true);
          getLanguageData();
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 已认证，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute;
