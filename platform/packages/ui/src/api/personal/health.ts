import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const listFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/health/medical_record/list', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/health/medical_record/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/health/medical_record/add', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/health/medical_record/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/health/medical_record/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/health/medical_record/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/health/medical_record/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/health/medical_record/delete',
    method: 'post',
    ...axiosConfig,
  });
};
