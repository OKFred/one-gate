import { axiosPlus } from '../../config';
import type { AxiosConfig } from '../../config';

//====================================================================
// Workflow API
//====================================================================

export const listAllFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/biz/enterprise/workflow/listAll', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/biz/enterprise/workflow/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/biz/enterprise/workflow/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/biz/enterprise/workflow/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/biz/enterprise/workflow/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/biz/enterprise/workflow/get',
    method: 'post',
    ...axiosConfig,
  });
};

export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/biz/enterprise/workflow/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/biz/enterprise/workflow/add',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/biz/enterprise/workflow/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/biz/enterprise/workflow/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/biz/enterprise/workflow/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/biz/enterprise/workflow/delete',
    method: 'post',
    ...axiosConfig,
  });
};

export const runFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/biz/enterprise/workflow/run', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/biz/enterprise/workflow/run',
    method: 'post',
    ...axiosConfig,
  });
};

//====================================================================
// Log API
//====================================================================

export const listLogsFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/biz/enterprise/workflow/log/list', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/biz/enterprise/workflow/log/list',
    method: 'post',
    ...axiosConfig,
  });
};
