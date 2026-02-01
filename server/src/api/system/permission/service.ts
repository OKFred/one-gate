import db from "@/db/index";
import {
  permissionTable,
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
} from "./db.table";
import { asc, count, desc, eq, or, like, and } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
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
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";

// 构建查询条件(列表和全部通用)
const buildWhereCondition = ({
  keyword,
  isEnabled,
  category,
  scope,
  effect,
}: Pick<
  FromSchema<typeof listReq>,
  "keyword" | "isEnabled" | "category" | "scope" | "effect"
>) => {
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(permissionTable.code, `%${keyword}%`),
        like(permissionTable.name, `%${keyword}%`)
      )
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(permissionTable.isEnabled, isEnabled));
  }
  if (category !== undefined) {
    conditions.push(eq(permissionTable.category, category));
  }
  if (scope !== undefined) {
    conditions.push(eq(permissionTable.scope, scope));
  }
  if (effect !== undefined) {
    conditions.push(eq(permissionTable.effect, effect));
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
    isEnabled: PermissionVO["isEnabled"],
    category: PermissionVO["category"],
    scope: PermissionVO["scope"],
    effect: PermissionVO["effect"],
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
  const { orderBy = "id", descend = true } = params;
  const orderField = permissionTable[orderBy] || permissionTable.id;
  const maxLimit = 10000;

  const rows = await db
    .select({
      id: permissionTable.id,
      code: permissionTable.code,
      name: permissionTable.name,
      category: permissionTable.category,
      resource: permissionTable.resource,
      effect: permissionTable.effect,
      scope: permissionTable.scope,
      parentId: permissionTable.parentId,
      remark: permissionTable.remark,
      isEnabled: permissionTable.isEnabled,
    })
    .from(permissionTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows as FromSchema<typeof listAllRes>;
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
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: PermissionVO["isEnabled"],
    category: PermissionVO["category"],
    scope: PermissionVO["scope"],
    effect: PermissionVO["effect"],
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
  const offset = (pageNo - 1) * pageSize;
  const orderField = permissionTable[orderBy] || permissionTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const countResult = await db
    .select({ total: count(permissionTable.id).as("total") })
    .from(permissionTable)
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
    .from(permissionTable)
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
    summary: "获取权限列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
} satisfies API;

export type PermissionAddLike = FromSchema<typeof addReq>
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

  const result = await db
    .insert(permissionTable)
    .values({
      ...obj,
      creatorId,
    })
    .returning({ id: permissionTable.id });

  return result[0]?.id;
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
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(permissionTable)
    .set(updateData)
    .where(eq(permissionTable.id, id))
    .returning({ id: permissionTable.id });
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
    summary: "更新权限",
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
  const result = await db
    .delete(permissionTable)
    .where(eq(permissionTable.id, id))
    .returning({ id: permissionTable.id });
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
    summary: "删除权限",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
} satisfies API;

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
  const rows = await db
    .select()
    .from(permissionTable)
    .where(eq(permissionTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return rows[0] as FromSchema<typeof getRes>;
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
} satisfies API;

// 工具函数：创建菜单权限
async function createMenuPermission(menuId: number, menuName: string, creatorId: number) {
  const permissionData = {
    code: `menu:${menuId}`,
    name: `菜单权限-${menuName}`,
    category: "menu" as const,
    resource: menuId.toString(),
    effect: "allow" as const,
    scope: "all" as const,
    parentId: null,
    remark: `菜单 ${menuName} 的访问权限`,
    isEnabled: true,
    creatorId,
  };

  const result = await db.insert(permissionTable).values(permissionData).returning({ id: permissionTable.id });
  return result[0].id;
}

// 工具函数：根据菜单ID获取权限ID
async function getPermissionIdByMenuId(menuId: number) {
  const rows = await db
    .select({ id: permissionTable.id })
    .from(permissionTable)
    .where(
      and(
        eq(permissionTable.category, "menu"),
        eq(permissionTable.code, `menu:${menuId}`)
      )
    )
    .limit(1);

  return rows.length > 0 ? rows[0].id : null;
}

export const utils = {
  createMenuPermission,
  getPermissionIdByMenuId,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
