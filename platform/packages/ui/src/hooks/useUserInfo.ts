import { useState, useEffect, useMemo } from 'react';
import { authUtils, subscribeAuthChanges, type UserInfo } from '@/utils/auth';

interface UseUserInfoReturn {
  /** 用户信息对象 */
  userInfo: UserInfo | null;
  /** 获取用户显示名称 */
  getDisplayName: (fallback?: string) => string;
  /** 获取用户头像字符（用户名首字母） */
  getAvatar: () => string;
}

/**
 * 自定义 Hook：获取当前登录用户信息及相关辅助函数
 */
export const useUserInfo = (): UseUserInfoReturn => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(() => {
    // 初始化时直接从 localStorage 读取，避免状态变化
    return authUtils.getUserInfo();
  });

  useEffect(() => {
    const refresh = () => setUserInfo(authUtils.getUserInfo());
    const unsubscribe = subscribeAuthChanges(refresh);
    refresh();
    return unsubscribe;
  }, []);

  const helpers = useMemo(
    () => ({
      userInfo,
      getDisplayName: (fallback: string = 'Guest') => {
        if (!userInfo) return fallback;
        return userInfo.username;
      },
      getAvatar: () => {
        if (!userInfo) return '';
        return userInfo.username.charAt(0).toUpperCase();
      },
    }),
    [userInfo],
  );

  return helpers;
};
