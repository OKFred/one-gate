import { axiosPlus, type AxiosConfig } from '@/api/config';

export const resourcesFn = (
  config: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/recycle-bin/resources', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    ...config,
    url: '/api/v1/admin/maintenance/recycle-bin/resources',
    method: 'post',
  });

export const listFn = (
  config: Omit<AxiosConfig<'/api/v1/admin/maintenance/recycle-bin/list', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    ...config,
    url: '/api/v1/admin/maintenance/recycle-bin/list',
    method: 'post',
  });

export const restoreFn = (
  config: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/recycle-bin/restore', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    ...config,
    url: '/api/v1/admin/maintenance/recycle-bin/restore',
    method: 'post',
  });

export const purgeFn = (
  config: Omit<
    AxiosConfig<'/api/v1/admin/maintenance/recycle-bin/purge', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({
    ...config,
    url: '/api/v1/admin/maintenance/recycle-bin/purge',
    method: 'post',
  });

export type ListRes = NonNullable<Awaited<ReturnType<typeof listFn>>['data']['data']>;
export type RecycleBinItem = ListRes['list'][number];
export type ResourcesRes = NonNullable<Awaited<ReturnType<typeof resourcesFn>>['data']['data']>;
export type ResourceDescriptor = ResourcesRes['list'][number];
