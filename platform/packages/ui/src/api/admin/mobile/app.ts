import type { AxiosConfig } from '../../config';
import { axiosPlus } from '../../config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/app/list', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/app/list',
    method: 'post',
    ...axiosConfig,
  });

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/app/add', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/app/add',
    method: 'post',
    ...axiosConfig,
  });

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/app/update', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/app/update',
    method: 'post',
    ...axiosConfig,
  });

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/app/delete', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/app/delete',
    method: 'post',
    ...axiosConfig,
  });
