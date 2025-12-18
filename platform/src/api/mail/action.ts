import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const sendFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/action/send', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    ...axiosConfig,
    url: '/api/v1/mail/action/send',
    method: 'post',
  });
};
