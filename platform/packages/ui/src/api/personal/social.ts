import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const contactListFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/social/contact/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/social/contact/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const contactAddFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/social/contact/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/social/contact/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const contactUpdateFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/social/contact/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/social/contact/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const contactDeleteFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/social/contact/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/social/contact/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const graphFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/social/graph', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/social/graph',
    method: 'post',
    ...axiosConfig,
  });
};
