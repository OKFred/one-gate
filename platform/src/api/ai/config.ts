import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

/** 获取所有 AI 配置 */
export const listAllFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/ai/config/listAll', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/ai/config/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

/** 分页获取 AI 配置 */
export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/ai/config/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/ai/config/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取 AI 配置详情 */
export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/ai/config/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/ai/config/get',
    method: 'post',
    ...axiosConfig,
  });
};

/** 添加 AI 配置 */
export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/ai/config/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/ai/config/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 更新 AI 配置 */
export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/ai/config/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/ai/config/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除 AI 配置 */
export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/ai/config/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/ai/config/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 验证 AI 配置连通性 */
export const verifyFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/ai/config/verify', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/ai/config/verify',
    method: 'post',
    ...axiosConfig,
  });
};
