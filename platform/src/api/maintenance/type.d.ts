import * as CacheAPI from '@/api/maintenance/cache';

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
import * as AuditLoginAPI from '@/api/maintenance/auditLogin';

export type ListLoginAuditReq = NonNullable<Parameters<typeof AuditLoginAPI.listFn>[0]['data']>;
export type ListLoginAuditRes = Awaited<ReturnType<typeof AuditLoginAPI.listFn>>['data']['data'];
