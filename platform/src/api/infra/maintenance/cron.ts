import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

/** 获取定时任务列表 */
export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cron/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cron/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取定时任务详情 */
export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cron/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cron/get',
    method: 'post',
    ...axiosConfig,
  });
};

/** 添加定时任务 */
export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cron/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cron/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 更新定时任务 */
export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cron/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cron/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除定时任务 */
export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cron/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cron/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取定时任务执行日志 */
export const listLogsFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cron/listLogs', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cron/listLogs',
    method: 'post',
    ...axiosConfig,
  });
};

/** 解析 Cron 表达式 */
export const parseFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cron/parse', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cron/parse',
    method: 'post',
    ...axiosConfig,
  });
};
