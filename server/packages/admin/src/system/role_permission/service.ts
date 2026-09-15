import {
  IndexVO,
  RolePermissionVO,
  RolePermissionListVO,
  RolePermissionAddVO,
  RolePermissionUpdateVO,
  RolePermissionListKeys,
  RolePermissionDetailKeys,
  RolePermissionGetKeys,
  RolePermissionDeleteKeys,
  RolePermissionAddKeys,
  RolePermissionUpdateKeys,
  RolePermissionSortableKeys,
  type RolePermissionPOLike,
  type RolePermissionVOLike,
  type RolePermissionAddVOLike,
  type RolePermissionUpdateVOLike,
  type RolePermissionDeleteVOLike,
  type RolePermissionGetVOLike,
  RolePermissionBaseVO,
} from "./model";
import { preventMissingRecord, preventMissingRole } from "./prevention";
import roleService, { utils as roleUtils } from "../role/service";
import permissionService from "../permission/service";
import { permissionRepository } from "../permission/repository";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import hasValue from "@hodor/core/utils/hasValue";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { PermissionInfo } from "../permission/service";
import { utils as permissionUtils } from "../permission/service";
import { SUPER_ADMIN_ROLE_ID } from "@hodor/core/db/init";
import { invalidateAuthCache } from "@hodor/core/middleware/auth/cache-invalidation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { rolePermissionRepository } from "./repository";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    roleId: RolePermissionVO["roleId"],
    permissionId: RolePermissionVO["permissionId"],
    orderBy: orderByWrapper<(keyof RolePermissionPOLike)[]>(
      RolePermissionSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...RolePermissionListVO,
    },
    required: [...RolePermissionListKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await rolePermissionRepository.findAll(params);
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有角色权限关联（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    roleId: RolePermissionVO["roleId"],
    permissionId: RolePermissionVO["permissionId"],
    orderBy: orderByWrapper<(keyof RolePermissionPOLike)[]>(
      RolePermissionSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<RolePermissionPOLike>[]>(
    {
      ...RolePermissionListVO,
    },
    [...RolePermissionListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await rolePermissionRepository.findPage({
    roleId: params.roleId,
    permissionId: params.permissionId,
    orderBy,
    descend,
    pageNo,
    pageSize: finalPageSize,
  });

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list,
  };
}
const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取角色权限关联列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...RolePermissionAddVO,
  } satisfies Partial<Record<keyof RolePermissionAddVOLike, JSONSchema>>,
  required: [
    ...RolePermissionAddKeys,
  ] as const satisfies RequiredKeys<RolePermissionAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  const { roleId } = obj;

  // 前置校验
  await preventMissingRole(roleId);

  const insertedId = await rolePermissionRepository.onInsert({
    ...obj,
    creatorId,
  });

  // 更新角色权限数量
  const currentCount =
    await rolePermissionRepository.getCurrentPermissionCount(roleId);
  await roleUtils.updatePermissionCount(roleId, currentCount);

  // 触发全局缓存失效
  await invalidateAuthCache();

  return insertedId;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加角色权限关联",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 批量添加权限到角色
const batchAddReq = {
  type: "object",
  properties: {
    roleId: RolePermissionVO["roleId"],
    permissionIds: {
      type: "array",
      items: { type: "number" },
      description: "权限ID列表",
      minItems: 1,
    },
  },
  required: ["roleId", "permissionIds"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const batchAddRes = {
  type: "number",
  description: "成功添加的数量",
} as const satisfies JSONSchema;
async function onBatchAdd(
  obj: FromSchema<typeof batchAddReq>,
  userObj: UserObj
): Promise<FromSchema<typeof batchAddRes>> {
  const { userId: creatorId } = userObj;
  const { roleId, permissionIds } = obj;

  // 前置校验
  await preventMissingRole(roleId);

  const values = permissionIds.map((permissionId) => ({
    roleId,
    permissionId,
    creatorId,
  }));

  const totalAdded = await rolePermissionRepository.onBatchInsert(values);

  // 更新角色权限数量
  const currentCount =
    await rolePermissionRepository.getCurrentPermissionCount(roleId);
  await roleUtils.updatePermissionCount(roleId, currentCount);

  // 触发全局缓存失效
  await invalidateAuthCache();

  return totalAdded;
}
const batchAddApi = {
  req: batchAddReq,
  res: batchAddRes,
  pathInfo: {
    path: "/batchAdd",
    method: "post",
    summary: "批量添加角色权限",
  } as const,
  adapter: bodyUserAdapter,
  service: onBatchAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...RolePermissionUpdateVO,
  },
  required: [
    ...RolePermissionUpdateKeys,
  ] as const satisfies RequiredKeys<RolePermissionUpdateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes> | null> {
  const { userId: updaterId } = userObj;
  const { id, roleId, permissionId, ...rest } = params;

  // 前置校验
  await preventMissingRecord(id);
  if (hasValue(roleId)) await preventMissingRole(roleId as number);

  const updateData = {
    ...rest,
    roleId,
    permissionId,
    updaterId,
  };

  const updatedId = await rolePermissionRepository.onUpdate(id, updateData);
  // 触发全局缓存失效
  await invalidateAuthCache();
  return updatedId;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新角色权限关联",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...RolePermissionDeleteKeys,
  ] as const satisfies RequiredKeys<RolePermissionDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onDelete(
  obj: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = obj;

  // 前置校验
  const record = await rolePermissionRepository.findById(id);
  preventEmpty(record);
  const roleId = record.roleId;

  const deletedId = await rolePermissionRepository.onDelete(id);

  // 更新角色权限数量
  const currentCount =
    await rolePermissionRepository.getCurrentPermissionCount(roleId);
  await roleUtils.updatePermissionCount(roleId, currentCount);

  // 触发全局缓存失效
  await invalidateAuthCache();

  return deletedId;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除角色权限关联",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// 批量删除角色的权限
const batchDeleteReq = {
  type: "object",
  properties: {
    roleId: RolePermissionVO["roleId"],
    permissionIds: {
      type: "array",
      items: { type: "number" },
      description: "权限ID列表",
      minItems: 1,
    },
  },
  required: ["roleId", "permissionIds"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const batchDeleteRes = {
  type: "number",
  description: "成功删除的数量",
} as const satisfies JSONSchema;
async function onBatchDelete(
  obj: FromSchema<typeof batchDeleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof batchDeleteRes>> {
  const { roleId, permissionIds } = obj;

  // 前置校验
  await preventMissingRole(roleId);

  const totalDeleted = await rolePermissionRepository.onBatchDelete(
    roleId,
    permissionIds
  );

  // 更新角色权限数量
  const currentCount =
    await rolePermissionRepository.getCurrentPermissionCount(roleId);
  await roleUtils.updatePermissionCount(roleId, currentCount);

  // 触发全局缓存失效
  await invalidateAuthCache();

  return totalDeleted;
}
const batchDeleteApi = {
  req: batchDeleteReq,
  res: batchDeleteRes,
  pathInfo: {
    path: "/batchDelete",
    method: "post",
    summary: "批量删除角色权限",
  } as const,
  adapter: bodyUserAdapter,
  service: onBatchDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...RolePermissionGetKeys,
  ] as const satisfies RequiredKeys<RolePermissionGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...RolePermissionVO,
  },
  required: [
    ...RolePermissionDetailKeys,
  ] as const satisfies RequiredKeys<RolePermissionVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const row = await rolePermissionRepository.findById(id);
  preventEmpty(row);
  return row;
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取角色权限关联",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 获取角色的所有权限
const getPermissionsByRoleReq = {
  type: "object",
  properties: {
    roleId: RolePermissionVO["roleId"],
  },
  required: ["roleId"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getPermissionsByRoleRes = {
  type: "array",
  items: {
    ...permissionService.get.res,
  },
} as const satisfies JSONSchema;
async function onGetPermissionsByRole(
  obj: FromSchema<typeof getPermissionsByRoleReq>
): Promise<FromSchema<typeof getPermissionsByRoleRes>> {
  const { roleId } = obj;
  const rows = await rolePermissionRepository.getPermissionsByRole(roleId);
  return rows.map((row) => ({
    ...row,
    category: row.category as "action",
  }));
}
const getPermissionsByRoleApi = {
  req: getPermissionsByRoleReq,
  res: getPermissionsByRoleRes,
  pathInfo: {
    path: "/getPermissionsByRole",
    method: "post",
    summary: "获取角色的所有权限",
  } as const,
  adapter: bodyAdapter,
  service: onGetPermissionsByRole,
  permission: { action: "read" },
} satisfies API;

/**
 * 根据角色ID数组获取所有权限
 * @param roleIds 角色ID数组
 * @returns 权限信息数组
 */
export async function getPermissionsByRoleIds(roleIds: number[]) {
  if (roleIds.length === 0) {
    return [];
  }
  // 如果是超管，给到所有权限（无视启用状态）
  if (roleIds.includes(SUPER_ADMIN_ROLE_ID)) {
    const rows = await permissionRepository.getAllPermissions();
    return permissionUtils.filterEffectivePermissions(rows as PermissionInfo[]);
  }
  // 仅允许已启用的角色
  const enabledRoles = await roleService.listAll.service({ isEnabled: true });
  const enabledRoleIds = new Set(enabledRoles.map((role) => role.id));
  const filteredRoleIds = roleIds.filter((id) => enabledRoleIds.has(id));
  if (filteredRoleIds.length === 0) {
    return [];
  }
  const rows =
    await rolePermissionRepository.getPermissionsByRoleIds(filteredRoleIds);
  const permissions = permissionUtils.filterEffectivePermissions(
    rows as PermissionInfo[]
  );
  return permissions;
}

// 工具函数：为角色添加菜单权限
async function addMenuPermissionToRole(
  roleId: number,
  permissionId: number,
  creatorId: number
) {
  await rolePermissionRepository.onInsert({
    roleId,
    permissionId,
    creatorId,
  });
}

async function verifyRecordExists(id: number) {
  return await rolePermissionRepository.verifyRecordExists(id);
}

async function verifyRoleExists(roleId: number) {
  return await roleUtils.verifyRoleExists(roleId);
}

export const utils = {
  addMenuPermissionToRole,
  getPermissionsByRoleIds,
  verifyRecordExists,
  verifyRoleExists,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  batchAdd: batchAddApi,
  update: updateApi,
  delete: deleteApi,
  batchDelete: batchDeleteApi,
  get: getApi,
  getPermissionsByRole: getPermissionsByRoleApi,
};
