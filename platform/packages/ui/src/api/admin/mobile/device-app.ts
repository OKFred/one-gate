import type { AxiosConfig } from '../../config';
import { axiosPlus } from '../../config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/device-app/list', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device-app/list',
    method: 'post',
    ...axiosConfig,
  });

export const syncFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/device-app/sync', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device-app/sync',
    method: 'post',
    ...axiosConfig,
  });

export const installFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/mobile/device-app/install', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device-app/install',
    method: 'post',
    ...axiosConfig,
  });
