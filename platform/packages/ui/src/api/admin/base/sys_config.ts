import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/sys_config/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/sys_config/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/sys_config/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/sys_config/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/sys_config/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/sys_config/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/sys_config/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/sys_config/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const schemaFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/sys_config/schema', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/sys_config/schema',
    method: 'post',
    ...axiosConfig,
  });
};

export const namespacesFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/admin/base/sys_config/namespaces', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/base/sys_config/namespaces',
    method: 'post',
    ...(axiosConfig || {}),
  });
};
