import { axiosPlus } from '../../config';
import type { AxiosConfig } from '../../config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/api-token/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/api-token/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/api-token/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/api-token/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/api-token/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/api-token/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/api-token/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/api-token/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/api-token/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/api-token/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const revokeFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/api-token/revoke', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/api-token/revoke',
    method: 'post',
    ...axiosConfig,
  });
};
