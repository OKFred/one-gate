import type { AxiosConfig, ResponseGeneric } from '../../config';
import { axiosPlus } from '../../config';

type SsoBindingSummaryPath = '/api/v1/admin/system/auth/sso/binding/summary';
export type SsoBindingSummary = ResponseGeneric<SsoBindingSummaryPath, 'post'>['data']['data'];

export const loginFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/login', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/login',
    method: 'post',
    ...axiosConfig,
  });
};

export const totpGateStatusFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/gate/status', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/system/auth/gate/status',
    method: 'post',
    ...axiosConfig,
  });

export const totpGateVerifyFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/gate/verify', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/system/auth/gate/verify',
    method: 'post',
    ...axiosConfig,
  });

export const totpGateLogoutFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/gate/logout', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/system/auth/gate/logout',
    method: 'post',
    ...axiosConfig,
  });

export const wechatLoginFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/wechat', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/wechat',
    method: 'post',
    ...axiosConfig,
  });
};

export const oauthLoginUrlFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/oauth/login/url', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/oauth/login/url',
    method: 'post',
    ...axiosConfig,
  });
};

export const oauthLoginCallbackFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/oauth/login/callback', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/oauth/login/callback',
    method: 'post',
    ...axiosConfig,
  });
};

export const oauthAccountUrlFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/oauth/account/url', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/oauth/account/url',
    method: 'post',
    ...axiosConfig,
  });
};

export const oauthAccountCallbackFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/oauth/account/callback', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/oauth/account/callback',
    method: 'post',
    ...axiosConfig,
  });
};

export const oauthBindingUnbindFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/oauth/binding/unbind', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/oauth/binding/unbind',
    method: 'post',
    ...axiosConfig,
  });
};

export const oauthBindingProfileFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/oauth/binding/profile', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/auth/oauth/binding/profile',
    method: 'post',
    ...axiosConfig,
  });
};

export const ssoLoginUrlFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/sso/login/url', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/system/auth/sso/login/url',
    method: 'post',
    ...axiosConfig,
  });

export const ssoLoginCallbackFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/sso/login/callback', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/system/auth/sso/login/callback',
    method: 'post',
    ...axiosConfig,
  });

export const ssoAccountUrlFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/sso/account/url', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/system/auth/sso/account/url',
    method: 'post',
    ...axiosConfig,
  });

export const ssoAccountCallbackFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/sso/account/callback', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/system/auth/sso/account/callback',
    method: 'post',
    ...axiosConfig,
  });

export const ssoBindingUnbindFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/sso/binding/unbind', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/system/auth/sso/binding/unbind',
    method: 'post',
    ...axiosConfig,
  });

export const ssoBindingSummaryFn = (
  axiosConfig: Omit<AxiosConfig<SsoBindingSummaryPath, 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/system/auth/sso/binding/summary',
    method: 'post',
    ...axiosConfig,
  });

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
