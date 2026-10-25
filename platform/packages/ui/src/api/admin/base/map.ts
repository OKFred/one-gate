import { axiosPlus, type AxiosConfig } from '@/api/config';

type ConfigRequest = AxiosConfig<'/api/v1/admin/base/map/config', 'post'>;

export const configFn = (config?: Omit<ConfigRequest, 'url' | 'method'>) =>
  axiosPlus({
    data: {},
    ...config,
    url: '/api/v1/admin/base/map/config',
    method: 'post',
  });
