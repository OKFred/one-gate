import * as UserAPI from '@/api/system/user';
import * as RoleAPI from '@/api/system/role';
import * as DepartmentAPI from '@/api/system/department';
import * as MenuAPI from '@/api/system/menu';
import * as AuthAPI from '@/api/system/auth';
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
