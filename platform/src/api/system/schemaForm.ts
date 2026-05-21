import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/schema_form/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/schema_form/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/schema_form/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/schema_form/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/schema_form/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/schema_form/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/schema_form/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/schema_form/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/schema_form/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/schema_form/delete',
    method: 'post',
    ...axiosConfig,
  });
};
