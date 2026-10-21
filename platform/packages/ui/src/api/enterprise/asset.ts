import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

export const listFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/list', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/list', method: 'post', ...config });

export const getFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/get', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/get', method: 'post', ...config });

export const addFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/add', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/add', method: 'post', ...config });

export const updateFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/update', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/update', method: 'post', ...config });

export const retireFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/retire', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/retire', method: 'post', ...config });

export const activateFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/activate', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/activate', method: 'post', ...config });

export const identifierListFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/identifierList', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/identifierList', method: 'post', ...config });

export const identifierAddFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/identifierAdd', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/identifierAdd', method: 'post', ...config });

export const identifierUpdateFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/identifierUpdate', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/identifierUpdate', method: 'post', ...config });

export const assignmentListFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/assignmentList', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/assignmentList', method: 'post', ...config });

export const assignFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/assign', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/assign', method: 'post', ...config });

export const closeAssignmentFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/closeAssignment', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/closeAssignment', method: 'post', ...config });

export const bindingListFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/bindingList', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/bindingList', method: 'post', ...config });

export const bindFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/bind', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/bind', method: 'post', ...config });

export const closeBindingFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/asset/closeBinding', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/asset/closeBinding', method: 'post', ...config });
