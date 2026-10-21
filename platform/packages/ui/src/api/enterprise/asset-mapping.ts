import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

export const resolveFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/mapping/resolve', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/mapping/resolve', method: 'post', ...config });

export const listFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/mapping/list', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/mapping/list', method: 'post', ...config });
