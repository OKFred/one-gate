import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/mail/account/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/mail/account/delete',
    method: 'post',
    ...axiosConfig,
  });
};
