import { axiosPlus } from '@/api/config';
import type { AxiosConfig } from '@/api/config';

/** 分页获取浏览器配置 */
export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/browser/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/browser/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 添加浏览器配置 */
export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/browser/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/browser/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 更新浏览器配置 */
export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/browser/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/browser/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除浏览器配置 */
export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/browser/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/browser/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 验证浏览器配置连通性 */
export const verifyFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/browser/verify', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/browser/verify',
    method: 'post',
    ...axiosConfig,
  });
};
