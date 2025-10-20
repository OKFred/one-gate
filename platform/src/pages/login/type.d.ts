/**
 * 全局类型定义
 * 从 API 函数中提取类型
 */

import type * as AuthAPI from '../../api/system/auth';

// ==================== 登录相关类型 ====================

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

// Token 验证
export type VerifyTokenParams = Parameters<typeof AuthAPI.verifyToken>[0];
export type VerifyTokenResponse = Awaited<ReturnType<typeof AuthAPI.verifyToken>>;
export type VerifyTokenReq = NonNullable<VerifyTokenParams['data']>;
export type VerifyTokenData = NonNullable<VerifyTokenResponse['data']>;

// Token 刷新
export type RefreshTokenParams = Parameters<typeof AuthAPI.refreshToken>[0];
export type RefreshTokenResponse = Awaited<ReturnType<typeof AuthAPI.refreshToken>>;
export type RefreshTokenReq = NonNullable<RefreshTokenParams['data']>;
export type RefreshTokenData = NonNullable<RefreshTokenResponse['data']>;
