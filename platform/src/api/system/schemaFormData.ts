import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/schema_form_data/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/schema_form_data/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const submitFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/system/schema_form_data/submit', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/system/schema_form_data/submit',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/system/schema_form_data/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/system/schema_form_data/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/schema_form_data/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/schema_form_data/get',
    method: 'post',
    ...axiosConfig,
  });
};
