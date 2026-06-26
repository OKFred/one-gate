import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

//====================================================================
// Workflow API
//====================================================================

export const listAllFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/listAll', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const runFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/run', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/run',
    method: 'post',
    ...axiosConfig,
  });
};

//====================================================================
// Config API
//====================================================================

export const listConfigFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/config/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/config/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const addConfigFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/config/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/config/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateConfigFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/config/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/config/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteConfigFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/config/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/config/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const verifyConfigFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/config/verify', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/config/verify',
    method: 'post',
    ...axiosConfig,
  });
};

//====================================================================
// Log API
//====================================================================

export const listLogsFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/enterprise/workflow/log/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/enterprise/workflow/log/list',
    method: 'post',
    ...axiosConfig,
  });
};
