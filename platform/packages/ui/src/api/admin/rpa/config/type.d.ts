import * as RpaConfigAPI from '@/api/admin/rpa/config/config';

// ==================== RpaConfig Configuration ====================

/** 分页获取浏览器配置请求 */
export type ListRpaConfigReq = NonNullable<Parameters<typeof RpaConfigAPI.listFn>[0]['data']>;
/** 分页获取浏览器配置响应 */
export type ListRpaConfigRes = Awaited<ReturnType<typeof RpaConfigAPI.listFn>>['data']['data'];

/** 添加浏览器配置请求 */
export type AddRpaConfigReq = NonNullable<Parameters<typeof RpaConfigAPI.addFn>[0]['data']>;
/** 添加浏览器配置响应 */
export type AddRpaConfigRes = Awaited<ReturnType<typeof RpaConfigAPI.addFn>>['data']['data'];

/** 更新浏览器配置请求 */
export type UpdateRpaConfigReq = NonNullable<Parameters<typeof RpaConfigAPI.updateFn>[0]['data']>;
/** 更新浏览器配置响应 */
export type UpdateRpaConfigRes = Awaited<ReturnType<typeof RpaConfigAPI.updateFn>>['data']['data'];

/** 删除浏览器配置请求 */
export type DeleteRpaConfigReq = NonNullable<Parameters<typeof RpaConfigAPI.deleteFn>[0]['data']>;
/** 删除浏览器配置响应 */
export type DeleteRpaConfigRes = Awaited<ReturnType<typeof RpaConfigAPI.deleteFn>>['data']['data'];

/** 验证浏览器配置连通性请求 */
export type VerifyRpaConfigReq = NonNullable<Parameters<typeof RpaConfigAPI.verifyFn>[0]['data']>;
/** 验证浏览器配置连通性响应 */
export type VerifyRpaConfigRes = Awaited<ReturnType<typeof RpaConfigAPI.verifyFn>>['data']['data'];

/** 浏览器配置对象 */
export type RpaConfigObj = ListRpaConfigRes['list'][number];
