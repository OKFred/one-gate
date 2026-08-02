import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

// ---- Sys Log ----
export const sysList = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/log/sys/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/log/sys/list',
    method: 'post',
    ...axiosConfig,
  });
};
export type SysListReq = NonNullable<Parameters<typeof sysList>[0]['data']>;
export type SysListRes = NonNullable<Awaited<ReturnType<typeof sysList>>['data']['data']>;

// ---- Audit Log ----
export const auditList = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/log/audit/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/log/audit/list',
    method: 'post',
    ...axiosConfig,
  });
};
export type AuditListReq = NonNullable<Parameters<typeof auditList>[0]['data']>;
export type AuditListRes = NonNullable<Awaited<ReturnType<typeof auditList>>['data']['data']>;

// ---- Biz Log ----
export const bizList = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/log/biz/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/log/biz/list',
    method: 'post',
    ...axiosConfig,
  });
};
export type BizListReq = NonNullable<Parameters<typeof bizList>[0]['data']>;
export type BizListRes = NonNullable<Awaited<ReturnType<typeof bizList>>['data']['data']>;

// ---- Timeline ----
export const timeline = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/log/timeline', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/log/timeline',
    method: 'post',
    ...axiosConfig,
  });
};
export type TimelineReq = NonNullable<Parameters<typeof timeline>[0]['data']>;
export type TimelineRes = NonNullable<Awaited<ReturnType<typeof timeline>>['data']['data']>;

// ---- Http Request Log ----
export const httpList = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/log/http/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/log/http/list',
    method: 'post',
    ...axiosConfig,
  });
};
export type HttpListReq = NonNullable<Parameters<typeof httpList>[0]['data']>;
export type HttpListRes = NonNullable<Awaited<ReturnType<typeof httpList>>['data']['data']>;
