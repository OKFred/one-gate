import { axiosPlus } from '../../config';
import type { AxiosConfig } from '../../config';

export const listAllFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/system/department/listAll', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/system/department/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/system/department/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/system/department/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/system/department/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/system/department/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/system/department/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/system/department/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/system/department/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/system/department/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/system/department/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/system/department/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const treeFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/system/department/tree', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/system/department/tree',
    method: 'post',
    ...axiosConfig,
  });
};
