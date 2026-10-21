import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

export const listFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/list', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/list', method: 'post', ...config });

export const platformListFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/platformList', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/platformList', method: 'post', ...config });

export const createFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/create', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/create', method: 'post', ...config });

export const updateFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/update', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/update', method: 'post', ...config });

export const memberListFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/memberList', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/memberList', method: 'post', ...config });

export const memberSetFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/memberSet', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/memberSet', method: 'post', ...config });

export const transferOwnerFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/transferOwner', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/transferOwner', method: 'post', ...config });

export const recoverOwnerFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/recoverOwner', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/recoverOwner', method: 'post', ...config });

export const tokenGrantListFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/tokenGrantList', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/tokenGrantList', method: 'post', ...config });

export const tokenGrantSetFn = (
  config: Omit<AxiosConfig<'/api/v1/enterprise/tenant/tokenGrantSet', 'post'>, 'url' | 'method'>,
) => axiosPlus({ url: '/api/v1/enterprise/tenant/tokenGrantSet', method: 'post', ...config });
