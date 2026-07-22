import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { IndexVO } from "@hodor/core/db/common/schema";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import * as mailRecipientRepository from "./repository";
import type { MailRecipientPOLike } from "./model";
import {
  MailRecipientVO,
  MailRecipientAddVO,
  MailRecipientAddKeys,
  MailRecipientUpdateVO,
  MailRecipientListReqVO,
} from "./model";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    ...MailRecipientListReqVO,
    orderBy: orderByWrapper<(keyof MailRecipientPOLike)[]>([
      "id",
      "email",
      "createTimeUtc",
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<MailRecipientPOLike>[]>(
    {
      ...MailRecipientVO,
    },
    ["id", "email", "scope", "remoteLoginWarn", "marketingEdm", "createTimeUtc"]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { pageNo = 1, pageSize = 20, orderBy, descend, ...filters } = params;
  const finalPageSize = pageSize || 20;

  const { total, list } = await mailRecipientRepository.findRecipientPage({
    pageNo,
    pageSize: finalPageSize,
    orderBy: orderBy as keyof MailRecipientPOLike,
    descend,
    ...filters,
    tenantId: filters.tenantId ?? undefined,
    userId: filters.userId ?? undefined,
  });

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: list as unknown as FromSchema<typeof listRes>["list"],
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取邮件收件人/联系人列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: ["id"] as const satisfies RequiredKeys<{ id: number }>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...MailRecipientVO,
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const res = await mailRecipientRepository.findRecipientById(params.id);
  return (res as unknown as FromSchema<typeof getRes>) || null;
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取邮件收件人详情",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...MailRecipientAddVO,
  },
  required: [
    ...MailRecipientAddKeys,
  ] as const satisfies RequiredKeys<MailRecipientPOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const creatorId = Number(userObj.id || userObj.userId || 0);
  const insertedId = await mailRecipientRepository.insertRecipient({
    ...obj,
    creatorId,
  });
  return insertedId || null;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加邮件收件人",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "create" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...IndexVO,
    ...MailRecipientUpdateVO,
  },
  required: ["id"] as const satisfies RequiredKeys<{ id: number }>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onUpdate(
  obj: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes> | null> {
  const { id, ...data } = obj;
  const updaterId = Number(userObj.id || userObj.userId || 0);

  const updatedId = await mailRecipientRepository.updateRecipient(id, {
    ...data,
    updaterId,
  });

  return updatedId || null;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新邮件收件人信息",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "update" },
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: ["id"] as const satisfies RequiredKeys<{ id: number }>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onDelete(
  obj: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes> | null> {
  const deletedId = await mailRecipientRepository.deleteRecipient(obj.id);
  return deletedId || null;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除邮件收件人",
  } as const,
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const mailRecipientService = {
  list: listApi,
  get: getApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
};

export default mailRecipientService;
