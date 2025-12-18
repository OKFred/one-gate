// 认证相关的工具函数
import type { components } from '@/types/openapi';

const USER_KEY = 'userInfo';
export type LoginResponse = components['schemas']['SystemAuthLoginRes']['data'];
export type UserInfo = LoginResponse['userObj'];

// Token管理
export const authUtils = {
  // 检查是否已登录
  isAuthenticated(): boolean {
    return !!this.getUserInfo()?.token;
  },

  // 设置用户信息
  setUserInfo(userInfo: UserInfo) {
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
  },

  // 获取用户信息
  getUserInfo(): UserInfo | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // 移除用户信息
  removeUserInfo() {
    localStorage.removeItem(USER_KEY);
  },

  // 登出（清理所有认证信息）
  logout() {
    this.removeUserInfo();
  },

  // 获取Authorization头
  getAuthHeader(): { Authorization: string } | Record<string, never> {
    const token = this.getUserInfo()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};
