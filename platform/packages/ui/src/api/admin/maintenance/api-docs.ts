import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

/** 获取 API 文档列表 */
export const listFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-docs/list', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-docs/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取 API 文档详情 */
export const getFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-docs/get', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-docs/get',
    method: 'post',
    ...axiosConfig,
  });
};

/** 添加 API 文档 */
export const addFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-docs/add', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-docs/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 更新 API 文档 */
export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-docs/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-docs/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除 API 文档 */
export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-docs/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-docs/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 解析 API 文档端点 */
export const parseFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/api-docs/parse', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/maintenance/api-docs/parse',
    method: 'post',
    ...axiosConfig,
  });
};
