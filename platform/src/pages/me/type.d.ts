import type * as UserAPI from '@/api/system/user';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListUserReq['orderBy']>;
  descend: boolean;
}

// 获取用户列表
export type ListUserParams = Parameters<typeof UserAPI.listFn>[0];
export type ListUserResponse = Awaited<ReturnType<typeof UserAPI.listFn>>;
export type ListUserReq = NonNullable<ListUserParams['data']>;
export type ListUserData = NonNullable<ListUserResponse['data']>;
export type UserList = NonNullable<ListUserData['data']['list']>;
export type User = UserList[number];

// 更新用户
export type UpdateUserParams = Parameters<typeof UserAPI.updateFn>[0]['data'];
export type UpdateUserResponse = Awaited<ReturnType<typeof UserAPI.updateFn>>;
export type UpdateUserReq = NonNullable<UpdateUserParams['data']>;
export type UpdateUserData = NonNullable<UpdateUserResponse['data']>;
