import * as RoleAPI from '@/api/system/role';

export interface Props {
  localObj: LocalObj;
}

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListRoleRequest['orderBy']>;
  descend: boolean;
  isEnabled?: boolean;
}

// 获取角色列表
export type ListRoleRequest = NonNullable<Parameters<typeof RoleAPI.listFn>[0]['data']>;
export type ListRoleResponse = Awaited<ReturnType<typeof RoleAPI.listFn>>;
export type ListRoles = NonNullable<ListRoleResponse['data']['data']['list']>;
export type ListRole = ListRoles[number];

// 获取单个角色
export type GetRoleRequest = NonNullable<Parameters<typeof RoleAPI.getFn>[0]['data']>;
export type GetRoleResponse = Awaited<ReturnType<typeof RoleAPI.getFn>>;
export type GetRole = NonNullable<GetRoleResponse['data']>;

// 添加角色
export type AddRoleRequest = NonNullable<Parameters<typeof RoleAPI.addFn>[0]['data']>;
export type AddRoleResponse = Awaited<ReturnType<typeof RoleAPI.addFn>>;

// 更新角色
export type UpdateRoleRequest = NonNullable<Parameters<typeof RoleAPI.updateFn>[0]['data']>;
export type UpdateRoleResponse = Awaited<ReturnType<typeof RoleAPI.updateFn>>;

// 删除角色
export type DeleteRoleRequest = NonNullable<Parameters<typeof RoleAPI.deleteFn>[0]['data']>;
export type DeleteRoleResponse = Awaited<ReturnType<typeof RoleAPI.deleteFn>>;
