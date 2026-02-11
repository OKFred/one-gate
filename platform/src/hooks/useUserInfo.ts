import { useState, useEffect } from 'react';
import { authUtils, type UserInfo } from '@/utils/auth';

/**
 * 自定义 Hook：获取当前登录用户信息
 * @returns userInfo - 用户信息对象，如果未登录则为 null
 */
export const useUserInfo = (): UserInfo | null => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(() => {
    // 初始化时直接从 localStorage 读取，避免状态变化
    return authUtils.getUserInfo();
  });

  useEffect(() => {
    // 监听 storage 事件，支持多标签页同步
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userInfo') {
        setUserInfo(authUtils.getUserInfo());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return userInfo;
};
