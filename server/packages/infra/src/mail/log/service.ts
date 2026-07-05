import {
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
import * as mailLogRepository from "./repository";

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
  return await mailLogRepository.findPageAll(params);
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
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await mailLogRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list,
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
  const insertedId = await mailLogRepository.onInsert(addData);
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
    updateTimeUtc: Date.now(),
  };

  const row = await mailLogRepository.onUpdate(id, updateData);
  preventEmpty(row);
  return row.id;
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
  permission: { action: "edit" },
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
  const row = await mailLogRepository.onDelete(id);
  preventEmpty(row);
  return row.id;
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
  permission: { action: "delete" },
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
  const row = await mailLogRepository.findById(id);
  preventEmpty(row);
  return row;
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
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
