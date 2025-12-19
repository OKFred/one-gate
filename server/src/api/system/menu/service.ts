import db from "@/db/index";
import {
  menuIndex,
  menuData,
  menuAudit,
  menuTable,
  type menuAddLike,
  type menuLike,
} from "./db.table";
import { asc, count, desc, eq, or, like, and, isNull } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";
import * as commonSchema from "@/middleware/encapsulation/common.schema";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import hasValue from "@/utils/hasValue";

// ============ 添加菜单 ============
const addReq = {
  type: "object",
  properties: {
    ...menuData,
  } satisfies Partial<Record<keyof menuAddLike, JSONSchema>>,
  required: ["text", "icon"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  ...menuIndex["id"],
} as const satisfies JSONSchema;

async function onAdd(
  c: NodeHonoContext
): Promise<FromSchema<typeof addRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof addReq>;
  const userObj = c.get("userObj");
  const {
    text,
    icon,
    path,
    parentId,
    sort = 0,
    roleIdArr,
    isEnabled = true,
  } = obj;

  // 如果有父菜单，检查父菜单是否存在
  if (hasValue(parentId)) {
    const parent = await db
      .select()
      .from(menuTable)
      .where(eq(menuTable.id, parentId))
      .limit(1);

    if (parent.length === 0) {
      throw new HTTPException(
        httpStatusCode.BAD_REQUEST as ContentfulStatusCode,
        {
          message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
        }
      );
    }
  }

  const result = await db
    .insert(menuTable)
    .values({
      text,
      icon,
      path,
      parentId,
      sort,
      roleIdArr,
      isEnabled,
      creatorId: userObj.userId,
    } satisfies menuAddLike)
    .returning({ id: menuTable.id });

  return result[0]?.id;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加菜单",
  } as const,
  service: onAdd,
};

// ============ 删除菜单 ============
const deleteReq = {
  type: "object",
  properties: {
    ...menuIndex,
  },
  required: ["id"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...menuIndex["id"],
} as const satisfies JSONSchema;

async function onDelete(
  c: NodeHonoContext
): Promise<FromSchema<typeof deleteRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof deleteReq>;
  const userObj = c.get("userObj");
  if (!userObj?.userId) {
    throw new HTTPException(
      httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
      {
        message: "i18n.api.system.notAuthenticated" as any,
      }
    );
  }
  const { id } = uniqueKeyObj;
  if (id === undefined) return null;

  // 检查是否有子菜单
  const children = await db
    .select()
    .from(menuTable)
    .where(eq(menuTable.parentId, id))
    .limit(1);

  if (children.length > 0) {
    throw new HTTPException(
      httpStatusCode.BAD_REQUEST as ContentfulStatusCode,
      {
        message: "i18n.api.system.menu.hasChildren" satisfies LanguageKey,
      }
    );
  }

  const result = await db
    .delete(menuTable)
    .where(eq(menuTable.id, id))
    .returning({ id: menuTable.id });

  if (!result || result.length === 0) return null;
  return result[0].id;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除菜单",
  } as const,
  service: onDelete,
};

// ============ 菜单列表 ============
const listReq = {
  type: "object",
  properties: {
    orderBy: commonSchema.orderByWrapper([
      "id",
      "text",
      "sort",
      "createTimeUtc",
    ] satisfies (keyof menuLike)[]),
    ...commonSchema.listReqBase,
    isEnabled: menuData.isEnabled,
    parentId: menuData.parentId,
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  type: "object",
  properties: {
    ...commonSchema.listResBase,
    list: commonSchema.listWrapper({
      ...menuIndex,
      ...menuData,
      ...menuAudit,
    } satisfies Partial<Record<keyof menuLike, JSONSchema>>),
  },
} as const satisfies JSONSchema;

async function onList(c: NodeHonoContext): Promise<FromSchema<typeof listRes>> {
  const listParamObj = c.get("bodyObj") as FromSchema<typeof listReq>;
  const {
    orderBy = "sort",
    descend = false,
    pageNo = 1,
    pageSize = 100,
    keyword = "",
    isEnabled,
    parentId,
  } = listParamObj;

  const offset = (pageNo - 1) * pageSize;
  const orderField = menuTable[orderBy] || menuTable.sort;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  function queryDB(getAll: true): Promise<{ total: number }[]>;
  function queryDB(getAll: false): Promise<menuLike[]>;
  function queryDB(getAll: boolean): Promise<{ total: number }[] | menuLike[]> {
    return db
      .select(getAll ? { total: count(menuTable.id).as("total") } : undefined)
      .from(menuTable)
      .where(
        and(
          keyword ? like(menuTable.text, `%${keyword}%`) : undefined,
          isEnabled !== undefined
            ? eq(menuTable.isEnabled, isEnabled)
            : undefined,
          parentId !== undefined
            ? parentId === null
              ? isNull(menuTable.parentId)
              : eq(menuTable.parentId, parentId)
            : undefined
        )
      )
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(getAll ? maxPageSize : finalPageSize)
      .offset(getAll ? 0 : offset);
  }

  const getAllResult = await queryDB(true);
  const total = getAllResult[0]?.total || 0;
  const rows = await queryDB(false);
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
    summary: "获取菜单列表",
  } as const,
  service: onList,
};

// ============ 更新菜单 ============
const updateReq = {
  type: "object",
  properties: {
    ...menuIndex,
    ...menuData,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  ...menuIndex["id"],
} as const satisfies JSONSchema;

async function onUpdate(
  c: NodeHonoContext
): Promise<FromSchema<typeof updateRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateReq>;
  const userObj = c.get("userObj");
  const { id, ...rest } = obj;

  // 如果更新父菜单，检查是否会造成循环引用
  if (rest.parentId) {
    // 不能将自己设为父菜单
    if (rest.parentId === id) {
      throw new HTTPException(
        httpStatusCode.BAD_REQUEST as ContentfulStatusCode
      );
    }

    // 检查父菜单是否存在
    const parent = await db
      .select()
      .from(menuTable)
      .where(eq(menuTable.id, rest.parentId))
      .limit(1);

    if (parent.length === 0) {
      throw new HTTPException(
        httpStatusCode.BAD_REQUEST as ContentfulStatusCode,
        {
          message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
        }
      );
    }
  }

  const updateData = {
    ...rest,
    updaterId: userObj.userId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(menuTable)
    .set(updateData)
    .where(eq(menuTable.id, id))
    .returning({ id: menuTable.id });

  if (!res || res.length === 0) return null;
  return res[0].id;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新菜单",
  } as const,
  service: onUpdate,
};

// ============ 获取单个菜单 ============
const getReq = {
  type: "object",
  properties: {
    ...menuIndex,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...menuIndex,
    ...menuData,
    ...menuAudit,
  },
} as const satisfies JSONSchema;

async function onGet(
  c: NodeHonoContext
): Promise<FromSchema<typeof getRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof getReq>;
  const { id } = uniqueKeyObj;
  const rows = await db
    .select()
    .from(menuTable)
    .where(eq(menuTable.id, id))
    .limit(1);

  if (rows.length === 0) {
    throw new HTTPException(httpStatusCode.NOT_FOUND as ContentfulStatusCode, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  }

  return rows[0];
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取菜单信息",
  } as const,
  service: onGet,
};

// ============ 获取树形菜单（前端使用） ============
export interface MenuTreeItem {
  id: number;
  text: string;
  icon: string;
  path?: string | null;
  sort: number;
  children?: MenuTreeItem[];
}

const treeReq = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const treeRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "number" },
      text: { type: "string" },
      icon: { type: "string" },
      path: { type: ["string", "null"], nullable: true },
      sort: { type: "number" },
      children: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number" },
            text: { type: "string" },
            icon: { type: "string" },
            path: { type: ["string", "null"], nullable: true },
            sort: { type: "number" },
          },
        },
      },
    },
  },
} as const satisfies JSONSchema;

async function onTree(c: NodeHonoContext): Promise<MenuTreeItem[]> {
  const userObj = c.get("userObj");
  const { roleIdArr } = userObj;
  // 获取所有启用的菜单
  const allMenus = await db
    .select()
    .from(menuTable)
    .where(eq(menuTable.isEnabled, true))
    .orderBy(asc(menuTable.sort));

  // 根据用户角色过滤菜单
  const filteredMenus = allMenus.filter((menu) => {
    if (!menu.roleIdArr) return true;
    try {
      if (menu.roleIdArr.length === 0) return true;
      return menu.roleIdArr.some((roleId) => roleIdArr.includes(roleId));
    } catch {
      return true;
    }
  });

  // 构建树形结构
  const menuMap = new Map<number, MenuTreeItem>();
  const rootMenus: MenuTreeItem[] = [];

  // 先创建所有菜单项
  for (const menu of filteredMenus) {
    menuMap.set(menu.id, {
      id: menu.id,
      text: menu.text,
      icon: menu.icon,
      path: menu.path,
      sort: menu.sort,
      children: [],
    });
  }

  // 然后建立父子关系
  for (const menu of filteredMenus) {
    const menuItem = menuMap.get(menu.id)!;
    if (menu.parentId && menuMap.has(menu.parentId)) {
      const parent = menuMap.get(menu.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(menuItem);
    } else {
      rootMenus.push(menuItem);
    }
  }

  // 清理空的 children 数组
  const cleanEmptyChildren = (items: MenuTreeItem[]): MenuTreeItem[] => {
    return items.map((item) => {
      if (item.children && item.children.length === 0) {
        const { children, ...rest } = item;
        return rest;
      }
      if (item.children && item.children.length > 0) {
        return { ...item, children: cleanEmptyChildren(item.children) };
      }
      return item;
    });
  };

  return cleanEmptyChildren(rootMenus);
}

const treeApi = {
  req: treeReq,
  res: treeRes,
  pathInfo: {
    path: "/tree",
    method: "post",
    summary: "获取树形菜单（根据用户角色过滤）",
  } as const,
  service: onTree,
};

export default {
  add: addApi,
  delete: deleteApi,
  list: listApi,
  update: updateApi,
  get: getApi,
  tree: treeApi,
};
