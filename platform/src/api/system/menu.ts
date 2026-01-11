/**
 * 菜单相关 API
 */

import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

/**
 * 获取树形菜单列表
 */
export const treeFn = async (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/menu/tree', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/menu/tree',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 获取所有菜单列表
 */
export const listAllFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/menu/listAll', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/menu/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 获取菜单列表
 */
export const listFn = async (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/menu/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/menu/list',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 获取单个菜单
 */
export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/menu/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/menu/get',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 添加菜单
 */
export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/menu/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/menu/add',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 更新菜单
 */
export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/menu/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/menu/update',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 删除菜单
 */
export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/system/menu/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/system/menu/delete',
    method: 'post',
    ...axiosConfig,
  });
};
