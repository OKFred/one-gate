import * as ProfileAPI from '@/api/personal/profile';

// ==================== Profile ====================

/** 获取所有个人档案请求 */
export type ListAllProfileReq = NonNullable<
  Parameters<typeof ProfileAPI.listAllFn>[0]['data']
>;
/** 获取所有个人档案响应 */
export type ListAllProfileRes = Awaited<
  ReturnType<typeof ProfileAPI.listAllFn>
>['data']['data'];

/** 分页获取个人档案请求 */
export type ListProfileReq = NonNullable<Parameters<typeof ProfileAPI.listFn>[0]['data']>;
/** 分页获取个人档案响应 */
export type ListProfileRes = Awaited<ReturnType<typeof ProfileAPI.listFn>>['data']['data'];

/** 获取个人档案详情请求 */
export type GetProfileReq = NonNullable<Parameters<typeof ProfileAPI.getFn>[0]['data']>;
/** 获取个人档案详情响应 */
export type GetProfileRes = Awaited<ReturnType<typeof ProfileAPI.getFn>>['data']['data'];

/** 添加个人档案请求 */
export type AddProfileReq = NonNullable<Parameters<typeof ProfileAPI.addFn>[0]['data']>;
/** 添加个人档案响应 */
export type AddProfileRes = Awaited<ReturnType<typeof ProfileAPI.addFn>>['data']['data'];

/** 更新个人档案请求 */
export type UpdateProfileReq = NonNullable<Parameters<typeof ProfileAPI.updateFn>[0]['data']>;
/** 更新个人档案响应 */
export type UpdateProfileRes = Awaited<
  ReturnType<typeof ProfileAPI.updateFn>
>['data']['data'];

/** 删除个人档案请求 */
export type DeleteProfileReq = NonNullable<Parameters<typeof ProfileAPI.deleteFn>[0]['data']>;
/** 删除个人档案响应 */
export type DeleteProfileRes = Awaited<
  ReturnType<typeof ProfileAPI.deleteFn>
>['data']['data'];

/** 个人档案对象 */
export type ProfileObj = ListProfileRes['list'][number];
