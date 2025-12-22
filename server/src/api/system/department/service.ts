import db from "@/db/index";
import {
  departmentIndex,
  departmentData,
  departmentAudit,
  departmentTable,
  type departmentAddLike,
  type departmentLike,
} from "./db.table";
import { asc, count, desc, eq, or, like, and } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";
import * as commonSchema from "@/middleware/encapsulation/common.schema";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import hasValue from "@/utils/hasValue";

const addReq = {
  type: "object",
  properties: {
    ...departmentData,
  } satisfies Partial<Record<keyof departmentAddLike, JSONSchema>>,
  required: ["name"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...departmentIndex["id"],
} as const satisfies JSONSchema;
async function onAdd(
  c: NodeHonoContext
): Promise<FromSchema<typeof addRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof addReq>;
  const userObj = c.get("userObj");
  const { name, description, parentId, isEnabled = true } = obj;
  // 如果有父部门，检查父部门是否存在
  if (hasValue(parentId)) {
    const parent = await db
      .select()
      .from(departmentTable)
      .where(eq(departmentTable.id, parentId))
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
    .insert(departmentTable)
    .values({
      name,
      description,
      parentId,
      isEnabled,
      creatorId: userObj.userId,
    } satisfies departmentAddLike)
    .returning({ id: departmentTable.id });

  return result[0]?.id;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加部门",
  } as const,
  service: onAdd,
};

const deleteReq = {
  type: "object",
  properties: {
    ...departmentIndex,
  },
  required: ["id"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...departmentIndex["id"],
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

  // 检查是否有子部门
  const children = await db
    .select()
    .from(departmentTable)
    .where(eq(departmentTable.parentId, id))
    .limit(1);

  if (children.length > 0) {
    throw new HTTPException(
      httpStatusCode.BAD_REQUEST as ContentfulStatusCode,
      {
        message: "i18n.api.system.department.hasChildren" satisfies LanguageKey,
      }
    );
  }

  const result = await db
    .delete(departmentTable)
    .where(eq(departmentTable.id, id))
    .returning({ id: departmentTable.id });

  if (!result || result.length === 0) return null;
  return result[0].id;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除部门",
  } as const,
  service: onDelete,
};

const listReq = {
  type: "object",
  properties: {
    orderBy: commonSchema.orderByWrapper([
      "id",
      "name",
      "createTimeUtc",
    ] satisfies (keyof departmentLike)[]),
    ...commonSchema.listReqBase,
    isEnabled: departmentData.isEnabled,
    parentId: departmentData.parentId,
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  type: "object",
  properties: {
    ...commonSchema.listResBase,
    list: commonSchema.listWrapper({
      ...departmentIndex,
      ...departmentData,
      ...departmentAudit,
    } satisfies Partial<Record<keyof departmentLike, JSONSchema>>),
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
    parentId,
  } = listParamObj;

  const offset = (pageNo - 1) * pageSize;
  const orderField = departmentTable[orderBy] || departmentTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 函数重载：根据 getAll 参数提供不同的返回类型
  function queryDB(getAll: true): Promise<{ total: number }[]>;
  function queryDB(getAll: false): Promise<departmentLike[]>;
  function queryDB(
    getAll: boolean
  ): Promise<{ total: number }[] | departmentLike[]> {
    return db
      .select(
        getAll ? { total: count(departmentTable.id).as("total") } : undefined
      )
      .from(departmentTable)
      .where(
        keyword
          ? and(
              like(departmentTable.name, `%${keyword}%`),
              isEnabled !== undefined
                ? eq(departmentTable.isEnabled, isEnabled)
                : undefined,
              parentId !== undefined
                ? eq(departmentTable.parentId, parentId)
                : undefined
            )
          : undefined
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
    summary: "获取部门列表",
  } as const,
  service: onList,
};

const updateReq = {
  type: "object",
  properties: {
    ...departmentIndex,
    ...departmentData,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  ...departmentIndex["id"],
} as const satisfies JSONSchema;

async function onUpdate(
  c: NodeHonoContext
): Promise<FromSchema<typeof updateRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateReq>;
  const userObj = c.get("userObj");
  const { id, ...rest } = obj;

  // 如果更新父部门，检查是否会造成循环引用
  if (rest.parentId) {
    // 不能将自己设为父部门
    if (rest.parentId === id) {
      throw new HTTPException(
        httpStatusCode.BAD_REQUEST as ContentfulStatusCode
      );
    }

    // 检查父部门是否存在
    const parent = await db
      .select()
      .from(departmentTable)
      .where(eq(departmentTable.id, rest.parentId))
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
    .update(departmentTable)
    .set(updateData)
    .where(eq(departmentTable.id, id))
    .returning({ id: departmentTable.id });

  if (!res || res.length === 0) return null;
  return res[0].id;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新部门",
  } as const,
  service: onUpdate,
};

const getReq = {
  type: "object",
  properties: {
    ...departmentIndex,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...departmentIndex,
    ...departmentData,
    ...departmentAudit,
  },
} as const satisfies JSONSchema;

async function onGet(
  c: NodeHonoContext
): Promise<FromSchema<typeof getRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof getReq>;
  const { id } = uniqueKeyObj;
  const rows = await db
    .select()
    .from(departmentTable)
    .where(eq(departmentTable.id, id))
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
    summary: "获取部门信息",
  } as const,
  service: onGet,
};

/**
 * 内部服务调用：根据ID获取部门名称
 */
export async function getDepartmentNameById(
  id: number
): Promise<string | null> {
  const rows = await db
    .select({ name: departmentTable.name })
    .from(departmentTable)
    .where(eq(departmentTable.id, id))
    .limit(1);
  return rows.length > 0 ? rows[0].name : null;
}

export default {
  add: addApi,
  delete: deleteApi,
  list: listApi,
  update: updateApi,
  get: getApi,
};
