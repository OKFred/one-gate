import type { AxiosConfig } from '../config';
import { axiosPlus } from '../config';

export const commonLogin = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/auth/login', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/auth/login',
    method: 'post',
    ...axiosConfig,
  });
};

export const wechatLogin = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/auth/wechat', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/auth/wechat',
    method: 'post',
    ...axiosConfig,
  });
};

export const verifyToken = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/auth/verify', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/auth/verify',
    method: 'post',
    ...axiosConfig,
  });
};

export const refreshToken = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/auth/refresh', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/auth/refresh',
    method: 'post',
    ...axiosConfig,
  });
};
