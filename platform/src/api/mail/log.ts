import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/log/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/log/list',
    method: 'post',
    ...axiosConfig,
  });
};
