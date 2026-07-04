import { axiosPlus } from '../../config';
import type { AxiosConfig } from '../../config';

export const listKeysFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cache/listKeys', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cache/listKeys',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cache/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cache/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const putFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cache/put', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cache/put',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cache/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cache/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const clearFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/maintenance/cache/clear', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/maintenance/cache/clear',
    method: 'post',
    ...axiosConfig,
  });
};
