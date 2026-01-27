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

export const refreshToken = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/auth/refresh', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/auth/refresh',
    method: 'post',
    ...axiosConfig,
  });
};

export const getProfile = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/auth/profile', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/auth/profile',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateProfileFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/auth/updateProfile', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/auth/updateProfile',
    method: 'post',
    ...axiosConfig,
  });
}

export const updatePasswordFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/auth/updatePassword', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/auth/updatePassword',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateLangCodeFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/auth/updateLangCode', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/auth/updateLangCode',
    method: 'post',
    ...axiosConfig,
  });
};
