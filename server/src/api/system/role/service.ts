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
  type RolePOLike,
  type RoleVOLike,
  type RoleAddVOLike,
  type RoleUpdateVOLike,
  type RoleDeleteVOLike,
  type RoleGetVOLike,
} from "./db.table";
import { asc, count, desc, eq, or, like, inArray, and } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import { SUPER_ADMIN_ROLE_ID } from "@/db/init";
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

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    orderBy: orderByWrapper<(keyof RolePOLike)[]>([
      "id",
      "name",
      "isEnabled",
      "createTimeUtc",
    ]),
    isEnabled: { type: "boolean", description: "是否启用状态过滤" },
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
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    keyword = "",
    isEnabled,
  } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = roleTable[orderBy] || roleTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 构建查询条件
  const buildWhereCondition = () => {
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

  // 查询总数
  const countResult = await db
    .select({ total: count(roleTable.id).as("total") })
    .from(roleTable)
    .where(buildWhereCondition());
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
    .where(buildWhereCondition())
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
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...RoleAddVO,
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
  const { name, description, permissions, isEnabled } = obj;
  // 如果提供了permissions，验证是否为有效JSON数组
  if (hasValue(permissions)) {
    const parsed = JSON.parse(permissions);
    if (!Array.isArray(parsed)) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
    }
  }

  const result = await db
    .insert(roleTable)
    .values({
      name,
      description,
      permissions,
      isEnabled,
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
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...RoleUpdateVO,
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
  const { id, permissions, ...rest } = params;
  const isEnabled = id === SUPER_ADMIN_ROLE_ID ? true : params.isEnabled; // 禁止禁用超级管理员角色

  let updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
    permissions: undefined,
    isEnabled: undefined,
  };
  // 如果更新permissions，验证是否为有效JSON数组
  if (hasValue(permissions)) {
    const parsed = JSON.parse(permissions);
    if (!Array.isArray(parsed)) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
    }
  }
  if (permissions !== undefined) {
    updateData = {
      ...updateData,
      permissions,
    };
  }
  if (isEnabled !== undefined) {
    updateData = {
      ...updateData,
      isEnabled,
    };
  }
  const res = await db
    .update(roleTable)
    .set(updateData)
    .where(eq(roleTable.id, id))
    .returning({ id: roleTable.id });
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
    summary: "更新角色",
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
  if (id === SUPER_ADMIN_ROLE_ID) {
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  }
  const result = await db
    .delete(roleTable)
    .where(eq(roleTable.id, id))
    .returning({ id: roleTable.id });
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
    summary: "删除角色",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
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
    summary: "获取角色",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
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
  const rows = await getRolesByIds(roleIdArr);
  // 检查返回的角色数量是否与请求的数量一致
  if (rows.length !== roleIdArr.length) {
    throw new BusinessError(BusinessErrorCode["ROLE_NOT_EXIST"]);
  }
  // 检查每个请求的角色ID是否都在返回结果中
  const returnedRoleIds = rows.map((r) => r.value);
  const allRolesExist = roleIdArr.every((id) => returnedRoleIds.includes(id));
  if (!allRolesExist) {
    throw new BusinessError(BusinessErrorCode["ROLE_NOT_EXIST"]);
  }
}

export const utils = {
  getRolesByIds,
  verifyRoles,
};

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
