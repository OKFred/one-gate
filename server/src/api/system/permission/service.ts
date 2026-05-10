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
} from "./model";
import { asc, count, desc, eq, or, like, and, inArray } from "drizzle-orm";
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
import { preventEmpty } from "@/middleware/auth/prevention";
import { preventMissingPermission } from "./prevention";
import translationService from "@/api/i18n/translation/service";

// 构建查询条件(列表和全部通用)
const buildWhereCondition = ({
  keyword,
  isEnabled,
  code,
  name,
  category,
}: Pick<
  FromSchema<typeof listReq>,
  "keyword" | "isEnabled" | "code" | "name" | "category"
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
  if (hasValue(code)) {
    conditions.push(eq(permissionTable.code, code));
  }
  if (hasValue(name)) {
    conditions.push(eq(permissionTable.name, name));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(permissionTable.isEnabled, isEnabled));
  }
  if (category !== undefined) {
    conditions.push(eq(permissionTable.category, category));
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
      business: permissionTable.business,
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
    summary: "删除权限",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
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
  const rows = await db
    .select()
    .from(permissionTable)
    .where(eq(permissionTable.id, id))
    .limit(1);
  const row = rows[0];
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
} satisfies API;

// 工具函数：创建菜单权限
async function createMenuPermission(
  params: {
    menuId: number;
    menuName: string;
    business: string | null;
  },
  userObj: UserObj
) {
  const { menuId, menuName, business } = params;
  const permissionName = await translationService.listAll
    .service({
      isEnabled: true,
    })
    .then((translationList) => {
      const tKeySubString = business || "";
      const prefix =
        translationList.find(
          (item) =>
            item.tKey === "businessType." + tKeySubString &&
            item.langCode === userObj.langCode
        )?.tValue || "未知菜单权限";
      const postfix = translationList.find(
        (item) =>
          item.tKey === "permission.category.menu" &&
          item.langCode === userObj.langCode
      )?.tValue;
      return postfix ? `${prefix}${postfix}` : menuName + "未知菜单";
    });
  const permissionData = {
    code: `${menuName}:menu`,
    name: permissionName,
    category: "menu" as const,
    resource: `${menuId}`,
    business,
    remark: null,
    isEnabled: true,
  };
  const result = await onAdd(permissionData, userObj);
  return result;
}

// 工具函数：根据菜单ID获取权限ID
async function getPermissionIdByMenuId(menuId: number) {
  const rows = await db
    .select({ id: permissionTable.id })
    .from(permissionTable)
    .where(
      and(
        eq(permissionTable.category, "menu"),
        eq(permissionTable.resource, `${menuId}`)
      )
    )
    .limit(1);

  return rows.length > 0 ? rows[0].id : null;
}

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
  createMenuPermission,
  getPermissionIdByMenuId,
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
