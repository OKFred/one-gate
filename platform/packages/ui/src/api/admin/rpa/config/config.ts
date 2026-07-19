import { axiosPlus } from '@/api/config';
import type { AxiosConfig } from '@/api/config';

/** 分页获取浏览器配置 */
export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/config/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/config/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 添加浏览器配置 */
export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/config/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/config/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 更新浏览器配置 */
export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/config/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/config/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除浏览器配置 */
export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/config/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/config/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 验证浏览器配置连通性 */
export const verifyFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/rpa/config/verify', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/rpa/config/verify',
    method: 'post',
    ...axiosConfig,
  });
};
