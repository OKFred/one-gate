import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const sendFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mail/action/send', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    ...axiosConfig,
    url: '/api/v1/admin/mail/action/send',
    method: 'post',
  });
};

export const verifyFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mail/action/verify', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/mail/action/verify',
    method: 'post',
    ...axiosConfig,
  });
};
