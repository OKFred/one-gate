import {
  IndexVO,
  MailTemplateVO,
  MailTemplateListVO,
  MailTemplateAddVO,
  MailTemplateUpdateVO,
  MailTemplateListKeys,
  MailTemplateDetailKeys,
  MailTemplateGetKeys,
  MailTemplateDeleteKeys,
  MailTemplateAddKeys,
  MailTemplateUpdateKeys,
  MailTemplateSortableKeys,
  type MailTemplatePOLike,
  type MailTemplateVOLike,
  type MailTemplateAddVOLike,
  type MailTemplateUpdateVOLike,
  type MailTemplateDeleteVOLike,
  type MailTemplateGetVOLike,
  MailTemplateBaseVO,
  MailTemplateUniqueKeys,
  MailTemplateUniqueVO,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
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
import { preventEmpty } from "@/middleware/auth/prevention";
import * as mailTemplateRepository from "./repository";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: MailTemplateVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MailTemplatePOLike)[]>(
      MailTemplateSortableKeys
    ),
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
      ...MailTemplateBaseVO,
      ...MailTemplateUniqueVO,
    },
    required: [...MailTemplateGetKeys, ...MailTemplateUniqueKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await mailTemplateRepository.findPageAll(params);
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有邮件模板（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: MailTemplateVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MailTemplatePOLike)[]>(
      MailTemplateSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<MailTemplatePOLike>[]>(
    {
      ...MailTemplateListVO,
    },
    [...MailTemplateListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await mailTemplateRepository.findPage({
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
    summary: "获取邮件模板列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...MailTemplateAddVO,
  } satisfies Partial<Record<keyof MailTemplateAddVOLike, JSONSchema>>,
  required: [
    ...MailTemplateAddKeys,
  ] as const satisfies RequiredKeys<MailTemplateAddVOLike>[],
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
  const insertedId = await mailTemplateRepository.onInsert(addData);
  return insertedId || null;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加邮件模板",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...MailTemplateUpdateVO,
  },
  required: [
    ...MailTemplateUpdateKeys,
  ] as const satisfies RequiredKeys<MailTemplateUpdateVOLike>[],
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

  const row = await mailTemplateRepository.onUpdate(id, updateData);
  preventEmpty(row);
  return row.id;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新邮件模板",
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
    ...MailTemplateDeleteKeys,
  ] as const satisfies RequiredKeys<MailTemplateDeleteVOLike>[],
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
  const row = await mailTemplateRepository.onDelete(id);
  preventEmpty(row);
  return row.id;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除邮件模板",
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
    ...MailTemplateGetKeys,
  ] as const satisfies RequiredKeys<MailTemplateGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...MailTemplateVO,
  },
  required: [
    ...MailTemplateDetailKeys,
  ] as const satisfies RequiredKeys<MailTemplateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const row = await mailTemplateRepository.findById(id);
  preventEmpty(row);
  return row;
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取邮件模板",
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
