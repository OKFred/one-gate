/**
 * 菜单相关 API
 */

import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

export interface MenuItem {
  /** 菜单唯一标识 */
  id?: number | undefined;
  /** 菜单名称 */
  text?: string | undefined;
  /** 图标名称，使用 Iconify material-symbols 图标 */
  icon: string;
  /** 路由路径 */
  path?: string | null;
  /** 子菜单 */
  children?: MenuItem[];
  /** 排序 */
  sort?: number;
}

/**
 * 获取树形菜单列表（根据用户角色自动过滤）
 */
export const getMenuList = async () => {
  return axiosPlus({
    url: '/api/v1/system/menu/tree',
    method: 'post',
    data: {},
  });
};

/**
 * 获取菜单列表（管理用）
 */
export const listFn = (
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
