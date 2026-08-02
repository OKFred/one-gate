import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

/** 获取 API Task 列表 */
export const listFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-task/list', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-task/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取 API Task 详情 */
export const getFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-task/get', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-task/get',
    method: 'post',
    ...axiosConfig,
  });
};

/** 添加 API Task */
export const addFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-task/add', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-task/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 更新 API Task */
export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-task/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-task/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除 API Task */
export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-task/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-task/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 立即执行 API Task 测试 */
export const runTestFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-task/runTest', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-task/runTest',
    method: 'post',
    ...axiosConfig,
  });
};

/** 批量添加 API Task */
export const bulkAddFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-task/bulkAdd', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-task/bulkAdd',
    method: 'post',
    ...axiosConfig,
  });
};
