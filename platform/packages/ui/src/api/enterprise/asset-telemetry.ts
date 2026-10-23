import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

export const catalogFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/telemetry/catalog', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/telemetry/catalog', method: 'post', ...config });

export const resolveBatchFn = (
  config: Omit<
    AxiosConfig<'/api/v1/enterprise/asset/telemetry/resolveBatch', 'post'>,
    'url' | 'method'
  >,
) =>
  axiosPlus({ url: '/api/v1/enterprise/asset/telemetry/resolveBatch', method: 'post', ...config });
