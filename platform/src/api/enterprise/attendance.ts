import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

export const listAllFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/attendance/listAll', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/attendance/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/attendance/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/attendance/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/attendance/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/attendance/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/attendance/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/attendance/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/attendance/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/attendance/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/attendance/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/attendance/delete',
    method: 'post',
    ...axiosConfig,
  });
};
