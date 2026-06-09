import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';

/** 获取JS脚本列表 */
export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/maintenance/script/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/maintenance/script/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取JS脚本详情 */
export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/maintenance/script/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/maintenance/script/get',
    method: 'post',
    ...axiosConfig,
  });
};

/** 添加JS脚本 */
export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/maintenance/script/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/maintenance/script/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 更新JS脚本 */
export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/maintenance/script/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/maintenance/script/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除JS脚本 */
export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/maintenance/script/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/maintenance/script/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 立即执行脚本测试 */
export const runTestFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/maintenance/script/runTest', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/maintenance/script/runTest',
    method: 'post',
    ...axiosConfig,
  });
};
