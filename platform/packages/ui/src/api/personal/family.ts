import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const listFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/family/member/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/family/member/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/family/member/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/family/member/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/family/member/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/family/member/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/family/member/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/family/member/delete',
    method: 'post',
    ...axiosConfig,
  });
};
