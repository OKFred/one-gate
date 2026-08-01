import type { AxiosConfig } from '../../config';
import { axiosPlus } from '../../config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/app-version/list', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/app-version/list',
    method: 'post',
    ...axiosConfig,
  });

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/app-version/add', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/app-version/add',
    method: 'post',
    ...axiosConfig,
  });

export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/mobile/app-version/update', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/app-version/update',
    method: 'post',
    ...axiosConfig,
  });

export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/mobile/app-version/delete', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/app-version/delete',
    method: 'post',
    ...axiosConfig,
  });
