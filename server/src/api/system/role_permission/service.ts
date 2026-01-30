import db from "@/db/index";
import {
  rolePermissionTable,
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
} from "./db.table";
import { permissionTable } from "../permission/db.table";
import { roleTable } from "../role/db.table";
import { asc, count, desc, eq, and, inArray } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import hasValue from "@/utils/hasValue";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";

// 构建查询条件
const buildWhereCondition = ({
  roleId,
  permissionId,
}: Pick<FromSchema<typeof listReq>, "roleId" | "permissionId">) => {
  const conditions = [];
  if (roleId !== undefined) {
    conditions.push(eq(rolePermissionTable.roleId, roleId));
  }
  if (permissionId !== undefined) {
    conditions.push(eq(rolePermissionTable.permissionId, permissionId));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

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
  const offset = (pageNo - 1) * pageSize;
  const orderField = rolePermissionTable[orderBy] || rolePermissionTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const countResult = await db
    .select({ total: count(rolePermissionTable.id).as("total") })
    .from(rolePermissionTable)
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

  const rows = await db
    .select()
    .from(rolePermissionTable)
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
    summary: "获取角色权限关联列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
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
  const { roleId, permissionId, resourceFilter, conditions } = obj;

  // 验证角色是否存在
  const roleExists = await db
    .select({ id: roleTable.id })
    .from(roleTable)
    .where(eq(roleTable.id, roleId))
    .limit(1);
  if (roleExists.length === 0) {
    throw new BusinessError(BusinessErrorCode.ROLE_NOT_EXIST);
  }

  // 验证权限是否存在
  const permissionExists = await db
    .select({ id: permissionTable.id })
    .from(permissionTable)
    .where(eq(permissionTable.id, permissionId))
    .limit(1);
  if (permissionExists.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }

  // 验证 resourceFilter 格式
  if (hasValue(resourceFilter)) {
    try {
      JSON.parse(resourceFilter);
    } catch {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
    }
  }

  // 验证 conditions 格式
  if (hasValue(conditions)) {
    try {
      JSON.parse(conditions);
    } catch {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
    }
  }

  const result = await db
    .insert(rolePermissionTable)
    .values({
      ...obj,
      creatorId,
    })
    .returning({ id: rolePermissionTable.id });

  return result[0]?.id;
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

  // 验证角色是否存在
  const roleExists = await db
    .select({ id: roleTable.id })
    .from(roleTable)
    .where(eq(roleTable.id, roleId))
    .limit(1);
  if (roleExists.length === 0) {
    throw new BusinessError(BusinessErrorCode.ROLE_NOT_EXIST);
  }

  // 验证权限是否存在
  const permissionsExist = await db
    .select({ id: permissionTable.id })
    .from(permissionTable)
    .where(inArray(permissionTable.id, permissionIds));
  if (permissionsExist.length !== permissionIds.length) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }

  // 批量插入
  const values = permissionIds.map((permissionId) => ({
    roleId,
    permissionId,
    resourceFilter: null,
    conditions: null,
    creatorId,
  }));

  const result = await db
    .insert(rolePermissionTable)
    .values(values)
    .returning({ id: rolePermissionTable.id });

  return result.length;
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
  const { id, resourceFilter, conditions, ...rest } = params;

  // 验证 resourceFilter 格式
  if (hasValue(resourceFilter)) {
    try {
      JSON.parse(resourceFilter);
    } catch {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
    }
  }

  // 验证 conditions 格式
  if (hasValue(conditions)) {
    try {
      JSON.parse(conditions);
    } catch {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
    }
  }

  const updateData = {
    ...rest,
    resourceFilter,
    conditions,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(rolePermissionTable)
    .set(updateData)
    .where(eq(rolePermissionTable.id, id))
    .returning({ id: rolePermissionTable.id });
  if (!res || res.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return res[0].id;
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
  const result = await db
    .delete(rolePermissionTable)
    .where(eq(rolePermissionTable.id, id))
    .returning({ id: rolePermissionTable.id });
  if (!result || result.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return result[0].id;
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

  const result = await db
    .delete(rolePermissionTable)
    .where(
      and(
        eq(rolePermissionTable.roleId, roleId),
        inArray(rolePermissionTable.permissionId, permissionIds)
      )
    )
    .returning({ id: rolePermissionTable.id });

  return result.length;
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
  const rows = await db
    .select()
    .from(rolePermissionTable)
    .where(eq(rolePermissionTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return rows[0];
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
    type: "object",
    properties: {
      id: { type: "number" },
      code: { type: "string" },
      name: { type: "string" },
      category: { type: "string" },
      resource: { type: ["string", "null"], nullable: true },
      effect: { type: "string" },
      scope: { type: "string" },
      resourceFilter: { type: ["string", "null"], nullable: true },
      conditions: { type: ["string", "null"], nullable: true },
    },
  },
} as const satisfies JSONSchema;
async function onGetPermissionsByRole(
  obj: FromSchema<typeof getPermissionsByRoleReq>
): Promise<FromSchema<typeof getPermissionsByRoleRes>> {
  const { roleId } = obj;

  const rows = await db
    .select({
      id: permissionTable.id,
      code: permissionTable.code,
      name: permissionTable.name,
      category: permissionTable.category,
      resource: permissionTable.resource,
      effect: permissionTable.effect,
      scope: permissionTable.scope,
      resourceFilter: rolePermissionTable.resourceFilter,
      conditions: rolePermissionTable.conditions,
    })
    .from(rolePermissionTable)
    .innerJoin(
      permissionTable,
      eq(rolePermissionTable.permissionId, permissionTable.id)
    )
    .where(
      and(
        eq(rolePermissionTable.roleId, roleId),
        eq(permissionTable.isEnabled, true)
      )
    );

  return rows;
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
} satisfies API;

export default {
  list: listApi,
  add: addApi,
  batchAdd: batchAddApi,
  update: updateApi,
  delete: deleteApi,
  batchDelete: batchDeleteApi,
  get: getApi,
  getPermissionsByRole: getPermissionsByRoleApi,
};
