import * as UserAPI from '@/api/admin/system/user';
import * as RoleAPI from '@/api/admin/system/role';
import * as DepartmentAPI from '@/api/admin/system/department';
import * as MenuAPI from '@/api/admin/system/menu';
import * as AuthAPI from '@/api/admin/system/auth';
import * as PermissionAPI from '@/api/admin/system/permission';
import * as RolePermissionAPI from '@/api/admin/system/role_permission';
import * as ApiTokenAPI from '@/api/admin/system/api-token';
// ==================== User ====================

// 获取所有用户列表
export type ListAllUserReq = NonNullable<Parameters<typeof UserAPI.listAllFn>[0]['data']>;
export type ListAllUserRes = Awaited<ReturnType<typeof UserAPI.listAllFn>>['data']['data'];

// 获取用户列表
export type ListUserReq = NonNullable<Parameters<typeof UserAPI.listFn>[0]['data']>;
export type ListUserRes = Awaited<ReturnType<typeof UserAPI.listFn>>['data']['data'];

// 获取单个用户
export type GetUserReq = NonNullable<Parameters<typeof UserAPI.getFn>[0]['data']>;
export type GetUserRes = Awaited<ReturnType<typeof UserAPI.getFn>>['data']['data'];

// 添加用户
export type AddUserReq = NonNullable<Parameters<typeof UserAPI.addFn>[0]['data']>;
export type AddUserRes = Awaited<ReturnType<typeof UserAPI.addFn>>['data']['data'];

// 更新用户
export type UpdateUserReq = NonNullable<Parameters<typeof UserAPI.updateFn>[0]['data']>;
export type UpdateUserRes = Awaited<ReturnType<typeof UserAPI.updateFn>>['data']['data'];

// 删除用户
export type DeleteUserReq = NonNullable<Parameters<typeof UserAPI.deleteFn>[0]['data']>;
export type DeleteUserRes = Awaited<ReturnType<typeof UserAPI.deleteFn>>['data']['data'];

// ==================== Role ====================

// 获取所有角色列表
export type ListAllRoleReq = NonNullable<Parameters<typeof RoleAPI.listAllFn>[0]['data']>;
export type ListAllRoleRes = Awaited<ReturnType<typeof RoleAPI.listAllFn>>['data']['data'];

// 获取角色列表
export type ListRoleReq = NonNullable<Parameters<typeof RoleAPI.listFn>[0]['data']>;
export type ListRoleRes = Awaited<ReturnType<typeof RoleAPI.listFn>>['data']['data'];

// 获取单个角色
export type GetRoleReq = NonNullable<Parameters<typeof RoleAPI.getFn>[0]['data']>;
export type GetRoleRes = Awaited<ReturnType<typeof RoleAPI.getFn>>['data']['data'];

// 添加角色
export type AddRoleReq = NonNullable<Parameters<typeof RoleAPI.addFn>[0]['data']>;
export type AddRoleRes = Awaited<ReturnType<typeof RoleAPI.addFn>>['data']['data'];

// 更新角色
export type UpdateRoleReq = NonNullable<Parameters<typeof RoleAPI.updateFn>[0]['data']>;
export type UpdateRoleRes = Awaited<ReturnType<typeof RoleAPI.updateFn>>['data']['data'];

// 删除角色
export type DeleteRoleReq = NonNullable<Parameters<typeof RoleAPI.deleteFn>[0]['data']>;
export type DeleteRoleRes = Awaited<ReturnType<typeof RoleAPI.deleteFn>>['data']['data'];

// ==================== Department ====================
// 获取部门树
export type TreeDepartmentReq = NonNullable<Parameters<typeof DepartmentAPI.treeFn>[0]['data']>;
export type TreeDepartmentRes = Awaited<ReturnType<typeof DepartmentAPI.treeFn>>['data']['data'];

// 获取所有部门列表
export type ListAllDepartmentReq = NonNullable<
  Parameters<typeof DepartmentAPI.listAllFn>[0]['data']
>;
export type ListAllDepartmentRes = Awaited<
  ReturnType<typeof DepartmentAPI.listAllFn>
>['data']['data'];

// 获取部门列表
export type ListDepartmentReq = NonNullable<Parameters<typeof DepartmentAPI.listFn>[0]['data']>;
export type ListDepartmentRes = Awaited<ReturnType<typeof DepartmentAPI.listFn>>['data']['data'];

// 获取单个部门
export type GetDepartmentReq = NonNullable<Parameters<typeof DepartmentAPI.getFn>[0]['data']>;
export type GetDepartmentRes = Awaited<ReturnType<typeof DepartmentAPI.getFn>>['data']['data'];

// 添加部门
export type AddDepartmentReq = NonNullable<Parameters<typeof DepartmentAPI.addFn>[0]['data']>;
export type AddDepartmentRes = Awaited<ReturnType<typeof DepartmentAPI.addFn>>['data']['data'];

// 更新部门
export type UpdateDepartmentReq = NonNullable<Parameters<typeof DepartmentAPI.updateFn>[0]['data']>;
export type UpdateDepartmentRes = Awaited<
  ReturnType<typeof DepartmentAPI.updateFn>
>['data']['data'];

// 删除部门
export type DeleteDepartmentReq = NonNullable<Parameters<typeof DepartmentAPI.deleteFn>[0]['data']>;
export type DeleteDepartmentRes = Awaited<
  ReturnType<typeof DepartmentAPI.deleteFn>
>['data']['data'];

// ==================== Menu ====================
// 获取菜单树
export type TreeMenuReq = NonNullable<Parameters<typeof MenuAPI.treeFn>[0]['data']>;
export type TreeMenuRes = Awaited<ReturnType<typeof MenuAPI.treeFn>>['data']['data'];

// 获取所有菜单列表
export type ListAllMenuReq = NonNullable<Parameters<typeof MenuAPI.listAllFn>[0]['data']>;
export type ListAllMenuRes = Awaited<ReturnType<typeof MenuAPI.listAllFn>>['data']['data'];

// 获取菜单列表
export type ListMenuReq = NonNullable<Parameters<typeof MenuAPI.listFn>[0]['data']>;
export type ListMenuRes = Awaited<ReturnType<typeof MenuAPI.listFn>>['data']['data'];

// 获取单个菜单
export type GetMenuReq = NonNullable<Parameters<typeof MenuAPI.getFn>[0]['data']>;
export type GetMenuRes = Awaited<ReturnType<typeof MenuAPI.getFn>>['data']['data'];

// 添加菜单
export type AddMenuReq = NonNullable<Parameters<typeof MenuAPI.addFn>[0]['data']>;
export type AddMenuRes = Awaited<ReturnType<typeof MenuAPI.addFn>>['data']['data'];

// 更新菜单
export type UpdateMenuReq = NonNullable<Parameters<typeof MenuAPI.updateFn>[0]['data']>;
export type UpdateMenuRes = Awaited<ReturnType<typeof MenuAPI.updateFn>>['data']['data'];

// 删除菜单
export type DeleteMenuReq = NonNullable<Parameters<typeof MenuAPI.deleteFn>[0]['data']>;
export type DeleteMenuRes = Awaited<ReturnType<typeof MenuAPI.deleteFn>>['data']['data'];

// ==================== Auth ====================

// 登录
export type LoginReq = NonNullable<Parameters<typeof AuthAPI.loginFn>[0]['data']>;
export type LoginRes = Awaited<ReturnType<typeof AuthAPI.loginFn>>['data']['data'];

// 微信登录
export type WechatLoginReq = NonNullable<Parameters<typeof AuthAPI.wechatLoginFn>[0]['data']>;
export type WechatLoginRes = Awaited<ReturnType<typeof AuthAPI.wechatLoginFn>>['data']['data'];

// 获取用户信息
export type GetProfileReq = NonNullable<Parameters<typeof AuthAPI.getProfileFn>[0]['data']>;
export type GetProfileRes = Awaited<ReturnType<typeof AuthAPI.getProfileFn>>['data']['data'];

// 刷新 Token
export type RefreshTokenReq = NonNullable<Parameters<typeof AuthAPI.refreshTokenFn>[0]['data']>;
export type RefreshTokenRes = Awaited<ReturnType<typeof AuthAPI.refreshTokenFn>>['data']['data'];

// 更新密码
export type UpdatePasswordReq = NonNullable<Parameters<typeof AuthAPI.updatePasswordFn>[0]['data']>;
export type UpdatePasswordRes = Awaited<
  ReturnType<typeof AuthAPI.updatePasswordFn>
>['data']['data'];

// 更新用户语言
export type UpdateLangCodeReq = NonNullable<Parameters<typeof AuthAPI.updateLangCodeFn>[0]['data']>;
export type UpdateLangCodeRes = Awaited<
  ReturnType<typeof AuthAPI.updateLangCodeFn>
>['data']['data'];

// 更新用户信息
export type UpdateProfileReq = NonNullable<Parameters<typeof AuthAPI.updateProfileFn>[0]['data']>;
export type UpdateProfileRes = Awaited<ReturnType<typeof AuthAPI.updateProfileFn>>['data']['data'];

// 检查 Token
export type CheckTokenReq = NonNullable<Parameters<typeof AuthAPI.checkTokenFn>[0]['data']>;
export type CheckTokenRes = Awaited<ReturnType<typeof AuthAPI.checkTokenFn>>['data']['data'];

// 获取按钮权限列表
export type GetButtonPermissionsReq = NonNullable<
  Parameters<typeof AuthAPI.getButtonPermissionFn>[0]['data']
>;
export type GetButtonPermissionsRes = Awaited<
  ReturnType<typeof AuthAPI.getButtonPermissionFn>
>['data']['data'];

// ==================== Permission ====================
// 获取所有权限列表
export type ListAllPermissionReq = NonNullable<
  Parameters<typeof PermissionAPI.listAllFn>[0]['data']
>;
export type ListAllPermissionRes = Awaited<
  ReturnType<typeof PermissionAPI.listAllFn>
>['data']['data'];

// 获取权限列表
export type ListPermissionReq = NonNullable<Parameters<typeof PermissionAPI.listFn>[0]['data']>;
export type ListPermissionRes = Awaited<ReturnType<typeof PermissionAPI.listFn>>['data']['data'];

// 获取单个权限
export type GetPermissionReq = NonNullable<Parameters<typeof PermissionAPI.getFn>[0]['data']>;
export type GetPermissionRes = Awaited<ReturnType<typeof PermissionAPI.getFn>>['data']['data'];

// 添加权限
export type AddPermissionReq = NonNullable<Parameters<typeof PermissionAPI.addFn>[0]['data']>;
export type AddPermissionRes = Awaited<ReturnType<typeof PermissionAPI.addFn>>['data']['data'];

// 更新权限
export type UpdatePermissionReq = NonNullable<Parameters<typeof PermissionAPI.updateFn>[0]['data']>;
export type UpdatePermissionRes = Awaited<
  ReturnType<typeof PermissionAPI.updateFn>
>['data']['data'];

// 删除权限
export type DeletePermissionReq = NonNullable<Parameters<typeof PermissionAPI.deleteFn>[0]['data']>;
export type DeletePermissionRes = Awaited<
  ReturnType<typeof PermissionAPI.deleteFn>
>['data']['data'];

// ==================== RolePermission ====================
// 获取所有角色权限关联（不分页）
export type ListAllRolePermissionReq = NonNullable<
  Parameters<typeof RolePermissionAPI.listAllFn>[0]['data']
>;
export type ListAllRolePermissionRes = Awaited<
  ReturnType<typeof RolePermissionAPI.listAllFn>
>['data']['data'];

// 获取角色权限关联列表
export type ListRolePermissionReq = NonNullable<
  Parameters<typeof RolePermissionAPI.listFn>[0]['data']
>;
export type ListRolePermissionRes = Awaited<
  ReturnType<typeof RolePermissionAPI.listFn>
>['data']['data'];

// 添加单个角色权限关联
export type AddRolePermissionReq = NonNullable<
  Parameters<typeof RolePermissionAPI.addFn>[0]['data']
>;
export type AddRolePermissionRes = Awaited<
  ReturnType<typeof RolePermissionAPI.addFn>
>['data']['data'];

// 批量添加权限到角色
export type BatchAddRolePermissionReq = NonNullable<
  Parameters<typeof RolePermissionAPI.batchAddFn>[0]['data']
>;
export type BatchAddRolePermissionRes = Awaited<
  ReturnType<typeof RolePermissionAPI.batchAddFn>
>['data']['data'];

// 更新角色权限关联
export type UpdateRolePermissionReq = NonNullable<
  Parameters<typeof RolePermissionAPI.updateFn>[0]['data']
>;
export type UpdateRolePermissionRes = Awaited<
  ReturnType<typeof RolePermissionAPI.updateFn>
>['data']['data'];

// 删除单个角色权限关联
export type DeleteRolePermissionReq = NonNullable<
  Parameters<typeof RolePermissionAPI.deleteFn>[0]['data']
>;
export type DeleteRolePermissionRes = Awaited<
  ReturnType<typeof RolePermissionAPI.deleteFn>
>['data']['data'];

// 批量删除角色的权限
export type BatchDeleteRolePermissionReq = NonNullable<
  Parameters<typeof RolePermissionAPI.batchDeleteFn>[0]['data']
>;
export type BatchDeleteRolePermissionRes = Awaited<
  ReturnType<typeof RolePermissionAPI.batchDeleteFn>
>['data']['data'];

// 获取角色权限关联详情
export type GetRolePermissionReq = NonNullable<
  Parameters<typeof RolePermissionAPI.getFn>[0]['data']
>;
export type GetRolePermissionRes = Awaited<
  ReturnType<typeof RolePermissionAPI.getFn>
>['data']['data'];

// 获取角色的所有权限
export type GetPermissionsByRoleReq = NonNullable<
  Parameters<typeof RolePermissionAPI.getPermissionsByRoleFn>[0]['data']
>;
export type GetPermissionsByRoleRes = Awaited<
  ReturnType<typeof RolePermissionAPI.getPermissionsByRoleFn>
>['data']['data'];

// ==================== Api Token ====================
// 获取 API Token 列表
export type ListApiTokenReq = NonNullable<Parameters<typeof ApiTokenAPI.listFn>[0]['data']>;
export type ListApiTokenRes = Awaited<ReturnType<typeof ApiTokenAPI.listFn>>['data']['data'];

// 获取单个 API Token
export type GetApiTokenReq = NonNullable<Parameters<typeof ApiTokenAPI.getFn>[0]['data']>;
export type GetApiTokenRes = Awaited<ReturnType<typeof ApiTokenAPI.getFn>>['data']['data'];

// 添加 API Token
export type AddApiTokenReq = NonNullable<Parameters<typeof ApiTokenAPI.addFn>[0]['data']>;
export type AddApiTokenRes = Awaited<ReturnType<typeof ApiTokenAPI.addFn>>['data']['data'];

// 更新 API Token
export type UpdateApiTokenReq = NonNullable<Parameters<typeof ApiTokenAPI.updateFn>[0]['data']>;
export type UpdateApiTokenRes = Awaited<ReturnType<typeof ApiTokenAPI.updateFn>>['data']['data'];

// 删除 API Token
export type DeleteApiTokenReq = NonNullable<Parameters<typeof ApiTokenAPI.deleteFn>[0]['data']>;
export type DeleteApiTokenRes = Awaited<ReturnType<typeof ApiTokenAPI.deleteFn>>['data']['data'];

// 吊销 API Token
export type RevokeApiTokenReq = NonNullable<Parameters<typeof ApiTokenAPI.revokeFn>[0]['data']>;
export type RevokeApiTokenRes = Awaited<ReturnType<typeof ApiTokenAPI.revokeFn>>['data']['data'];
