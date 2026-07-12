import { axiosPlus } from '../../config';
import type { AxiosConfig } from '../../config';

//====================================================================
// Workflow API
//====================================================================

export const listAllFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/enterprise/executive/workflow/listAll', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/executive/workflow/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/executive/workflow/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/executive/workflow/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/executive/workflow/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/executive/workflow/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/executive/workflow/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/executive/workflow/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/enterprise/executive/workflow/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/executive/workflow/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/enterprise/executive/workflow/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/executive/workflow/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const runFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/executive/workflow/run', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/executive/workflow/run',
    method: 'post',
    ...axiosConfig,
  });
};

//====================================================================
// Log API
//====================================================================

export const listLogsFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/enterprise/executive/workflow/log/list', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/executive/workflow/log/list',
    method: 'post',
    ...axiosConfig,
  });
};
