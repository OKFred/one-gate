import db from "@/db/index";
import {
  roleTable,
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
import { asc, count, desc, eq, or, like, inArray, and } from "drizzle-orm";
import { DataScope, DataScopeValues } from "@/types/dataScope";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import {
  preventSuperAdminDelete,
  preventSuperAdminUpdate,
  preventMissingRoles,
} from "./prevention";
import hasValue from "@/utils/hasValue";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import { preventEmpty } from "@/middleware/auth/prevention";

// 构建查询条件(列表和全部通用)
export const buildWhereCondition = (condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) => {
  const { keyword, isEnabled } = condition || {};
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(or(like(roleTable.name, `%${keyword}%`)));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(roleTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

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
  const { orderBy = "id", descend = true } = params;
  const orderField = roleTable[orderBy] || roleTable.id;
  const maxLimit = 10000; // 设置最大返回数量限制，防止数据过大
  // 查询所有匹配的数据
  const rows = await db
    .select({
      id: roleTable.id,
      name: roleTable.name,
      remark: roleTable.remark,
      isEnabled: roleTable.isEnabled,
      dataScope: roleTable.dataScope,
    })
    .from(roleTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
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

/**
 * 查询角色列表（纯业务逻辑）
 * @param params 查询参数
 * @returns 角色列表
 */
async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = roleTable[orderBy] || roleTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 查询总数
  const countResult = await db
    .select({ total: count(roleTable.id).as("total") })
    .from(roleTable)
    .where(buildWhereCondition(params));
  const total = countResult[0]?.total || 0;
  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }
  // 查询列表数据
  const rows = await db
    .select()
    .from(roleTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(finalPageSize)
    .offset(offset);
  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rows,
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

  const result = await db
    .insert(roleTable)
    .values({
      ...obj,
      creatorId,
    })
    .returning({ id: roleTable.id });

  return result[0]?.id;
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
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(roleTable)
    .set(updateData)
    .where(eq(roleTable.id, id))
    .returning({ id: roleTable.id });
  const row = res[0];
  preventEmpty(row);
  return row.id;
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
  const result = await db
    .delete(roleTable)
    .where(eq(roleTable.id, id))
    .returning({ id: roleTable.id });
  const row = result[0];
  preventEmpty(row);
  return row.id;
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
  const rows = await db
    .select()
    .from(roleTable)
    .where(eq(roleTable.id, id))
    .limit(1);
  const row = rows[0];
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
  if (ids.length === 0) return [];
  const rows = await db
    .select({ value: roleTable.id, label: roleTable.name })
    .from(roleTable)
    .where(inArray(roleTable.id, ids));
  return rows;
}

async function verifyRoles(roleIdArr: number[]) {
  await preventMissingRoles(roleIdArr);
}

/** 更新角色的权限数量 */
async function updatePermissionCount(
  roleId: number,
  newCount: number
): Promise<void> {
  await db
    .update(roleTable)
    .set({ permissionCount: newCount })
    .where(eq(roleTable.id, roleId));
}
async function verifyRoleExists(roleId: number) {
  const rows = await db
    .select({ id: roleTable.id })
    .from(roleTable)
    .where(eq(roleTable.id, roleId))
    .limit(1);
  return rows.length > 0;
}

export const utils = {
  getRolesByIds,
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
