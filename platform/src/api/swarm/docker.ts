import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

export const listServicesFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/swarm/docker/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/swarm/docker/list',
    method: 'post',
    ...axiosConfig,
  });
};

export const inspectServiceFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/swarm/docker/inspect', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/swarm/docker/inspect',
    method: 'post',
    ...axiosConfig,
  });
};

export const createServiceFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/swarm/docker/create', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/swarm/docker/create',
    method: 'post',
    ...axiosConfig,
  });
};

export const updateServiceFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/swarm/docker/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/swarm/docker/update',
    method: 'post',
    ...axiosConfig,
  });
};

export const removeServiceFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/swarm/docker/remove', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/swarm/docker/remove',
    method: 'post',
    ...axiosConfig,
  });
};

export const getServiceLogsFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/swarm/docker/logs', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/swarm/docker/logs',
    method: 'post',
    ...axiosConfig,
  });
};

export const getServiceStatsFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/swarm/docker/stats', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/swarm/docker/stats',
    method: 'post',
    ...axiosConfig,
  });
};
