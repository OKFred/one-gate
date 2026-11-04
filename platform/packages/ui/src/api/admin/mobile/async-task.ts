import type { AxiosConfig } from '../../config';
import { axiosPlus } from '../../config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/async-task/list', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/async-task/list',
    method: 'post',
    ...axiosConfig,
  });

export const stateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/async-task/state', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/async-task/state',
    method: 'post',
    ...axiosConfig,
  });

export const cancelFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/mobile/async-task/cancel', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/async-task/cancel',
    method: 'post',
    ...axiosConfig,
  });

export type DeviceTaskState = Awaited<ReturnType<typeof stateFn>>['data']['data'];
