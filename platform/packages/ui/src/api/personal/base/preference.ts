import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const getFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/base/preference/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/base/preference/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/base/preference/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/base/preference/update',
    method: 'post',
    ...axiosConfig,
  });
};
