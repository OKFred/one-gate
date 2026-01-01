import type * as MenuAPI from '@/api/system/menu';

// 获取菜单树
export type TreeMenuResponse = Awaited<ReturnType<typeof MenuAPI.treeFn>>;
export type Menu = NonNullable<TreeMenuResponse['data']>['data'][0];

// 获取单个菜单
export type GetMenuParams = Parameters<typeof MenuAPI.getFn>[0];
export type GetMenuResponse = Awaited<ReturnType<typeof MenuAPI.getFn>>;
export type GetMenuReq = NonNullable<GetMenuParams['data']>;
export type GetMenuData = NonNullable<GetMenuResponse['data']>;

// 添加菜单
export type AddMenuParams = NonNullable<Parameters<typeof MenuAPI.addFn>[0]['data']>;
export type AddMenuResponse = Awaited<ReturnType<typeof MenuAPI.addFn>>;
export type AddMenuReq = NonNullable<AddMenuParams['data']>;
export type AddMenuData = NonNullable<AddMenuResponse['data']>;

// 更新菜单
export type UpdateMenuParams = Parameters<typeof MenuAPI.updateFn>[0]['data'];
export type UpdateMenuResponse = Awaited<ReturnType<typeof MenuAPI.updateFn>>;
export type UpdateMenuReq = NonNullable<UpdateMenuParams['data']>;
export type UpdateMenuData = NonNullable<UpdateMenuResponse['data']>;

// 删除菜单
export type DeleteMenuParams = Parameters<typeof MenuAPI.deleteFn>[0];
export type DeleteMenuResponse = Awaited<ReturnType<typeof MenuAPI.deleteFn>>;
export type DeleteMenuReq = NonNullable<DeleteMenuParams['data']>;
export type DeleteMenuData = NonNullable<DeleteMenuResponse['data']>;
