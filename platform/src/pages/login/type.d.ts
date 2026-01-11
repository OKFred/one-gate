/**
 * 全局类型定义
 * 从 API 函数中提取类型
 */

import type * as AuthAPI from '../../api/system/auth';

// 普通登录
export type CommonLoginParams = Parameters<typeof AuthAPI.commonLogin>[0];
export type CommonLoginResponse = Awaited<ReturnType<typeof AuthAPI.commonLogin>>;
export type CommonLoginReq = NonNullable<CommonLoginParams['data']>;
export type CommonLoginData = NonNullable<CommonLoginResponse['data']>;

// 微信登录
export type WechatLoginParams = Parameters<typeof AuthAPI.wechatLogin>[0];
export type WechatLoginResponse = Awaited<ReturnType<typeof AuthAPI.wechatLogin>>;
export type WechatLoginReq = NonNullable<WechatLoginParams['data']>;
export type WechatLoginData = NonNullable<WechatLoginResponse['data']>;

// 获取用户信息
export type GetProfileParams = Parameters<typeof AuthAPI.getProfile>[0];
export type GetProfileResponse = Awaited<ReturnType<typeof AuthAPI.getProfile>>;
export type GetProfileReq = NonNullable<GetProfileParams['data']>;
export type GetProfileData = NonNullable<GetProfileResponse['data']>;

// Token 刷新
export type RefreshTokenParams = Parameters<typeof AuthAPI.refreshToken>[0];
export type RefreshTokenResponse = Awaited<ReturnType<typeof AuthAPI.refreshToken>>;
export type RefreshTokenReq = NonNullable<RefreshTokenParams['data']>;
export type RefreshTokenData = NonNullable<RefreshTokenResponse['data']>;
