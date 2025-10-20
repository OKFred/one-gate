/**
 * 全局类型定义
 * 从 API 函数中提取类型
 */

import type * as AuthAPI from '../../api/system/auth';
import type { paths } from '../../types/openapi';

// ==================== 登录相关类型 ====================

// 普通登录
export type CommonLoginParams = Parameters<typeof AuthAPI.commonLogin>[0];
export type CommonLoginResponse = Awaited<ReturnType<typeof AuthAPI.commonLogin>>;
export type CommonLoginReq = NonNullable<CommonLoginParams['data']>;

// 直接从 openapi paths 中提取响应数据类型
type CommonLoginApiResponse =
  paths['/api/v1/system/auth/login']['post']['responses'][200]['content']['application/json'];
export type CommonLoginData = NonNullable<CommonLoginApiResponse['data']>;

// 微信登录
export type WechatLoginParams = Parameters<typeof AuthAPI.wechatLogin>[0];
export type WechatLoginResponse = Awaited<ReturnType<typeof AuthAPI.wechatLogin>>;
export type WechatLoginReq = NonNullable<WechatLoginParams['data']>;

type WechatLoginApiResponse =
  paths['/api/v1/system/auth/wechat']['post']['responses'][200]['content']['application/json'];
export type WechatLoginData = NonNullable<WechatLoginApiResponse['data']>;

// Token 验证
export type VerifyTokenParams = Parameters<typeof AuthAPI.verifyToken>[0];
export type VerifyTokenResponse = Awaited<ReturnType<typeof AuthAPI.verifyToken>>;
export type VerifyTokenReq = NonNullable<VerifyTokenParams['data']>;

type VerifyTokenApiResponse =
  paths['/api/v1/system/auth/verify']['post']['responses'][200]['content']['application/json'];
export type VerifyTokenData = NonNullable<VerifyTokenApiResponse['data']>;

// Token 刷新
export type RefreshTokenParams = Parameters<typeof AuthAPI.refreshToken>[0];
export type RefreshTokenResponse = Awaited<ReturnType<typeof AuthAPI.refreshToken>>;
export type RefreshTokenReq = NonNullable<RefreshTokenParams['data']>;

type RefreshTokenApiResponse =
  paths['/api/v1/system/auth/refresh']['post']['responses'][200]['content']['application/json'];
export type RefreshTokenData = NonNullable<RefreshTokenApiResponse['data']>;
