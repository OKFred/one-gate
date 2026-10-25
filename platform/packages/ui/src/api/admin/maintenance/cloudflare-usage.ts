import { axiosPlus, type AxiosConfig } from '@/api/config';

type OverviewConfig = AxiosConfig<'/api/v1/admin/maintenance/cloudflare-usage/overview', 'post'>;
type RefreshConfig = AxiosConfig<'/api/v1/admin/maintenance/cloudflare-usage/refresh', 'post'>;

export const overviewFn = (config?: Omit<OverviewConfig, 'url' | 'method'>) =>
  axiosPlus({
    url: '/api/v1/admin/maintenance/cloudflare-usage/overview',
    method: 'post',
    data: {},
    ...config,
  });

export const refreshFn = (config?: Omit<RefreshConfig, 'url' | 'method'>) =>
  axiosPlus({
    url: '/api/v1/admin/maintenance/cloudflare-usage/refresh',
    method: 'post',
    data: {},
    ...config,
  });
