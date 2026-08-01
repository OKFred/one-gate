import { axiosPlus } from '../../config';
import type { AxiosConfig } from '../../config';

export const listAllFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/permission/listAll', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/permission/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/permission/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/permission/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/permission/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/permission/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/permission/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/permission/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/permission/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/permission/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/permission/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/permission/delete',
    method: 'post',
    ...axiosConfig,
  });
};
