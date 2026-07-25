import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

export const dashboardFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/finance/dashboard', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/dashboard',
    method: 'post',
    ...axiosConfig,
  });
};

export const incomeListFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/finance/income/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/income/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const incomeAddFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/finance/income/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/income/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const incomeUpdateFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/income/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/income/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const incomeDeleteFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/income/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/income/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const expenseListFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/expense/list', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/expense/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const expenseAddFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/personal/finance/expense/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/expense/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const expenseUpdateFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/expense/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/expense/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const expenseDeleteFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/expense/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/expense/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const dataSourceListFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/data_source/list', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/data_source/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const dataSourceAddFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/data_source/add', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/data_source/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const dataSourceUpdateFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/data_source/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/data_source/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const dataSourceDeleteFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/data_source/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/data_source/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const dataSourceSyncFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/personal/finance/data_source/sync', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/personal/finance/data_source/sync',
    method: 'post',
    ...axiosConfig,
  });
};
