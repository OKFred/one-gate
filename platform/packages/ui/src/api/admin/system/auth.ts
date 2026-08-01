import type { AxiosConfig } from '../../config';
import { axiosPlus } from '../../config';

export const loginFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/login', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/login',
    method: 'post',
    ...axiosConfig,
  });
};

export const wechatLoginFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/wechat', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/wechat',
    method: 'post',
    ...axiosConfig,
  });
};

export const refreshTokenFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/refresh', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/refresh',
    method: 'post',
    ...axiosConfig,
  });
};

export const checkTokenFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/check', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/check',
    method: 'post',
    ...axiosConfig,
  });
};

export const getProfileFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/profile', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/profile',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateProfileFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/updateProfile', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/updateProfile',
    method: 'post',
    ...axiosConfig,
  });
};

export const updatePasswordFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/updatePassword', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/updatePassword',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateLangCodeFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/updateLangCode', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/updateLangCode',
    method: 'post',
    ...axiosConfig,
  });
};

export const getButtonPermissionFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/getButtonPermission', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/getButtonPermission',
    method: 'post',
    ...axiosConfig,
  });
};
