import axios from 'axios';
import type { AxiosConfig } from '../config';

// 创建用户模块的axios实例
const userApiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || '', // API服务器地址
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加token
userApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器
userApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，清除本地存储并跳转到登录页
      localStorage.removeItem('userToken');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/department/list', 'post'>, 'url' | 'method'>,
) => {
  return userApiClient({
    url: '/api/v1/system/department/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/department/get', 'post'>, 'url' | 'method'>,
) => {
  return userApiClient({
    url: '/api/v1/system/department/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/department/add', 'post'>, 'url' | 'method'>,
) => {
  return userApiClient({
    url: '/api/v1/system/department/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/department/update', 'post'>, 'url' | 'method'>,
) => {
  return userApiClient({
    url: '/api/v1/system/department/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/department/delete', 'post'>, 'url' | 'method'>,
) => {
  return userApiClient({
    url: '/api/v1/system/department/delete',
    method: 'post',
    ...axiosConfig,
  });
};
