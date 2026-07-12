import {
  IndexVO,
  PermissionVO,
  PermissionListVO,
  PermissionAddVO,
  PermissionUpdateVO,
  PermissionListKeys,
  PermissionDetailKeys,
  PermissionGetKeys,
  PermissionDeleteKeys,
  PermissionAddKeys,
  PermissionUpdateKeys,
  PermissionSortableKeys,
  type PermissionPOLike,
  type PermissionVOLike,
  type PermissionAddVOLike,
  type PermissionUpdateVOLike,
  type PermissionDeleteVOLike,
  type PermissionGetVOLike,
  PermissionBaseVO,
  PermissionUniqueKeys,
  PermissionUniqueVO,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
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
import { permissionRepository } from "./repository";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    code: PermissionVO["code"],
    name: PermissionVO["name"],
    category: PermissionVO["category"],
    isEnabled: PermissionVO["isEnabled"],
    orderBy: orderByWrapper<(keyof PermissionPOLike)[]>(PermissionSortableKeys),
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
      ...PermissionBaseVO,
      ...PermissionUniqueVO,
    },
    required: [...PermissionGetKeys, ...PermissionUniqueKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  const rows = await permissionRepository.findAll(params);
  return rows.map((row) => ({
    ...row,
    category: row.category as "action",
  }));
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有权限（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    code: PermissionVO["code"],
    name: PermissionVO["name"],
    category: PermissionVO["category"],
    isEnabled: PermissionVO["isEnabled"],
    orderBy: orderByWrapper<(keyof PermissionPOLike)[]>(PermissionSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<PermissionPOLike>[]>(
    {
      ...PermissionListVO,
    },
    [...PermissionListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await permissionRepository.findPage({
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    code: params.code,
    name: params.name,
    category: params.category,
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
    list: list.map((row) => ({
      ...row,
      category: row.category as "action",
    })),
  };
}
const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取权限列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

export type PermissionAddLike = FromSchema<typeof addReq>;
const addReq = {
  type: "object",
  properties: {
    ...PermissionAddVO,
  } satisfies Partial<Record<keyof PermissionAddVOLike, JSONSchema>>,
  required: [
    ...PermissionAddKeys,
  ] as const satisfies RequiredKeys<PermissionAddVOLike>[],
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

  const insertedId = await permissionRepository.onInsert({
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
    summary: "添加权限",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...PermissionUpdateVO,
  },
  required: [
    ...PermissionUpdateKeys,
  ] as const satisfies RequiredKeys<PermissionUpdateVOLike>[],
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

  const updateData = {
    ...rest,
    updaterId,
  };

  const updatedId = await permissionRepository.onUpdate(id, updateData);
  return updatedId;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新权限",
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
    ...PermissionDeleteKeys,
  ] as const satisfies RequiredKeys<PermissionDeleteVOLike>[],
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
  const deletedId = await permissionRepository.onDelete(id);
  return deletedId;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除权限",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

export type PermissionInfo = FromSchema<typeof getRes>;
const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...PermissionGetKeys,
  ] as const satisfies RequiredKeys<PermissionGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...PermissionVO,
  },
  required: [
    ...PermissionDetailKeys,
  ] as const satisfies RequiredKeys<PermissionVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const row = await permissionRepository.findById(id);
  preventEmpty(row);
  return row as FromSchema<typeof getRes>;
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取权限",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

/**
 * 过滤生效的权限（处理 allow/deny）
 * @param permissions 权限数组
 * @returns 处理后的权限数组（只包含最终允许的权限）
 */
function filterEffectivePermissions(
  permissions: PermissionInfo[]
): PermissionInfo[] {
  // 按权限代码分组
  const permissionMap = new Map<string, PermissionInfo[]>();

  for (const perm of permissions) {
    const existing = permissionMap.get(perm.code) || [];
    existing.push(perm);
    permissionMap.set(perm.code, existing);
  }

  // 处理每个权限组
  const result: PermissionInfo[] = [];
  for (const [_, perms] of permissionMap) {
    result.push(perms[0]);
  }

  return result;
}

export const utils = {
  filterEffectivePermissions,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
