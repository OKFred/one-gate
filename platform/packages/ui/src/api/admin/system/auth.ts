import type { AxiosConfig, ExplicitPostConfig } from '../../config';
import { axiosExplicitPost, axiosPlus } from '../../config';

export interface SsoAuthorizationUrlReq {
  redirectUri: string;
}

export interface SsoAuthorizationUrlRes {
  url: string;
}

export interface SsoCallbackReq {
  code: string;
  state: string;
}

export interface SsoLoginCallbackRes {
  userObj: {
    id: number;
    username: string;
    langCode: string;
    token: string;
  };
}

export interface SsoBindingSummary {
  bound: boolean;
  issuer: string | null;
  tenantId: string | null;
  membershipId: string | null;
  clientId: string | null;
  amr: readonly string[];
  scope: readonly string[];
  createTimeUtc: number | null;
  updateTimeUtc: number | null;
}

export interface SsoAccountCallbackRes {
  message: string;
}

export interface SsoUnbindRes {
  message: string;
}

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

export const ssoLoginUrlFn = (axiosConfig: ExplicitPostConfig<SsoAuthorizationUrlReq>) =>
  axiosExplicitPost<SsoAuthorizationUrlReq, SsoAuthorizationUrlRes>(
    '/api/v1/admin/system/auth/sso/login/url',
    axiosConfig,
  );

export const ssoLoginCallbackFn = (axiosConfig: ExplicitPostConfig<SsoCallbackReq>) =>
  axiosExplicitPost<SsoCallbackReq, SsoLoginCallbackRes>(
    '/api/v1/admin/system/auth/sso/login/callback',
    axiosConfig,
  );

export const ssoAccountUrlFn = (axiosConfig: ExplicitPostConfig<SsoAuthorizationUrlReq>) =>
  axiosExplicitPost<SsoAuthorizationUrlReq, SsoAuthorizationUrlRes>(
    '/api/v1/admin/system/auth/sso/account/url',
    axiosConfig,
  );

export const ssoAccountCallbackFn = (axiosConfig: ExplicitPostConfig<SsoCallbackReq>) =>
  axiosExplicitPost<SsoCallbackReq, SsoAccountCallbackRes>(
    '/api/v1/admin/system/auth/sso/account/callback',
    axiosConfig,
  );

export const ssoBindingUnbindFn = (axiosConfig: ExplicitPostConfig<Record<string, never>>) =>
  axiosExplicitPost<Record<string, never>, SsoUnbindRes>(
    '/api/v1/admin/system/auth/sso/binding/unbind',
    axiosConfig,
  );

export const ssoBindingSummaryFn = (axiosConfig: ExplicitPostConfig<Record<string, never>>) =>
  axiosExplicitPost<Record<string, never>, SsoBindingSummary>(
    '/api/v1/admin/system/auth/sso/binding/summary',
    axiosConfig,
  );

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
