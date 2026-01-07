import type * as authAPI from '@/api/system/auth';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<AuthUserReq['orderBy']>;
  descend: boolean;
}

// 获取用户列表
export type AuthUserParams = Parameters<typeof authAPI.getProfile>[0];
export type AuthUserResponse = Awaited<ReturnType<typeof authAPI.getProfile>>;
export type AuthUserReq = NonNullable<AuthUserParams['data']>;
export type AuthUserData = NonNullable<AuthUserResponse['data']>;
export type User = AuthUserData['data']['userObj'];
