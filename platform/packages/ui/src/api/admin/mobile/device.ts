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

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/device/get', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device/get',
    method: 'post',
    ...axiosConfig,
  });

export const updateMetadataFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/mobile/device/metadata/update', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device/metadata/update',
    method: 'post',
    ...axiosConfig,
  });

export const listEventsFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/mobile/device/event/list', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device/event/list',
    method: 'post',
    ...axiosConfig,
  });

export const revealSensitiveFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/mobile/device/sensitive/reveal', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device/sensitive/reveal',
    method: 'post',
    ...axiosConfig,
  });

export const resetReportTokenFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/mobile/device/report-token/reset', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device/report-token/reset',
    method: 'post',
    ...axiosConfig,
  });
