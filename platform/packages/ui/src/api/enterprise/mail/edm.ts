import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const sendBatchFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/mail/edm/sendBatch', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/mail/edm/sendBatch',
    method: 'post',
    ...axiosConfig,
  });
};
