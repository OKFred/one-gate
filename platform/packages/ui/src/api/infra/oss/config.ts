import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

/** 获取所有 OSS 配置 */
export const listAllFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/infra/oss/config/listAll', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/oss/config/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

/** 分页获取 OSS 配置 */
export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/oss/config/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/oss/config/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取 OSS 配置详情 */
export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/oss/config/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/oss/config/get',
    method: 'post',
    ...axiosConfig,
  });
};

/** 添加 OSS 配置 */
export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/oss/config/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/oss/config/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 更新 OSS 配置 */
export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/oss/config/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/oss/config/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除 OSS 配置 */
export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/oss/config/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/oss/config/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 验证配置连通性 */
export const verifyFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/oss/config/verify', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/oss/config/verify',
    method: 'post',
    ...axiosConfig,
  });
};
