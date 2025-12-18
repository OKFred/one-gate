import type * as UserAPI from '@/api/system/user';

// ==================== 用户相关类型 ====================

// 获取用户列表
export type ListUserParams = Parameters<typeof UserAPI.listFn>[0];
export type ListUserResponse = Awaited<ReturnType<typeof UserAPI.listFn>>;
export type ListUserReq = NonNullable<ListUserParams['data']>;
export type ListUserData = NonNullable<ListUserResponse['data']>;
export type UserList = NonNullable<ListUserData['data']['list']>;
export type User = UserList[number];

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListUserReq['orderBy']>;
  descend: boolean;
}

// 获取单个用户
export type GetUserParams = Parameters<typeof UserAPI.getFn>[0];
export type GetUserResponse = Awaited<ReturnType<typeof UserAPI.getFn>>;
export type GetUserReq = NonNullable<GetUserParams['data']>;
export type GetUserData = NonNullable<GetUserResponse['data']>;

// 添加用户
export type AddUserParams = Parameters<typeof UserAPI.addFn>[0]['data'];
export type AddUserResponse = Awaited<ReturnType<typeof UserAPI.addFn>>;
export type AddUserReq = NonNullable<AddUserParams['data']>;
export type AddUserData = NonNullable<AddUserResponse['data']>;

// 更新用户
export type UpdateUserParams = Parameters<typeof UserAPI.updateFn>[0]['data'];
export type UpdateUserResponse = Awaited<ReturnType<typeof UserAPI.updateFn>>;
export type UpdateUserReq = NonNullable<UpdateUserParams['data']>;
export type UpdateUserData = NonNullable<UpdateUserResponse['data']>;

// 删除用户
export type DeleteUserParams = Parameters<typeof UserAPI.deleteFn>[0];
export type DeleteUserResponse = Awaited<ReturnType<typeof UserAPI.deleteFn>>;
export type DeleteUserReq = NonNullable<DeleteUserParams['data']>;
export type DeleteUserData = NonNullable<DeleteUserResponse['data']>;

// 验证用户
export type VerifyUserParams = Parameters<typeof UserAPI.verifyFn>[0];
export type VerifyUserResponse = Awaited<ReturnType<typeof UserAPI.verifyFn>>;
export type VerifyUserReq = NonNullable<VerifyUserParams['data']>;
export type VerifyUserData = NonNullable<VerifyUserResponse['data']>;
