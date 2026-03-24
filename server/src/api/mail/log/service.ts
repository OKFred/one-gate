import db from "@/db/index";
import {
  mailLogTable,
  IndexVO,
  MailLogVO,
  MailLogListVO,
  MailLogAddVO,
  MailLogUpdateVO,
  MailLogListKeys,
  MailLogDetailKeys,
  MailLogGetKeys,
  MailLogDeleteKeys,
  MailLogAddKeys,
  MailLogUpdateKeys,
  MailLogSortableKeys,
  type MailLogPOLike,
  type MailLogVOLike,
  type MailLogAddVOLike,
  type MailLogUpdateVOLike,
  type MailLogDeleteVOLike,
  type MailLogGetVOLike,
  MailLogBaseVO,
  MailLogUniqueKeys,
  MailLogUniqueVO,
} from "./model";
import { asc, count, desc, eq, or, like, and, gte, lte } from "drizzle-orm";
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
  sendStatus,
  templateId,
  startTimeUtc,
  endTimeUtc,
}: Pick<
  FromSchema<typeof listReq>,
  "keyword" | "sendStatus" | "templateId" | "startTimeUtc" | "endTimeUtc"
>) => {
  const conditions = [];
  if (hasValue(keyword)) {
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
  if (hasValue(templateId)) {
    conditions.push(eq(mailLogTable.templateId, templateId));
  }
  if (startTimeUtc !== undefined) {
    conditions.push(gte(mailLogTable.createTimeUtc, startTimeUtc));
  }
  if (endTimeUtc !== undefined) {
    conditions.push(lte(mailLogTable.createTimeUtc, endTimeUtc));
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
    sendStatus: MailLogVO["sendStatus"],
    templateId: { type: "string", description: "模板ID" },
    startTimeUtc: { type: "number", description: "开始时间（UTC毫秒）" },
    endTimeUtc: { type: "number", description: "结束时间（UTC毫秒）" },
    orderBy: orderByWrapper<(keyof MailLogPOLike)[]>(MailLogSortableKeys),
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
      ...MailLogBaseVO,
      ...MailLogUniqueVO,
    },
    required: [...MailLogGetKeys, ...MailLogUniqueKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  const { orderBy = "id", descend = true } = params;
  const orderField = mailLogTable[orderBy] || mailLogTable.id;
  const maxLimit = 10000;
  const rows = await db
    .select({
      id: mailLogTable.id,
      mailTo: mailLogTable.mailTo,
      mailFrom: mailLogTable.mailFrom,
      title: mailLogTable.title,
      sendStatus: mailLogTable.sendStatus,
    })
    .from(mailLogTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有邮件日志（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    sendStatus: MailLogVO["sendStatus"],
    templateId: { type: "string", description: "模板ID" },
    startTimeUtc: { type: "number", description: "开始时间（UTC毫秒）" },
    endTimeUtc: { type: "number", description: "结束时间（UTC毫秒）" },
    orderBy: orderByWrapper<(keyof MailLogPOLike)[]>(MailLogSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<MailLogPOLike>[]>(
    {
      ...MailLogListVO,
    },
    [...MailLogListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailLogTable[orderBy] || mailLogTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const countResult = await db
    .select({ total: count(mailLogTable.id).as("total") })
    .from(mailLogTable)
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
    .from(mailLogTable)
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
    summary: "获取邮件日志列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...MailLogAddVO,
  } satisfies Partial<Record<keyof MailLogAddVOLike, JSONSchema>>,
  required: [
    ...MailLogAddKeys,
  ] as const satisfies RequiredKeys<MailLogAddVOLike>[],
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
  const addData = {
    ...obj,
    creatorId,
  };
  const result = await db
    .insert(mailLogTable)
    .values(addData)
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
  adapter: bodyUserAdapter,
  service: onAdd,
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...MailLogUpdateVO,
  },
  required: [
    ...MailLogUpdateKeys,
  ] as const satisfies RequiredKeys<MailLogUpdateVOLike>[],
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
    .update(mailLogTable)
    .set(updateData)
    .where(eq(mailLogTable.id, id))
    .returning({ id: mailLogTable.id });
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
    summary: "更新邮件日志",
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
    ...MailLogDeleteKeys,
  ] as const satisfies RequiredKeys<MailLogDeleteVOLike>[],
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
    .delete(mailLogTable)
    .where(eq(mailLogTable.id, id))
    .returning({ id: mailLogTable.id });
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
    summary: "删除邮件日志",
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
    ...MailLogGetKeys,
  ] as const satisfies RequiredKeys<MailLogGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...MailLogVO,
  },
  required: [
    ...MailLogDetailKeys,
  ] as const satisfies RequiredKeys<MailLogVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const rows = await db
    .select()
    .from(mailLogTable)
    .where(eq(mailLogTable.id, id))
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
    summary: "获取邮件日志",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
} satisfies API;

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
