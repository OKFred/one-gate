import db from "@/db/index";
import {
  mailTemplateIndex,
  mailTemplateUnique,
  mailTemplateAudit,
  mailTemplateTable,
  mailTemplateData,
  type mailTemplateAddLike,
  type mailTemplateLike,
} from "./db.table";
import { asc, count, desc, eq, like, or } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";
import * as commonSchema from "@/middleware/encapsulation/common.schema";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";

const addReq = {
  type: "object",
  properties: {
    ...mailTemplateData,
  } satisfies Partial<Record<keyof mailTemplateAddLike, JSONSchema>>,
  required: ["name", "title", "langCode", "content"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...mailTemplateIndex["id"],
} as const satisfies JSONSchema;
async function onAdd(
  c: NodeHonoContext
): Promise<FromSchema<typeof addRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof addReq>;
  const userObj = c.get("userObj");
  const { name, title, langCode, content, category = "", remark } = obj;
  const result = await db
    .insert(mailTemplateTable)
    .values({
      name,
      title,
      langCode,
      content,
      creatorId: userObj.userId,
      category,
      remark,
    } satisfies mailTemplateAddLike)
    .returning({ id: mailTemplateTable.id });
  return result[0]?.id;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加邮件模板",
  } as const,
  service: onAdd,
};

const deleteReq = {
  type: "object",
  properties: {
    ...mailTemplateIndex,
  },
  required: ["id"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...mailTemplateIndex["id"],
} as const satisfies JSONSchema;
async function onDelete(
  c: NodeHonoContext
): Promise<FromSchema<typeof deleteRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof deleteReq>;
  const userObj = c.get("userObj");
  const { id } = uniqueKeyObj;
  if (id === undefined) return null;
  // 软删除：设置 status=false 并记录 updaterId，而不是物理删除
  const result = await db
    .update(mailTemplateTable)
    .set({
      status: false,
      updaterId: userObj.userId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(mailTemplateTable.id, id))
    .returning({ id: mailTemplateTable.id });
  if (!result || result.length === 0) {
    throw new HTTPException(httpStatusCode.NOT_FOUND as ContentfulStatusCode, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  }
  return result[0].id;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除邮件模板",
  } as const,
  service: onDelete,
};

const listReq = {
  type: "object",
  properties: {
    orderBy: commonSchema.orderByWrapper([
      "id",
      "name",
      "creatorId",
      "createTimeUtc",
    ] satisfies (keyof mailTemplateLike)[]),
    ...commonSchema.listReqBase,
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  type: "object",
  properties: {
    ...commonSchema.listResBase,
    list: commonSchema.listWrapper({
      ...mailTemplateIndex,
      ...mailTemplateData,
      ...mailTemplateAudit,
      status: {
        type: "boolean",
        description: "状态",
      },
      remark: {
        type: "string",
        nullable: true,
        description: "备注",
      },
    } satisfies Partial<Record<keyof mailTemplateLike, JSONSchema>>),
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
  } = listParamObj;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailTemplateTable[orderBy] || mailTemplateTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 函数重载：根据 getAll 参数提供不同的返回类型
  function queryDB(getAll: true): Promise<{ total: number }[]>;
  function queryDB(getAll: false): Promise<mailTemplateLike[]>;
  function queryDB(
    getAll: boolean
  ): Promise<{ total: number }[] | mailTemplateLike[]> {
    return db
      .select(
        getAll ? { total: count(mailTemplateTable.id).as("total") } : undefined
      )
      .from(mailTemplateTable)
      .where(
        keyword
          ? or(
              like(mailTemplateTable.name, `%${keyword}%`),
              like(mailTemplateTable.title, `%${keyword}%`),
              like(mailTemplateTable.category, `%${keyword}%`)
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
    summary: "获取邮件模板列表",
  } as const,
  service: onList,
};

const updateReq = {
  type: "object",
  properties: {
    ...mailTemplateIndex,
    ...mailTemplateData,
    status: {
      type: "boolean",
      description: "状态",
    },
    remark: {
      type: "string",
      description: "备注",
    },
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateRes = {
  ...mailTemplateIndex["id"],
} as const satisfies JSONSchema;
async function onUpdate(
  c: NodeHonoContext
): Promise<FromSchema<typeof updateRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateReq>;
  const userObj = c.get("userObj");
  const { id, ...rest } = obj;
  const res = await db
    .update(mailTemplateTable)
    .set({
      ...rest,
      updaterId: userObj.userId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(mailTemplateTable.id, id))
    .returning({ id: mailTemplateTable.id });
  if (!res || res.length === 0) {
    throw new HTTPException(httpStatusCode.NOT_FOUND as ContentfulStatusCode, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  }
  return res[0].id;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新邮件模板",
  } as const,
  service: onUpdate,
};

const getReq = {
  type: "object",
  properties: {
    ...mailTemplateIndex,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...mailTemplateIndex,
    ...mailTemplateData,
    ...mailTemplateAudit,
    status: {
      type: "boolean",
      description: "状态",
    },
    remark: {
      type: "string",
      nullable: true,
      description: "备注",
    },
  } satisfies Partial<Record<keyof mailTemplateLike, JSONSchema>>,
} as const satisfies JSONSchema;
async function onGet(
  c: NodeHonoContext
): Promise<FromSchema<typeof getRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof getReq>;
  const { id } = uniqueKeyObj;
  const rows = await db
    .select()
    .from(mailTemplateTable)
    .where(eq(mailTemplateTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new HTTPException(404, {
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
    summary: "获取邮件模板",
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
