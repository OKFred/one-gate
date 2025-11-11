import db from "@/db/index";
import {
  mailLogIndex,
  mailLogUnique,
  mailLogAudit,
  mailLogTable,
  mailLogData,
  type mailLogAddLike,
  type mailLogLike,
} from "./db.table";
import { asc, count, desc, eq, and, gte, lte, like, or } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";
import * as commonSchema from "../common.schema";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";

const addReq = {
  type: "object",
  properties: {
    ...mailLogData,
  } satisfies Partial<Record<keyof mailLogAddLike, JSONSchema>>,
  required: ["mailTo", "mailFrom", "title", "sendStatus"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...mailLogIndex["id"],
} as const satisfies JSONSchema;
async function onAdd(
  c: NodeHonoContext
): Promise<FromSchema<typeof addRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof addReq>;
  const userObj = c.get("userObj");
   const {
    mailTo,
    mailFrom,
    title,
    templateId,
    templateParams,
    sendStatus,
    exceptionCode,
    exceptionDetails,
  } = obj;
  const result = await db
    .insert(mailLogTable)
    .values({
      mailTo,
      mailFrom,
      title,
      templateId,
      templateParams,
      sendStatus,
      exceptionCode,
      exceptionDetails,
      creatorId: userObj.userId,
    } satisfies mailLogAddLike)
    .returning({ id: mailLogTable.id });
  return result[0]?.id;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加邮件日志",
  } as const,
  service: onAdd,
};

const deleteReq = {
  type: "object",
  properties: {
    ...mailLogIndex,
  },
  required: ["id"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...mailLogIndex["id"],
} as const satisfies JSONSchema;
async function onDelete(
  c: NodeHonoContext
): Promise<FromSchema<typeof deleteRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof deleteReq>;
  const userObj = c.get("userObj");
  const { userId: updaterId } = userObj;
  const { id } = uniqueKeyObj;
  if (id === undefined) return null;
  const result = await db
    .delete(mailLogTable)
    .where(eq(mailLogTable.id, id))
    .returning({
      id: mailLogTable.id,
    });
  if (!result || result.length === 0) return null;
  return result[0].id;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除邮件日志",
  } as const,
  service: onDelete,
};

const listReq = {
  type: "object",
  properties: {
    orderBy: commonSchema.orderByWrapper([
      "id",
      "mailTo",
      "mailFrom",
      "sendStatus",
      "createTimeUtc",
    ] satisfies (keyof mailLogLike)[]),
    ...commonSchema.listReqBase,
    sendStatus: { type: "boolean", description: "发送状态过滤" },
    templateId: { type: "string", description: "模板ID过滤" },
    startTimeUtc: { type: "number", description: "开始时间（UTC毫秒）" },
    endTimeUtc: { type: "number", description: "结束时间（UTC毫秒）" },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  type: "object",
  properties: {
    ...commonSchema.listResBase,
    list: commonSchema.listWrapper({
      ...mailLogIndex,
      ...mailLogData,
      ...mailLogAudit,
    } satisfies Partial<Record<keyof mailLogLike, JSONSchema>>),
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
    sendStatus,
    templateId,
    startTimeUtc,
    endTimeUtc,
  } = listParamObj;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailLogTable[orderBy] || mailLogTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 构建查询条件
  const conditions = [];
  if (keyword) {
    conditions.push(
      or(
        like(mailLogTable.mailTo, `%${keyword}%`),
        like(mailLogTable.mailFrom, `%${keyword}%`)
      )
    );
  }
  if (sendStatus !== undefined) {
    conditions.push(eq(mailLogTable.sendStatus, sendStatus));
  }
  if (templateId) {
    conditions.push(eq(mailLogTable.templateId, templateId));
  }
  if (startTimeUtc !== undefined) {
    conditions.push(gte(mailLogTable.createTimeUtc, startTimeUtc));
  }
  if (endTimeUtc !== undefined) {
    conditions.push(lte(mailLogTable.createTimeUtc, endTimeUtc));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 函数重载：根据 getAll 参数提供不同的返回类型
  function queryDB(getAll: true): Promise<{ total: number }[]>;
  function queryDB(getAll: false): Promise<mailLogLike[]>;
  function queryDB(
    getAll: boolean
  ): Promise<{ total: number }[] | mailLogLike[]> {
    return db
      .select(
        getAll ? { total: count(mailLogTable.id).as("total") } : undefined
      )
      .from(mailLogTable)
      .where(whereClause)
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
    summary: "获取邮件日志列表",
  } as const,
  service: onList,
};

const updateReq = {
  type: "object",
  properties: {
    ...mailLogIndex,
    ...mailLogData,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateRes = {
  ...mailLogIndex["id"],
} as const satisfies JSONSchema;
async function onUpdate(
  c: NodeHonoContext
): Promise<FromSchema<typeof updateRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateReq>;
  const userObj = c.get("userObj");
  const { id, ...rest } = obj;
  const res = await db
    .update(mailLogTable)
    .set({
      ...rest,
      updaterId: userObj.userId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(mailLogTable.id, id))
    .returning({ id: mailLogTable.id });
  if (!res || res.length === 0) return null;
  return res[0].id;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新邮件日志",
  } as const,
  service: onUpdate,
};

const getReq = {
  type: "object",
  properties: {
    ...mailLogIndex,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...mailLogIndex,
    ...mailLogData,
    ...mailLogAudit,
  } satisfies Partial<Record<keyof mailLogLike, JSONSchema>>,
} as const satisfies JSONSchema;
async function onGet(
  c: NodeHonoContext
): Promise<FromSchema<typeof getRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof getReq>;
  const { id } = uniqueKeyObj;
  const rows = await db
    .select()
    .from(mailLogTable)
    .where(eq(mailLogTable.id, id))
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
    summary: "获取邮件日志",
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
