import db from "@/db/index";
import {
  menuTable,
  IndexVO,
  MenuVO,
  MenuListVO,
  MenuAddVO,
  MenuUpdateVO,
  MenuListKeys,
  MenuDetailKeys,
  MenuGetKeys,
  MenuDeleteKeys,
  MenuAddKeys,
  MenuUpdateKeys,
  type MenuPOLike,
  type MenuVOLike,
  type MenuAddVOLike,
  type MenuUpdateVOLike,
  type MenuDeleteVOLike,
  type MenuGetVOLike,
} from "./db.table";
import { asc, count, desc, eq, or, like, and } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { RequiredKeys } from "@/types/app";
import hasValue from "@/utils/hasValue";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    orderBy: orderByWrapper<(keyof MenuPOLike)[]>([
      "id",
      "text",
      "isEnabled",
      "createTimeUtc",
    ]),
    isEnabled: { type: "boolean", description: "是否启用状态过滤" },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<MenuPOLike>[]>(
    {
      ...MenuListVO,
    },
    [...MenuListKeys]
  ),
} as const satisfies JSONSchema;
async function onList(c: NodeHonoContext): Promise<FromSchema<typeof listRes>> {
  const listParamObj = c.get("bodyObj") as FromSchema<typeof listReq>;
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    keyword = "",
    isEnabled,
  } = listParamObj;
  const offset = (pageNo - 1) * pageSize;
  const orderField = menuTable[orderBy] || menuTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 构建查询条件
  const buildWhereCondition = () => {
    const conditions = [];
    if (hasValue(keyword)) {
      conditions.push(or(like(menuTable.text, `%${keyword}%`)));
    }
    if (isEnabled !== undefined) {
      conditions.push(eq(menuTable.isEnabled, isEnabled));
    }
    return conditions.length > 0
      ? conditions.length === 1
        ? conditions[0]
        : and(...conditions)
      : undefined;
  };

  // 查询总数
  const countResult = await db
    .select({ total: count(menuTable.id).as("total") })
    .from(menuTable)
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
    .from(menuTable)
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
    summary: "获取菜单列表",
  } as const,
  service: onList,
};

const addReq = {
  type: "object",
  properties: {
    ...MenuAddVO,
  } satisfies Partial<Record<keyof MenuAddVOLike, JSONSchema>>,
  required: [...MenuAddKeys] as const satisfies RequiredKeys<MenuAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onAdd(
  c: NodeHonoContext
): Promise<FromSchema<typeof addRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof addReq>;
  const userObj = c.get("userObj");
  const { userId: creatorId } = userObj;
  const { parentId } = obj;

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
  const updateData = {
    ...obj,
    creatorId,
  };
  const result = await db
    .insert(menuTable)
    .values(updateData)
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

const updateReq = {
  type: "object",
  properties: {
    ...MenuUpdateVO,
  },
  required: [
    ...MenuUpdateKeys,
  ] as const satisfies RequiredKeys<MenuUpdateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateRes = {
  ...IndexVO["id"],
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

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...MenuDeleteKeys,
  ] as const satisfies RequiredKeys<MenuDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...IndexVO["id"],
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

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [...MenuGetKeys] as const satisfies RequiredKeys<MenuGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...MenuVO,
  },
  required: [...MenuDetailKeys] as const satisfies RequiredKeys<MenuVOLike>[],
  additionalProperties: false,
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
    ...MenuVO,
    children: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ...MenuVO,
          children: {
            type: "array",
            maxLength: 0,
            minLength: 0,
          },
        },
        required: [...MenuDetailKeys, "children"],
        additionalProperties: false,
      },
    },
  },
  required: [...MenuDetailKeys, "children"],
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
  const { roleArr } = userObj;
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
    return menu.roleIdArr.some((roleId) =>
      roleArr.find((r) => r.value === roleId)
    );
  });
  // 父菜单没有权限时，所有子菜单也不显示
  filteredMenus = filteredMenus.filter((menu) => {
    if (!menu.parentId) return true;
    const parentMenu = filteredMenus.find((m) => m.id === menu.parentId);
    return !!parentMenu;
  });
  function buildMenuTree(
    data,
    parentId: number | null = null
  ): FromSchema<typeof treeRes> {
    return data
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
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
  list: listApi,
  add: addApi,
  delete: deleteApi,
  update: updateApi,
  get: getApi,
  tree: treeApi,
};
