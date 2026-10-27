import { axiosPlus, type AxiosConfig } from '@/api/config';

type StatusConfig = AxiosConfig<'/api/v1/personal/calendar/subscription/status', 'post'>;
type RotateConfig = AxiosConfig<'/api/v1/personal/calendar/subscription/rotate', 'post'>;
type RevokeConfig = AxiosConfig<'/api/v1/personal/calendar/subscription/revoke', 'post'>;

export const getFn = (config?: Omit<StatusConfig, 'url' | 'method'>) =>
  axiosPlus({
    url: '/api/v1/personal/calendar/subscription/status',
    method: 'post',
    data: {},
    ...config,
  });
export const rotateFn = (config: Omit<RotateConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/calendar/subscription/rotate', method: 'post', ...config });
export const revokeFn = (config: Omit<RevokeConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/calendar/subscription/revoke', method: 'post', ...config });

export type CalendarSubscriptionStatus = Awaited<ReturnType<typeof getFn>>['data']['data'];
