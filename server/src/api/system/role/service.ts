import db from "@/db/index";
import {
  roleIndex,
  roleData,
  roleAudit,
  roleTable,
  type roleAddLike,
  type roleLike,
} from "./db.table";
import { asc, count, desc, eq, or, like } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";

// 添加角色
const addReq = {
  type: "object",
  properties: {
    ...roleData,
  } satisfies Partial<Record<keyof roleAddLike, JSONSchema>>,
  required: ["name"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  ...roleIndex["id"],
} as const satisfies JSONSchema;

async function onAdd(
  c: NodeHonoContext
): Promise<FromSchema<typeof addRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof addReq>;
  const userObj = c.get("userObj");
  const { name, description, permissions, isEnabled = true } = obj;
  // 如果提供了permissions，验证是否为有效JSON数组
  if (permissions) {
    const parsed = JSON.parse(permissions);
    if (!Array.isArray(parsed)) {
      throw new HTTPException(
        httpStatusCode.BAD_REQUEST as ContentfulStatusCode,
        {
          message: "Invalid permissions format, must be a JSON array",
        }
      );
    }
  }

  const result = await db
    .insert(roleTable)
    .values({
      name,
      description,
      permissions,
      isEnabled,
      creatorId: userObj.userId,
    } satisfies roleAddLike)
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
  service: onAdd,
};

// 删除角色
const deleteReq = {
  type: "object",
  properties: {
    ...roleIndex,
  },
  required: ["id"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...roleIndex["id"],
} as const satisfies JSONSchema;

async function onDelete(
  c: NodeHonoContext
): Promise<FromSchema<typeof deleteRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof deleteReq>;
  const { id } = uniqueKeyObj;

  if (!id) return null;

  const result = await db
    .delete(roleTable)
    .where(eq(roleTable.id, id))
    .returning({ id: roleTable.id });

  if (!result || result.length === 0) return null;
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
  service: onDelete,
};

// 列表查询
const listReq = {
  type: "object",
  properties: {
    orderBy: {
      type: "string",
      enum: ["id", "name", "createTimeUtc"] satisfies (keyof roleLike)[],
    },
    descend: { type: "boolean" },
    pageNo: { type: "number", minimum: 1, default: 1 },
    pageSize: { type: "number", maximum: 1000, default: 10 },
    keyword: {
      type: "string",
      examples: [""],
      description: "搜索角色ID或名称",
    },
    isEnabled: { type: "boolean", description: "是否启用状态过滤" },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  type: "object",
  properties: {
    total: { type: "number", description: "总记录数" },
    totalPage: { type: "number", description: "总页数" },
    currentPage: { type: "number", description: "当前页码" },
    pageSize: { type: "number", description: "每页记录数" },
    list: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ...roleIndex,
          ...roleData,
          ...roleAudit,
        },
      },
    },
  },
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
  const orderField = roleTable[orderBy] || roleTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 构建查询条件
  const buildWhereCondition = () => {
    const conditions = [];
    if (keyword) {
      conditions.push(
        or(
          like(roleTable.id, `%${keyword}%`),
          like(roleTable.name, `%${keyword}%`)
        )
      );
    }
    if (isEnabled !== undefined) {
      conditions.push(eq(roleTable.isEnabled, isEnabled));
    }
    return conditions.length > 0
      ? conditions.length === 1
        ? conditions[0]
        : or(...conditions)
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
  service: onList,
};

// 更新角色
const updateReq = {
  type: "object",
  properties: {
    ...roleIndex,
    ...roleData,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  ...roleIndex["id"],
} as const satisfies JSONSchema;

async function onUpdate(
  c: NodeHonoContext
): Promise<FromSchema<typeof updateRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateReq>;
  const userObj = c.get("userObj");
  const { id, permissions, ...rest } = obj;

  // 如果更新permissions，验证是否为有效JSON数组
  if (permissions) {
    const parsed = JSON.parse(permissions);
    if (!Array.isArray(parsed)) {
      throw new HTTPException(
        httpStatusCode.BAD_REQUEST as ContentfulStatusCode
      );
    }
  }

  const updateData = {
    ...rest,
    permissions,
    updaterId: userObj.userId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(roleTable)
    .set(updateData)
    .where(eq(roleTable.id, id))
    .returning({ id: roleTable.id });

  if (!res || res.length === 0) return null;
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
  service: onUpdate,
};

// 获取单个角色
const getReq = {
  type: "object",
  properties: {
    ...roleIndex,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...roleIndex,
    ...roleData,
    ...roleAudit,
  },
} as const satisfies JSONSchema;

async function onGet(
  c: NodeHonoContext
): Promise<FromSchema<typeof getRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof getReq>;
  const { id } = uniqueKeyObj;

  const rows = await db
    .select()
    .from(roleTable)
    .where(eq(roleTable.id, id))
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
    summary: "获取角色信息",
  } as const,
  service: onGet,
};

export default {
  add: addApi,
  delete: deleteApi,
  list: listApi,
  update: updateApi,
  get: getApi,
};
