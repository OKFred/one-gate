import { axiosPlus } from '../../config';
import type { AxiosConfig } from '../../config';

export const listAllFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/region/listAll', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/i18n/region/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/region/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/i18n/region/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/region/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/i18n/region/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/region/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/i18n/region/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/region/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/i18n/region/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/region/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/i18n/region/delete',
    method: 'post',
    ...axiosConfig,
  });
};
