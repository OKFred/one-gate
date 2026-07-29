import {
  IndexVO,
  MailLogVO,
  MailLogListVO,
  MailLogAddVO,
  MailLogListKeys,
  MailLogDetailKeys,
  MailLogGetKeys,
  MailLogAddKeys,
  MailLogSortableKeys,
  type MailLogPOLike,
  type MailLogVOLike,
  type MailLogAddVOLike,
  type MailLogGetVOLike,
  MailLogBaseVO,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { registry } from "../../common/registry";

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
      ...MailLogVO,
    },
    required: [
      ...MailLogListKeys,
    ] as const satisfies RequiredKeys<MailLogVOLike>[],
  },
} as const satisfies JSONSchema;

function mapBizLogToMailLog(item: any): MailLogPOLike {
  const val = item.logValue || {};
  return {
    id: item.id,
    mailTo: val.mailTo ?? "",
    mailFrom: val.mailFrom ?? "",
    title: val.title ?? "",
    templateId: val.templateId ?? null,
    templateParams: val.templateParams ?? null,
    sendStatus: val.sendStatus ?? false,
    exceptionCode: val.exceptionCode ?? null,
    exceptionDetails: val.exceptionDetails ?? null,
    remark: item.remark ?? null,
    creatorId: item.creatorId,
    creatorName: item.creatorName ?? null,
    createTimeUtc: item.createTimeUtc,
  };
}

async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  const {
    orderBy = "id",
    descend = true,
    sendStatus,
    templateId,
    startTimeUtc,
    endTimeUtc,
  } = params;

  const filters: Record<string, unknown> = {};
  if (sendStatus !== undefined) filters.sendStatus = sendStatus;
  if (templateId !== undefined) filters.templateId = templateId;

  // For listAll, we pass a very large pageSize to fetch all records matching filters
  const { list } = await registry.base.log.biz.list({
    namespace: "mail",
    pageNo: 1,
    pageSize: 10000,
    orderBy:
      orderBy === "id" || orderBy === "createTimeUtc" ? orderBy : undefined,
    descend,
    filters,
    startTime: startTimeUtc,
    endTime: endTimeUtc,
  });

  const mappedList = list.map(mapBizLogToMailLog);

  if (orderBy && orderBy !== "id" && orderBy !== "createTimeUtc") {
    mappedList.sort((a, b) => {
      const aVal = a[orderBy] as any;
      const bVal = b[orderBy] as any;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return descend ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return descend ? bVal - aVal : aVal - bVal;
    });
  }

  return mappedList as any;
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/list_all",
    method: "post",
    summary: "获取邮件日志全量列表",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
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
  ...listResponseWrapper<RequiredKeys<MailLogVOLike>[]>(
    {
      ...MailLogVO,
    },
    [...MailLogListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    sendStatus,
    templateId,
    startTimeUtc,
    endTimeUtc,
  } = params;
  const finalPageSize = Math.min(pageSize, 1000);

  const filters: Record<string, unknown> = {};
  if (sendStatus !== undefined) filters.sendStatus = sendStatus;
  if (templateId !== undefined) filters.templateId = templateId;

  const { total, list } = await registry.base.log.biz.list({
    namespace: "mail",
    pageNo,
    pageSize: finalPageSize,
    orderBy:
      orderBy === "id" || orderBy === "createTimeUtc" ? orderBy : undefined,
    descend,
    filters,
    startTime: startTimeUtc,
    endTime: endTimeUtc,
  });

  const mappedList = list.map(mapBizLogToMailLog);

  if (orderBy && orderBy !== "id" && orderBy !== "createTimeUtc") {
    mappedList.sort((a, b) => {
      const aVal = a[orderBy] as any;
      const bVal = b[orderBy] as any;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return descend ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return descend ? bVal - aVal : aVal - bVal;
    });
  }

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: mappedList as any,
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
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...MailLogAddVO,
  },
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
  const creatorId = userObj.id || (userObj as any).userId;
  const username = userObj.username;
  const { remark, ...logValue } = obj;

  const creatorName = username || String(creatorId);

  const insertedId = await registry.base.log.biz.add({
    namespace: "mail",
    status: !obj.exceptionCode && Boolean(obj.sendStatus),
    payloadType: "json",
    logValue: logValue,
    remark: remark,
    creatorId,
    creatorName,
  });

  return insertedId || null;
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
  permission: { action: "add" },
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
  const row = await registry.base.log.biz.detail(id);
  preventEmpty(row);

  if (row.namespace !== "mail") {
    return null;
  }

  return mapBizLogToMailLog(row) as any;
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
  permission: { action: "read" },
} satisfies API;

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  get: getApi,
};
