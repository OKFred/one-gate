import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

/** 获取所有 Docker 配置 */
export const listAllFn = (
  axiosConfig?: Omit<
    AxiosConfig<'/api/v1/admin/swarm/docker_config/listAll', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/swarm/docker_config/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

/** 分页获取 Docker 配置 */
export const listFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/swarm/docker_config/list', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/swarm/docker_config/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取 Docker 配置详情 */
export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/swarm/docker_config/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/swarm/docker_config/get',
    method: 'post',
    ...axiosConfig,
  });
};

/** 添加 Docker 配置 */
export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/swarm/docker_config/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/swarm/docker_config/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 更新 Docker 配置 */
export const updateFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/swarm/docker_config/update', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/swarm/docker_config/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除 Docker 配置 */
export const deleteFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/swarm/docker_config/delete', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/swarm/docker_config/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 验证 Docker 配置连通性 */
export const verifyFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/swarm/docker_config/verify', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/admin/swarm/docker_config/verify',
    method: 'post',
    ...axiosConfig,
  });
};
