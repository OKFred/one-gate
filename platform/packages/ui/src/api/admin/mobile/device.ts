import type { AxiosConfig } from '../../config';
import { axiosPlus } from '../../config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/device/list', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device/list',
    method: 'post',
    ...axiosConfig,
  });

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/device/add', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device/add',
    method: 'post',
    ...axiosConfig,
  });

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/device/update', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device/update',
    method: 'post',
    ...axiosConfig,
  });

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/device/delete', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device/delete',
    method: 'post',
    ...axiosConfig,
  });
