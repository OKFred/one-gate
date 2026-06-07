import * as CacheAPI from '@/api/maintenance/cache';
import * as AuditLoginAPI from '@/api/maintenance/auditLogin';
import * as CronAPI from '@/api/maintenance/cron';

// ==================== Cache ====================

// 列出所有 keys
export type ListKeysReq = NonNullable<Parameters<typeof CacheAPI.listKeysFn>[0]['data']>;
export type ListKeysRes = Awaited<ReturnType<typeof CacheAPI.listKeysFn>>['data']['data'];

// 获取缓存值
export type GetCacheReq = NonNullable<Parameters<typeof CacheAPI.getFn>[0]['data']>;
export type GetCacheRes = Awaited<ReturnType<typeof CacheAPI.getFn>>['data']['data'];

// 设置缓存值
export type PutCacheReq = NonNullable<Parameters<typeof CacheAPI.putFn>[0]['data']>;
export type PutCacheRes = Awaited<ReturnType<typeof CacheAPI.putFn>>['data']['data'];

// 删除缓存值
export type DeleteCacheReq = NonNullable<Parameters<typeof CacheAPI.deleteFn>[0]['data']>;
export type DeleteCacheRes = Awaited<ReturnType<typeof CacheAPI.deleteFn>>['data']['data'];

// 清空所有缓存
export type ClearCacheReq = NonNullable<Parameters<typeof CacheAPI.clearFn>[0]['data']>;
export type ClearCacheRes = Awaited<ReturnType<typeof CacheAPI.clearFn>>['data']['data'];

// ==================== Audit Login ====================

export type ListLoginAuditReq = NonNullable<Parameters<typeof AuditLoginAPI.listFn>[0]['data']>;
export type ListLoginAuditRes = Awaited<ReturnType<typeof AuditLoginAPI.listFn>>['data']['data'];

// ==================== Cron ====================
export type ListCronReq = NonNullable<Parameters<typeof CronAPI.listFn>[0]['data']>;
export type ListCronRes = Awaited<ReturnType<typeof CronAPI.listFn>>['data']['data'];

export type GetCronReq = NonNullable<Parameters<typeof CronAPI.getFn>[0]['data']>;
export type GetCronRes = Awaited<ReturnType<typeof CronAPI.getFn>>['data']['data'];

export type AddCronReq = NonNullable<Parameters<typeof CronAPI.addFn>[0]['data']>;
export type AddCronRes = Awaited<ReturnType<typeof CronAPI.addFn>>['data']['data'];

export type UpdateCronReq = NonNullable<Parameters<typeof CronAPI.updateFn>[0]['data']>;
export type UpdateCronRes = Awaited<ReturnType<typeof CronAPI.updateFn>>['data']['data'];

export type DeleteCronReq = NonNullable<Parameters<typeof CronAPI.deleteFn>[0]['data']>;
export type DeleteCronRes = Awaited<ReturnType<typeof CronAPI.deleteFn>>['data']['data'];

export type ListCronLogsReq = NonNullable<Parameters<typeof CronAPI.listLogsFn>[0]['data']>;
export type ListCronLogsRes = Awaited<ReturnType<typeof CronAPI.listLogsFn>>['data']['data'];

export type CronObj = ListCronRes['list'][number];
export type CronLogObj = ListCronLogsRes['list'][number];
