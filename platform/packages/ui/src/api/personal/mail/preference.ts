import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const getFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/mail/preference/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/mail/preference/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/personal/mail/preference/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/mail/preference/update',
    method: 'post',
    ...axiosConfig,
  });
};
