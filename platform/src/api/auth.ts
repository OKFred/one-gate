import axios from 'axios';
import { authUtils, type LoginResponse } from '@/utils/auth';

// 登录请求参数
export interface LoginCredentials {
  username: string;
  password: string;
}

// 微信登录请求参数
export interface WechatLoginData {
  code: string;
  state?: string;
}

// Token验证响应
export interface TokenVerifyResponse {
  valid: boolean;
  payload?: {
    userId: number;
    username: string;
    role: string;
    department: string;
    exp: number;
  };
}

// 创建axios实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || '', // API服务器地址
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加token
apiClient.interceptors.request.use(
  (config) => {
    const token = authUtils.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      // token过期或无效，自动登出
      authUtils.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const loginAPI = {
  // 普通登录
  async commonLogin(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await apiClient.post('/api/login/common', credentials);

      if (response.data.ok && response.data.data) {
        const { token, user } = response.data.data;
        // 自动保存token和用户信息
        authUtils.setToken(token);
        authUtils.setUserInfo(user);
        return { token, user };
      } else {
        throw new Error(response.data.message || '登录失败');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err.response?.data?.message || err.message || '登录失败');
    }
  },

  // 微信登录
  async wechatLogin(loginData: WechatLoginData): Promise<LoginResponse> {
    try {
      const response = await apiClient.post('/api/login/wechat', loginData);

      if (response.data.ok && response.data.data) {
        const { token, user } = response.data.data;
        // 自动保存token和用户信息
        authUtils.setToken(token);
        authUtils.setUserInfo(user);
        return { token, user };
      } else {
        throw new Error(response.data.message || '微信登录失败');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err.response?.data?.message || err.message || '微信登录失败');
    }
  },

  // 验证token
  async verifyToken(token?: string): Promise<TokenVerifyResponse> {
    const tokenToVerify = token || authUtils.getToken();
    if (!tokenToVerify) {
      return { valid: false };
    }

    try {
      const response = await apiClient.post('/api/login/verify', {
        token: tokenToVerify,
      });
      return response.data.data;
    } catch {
      return { valid: false };
    }
  },

  // 刷新token
  async refreshToken(token?: string): Promise<string> {
    const tokenToRefresh = token || authUtils.getToken();
    if (!tokenToRefresh) {
      throw new Error('没有可刷新的token');
    }

    try {
      const response = await apiClient.post('/api/login/refresh', {
        token: tokenToRefresh,
      });

      if (response.data.ok && response.data.data) {
        const newToken = response.data.data.token;
        // 自动更新本地token
        authUtils.setToken(newToken);
        return newToken;
      } else {
        throw new Error(response.data.message || 'Token刷新失败');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err.response?.data?.message || err.message || 'Token刷新失败');
    }
  },

  // 登出
  logout() {
    authUtils.logout();
    // 跳转到登录页
    window.location.href = '/login';
  },
};
