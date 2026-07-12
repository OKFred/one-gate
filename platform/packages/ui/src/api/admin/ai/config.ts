import { axiosPlus } from '@/api/config';

/** 获取所有 AI 配置 */
export const listAllFn = (axiosConfig?: any) => {
  return axiosPlus({
    url: '/api/v1/admin/ai/config/listAll' as any,
    method: 'post' as any,
    ...axiosConfig,
  } as any);
};

/** 分页获取 AI 配置 */
export const listFn = (axiosConfig: any) => {
  return axiosPlus({
    url: '/api/v1/admin/ai/config/list' as any,
    method: 'post' as any,
    ...axiosConfig,
  } as any);
};

/** 获取 AI 配置详情 */
export const getFn = (axiosConfig: any) => {
  return axiosPlus({
    url: '/api/v1/admin/ai/config/get' as any,
    method: 'post' as any,
    ...axiosConfig,
  } as any);
};

/** 添加 AI 配置 */
export const addFn = (axiosConfig: any) => {
  return axiosPlus({
    url: '/api/v1/admin/ai/config/add' as any,
    method: 'post' as any,
    ...axiosConfig,
  } as any);
};

/** 更新 AI 配置 */
export const updateFn = (axiosConfig: any) => {
  return axiosPlus({
    url: '/api/v1/admin/ai/config/update' as any,
    method: 'post' as any,
    ...axiosConfig,
  } as any);
};

/** 删除 AI 配置 */
export const deleteFn = (axiosConfig: any) => {
  return axiosPlus({
    url: '/api/v1/admin/ai/config/delete' as any,
    method: 'post' as any,
    ...axiosConfig,
  } as any);
};

/** 验证 AI 配置连通性 */
export const verifyFn = (axiosConfig: any) => {
  return axiosPlus({
    url: '/api/v1/admin/ai/config/verify' as any,
    method: 'post' as any,
    ...axiosConfig,
  } as any);
};
