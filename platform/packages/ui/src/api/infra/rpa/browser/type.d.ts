import * as BrowserConfigAPI from '@/api/infra/rpa/browser/config';

// ==================== Browser Configuration ====================

/** 分页获取浏览器配置请求 */
export type ListBrowserConfigReq = NonNullable<
  Parameters<typeof BrowserConfigAPI.listFn>[0]['data']
>;
/** 分页获取浏览器配置响应 */
export type ListBrowserConfigRes = Awaited<
  ReturnType<typeof BrowserConfigAPI.listFn>
>['data']['data'];

/** 添加浏览器配置请求 */
export type AddBrowserConfigReq = NonNullable<Parameters<typeof BrowserConfigAPI.addFn>[0]['data']>;
/** 添加浏览器配置响应 */
export type AddBrowserConfigRes = Awaited<
  ReturnType<typeof BrowserConfigAPI.addFn>
>['data']['data'];

/** 更新浏览器配置请求 */
export type UpdateBrowserConfigReq = NonNullable<
  Parameters<typeof BrowserConfigAPI.updateFn>[0]['data']
>;
/** 更新浏览器配置响应 */
export type UpdateBrowserConfigRes = Awaited<
  ReturnType<typeof BrowserConfigAPI.updateFn>
>['data']['data'];

/** 删除浏览器配置请求 */
export type DeleteBrowserConfigReq = NonNullable<
  Parameters<typeof BrowserConfigAPI.deleteFn>[0]['data']
>;
/** 删除浏览器配置响应 */
export type DeleteBrowserConfigRes = Awaited<
  ReturnType<typeof BrowserConfigAPI.deleteFn>
>['data']['data'];

/** 验证浏览器配置连通性请求 */
export type VerifyBrowserConfigReq = NonNullable<
  Parameters<typeof BrowserConfigAPI.verifyFn>[0]['data']
>;
/** 验证浏览器配置连通性响应 */
export type VerifyBrowserConfigRes = Awaited<
  ReturnType<typeof BrowserConfigAPI.verifyFn>
>['data']['data'];

/** 浏览器配置对象 */
export type BrowserConfigObj = ListBrowserConfigRes['list'][number];
