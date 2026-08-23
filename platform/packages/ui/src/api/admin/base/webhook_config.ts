import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const listFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/base/webhook_config/list', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/base/webhook_config/list',
    method: 'post',
    ...axiosConfig,
  });

export const detailFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/base/webhook_config/detail', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/base/webhook_config/detail',
    method: 'post',
    ...axiosConfig,
  });

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/base/webhook_config/add', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/base/webhook_config/add',
    method: 'post',
    ...axiosConfig,
  });

export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/base/webhook_config/update', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/base/webhook_config/update',
    method: 'post',
    ...axiosConfig,
  });

export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/base/webhook_config/delete', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    url: '/api/v1/admin/base/webhook_config/delete',
    method: 'post',
    ...axiosConfig,
  });
