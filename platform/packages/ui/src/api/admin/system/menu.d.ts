/**
 * 菜单相关 API
 */
import type { AxiosConfig } from '../../config';
/**
 * 获取树形菜单列表
 */
export declare const treeFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/menu/tree', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/menu/tree', 'post'>
>;
/**
 * 获取所有菜单列表
 */
export declare const listAllFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/menu/listAll', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/menu/listAll', 'post'>
>;
/**
 * 获取菜单列表
 */
export declare const listFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/menu/list', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/menu/list', 'post'>
>;
/**
 * 获取单个菜单
 */
export declare const getFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/menu/get', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/menu/get', 'post'>
>;
/**
 * 添加菜单
 */
export declare const addFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/menu/add', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/menu/add', 'post'>
>;
/**
 * 更新菜单
 */
export declare const updateFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/menu/update', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/menu/update', 'post'>
>;
/**
 * 删除菜单
 */
export declare const deleteFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/menu/delete', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/menu/delete', 'post'>
>;
