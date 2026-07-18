import {
  IndexVO,
  RoleVO,
  RoleListVO,
  RoleAddVO,
  RoleUpdateVO,
  RoleListKeys,
  RoleDetailKeys,
  RoleGetKeys,
  RoleDeleteKeys,
  RoleAddKeys,
  RoleUpdateKeys,
  RoleSortableKeys,
  type RolePOLike,
  type RoleVOLike,
  type RoleAddVOLike,
  type RoleUpdateVOLike,
  type RoleDeleteVOLike,
  type RoleGetVOLike,
  RoleBaseVO,
  RoleUniqueKeys,
  RoleUniqueVO,
} from "./model";
import { DataScope, DataScopeValues } from "@hodor/core/types/dataScope";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  preventSuperAdminDelete,
  preventSuperAdminUpdate,
  preventMissingRoles,
} from "./prevention";
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
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { roleRepository } from "./repository";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: RoleVO["isEnabled"],
    orderBy: orderByWrapper<(keyof RolePOLike)[]>(RoleSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...IndexVO,
      ...RoleBaseVO,
      ...RoleUniqueVO,
    },
    required: [...RoleGetKeys, ...RoleUniqueKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await roleRepository.findAll(params);
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有角色（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: RoleVO["isEnabled"],
    orderBy: orderByWrapper<(keyof RolePOLike)[]>(RoleSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<RolePOLike>[]>(
    {
      ...RoleListVO,
    },
    [...RoleListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await roleRepository.findPage({
    keyword: params.keyword,
    isEnabled: params.isEnabled,
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
    summary: "获取角色列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...RoleAddVO,
    dataScope: {
      type: "string",
      enum: DataScopeValues,
      description: "数据访问范围",
      default: DataScope.SELF_ONLY,
    },
    customDeptIds: {
      type: ["string", "null"],
      nullable: true,
      description: "自定义部门ID列表（JSON序列化）",
    },
  } satisfies Partial<Record<keyof RoleAddVOLike, JSONSchema>>,
  required: [...RoleAddKeys] as const satisfies RequiredKeys<RoleAddVOLike>[],
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

  const insertedId = await roleRepository.onInsert({
    ...obj,
    creatorId,
  });

  return insertedId;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加角色",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...RoleUpdateVO,
    dataScope: {
      type: "string",
      enum: DataScopeValues,
      description: "数据访问范围",
    },
    customDeptIds: {
      type: ["string", "null"],
      nullable: true,
      description: "自定义部门ID列表（JSON序列化）",
    },
  },
  required: [
    ...RoleUpdateKeys,
  ] as const satisfies RequiredKeys<RoleUpdateVOLike>[],
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
  const { id, ...rest } = params;

  // 前置校验
  preventSuperAdminUpdate(id, params);

  const updateData = {
    ...rest,
    updaterId,
  };

  const updatedId = await roleRepository.onUpdate(id, updateData);
  return updatedId;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新角色",
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
    ...RoleDeleteKeys,
  ] as const satisfies RequiredKeys<RoleDeleteVOLike>[],
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
  preventSuperAdminDelete(id);
  const deletedId = await roleRepository.onDelete(id);
  return deletedId;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除角色",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [...RoleGetKeys] as const satisfies RequiredKeys<RoleGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...RoleVO,
  },
  required: [...RoleDetailKeys] as const satisfies RequiredKeys<RoleVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const row = await roleRepository.findById(id);
  preventEmpty(row);
  return row;
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取角色",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

async function getRolesByIds(
  ids: number[]
): Promise<{ value: number; label: string }[]> {
  return await roleRepository.getRolesByIds(ids);
}

async function verifyRoles(roleIdArr: number[]) {
  await preventMissingRoles(roleIdArr);
}

/** 更新角色的权限数量 */
async function updatePermissionCount(
  roleId: number,
  newCount: number
): Promise<void> {
  await roleRepository.updatePermissionCount(roleId, newCount);
}

async function verifyRoleExists(roleId: number) {
  return await roleRepository.verifyRoleExists(roleId);
}

async function getRoleDataScopes(roleIds: number[]) {
  return await roleRepository.getRoleDataScopes(roleIds);
}

export const utils = {
  getRolesByIds,
  getRoleDataScopes,
  verifyRoles,
  verifyRoleExists,
  updatePermissionCount,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
