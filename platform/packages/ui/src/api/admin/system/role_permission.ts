import { axiosPlus } from '../../config';
import type { AxiosConfig } from '../../config';

export const listAllFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/role_permission/listAll', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/role_permission/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

export const listFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/role_permission/list', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/role_permission/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/role_permission/add', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/role_permission/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const batchAddFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/role_permission/batchAdd', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/role_permission/batchAdd',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/role_permission/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/role_permission/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/role_permission/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/role_permission/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const batchDeleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/role_permission/batchDelete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/role_permission/batchDelete',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/role_permission/get', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/role_permission/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const getPermissionsByRoleFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/role_permission/getPermissionsByRole', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/system/role_permission/getPermissionsByRole',
    method: 'post',
    ...axiosConfig,
  });
};
