import db from "@/db/index";
import {
  menuIndex,
  menuData,
  menuAudit,
  menuTable,
  type menuAddLike,
} from "./db.table";
import { asc, eq, or } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";
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

const treeReq = {
  type: "object",
  properties: {
    showAll: {
      description: "是否显示所有菜单（包括未启用的）",
      type: "boolean",
    },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const menuTreeItem = {
  type: "object",
  properties: {
    id: { type: "number" },
    text: { type: "string" },
    icon: { type: "string" },
    path: { type: "string" },
    sort: { type: "number" },
    children: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          text: { type: "string" },
          icon: { type: "string" },
          path: { type: "string" },
          sort: { type: "number" },
        },
        required: ["id", "text", "icon", "path"],
      },
    },
  },
  required: ["id", "text", "icon", "path"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const treeRes = {
  type: "array",
  items: {
    ...menuTreeItem,
  },
} as const satisfies JSONSchema;

async function onTree(
  c: NodeHonoContext
): Promise<FromSchema<typeof treeRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof treeReq>;
  const userObj = c.get("userObj");
  const { roleIdArr } = userObj;
  // 获取所有菜单
  const { showAll } = obj;
  // 构建查询条件
  const buildWhereCondition = () => {
    const conditions = [];
    if (showAll !== true) {
      conditions.push(eq(menuTable.isEnabled, true)); // 默认只查询启用的菜单
    }
    return conditions.length > 0
      ? conditions.length === 1
        ? conditions[0]
        : or(...conditions)
      : undefined;
  };
  const allMenus = await db
    .select()
    .from(menuTable)
    .where(buildWhereCondition())
    .orderBy(asc(menuTable.sort));

  // 根据用户角色过滤菜单
  let filteredMenus = allMenus.filter((menu) => {
    if (!menu.roleIdArr) return true;
    if (menu.roleIdArr.length === 0) return true;
    return menu.roleIdArr.some((roleId) => roleIdArr.includes(roleId));
  });
  // 父菜单没有权限时，所有子菜单也不显示
  filteredMenus = filteredMenus.filter((menu) => {
    if (!menu.parentId) return true;
    const parentMenu = filteredMenus.find((m) => m.id === menu.parentId);
    return !!parentMenu;
  });
  function buildMenuTree(
    data: typeof filteredMenus,
    parentId: number | null = null
  ): FromSchema<typeof treeRes> {
    return data
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        roleIdArr: undefined, // 不返回角色信息到前端
        children: buildMenuTree(data, item.id),
      }));
  }
  const menuTree = buildMenuTree(filteredMenus);
  return menuTree;
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
  update: updateApi,
  get: getApi,
  tree: treeApi,
};
