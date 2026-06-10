import * as CacheAPI from '@/api/maintenance/cache';
import * as AuditLoginAPI from '@/api/maintenance/auditLogin';
import * as CronAPI from '@/api/maintenance/cron';
import * as ApiTaskAPI from '@/api/maintenance/api-task';
import * as ApiDocsAPI from '@/api/maintenance/api-docs';

// ==================== Cache ====================
// ... (lines 6-69 stay identical, let's keep them)
export type ListKeysReq = NonNullable<Parameters<typeof CacheAPI.listKeysFn>[0]['data']>;
export type ListKeysRes = Awaited<ReturnType<typeof CacheAPI.listKeysFn>>['data']['data'];

export type GetCacheReq = NonNullable<Parameters<typeof CacheAPI.getFn>[0]['data']>;
export type GetCacheRes = Awaited<ReturnType<typeof CacheAPI.getFn>>['data']['data'];

export type PutCacheReq = NonNullable<Parameters<typeof CacheAPI.putFn>[0]['data']>;
export type PutCacheRes = Awaited<ReturnType<typeof CacheAPI.putFn>>['data']['data'];

export type DeleteCacheReq = NonNullable<Parameters<typeof CacheAPI.deleteFn>[0]['data']>;
export type DeleteCacheRes = Awaited<ReturnType<typeof CacheAPI.deleteFn>>['data']['data'];

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

// ... Rest of file up to line 70
export type DeleteCronReq = NonNullable<Parameters<typeof CronAPI.deleteFn>[0]['data']>;
export type DeleteCronRes = Awaited<ReturnType<typeof CronAPI.deleteFn>>['data']['data'];

export type ListCronLogsReq = NonNullable<Parameters<typeof CronAPI.listLogsFn>[0]['data']>;
export type ListCronLogsRes = Awaited<ReturnType<typeof CronAPI.listLogsFn>>['data']['data'];

export type CronObj = ListCronRes['list'][number];
export type CronLogObj = ListCronLogsRes['list'][number];

// ==================== API Task ====================
export type ListApiTaskReq = NonNullable<Parameters<typeof ApiTaskAPI.listFn>[0]['data']>;
export type ListApiTaskRes = Awaited<ReturnType<typeof ApiTaskAPI.listFn>>['data']['data'];

export type GetApiTaskReq = NonNullable<Parameters<typeof ApiTaskAPI.getFn>[0]['data']>;
export type GetApiTaskRes = Awaited<ReturnType<typeof ApiTaskAPI.getFn>>['data']['data'];

export type AddApiTaskReq = NonNullable<Parameters<typeof ApiTaskAPI.addFn>[0]['data']>;
export type AddApiTaskRes = Awaited<ReturnType<typeof ApiTaskAPI.addFn>>['data']['data'];

export type UpdateApiTaskReq = NonNullable<Parameters<typeof ApiTaskAPI.updateFn>[0]['data']>;
export type UpdateApiTaskRes = Awaited<ReturnType<typeof ApiTaskAPI.updateFn>>['data']['data'];

export type DeleteApiTaskReq = NonNullable<Parameters<typeof ApiTaskAPI.deleteFn>[0]['data']>;
export type DeleteApiTaskRes = Awaited<ReturnType<typeof ApiTaskAPI.deleteFn>>['data']['data'];

export type RunTestApiTaskReq = NonNullable<Parameters<typeof ApiTaskAPI.runTestFn>[0]['data']>;
export type RunTestApiTaskRes = Awaited<ReturnType<typeof ApiTaskAPI.runTestFn>>['data']['data'];

export type ApiTaskObj = ListApiTaskRes['list'][number];

// ==================== API Docs ====================
export type ListApiDocsReq = NonNullable<Parameters<typeof ApiDocsAPI.listFn>[0]['data']>;
export type ListApiDocsRes = Awaited<ReturnType<typeof ApiDocsAPI.listFn>>['data']['data'];

export type GetApiDocsReq = NonNullable<Parameters<typeof ApiDocsAPI.getFn>[0]['data']>;
export type GetApiDocsRes = Awaited<ReturnType<typeof ApiDocsAPI.getFn>>['data']['data'];

export type AddApiDocsReq = NonNullable<Parameters<typeof ApiDocsAPI.addFn>[0]['data']>;
export type AddApiDocsRes = Awaited<ReturnType<typeof ApiDocsAPI.addFn>>['data']['data'];

export type UpdateApiDocsReq = NonNullable<Parameters<typeof ApiDocsAPI.updateFn>[0]['data']>;
export type UpdateApiDocsRes = Awaited<ReturnType<typeof ApiDocsAPI.updateFn>>['data']['data'];

export type DeleteApiDocsReq = NonNullable<Parameters<typeof ApiDocsAPI.deleteFn>[0]['data']>;
export type DeleteApiDocsRes = Awaited<ReturnType<typeof ApiDocsAPI.deleteFn>>['data']['data'];

export type ParseApiDocsReq = NonNullable<Parameters<typeof ApiDocsAPI.parseFn>[0]['data']>;
export type ParseApiDocsRes = Awaited<ReturnType<typeof ApiDocsAPI.parseFn>>['data']['data'];

export type ApiDocsObj = ListApiDocsRes['list'][number];

// ==================== API Task Add Bulk ====================
export type BulkAddApiTaskReq = NonNullable<Parameters<typeof ApiTaskAPI.bulkAddFn>[0]['data']>;
export type BulkAddApiTaskRes = Awaited<ReturnType<typeof ApiTaskAPI.bulkAddFn>>['data']['data'];
